import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 400, 401, 403, 409, 429, 503));

const vus = Number.parseInt(__ENV.VUS || "500", 10);
const duration = __ENV.DURATION || "30s";
const pauseSeconds = Number.parseFloat(__ENV.SLEEP_SECONDS || "1");

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_duration{name:event_detail}": ["p(95)<3000"],
    "http_req_duration{name:reservation_create}": ["p(95)<3000"],
    "http_req_duration{name:checkout}": ["p(95)<3000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const eventIdEnv = __ENV.EVENT_ID ? Number.parseInt(__ENV.EVENT_ID, 10) : null;
const ticketTypeIdEnv = __ENV.TICKET_TYPE_ID ? Number.parseInt(__ENV.TICKET_TYPE_ID, 10) : null;
const userPoolSizeEnv = __ENV.USER_POOL_SIZE ? Number.parseInt(__ENV.USER_POOL_SIZE, 10) : null;
const customerEmailEnv = __ENV.CUSTOMER_EMAIL || "";
const customerPasswordEnv = __ENV.CUSTOMER_PASSWORD || "";
const lazyUsersEnv = __ENV.LAZY_USERS === "true" || __ENV.LAZY_USERS === "1";

const successfulCheckouts = new Counter("successful_checkouts");
const successfulReservations = new Counter("successful_reservations");
const reservationResponses = new Counter("reservation_responses");
const checkoutResponses = new Counter("checkout_responses");
const reservationStatusOk = new Counter("reservation_status_ok");
const reservationStatusAuth = new Counter("reservation_status_auth");
const reservationStatusConflict = new Counter("reservation_status_conflict");
const reservationStatusRateLimited = new Counter("reservation_status_ratelimited");
const reservationStatusServerError = new Counter("reservation_status_server_error");
const reservationStatusOther = new Counter("reservation_status_other");

function pickFirstTicketTypeId(eventPayload) {
  const ticketTypes = eventPayload?.ticket_types;
  if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
    return Number(ticketTypes[0].id);
  }
  return null;
}

function buildUserPayload(runId, index) {
  const suffix = String(index).padStart(4, "0");
  const documentNumberBase = `K6${runId}${suffix}`.replace(/[^A-Za-z0-9]/g, "");
  const documentNumber = documentNumberBase.slice(0, 20).padEnd(8, "0");
  const runPhoneBaseRaw = Number.parseInt(String(runId).slice(-8), 10);
  const runPhoneBase = Number.isFinite(runPhoneBaseRaw) ? runPhoneBaseRaw : 10000000;
  const phoneDigits = String((runPhoneBase + index) % 100000000).padStart(8, "0");
  return {
    fullName: "K Six User",
    email: `k6-user-${runId}-${suffix}@crowdpass.test`,
    password: "K6User123!",
    country: "Peru",
    city: "Lima",
    documentNumber,
    gender: "unspecified",
    phone: `+519${phoneDigits}`,
    acceptsTerms: true,
    acceptsMarketing: true,
  };
}

function registerOrLoginUser(userPayload) {
  const registerResponse = http.post(`${baseUrl}/api/auth/register`, JSON.stringify(userPayload), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "auth_register" },
  });

  if (registerResponse.status === 201) {
    return registerResponse.json("data.token");
  }

  if (registerResponse.status !== 409) {
    return null;
  }

  const loginResponse = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email: userPayload.email, password: userPayload.password }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "auth_login" } }
  );

  if (loginResponse.status !== 200) {
    return null;
  }

  return loginResponse.json("data.token");
}

function registerOrLoginUserWithRetries(userPayload) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const registerResponse = http.post(`${baseUrl}/api/auth/register`, JSON.stringify(userPayload), {
      headers: { "Content-Type": "application/json" },
      tags: { name: "auth_register" },
    });

    if (registerResponse.status === 201) {
      return registerResponse.json("data.token");
    }

    if ([503, 429].includes(registerResponse.status)) {
      sleep(0.6);
      continue;
    }

    if (registerResponse.status !== 409) {
      return null;
    }

    for (let loginAttempt = 0; loginAttempt < 6; loginAttempt += 1) {
      const loginResponse = http.post(
        `${baseUrl}/api/auth/login`,
        JSON.stringify({ email: userPayload.email, password: userPayload.password }),
        { headers: { "Content-Type": "application/json" }, tags: { name: "auth_login" } }
      );

      if (loginResponse.status === 200) {
        return loginResponse.json("data.token");
      }

      if ([503, 429].includes(loginResponse.status)) {
        sleep(0.6);
        continue;
      }

      return null;
    }

    return null;
  }

  return null;
}

export function setup() {
  const healthResponse = http.get(`${baseUrl}/api/health`, { tags: { name: "health" } });

  check(healthResponse, {
    "health responde 200/503": (response) => response.status === 200 || response.status === 503,
    "health indica status ok": (response) => {
      if (response.status !== 200) {
        return true;
      }
      try {
        return response.json("data.status") === "ok";
      } catch {
        return false;
      }
    },
  });

  let targetEventId = Number.isFinite(eventIdEnv) ? eventIdEnv : null;
  if (!Number.isFinite(targetEventId) || targetEventId <= 0) {
    let eventsResponse = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      eventsResponse = http.get(`${baseUrl}/api/events?limit=1&page=1`, { tags: { name: "events_list" } });
      if (eventsResponse.status === 200) {
        break;
      }
      if ([503, 429].includes(eventsResponse.status)) {
        sleep(1);
        continue;
      }
      break;
    }

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

    if (eventsResponse.status !== 200) {
      throw new Error(`No se pudo listar eventos para la prueba. Status: ${eventsResponse.status}`);
    }

    const firstEventId = Number(eventsResponse.json("data.0.id"));
    if (!Number.isFinite(firstEventId) || firstEventId <= 0) {
      throw new Error("No se pudo inferir un evento publico para la prueba.");
    }

    targetEventId = firstEventId;
  }

  let eventDetailResponse = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    eventDetailResponse = http.get(`${baseUrl}/api/events/${targetEventId}`, { tags: { name: "event_detail" } });
    if (eventDetailResponse.status === 200) {
      break;
    }
    if ([503, 429].includes(eventDetailResponse.status)) {
      sleep(1);
      continue;
    }
    break;
  }
  check(eventDetailResponse, {
    "event detail responde 200": (response) => response.status === 200,
  });

  if (eventDetailResponse.status !== 200) {
    throw new Error(`No se pudo obtener detalle del evento ${targetEventId}. Status: ${eventDetailResponse.status}`);
  }

  const inferredTicketTypeId = pickFirstTicketTypeId(eventDetailResponse.json("data"));
  const targetTicketTypeId = Number.isFinite(ticketTypeIdEnv) ? ticketTypeIdEnv : inferredTicketTypeId;
  if (!Number.isFinite(targetTicketTypeId) || targetTicketTypeId <= 0) {
    throw new Error("TICKET_TYPE_ID invalido y no se pudo inferir un ticket type del evento.");
  }

  const runId = `${Date.now()}`;
  const userPoolSize = Number.isFinite(userPoolSizeEnv) && userPoolSizeEnv > 0 ? userPoolSizeEnv : Math.min(vus, 20);
  const shouldUseLazyUsers = lazyUsersEnv || userPoolSize >= 50;
  const tokens = [];

  if (customerEmailEnv && customerPasswordEnv) {
    const loginResponse = http.post(
      `${baseUrl}/api/auth/login`,
      JSON.stringify({ email: customerEmailEnv, password: customerPasswordEnv }),
      { headers: { "Content-Type": "application/json" }, tags: { name: "auth_login" } }
    );
    check(loginResponse, {
      "login customer responde 200": (response) => response.status === 200,
    });
    if (loginResponse.status !== 200) {
      throw new Error(`No se pudo autenticar CUSTOMER_EMAIL. Status: ${loginResponse.status}`);
    }
    tokens.push(loginResponse.json("data.token"));
  } else if (!shouldUseLazyUsers) {
    for (let index = 0; index < userPoolSize; index += 1) {
      const userPayload = buildUserPayload(runId, index);
      const token = registerOrLoginUserWithRetries(userPayload);
      if (!token) {
        throw new Error(`No se pudo autenticar usuario k6 #${index}.`);
      }
      tokens.push(token);
    }
  }

  return {
    tokens,
    eventId: targetEventId,
    ticketTypeId: targetTicketTypeId,
    runId,
    userPoolSize,
  };
}

let vuToken = null;

function ensureVuToken(data) {
  if (Array.isArray(data.tokens) && data.tokens.length > 0) {
    return data.tokens[(__VU - 1) % data.tokens.length];
  }

  if (vuToken) {
    return vuToken;
  }

  const poolSize = Number(data.userPoolSize) > 0 ? Number(data.userPoolSize) : 1;
  const userIndex = (__VU - 1) % poolSize;
  const userPayload = buildUserPayload(data.runId || `${Date.now()}`, userIndex);
  const token = registerOrLoginUserWithRetries(userPayload);
  if (!token) {
    return null;
  }

  vuToken = token;
  return vuToken;
}

export default function (data) {
  const token = ensureVuToken(data);
  if (!token) {
    sleep(Number.isFinite(pauseSeconds) ? pauseSeconds : 1);
    return;
  }

  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const reservationPayload = JSON.stringify({
    eventId: data.eventId,
    ticketTypeId: data.ticketTypeId,
    quantity: 1,
    paymentMethod: "credit_card",
    installmentCount: 1,
    isRefundablePurchase: false,
  });

  const reservationResponse = http.post(`${baseUrl}/api/reservations`, reservationPayload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    tags: { name: "reservation_create" },
  });

  const reservationOk = check(reservationResponse, {
    "reservation responde 201/400/409/429/503": (response) =>
      response.status === 201 ||
      response.status === 400 ||
      response.status === 409 ||
      response.status === 429 ||
      response.status === 503,
  });
  reservationResponses.add(1, { status: String(reservationResponse.status) });

  if (reservationResponse.status === 201 || reservationResponse.status === 400) {
    reservationStatusOk.add(1);
  } else if (reservationResponse.status === 401 || reservationResponse.status === 403) {
    reservationStatusAuth.add(1);
  } else if (reservationResponse.status === 409) {
    reservationStatusConflict.add(1);
  } else if (reservationResponse.status === 429) {
    reservationStatusRateLimited.add(1);
  } else if (reservationResponse.status === 503) {
    reservationStatusServerError.add(1);
  } else if (reservationResponse.status >= 500 || reservationResponse.status === 0) {
    reservationStatusServerError.add(1);
    if (__VU <= 2 && __ITER < 2) {
      console.error(`reservation error status=${reservationResponse.status} body=${reservationResponse.body}`);
    }
  } else {
    reservationStatusOther.add(1);
    if (__VU <= 2 && __ITER < 2) {
      console.error(`reservation other status=${reservationResponse.status} body=${reservationResponse.body}`);
    }
  }

  if (reservationOk && reservationResponse.status === 201) {
    successfulReservations.add(1);
  }

  if (reservationResponse.status !== 201) {
    sleep(Number.isFinite(pauseSeconds) ? pauseSeconds : 1);
    return;
  }

  const reservationId = reservationResponse.json("data.id");
  const checkoutPayload = JSON.stringify({
    reservationId,
    simulateOutcome: "approved",
    cardNumber: "4111111111111111",
    expMonth: 12,
    expYear: 2030,
    holderName: "K6 User",
    saveToWallet: false,
  });

  const checkoutResponse = http.post(`${baseUrl}/api/payments/checkout`, checkoutPayload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { name: "checkout" },
  });

  const checkoutOk = check(checkoutResponse, {
    "checkout responde 200/400/409/429": (response) =>
      response.status === 200 || response.status === 400 || response.status === 409 || response.status === 429,
  });
  checkoutResponses.add(1, { status: String(checkoutResponse.status) });

  if (checkoutOk && checkoutResponse.status === 200) {
    const status = checkoutResponse.json("data.status");
    if (status === "confirmed") {
      successfulCheckouts.add(1);
    }
  }

  sleep(Number.isFinite(pauseSeconds) ? pauseSeconds : 1);
}
