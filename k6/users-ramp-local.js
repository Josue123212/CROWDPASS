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

function normalizeTarget(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "categories";
  }
  if (raw === "health" || raw === "categories" || raw === "events" || raw === "users") {
    return raw;
  }
  return "categories";
}

const TARGET = normalizeTarget(__ENV.TARGET);
const baseUrl = normalizeBaseUrl(__ENV.BASE_URL) || "http://localhost:3000";
const requestTimeout = String(__ENV.REQ_TIMEOUT || "10s");

const maxVus = parsePositiveInt(__ENV.MAX_VUS, 1000);
const rampStep = parsePositiveInt(__ENV.RAMP_STEP, 250);
const rampDuration = String(__ENV.RAMP_DURATION || "30s");
const holdDuration = String(__ENV.HOLD_DURATION || "30s");

const sleepSeconds = Number.isFinite(Number(__ENV.SLEEP_SECONDS)) ? Number(__ENV.SLEEP_SECONDS) : 0;
export const options = {
  scenarios: {
    users_resource_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: (() => {
        const stages = [];
        let current = Math.min(100, maxVus);
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
    http_req_failed: ["rate<0.10"],
    http_req_duration: ["p(95)<3000"],
  },
};

const adminEmail = __ENV.ADMIN_EMAIL || "captura.register2@crowdpass.com";
const adminPassword = __ENV.ADMIN_PASSWORD || "Password123*";
const usersPage = __ENV.USERS_PAGE || "1";
const usersLimit = __ENV.USERS_LIMIT || "12";

export function setup() {
  if (TARGET !== "users") {
    return { token: "" };
  }

  const loginPayload = JSON.stringify({
    email: adminEmail,
    password: adminPassword,
  });

  const loginResponse = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: requestTimeout,
  });

  check(loginResponse, {
    "login admin responde 200": (response) => response.status === 200,
    "login admin entrega token": (response) => {
      try {
        return Boolean(response.json("data.token"));
      } catch {
        return false;
      }
    },
  });

  if (loginResponse.status !== 200) {
    throw new Error(`No se pudo autenticar admin para la prueba. Status: ${loginResponse.status}`);
  }

  return {
    token: loginResponse.json("data.token"),
  };
}

export default function (data) {
  const url =
    TARGET === "health"
      ? `${baseUrl}/api/health`
      : TARGET === "events"
        ? `${baseUrl}/api/events?page=1&limit=12`
        : TARGET === "users"
          ? `${baseUrl}/api/users?page=${usersPage}&limit=${usersLimit}`
          : `${baseUrl}/api/events/categories`;

  const params =
    TARGET === "users"
      ? {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
          timeout: requestTimeout,
          tags: { name: "users" },
        }
      : {
          timeout: requestTimeout,
          tags: { name: TARGET },
        };

  const response = http.get(url, params);

  check(response, {
    "request responde 200": (currentResponse) => currentResponse.status === 200,
  });

  if (sleepSeconds > 0) {
    sleep(sleepSeconds);
  }
}

export function handleSummary(data) {
  const stats = data.metrics;
  
  const totalIterations = stats.iterations ? stats.iterations.values.count : 0;
  const totalHttpRequests = stats.http_reqs ? stats.http_reqs.values.count : 0;
  const httpFailedRate = stats.http_req_failed ? (stats.http_req_failed.values.rate * 100).toFixed(2) : "0.00";
  
  const avgDuration = stats.http_req_duration ? stats.http_req_duration.values.avg.toFixed(2) : "0.00";
  const p95Duration = stats.http_req_duration ? stats.http_req_duration.values["p(95)"].toFixed(2) : "0.00";
  const maxDuration = stats.http_req_duration ? stats.http_req_duration.values.max.toFixed(2) : "0.00";

  const targetName = TARGET === "events" ? "Catálogo de Eventos" : TARGET === "categories" ? "Categorías" : TARGET;

  const asciiArt = `
 ==========================================================
 🛡️  CROWDPASS - REPORTE DE ESTRÉS DE LECTURA MASIVA (K6)
 ==========================================================
  
  [📊 RESUMEN DE EJECUCIÓN]
  --------------------------------------------------------
   • Recurso Evaluado:         [GET] /api/${TARGET} (${targetName})
   • Iteraciones Completadas:  ${totalIterations} visitas simuladas
   • Peticiones HTTP Totales:   ${totalHttpRequests} peticiones enviadas
  
  [👤 NIVEL DE CONCURRENCIA]
  --------------------------------------------------------
   👥 Usuarios Concurrentes (VUs): Max ${maxVus} simulados
  
  [⚠️ ESTADO DE LAS RESPUESTAS]
  --------------------------------------------------------
   ✅ Tasa de Éxito (Status 200):  ${(100 - Number(httpFailedRate)).toFixed(2)}% de peticiones correctas
   ❌ Tasa de Fallo (Errores):     ${httpFailedRate}% de peticiones fallidas
  
  [⚡ TIEMPOS DE RESPUESTA DEL SERVIDOR]
  --------------------------------------------------------
   ⏱️ Tiempo Promedio:                  ${avgDuration} ms
   ⏱️ Percentil 95 (P95):                ${p95Duration} ms
   ⏱️ Tiempo Máximo Registrado:          ${maxDuration} ms
 ==========================================================
  Prueba de estrés de lectura masiva finalizada con éxito.
 ==========================================================
`;

  return {
    stdout: asciiArt,
  };
}

