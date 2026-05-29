import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    users_resource_load: {
      executor: "per-vu-iterations",
      vus: 1200,
      iterations: 10,
      maxDuration: "5m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.10"],
    http_req_duration: ["p(95)<5000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const adminEmail = __ENV.ADMIN_EMAIL || "captura.register2@crowdpass.com";
const adminPassword = __ENV.ADMIN_PASSWORD || "Password123*";
const usersPage = __ENV.USERS_PAGE || "1";
const usersLimit = __ENV.USERS_LIMIT || "12";

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
  const usersResponse = http.get(`${baseUrl}/api/users?page=${usersPage}&limit=${usersLimit}`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  });

  check(usersResponse, {
    "users responde 200": (response) => response.status === 200,
  });
}
