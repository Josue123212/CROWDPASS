import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// Métricas personalizadas en consola en tiempo real
const createdReservations = new Counter("created_reservations");
const soldOutHits = new Counter("sold_out_hits");
const rateLimitHits = new Counter("rate_limit_hits");
const serverErrors = new Counter("server_errors");
const connectionErrors = new Counter("connection_errors");
const totalRegistrationSuccess = new Counter("registration_success");
const dbResponseTime = new Trend("db_response_time");

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
const eventId = parsePositiveInt(__ENV.EVENT_ID, 18); // Por defecto el Ilimitado (18)
const ticketTypeId = parsePositiveInt(__ENV.TICKET_TYPE_ID, 2); // Ticket 2 es de Evento 18, 1 de Evento 17
const quantity = parsePositiveInt(__ENV.QUANTITY, 1);
const maxVus = parsePositiveInt(__ENV.MAX_VUS, 100); // Límite por defecto para local
const rampDuration = String(__ENV.RAMP_DURATION || "10s");
const holdDuration = String(__ENV.HOLD_DURATION || "15s");
const sleepSeconds = Number.isFinite(Number(__ENV.SLEEP_SECONDS)) ? Number(__ENV.SLEEP_SECONDS) : 0;
let globalTicketsSold = 0;
let globalTotalTickets = 100000;

export const options = {
  scenarios: {
    reservations_stampede: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: rampDuration, target: maxVus },
        { duration: holdDuration, target: maxVus },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<4000"],
  },
};

export default function () {
  // Generar correo único incremental por VU e Iteración
  const uniqueId = `vu-${__VU}-iter-${__ITER}-${Math.floor(Math.random() * 100000)}`;
  const email = `k6_user_${uniqueId}@crowdpass.com`;
  const password = "K6UserPassword123!";
  const registerPayload = JSON.stringify({
    email,
    password,
    fullName: "Usuario Concurrente Test",
    phone: `+519${Math.floor(10000000 + Math.random() * 90000000)}`,
    country: "Peru",
    city: "Lima",
    documentNumber: `DNI${Math.floor(10000000 + Math.random() * 90000000)}`,
    gender: "unspecified",
    acceptsTerms: true,
    acceptsMarketing: true,
  });
  const registerRes = http.post(`${baseUrl}/api/auth/register`, registerPayload, {
    headers: { "Content-Type": "application/json" },
    timeout: requestTimeout,
  });

  const isRegistered = registerRes.status === 201 || (registerRes.status === 400 && registerRes.json("message")?.includes("ya existe"));
  if (registerRes.status === 201) {
    totalRegistrationSuccess.add(1);
  }

  if (!isRegistered) {
    connectionErrors.add(1);
    return;
  }

  // 2. Login del usuario para obtener el Token
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: { "Content-Type": "application/json" },
    timeout: requestTimeout,
  });

  if (loginRes.status !== 200) {
    connectionErrors.add(1);
    return;
  }

  const token = loginRes.json("data.token");
  if (!token) {
    connectionErrors.add(1);
    return;
  }

  // 3. Intento de Reserva concurrente con bucle de reintento automático si el servicio está saturado (503 / timeout)
  const reservationPayload = JSON.stringify({
    eventId,
    ticketTypeId,
    quantity,
    paymentMethod: "transfer",
    installmentCount: 1,
    isRefundablePurchase: false,
  });

  let response;
  let attempts = 0;
  const maxAttempts = 10; // Intentará hasta 10 veces por usuario virtual
  let success = false;

  const startTime = Date.now();

  while (attempts < maxAttempts && !success) {
    attempts++;
    response = http.post(`${baseUrl}/api/reservations`, reservationPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": `k6-${uniqueId}-attempt-${attempts}`,
      },
      timeout: requestTimeout,
    });

    if (response.status === 201) {
      createdReservations.add(1);
      success = true;
    } else if (response.status === 409) {
      soldOutHits.add(1);
      success = true; // Paramos porque realmente no hay stock
    } else if (response.status === 429) {
      rateLimitHits.add(1);
      // Rate limit: espera un poco antes de reintentar
      sleep(0.2);
    } else if (response.status === 500) {
      serverErrors.add(1);
      return; // Error interno del servidor: abortamos iteración
    } else {
      // 503 / Timeout / DB_CONNECT_TIMEOUT: el servicio está saturado. 
      // Sumamos la saturación pero REINTENTAMOS esperando un breve instante (backoff)
      connectionErrors.add(1);
      sleep(0.1); // Espera 100ms a que la BD respire antes del siguiente intento
    }
  }

  const duration = Date.now() - startTime;
  dbResponseTime.add(duration);


  check(response, {
    "Respuesta recibida": (res) => res.status > 0,
    "Sin error 500": (res) => res.status !== 500,
  });

  // Consultar total acumulado en Neon al final de la iteración para el reporte acumulativo
  try {
    const eventRes = http.get(`${baseUrl}/api/events/${eventId}`);
    if (eventRes.status === 200) {
      const data = eventRes.json("data");
      if (data) {
        globalTicketsSold = Number(data.tickets_sold || 0);
        globalTotalTickets = Number(data.total_tickets || 100000);
      }
    }
  } catch (e) {
    // Silencioso si falla la red
  }

  if (sleepSeconds > 0) {
    sleep(sleepSeconds);
  }
}

export function handleSummary(data) {
  const stats = data.metrics;
  
  const totalUsers = stats.registration_success ? stats.registration_success.values.count : 0;
  const reservationsCreated = stats.created_reservations ? stats.created_reservations.values.count : 0;
  const soldOut = stats.sold_out_hits ? stats.sold_out_hits.values.count : 0;
  const rateLimit = stats.rate_limit_hits ? stats.rate_limit_hits.values.count : 0;
  const serverErr = stats.server_errors ? stats.server_errors.values.count : 0;
  const connErr = stats.connection_errors ? stats.connection_errors.values.count : 0;
  
  const avgDbTime = stats.db_response_time ? stats.db_response_time.values.avg.toFixed(2) : "0.00";
  const maxDbTime = stats.db_response_time ? stats.db_response_time.values.max.toFixed(2) : "0.00";
  const p95DbTime = stats.db_response_time ? stats.db_response_time.values["p(95)"].toFixed(2) : "0.00";

  const totalIterations = stats.iterations ? stats.iterations.values.count : 0;
  const totalHttpRequests = stats.http_reqs ? stats.http_reqs.values.count : 0;

  const asciiArt = `
 ==========================================================
 🛡️  CROWDPASS - REPORTE DE PRUEBA DE CARGA MASIVA (K6)
 ==========================================================
  
  [📊 RESUMEN DE EJECUCIÓN]
  --------------------------------------------------------
   • Iteraciones Totales:      ${totalIterations} intentos de flujo
   • Peticiones HTTP Totales:   ${totalHttpRequests} llamadas al API
  
  [👤 REGISTROS E INICIOS DE SESIÓN]
  --------------------------------------------------------
   ✅ Usuarios Creados y Autenticados:   ${totalUsers} usuarios únicos
  
  [🎫 OPERACIONES DE COMPRA / RESERVA]
  --------------------------------------------------------
   🎉 Compras Concretadas en esta Sesión: ${reservationsCreated} entradas
   📈 Total Histórico Acumulado en Neon: ${globalTicketsSold} / ${globalTotalTickets} tickets vendidos
   ❌ Compras Rechazadas por Sold-Out:   ${soldOut} veces sin stock (409)
  
  [⚠️ CONTROL DE ERRORES Y SATURACIÓN]
  --------------------------------------------------------
   🚫 Bloqueos por Límite de Tasa (429): ${rateLimit} solicitudes
   💥 Fallas de Servidor Internas (500): ${serverErr} caídas detectadas
   🔌 Errores de Red / Conexión:          ${connErr} pérdidas de enlace
  
  [⚡ TIEMPOS DE RESPUESTA DE LA BASE DE DATOS]
  --------------------------------------------------------
   ⏱️ Tiempo Promedio:                  ${avgDbTime} ms
   ⏱️ Percentil 95 (P95):                ${p95DbTime} ms
   ⏱️ Tiempo Máximo Registrado:          ${maxDbTime} ms
 ==========================================================
  Prueba de estrés masiva finalizada con éxito.
 ==========================================================
`;

  return {
    stdout: asciiArt,
  };
}

