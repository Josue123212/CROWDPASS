import http from "k6/http";
import { check, sleep } from "k6";

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "")
    .replace(/\/+$/g, "");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const baseUrl = normalizeBaseUrl(__ENV.BASE_URL) || "http://localhost:3000";
const requestTimeout = String(__ENV.REQ_TIMEOUT || "15s");
const customerEmail = String(__ENV.CUSTOMER_EMAIL || "customer@crowdpass.com").trim();
const customerPassword = String(__ENV.CUSTOMER_PASSWORD || "CrowdPass123!").trim();
const eventId = parsePositiveInt(__ENV.EVENT_ID, 0);
const ticketTypeId = parsePositiveInt(__ENV.TICKET_TYPE_ID, 0);
const quantity = parsePositiveInt(__ENV.QUANTITY, 1);
const maxVus = parsePositiveInt(__ENV.MAX_VUS, 5000);
const rampStep = parsePositiveInt(__ENV.RAMP_STEP, 1000);
const rampDuration = String(__ENV.RAMP_DURATION || "30s");
const holdDuration = String(__ENV.HOLD_DURATION || "60s");
const sleepSeconds = Number.isFinite(Number(__ENV.SLEEP_SECONDS)) ? Number(__ENV.SLEEP_SECONDS) : 0;

export const options = {
  scenarios: {
    reservations_stampede: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: (() => {
        const stages = [];
        let current = Math.min(500, maxVus);
        while (current < maxVus) {
          stages.push({ duration: rampDuration, target: current });
          current = Math.min(current + rampStep, maxVus);
        }
        stages.push({ duration: rampDuration, target: maxVus });
        stages.push({ duration: holdDuration, target: maxVus });
        stages.push({ duration: "20s", target: 0 });
        return stages;
      })(),
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<4000"],
    checks: ["rate>0.95"],
  },
};

export function setup() {
  if (!eventId || !ticketTypeId) {
    throw new Error("Debes definir EVENT_ID y TICKET_TYPE_ID para la prueba.");
  }

  const loginPayload = JSON.stringify({
    email: customerEmail,
    password: customerPassword,
  });

  const loginResponse = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: { "Content-Type": "application/json" },
    timeout: requestTimeout,
  });

  check(loginResponse, {
    "login responde 200": (response) => response.status === 200,
    "login entrega token": (response) => {
      try {
        return Boolean(response.json("data.token"));
      } catch {
        return false;
      }
    },
  });

  if (loginResponse.status !== 200) {
    throw new Error(`No se pudo autenticar customer para la prueba. Status: ${loginResponse.status}`);
  }

  return {
    token: loginResponse.json("data.token"),
  };
}

export default function (data) {
  const payload = JSON.stringify({
    eventId,
    ticketTypeId,
    quantity,
    paymentMethod: "transfer",
    installmentCount: 1,
    isRefundablePurchase: false,
  });

  const response = http.post(`${baseUrl}/api/reservations`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.token}`,
      "Idempotency-Key": `k6-${__VU}-${__ITER}`,
    },
    timeout: requestTimeout,
    tags: {
      name: "reservation_create",
    },
  });

  check(response, {
    "status permitido": (currentResponse) => [201, 409, 429, 503].includes(currentResponse.status),
    "sin error 500": (currentResponse) => currentResponse.status !== 500,
  });

  if (sleepSeconds > 0) {
    sleep(sleepSeconds);
  }
}
