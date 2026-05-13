import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const healthResponse = http.get(`${baseUrl}/api/health`);

  check(healthResponse, {
    "health responde 200": (response) => response.status === 200,
  });

  const payload = JSON.stringify({
    fullName: `K6 User ${__VU}-${__ITER}`,
    email: `k6-user-${__VU}-${__ITER}@crowdpass.com`,
    password: "secret123",
  });

  const registerResponse = http.post(`${baseUrl}/api/auth/register`, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  check(registerResponse, {
    "register responde 201 o 409": (response) =>
      response.status === 201 || response.status === 409,
  });

  sleep(1);
}
