import http from "k6/http";
import { check } from "k6";

export const options = {
  noConnectionReuse: true,
  scenarios: {
    users_resource_break: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5s", target: 400 },
        { duration: "5s", target: 800 },
        { duration: "5s", target: 1200 },
        { duration: "10s", target: 1500 },
        { duration: "45s", target: 1500 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "0s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.40"],
    http_req_duration: ["p(95)<10000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const adminEmail = __ENV.ADMIN_EMAIL || "captura.register2@crowdpass.com";
const adminPassword = __ENV.ADMIN_PASSWORD || "Password123*";
const usersPage = __ENV.USERS_PAGE || "1";
const usersLimit = __ENV.USERS_LIMIT || "100";
const burstRequests = Number.parseInt(__ENV.BURST_REQUESTS || "3", 10);

function buildUsersUrl() {
  return `${baseUrl}/api/users?page=${usersPage}&limit=${usersLimit}`;
}

export function setup() {
  const loginPayload = JSON.stringify({
    email: adminEmail,
    password: adminPassword,
  });

  const loginResponse = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: {
      "Content-Type": "application/json",
    },
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
  const requests = Array.from({ length: Math.max(burstRequests, 1) }, () => ({
    method: "GET",
    url: buildUsersUrl(),
    params: {
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
    },
  }));

  const responses = http.batch(requests);

  for (const response of responses) {
    check(response, {
      "users responde 200": (currentResponse) => currentResponse.status === 200,
      "users entrega arreglo": (currentResponse) => {
        try {
          return Array.isArray(currentResponse.json("data"));
        } catch {
          return false;
        }
      },
    });
  }
}
