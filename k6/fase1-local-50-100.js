import http from "k6/http";
import { check, sleep } from "k6";

const vus = Number.parseInt(__ENV.VUS || "500", 10);
const duration = __ENV.DURATION || "30s";
const pauseSeconds = Number.parseFloat(__ENV.SLEEP_SECONDS || "1");

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const healthResponse = http.get(`${baseUrl}/api/health`);

  check(healthResponse, {
    "health responde 200": (response) => response.status === 200,
    "health indica status ok": (response) => {
      try {
        return response.json("data.status") === "ok";
      } catch {
        return false;
      }
    },
  });

  const eventsResponse = http.get(`${baseUrl}/api/events`);

  check(eventsResponse, {
    "events responde 200": (response) => response.status === 200,
    "events retorna arreglo": (response) => {
      try {
        return Array.isArray(response.json("data"));
      } catch {
        return false;
      }
    },
  });

  sleep(Number.isFinite(pauseSeconds) ? pauseSeconds : 1);
}
