import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import "./App.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import ReactPhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
const PhoneInput = ReactPhoneInput.default ? ReactPhoneInput.default : ReactPhoneInput;
import BackofficeLayout from "./backoffice/BackofficeLayout";
import { BACKOFFICE_ROLE_CONFIGS } from "./backoffice/roleConfigs";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const WHATSAPP_SUPPORT_PHONE = (import.meta.env.VITE_WHATSAPP_SUPPORT_PHONE || "51928836295").trim();
const WHATSAPP_SUPPORT_TEXT = (import.meta.env.VITE_WHATSAPP_SUPPORT_TEXT || "Hola, necesito ayuda con CrowdPass.").trim();
const TOKEN_KEY = "crowdpass_token";
const USER_KEY = "crowdpass_user";
const AUTH_NOTICE_KEY = "crowdpass_auth_notice";
const RESERVATION_DRAFT_PREFIX = "crowdpass_reservation_draft_";
const SESSION_EXPIRED_EVENT = "crowdpass:session-expired";
const NOTIFICATIONS_UPDATED_EVENT = "crowdpass:notifications-updated";
const USERS_PAGE_SIZE = 12;
const EVENTS_REFRESH_INTERVAL = 15000;
const RESERVATIONS_REFRESH_INTERVAL = 15000;
const USERS_REFRESH_INTERVAL = 5000;
const ORGANIZER_REFRESH_INTERVAL = 10000;
const SERVER_STATUS_INTERVAL = 10000;
const HOME_CAROUSEL_AUTOPLAY_DESKTOP_MS = 3800;
const HOME_CAROUSEL_AUTOPLAY_MOBILE_MS = 5200;

function buildWhatsAppUrl(phone, text) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  const message = String(text || "").trim();
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

const HERO_EVENT_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQrGBV8zgI05sX9sVGvDfJKfKItBR5jBaVrUDLo7J9dFoffYKe3c8nlcX7Ep7D34phnzfCWqlpF7zZln8ipkDyUNRNUJYHB4USYmDRd4_7LMAamDSleFAeF56rkkCjQ1qwrE5M2c5VJN3ujWK7uTlAJnBiwBFBy_-F21Ma_l4Am6bpONnrzzhxvO4BXq1I_a0PNBcHk_M3gHe8a40BFgQtYanHAoI3p6GwjIt8HiXw_o_IZI4J4VrBS8gMUrHrJJywgT1Nvzpm26a3";
const AUTH_PANEL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBgHWcceDyvrOoeDEyN_0OUFFOFE9S9Iybr_sLoMuitmf1JT5-sRKR1_4kaVy68eIQ1LqXH4KelZJsPIXW_NwHbXTFznz7L0aVLfuEAcJr09Qv8GY9hu9jOh1JXN711OSem-JKJ4ycKtjsS_XH0qAi5B8MRjc_WKkUJU5VQN2gqhflfuZmoQ0hA1VkROCZfmvlF2yVO0y2Id4bQpFmd-lpey2uoDVX8j1A-RbtfJBMRrWn12BPJQfYByE8WQIuliA8eiUsznJo2iF0Q";
const NOT_FOUND_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCLGW_IYl3S4uk5Z9kdtLD40RWgrv00UA2M4x0tmXX7wj2eGERW7HaDAVIKyLl9u7HYQ9ivYdHASD0MJ0lQhW6UtHlTPv8z6bki1IJfGUooYhcAmJLCgI9c562RO_DRIxWDsaGKXnfHiWpulUUIstaMwTbNC91YpQShcmJ0fKa-wMxPzsUSXjXqDf_P1e_N-9mrc-ddUfIj5rLWTuKo13TS8UcIFm_A-zWfI03K-qOowUyPbvUKIsAKIbUtjzk-KVkTfIFTfw9DabMf";
const SERVER_ERROR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBfiGtvSpfoi7dGYZGkpym3L5WSC0Xzw1iJrtrzum6wKf7z1Sgde1qYq2AvdUWOcK2qB19NQ8YgbGQu3m6ZXj9HzkVjqsc-x_7WAXVkHyEwK4S03oJd-mg1lSDjB7RnxIpuSxJc_oSlFozclv9odMyztamXTC34Wkgd-wr4Am-gzP0ek3QHm2zjK19tBoqQscQ9UR4FBOXYLEQWs0XpggFpiglRElEJsAbwBAbrIx8A8Yzi4z0nDkfUdFFEUtk84bpO9nwchuW4z2u5";
const CUSTOMER_AVATAR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCSSaQ94Z18y8yaDI3hr4MY7h-eOLZJ7Dwxb4Vf2jH9HDIvO5Q-gpR1Ah_7qhsFXHEnxtVQCEgAUpMKbszdYhYpdJqgYHODVlIGp2R629UIGDGB-QeXx4A2nLFdbiIN865QZVql6x1l5JMwvjsmGR6Rlz1o9DfJs-Snvf42eNf00QeRVn1URje6Yzrwpq_MMlLD9ybthEpJCwWvt-QDldFMvk--IDtKhyn5BxaXF-P6_td8gDqrsDqzjHTs8V5e2ykIqmml9n-zqNsw";
const ADMIN_AVATAR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCmS8JWi1hHWE3yepwkVvBwgNh0ekAjQ6mUVhMwuCXyw9Y0Nq4SbceqTFfJ9MURTSqLBq6MoYOkBe5DHrUy6Mcjn-rgC6C0eME7_EwWjM1ILYBG-DOvdjGMCsaKCeNwm7-pBSOTo9_XTTZ0jMFifK1jL1XSCfU9ZH-e6n0rffNYe29A9eypnttdjEv_Cw_TKk6A1iJhsOpKxLSMGeAuT1vLMgAvghPe5TZVC0UD3eB1n47g2QWS78aDbKPFTLHad1itsxL24NwDI1-N";

const EVENT_FALLBACK_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAcXi568ihuRJEOV01OIw3FYqbSpoJpjI816Xe60I4mIPPnRjiV0z0Tl2fxWNE2bl9NX1LmuGRgYM5UpRdpMW4VPgpSCU4neZzWSfoJauW7vtSoSeXOWwsnLPaPP-U6sQoxO7Qvx9I1QWb-Q735hTE816quFpTcVlf4B395IgTc5Q7BEu52kAT5NsNgd0n8RPQgPmwu0c3fMt3uivkOALRFPIoBStnLHdM4f_bdTLNhiL2Synh7yhZaYJjLzJurq2CpaDgvjIMd9qom",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAEX_cvjCHGM1MCHUcQhC2ktRgEpOWUQOgQ5Ijsca3z52SphbADL15bYHONsHKQjCS9QM-r3x9Z5GLNG_ViPGGyyEYcjlDG7MFgnEHsJ2VHkFi-Vnxae1vMUi3eVNlz9NUJSbW2in26ouKYr1CNQwb0mRidE-2kYKIPTnUPocufkE7XpW6040Iq4lZxmlpZUpxP3y-0AdzL-fPiEobU6srw8cuyXi5bsU6r_UarAggQ40UW6YKSb4O_I7JQi59U0CRDxZUiHGCRr4Rl",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBw-r4vLWg1iVZYGwgRtNDSGF7QquQ1w4S25fDFn6YkixmrBzOxlRdMajPcL7ZgYOAo3K-ukzIBLUGPN1AzPHeZKj2X1e8def6OCpRjieRQit3sc2XqSfB2XbX5TgDPineTevRm15lNHqwl9t8SVX8-V7RQrfm_kb6EfVfVGSklVFNGSXeDUT-JdsVhiG6iFo3OlLhnCjKEawMPMn5y9jhFytcCKGz9iU0Z2MLw6W3Sw7oWFtzj8IhPpdKbAJj0ioPXRqe2SPQoc915",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC4vjQK1_MBHM1JfxlS8q8_hN-yW_NqUGo0V1V8v-YxChtGZ4FctiLeSKUHKm4cp5mh1x9HilEwcxSgoGV92AH4I5xRmd79EB6tN8euEyR6ex2GWCXAZBp2AA34_rMohwbl1wmONUJOVqOVnzRp-xFVwrzyQid75tU2ETP6O1a5TkuMWequOcOqQTMxz-8CGAGOPjFeBZZEnSHB_b4BNilUB5E-MT8w-3VYc5OxP1wf8brfvVWtGDSIXPat1XeY1x6oyCSgnZe9NFby",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
  { value: "unspecified", label: "Prefiero no decirlo" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "credit_card", label: "Tarjeta de credito" },
  { value: "debit_card", label: "Tarjeta de debito" },
  { value: "pagoefectivo", label: "PagoEfectivo" },
  { value: "transfer", label: "Transferencia" },
];

const EVENT_STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "pending_review", label: "Enviar a revision" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
];
const ORGANIZER_PROTECTED_EVENT_STATUSES = ["published", "active", "paused"];
const isEventExpired = (eventItem) => {
  if (!eventItem) return false;
  const eventDate = new Date(eventItem.ends_at || eventItem.starts_at || eventItem.event_date);
  return eventDate < new Date();
};

/**
 * Convierte un enlace de Google Drive o YouTube en una URL embebible para iframe.
 * Drive:   https://drive.google.com/file/d/FILE_ID/view  →  .../preview
 * YouTube: https://www.youtube.com/watch?v=VIDEO_ID     →  https://www.youtube.com/embed/VIDEO_ID
 * YouTube: https://youtu.be/VIDEO_ID                    →  https://www.youtube.com/embed/VIDEO_ID
 * Retorna null si el enlace no es reconocido.
 */
function getPromoVideoEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();

  // Google Drive: /file/d/FILE_ID/view  →  /file/d/FILE_ID/preview
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // YouTube watch: ?v=VIDEO_ID
  const ytWatch = url.match(/(?:youtube\.com\/watch\?(?:[^#&]*&)*v=)([^#&?]+)/);
  if (ytWatch) {
    return `https://www.youtube.com/embed/${ytWatch[1]}`;
  }

  // YouTube short link: youtu.be/VIDEO_ID
  const ytShort = url.match(/youtu\.be\/([^#&?]+)/);
  if (ytShort) {
    return `https://www.youtube.com/embed/${ytShort[1]}`;
  }

  // YouTube embed already
  if (url.includes("youtube.com/embed/") || url.includes("drive.google.com/file/d/") && url.includes("/preview")) {
    return url;
  }

  return null;
}
const CHANGE_REQUEST_FIELD_DEFINITIONS = [
  { key: "title", label: "Titulo" },
  { key: "category", label: "Categoria" },
  { key: "description", label: "Descripcion" },
  { key: "additionalInfo", label: "Informacion adicional" },
  { key: "featuredImageUrl", label: "Imagen destacada" },
  { key: "promoVideoUrl", label: "Video promocional" },
  { key: "venue", label: "Venue" },
  { key: "startsAt", label: "Inicio" },
  { key: "endsAt", label: "Fin" },
  { key: "visibility", label: "Visibilidad" },
  { key: "ageRestriction", label: "Restriccion de edad" },
  { key: "country", label: "Pais" },
  { key: "city", label: "Ciudad" },
  { key: "addressLine", label: "Direccion" },
  { key: "addressReference", label: "Referencia" },
  { key: "meetingPoint", label: "Punto de encuentro" },
  { key: "status", label: "Estado" },
  { key: "ticketTypes", label: "Tipos de ticket" },
];

const PASSWORD_RULES = [
  { id: "length", label: "Minimo 8 caracteres", test: (value) => value.length >= 8 },
  { id: "uppercase", label: "Al menos una mayuscula", test: (value) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "Al menos una minuscula", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "Al menos un numero", test: (value) => /\d/.test(value) },
  { id: "symbol", label: "Al menos un simbolo", test: (value) => /[^A-Za-z0-9]/.test(value) },
];
const REGISTER_DOCUMENT_REGEX = /^[A-Za-z0-9]{8,20}$/;
const REGISTER_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const HOME_CATEGORY_VISUALS = [
  {
    matches: ["musica", "music", "concierto", "concert", "festival"],
    icon: "music_note",
    accent: "linear-gradient(135deg, rgba(111, 66, 193, 0.96), rgba(77, 68, 227, 0.92))",
    surface: "rgba(241, 235, 255, 0.96)",
  },
  {
    matches: ["teatro", "comedia", "stand", "show", "humor"],
    icon: "theater_comedy",
    accent: "linear-gradient(135deg, rgba(249, 115, 22, 0.96), rgba(245, 158, 11, 0.92))",
    surface: "rgba(255, 245, 235, 0.96)",
  },
  {
    matches: ["arte", "museo", "galeria", "expo", "cultura"],
    icon: "palette",
    accent: "linear-gradient(135deg, rgba(14, 165, 233, 0.96), rgba(56, 189, 248, 0.92))",
    surface: "rgba(236, 248, 255, 0.96)",
  },
  {
    matches: ["deporte", "sports", "futbol", "running", "maraton"],
    icon: "sports_soccer",
    accent: "linear-gradient(135deg, rgba(34, 197, 94, 0.96), rgba(22, 163, 74, 0.92))",
    surface: "rgba(239, 253, 244, 0.96)",
  },
  {
    matches: ["negocio", "tech", "tecnologia", "conferencia", "summit", "cumbre"],
    icon: "rocket_launch",
    accent: "linear-gradient(135deg, rgba(59, 130, 246, 0.96), rgba(37, 99, 235, 0.92))",
    surface: "rgba(239, 246, 255, 0.96)",
  },
  {
    matches: ["familia", "kids", "infantil", "ninos", "comunidad"],
    icon: "celebration",
    accent: "linear-gradient(135deg, rgba(236, 72, 153, 0.96), rgba(244, 114, 182, 0.92))",
    surface: "rgba(253, 242, 248, 0.96)",
  },
];

function normalizeTextToken(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugifyText(value = "") {
  return normalizeTextToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getHomeInterestVisual(categoryName = "") {
  const normalizedCategory = normalizeTextToken(categoryName);
  const matchedVisual = HOME_CATEGORY_VISUALS.find((visual) =>
    visual.matches.some((candidate) => normalizedCategory.includes(candidate)),
  );

  return (
    matchedVisual || {
      icon: "confirmation_number",
      accent: "linear-gradient(135deg, rgba(77, 68, 227, 0.96), rgba(124, 58, 237, 0.92))",
      surface: "rgba(239, 244, 255, 0.96)",
    }
  );
}

function readStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function setTransientAuthNotice(message) {
  if (!message) {
    return;
  }

  sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

function consumeTransientAuthNotice() {
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);

  if (!notice) {
    return "";
  }

  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return notice;
}

async function apiRequest(path, options = {}) {
  let response;
  const optionHeaders = options.headers || {};
  const shouldSkipJsonHeader =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const requestHeaders = shouldSkipJsonHeader
    ? { ...optionHeaders }
    : {
        "Content-Type": "application/json",
        ...optionHeaders,
      };
  const requestOptions = { ...options };
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 8000;
  let timeoutId = null;
  let abortController = null;

  if (requestOptions.timeoutMs !== undefined) {
    delete requestOptions.timeoutMs;
  }

  if (!requestOptions.signal && typeof AbortController !== "undefined" && timeoutMs > 0) {
    abortController = new AbortController();
    requestOptions.signal = abortController.signal;
    timeoutId = window.setTimeout(() => abortController.abort(), timeoutMs);
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
  } catch (error) {
    const isAbort = String(error?.name || "") === "AbortError";
    const networkError = new Error(isAbort ? "Tiempo de espera agotado al conectar con el servidor." : "No pudimos conectar con el servidor.");
    networkError.isConnectionError = true;
    networkError.cause = error;
    throw networkError;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || "No se pudo completar la solicitud.";

    if (response.status === 401 && requestHeaders.Authorization) {
      setTransientAuthNotice("Tu sesion expiro. Vuelve a iniciar sesion para continuar.");
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function buildIdempotencyKey(prefix = "req") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildQueryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function readCatalogFiltersFromSearch(search = "") {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") || "",
    category: params.get("category") || "",
    city: params.get("city") || "",
    venue: params.get("venue") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    freeOnly: params.get("freeOnly") === "true",
  };
}

function buildCatalogNavigationQuery(filters) {
  return buildQueryString({
    q: filters.q,
    category: filters.category,
    city: filters.city,
    venue: filters.venue,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    freeOnly: filters.freeOnly ? "true" : "",
  });
}

function buildEventsApiQuery(filters) {
  return buildQueryString({
    q: filters.q,
    category: filters.category,
    city: filters.city,
    venue: filters.venue,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    freeOnly: filters.freeOnly ? "true" : "",
    startDate: filters.startDate,
    endDate: filters.endDate,
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  });
}

function isServiceUnavailableError(error) {
  if (error?.isConnectionError) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("no pudimos conectar con el servidor")
  );
}

function getHomeCarouselAutoplayMs() {
  if (typeof window === "undefined") {
    return HOME_CAROUSEL_AUTOPLAY_DESKTOP_MS;
  }

  return window.matchMedia("(max-width: 760px)").matches
    ? HOME_CAROUSEL_AUTOPLAY_MOBILE_MS
    : HOME_CAROUSEL_AUTOPLAY_DESKTOP_MS;
}

function useAutoRefresh(refreshCallback, delay, enabled = true) {
  useEffect(() => {
    if (!enabled || !delay) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshCallback();
    }, delay);

    return () => window.clearInterval(intervalId);
  }, [refreshCallback, delay, enabled]);
}

function getReservationDraftKey(eventId) {
  return `${RESERVATION_DRAFT_PREFIX}${eventId}`;
}

function readReservationDraft(eventId) {
  const rawDraft = sessionStorage.getItem(getReservationDraftKey(eventId));

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft);
  } catch {
    sessionStorage.removeItem(getReservationDraftKey(eventId));
    return null;
  }
}

function writeReservationDraft(eventId, draft) {
  sessionStorage.setItem(getReservationDraftKey(eventId), JSON.stringify(draft));
}

function clearReservationDraft(eventId) {
  sessionStorage.removeItem(getReservationDraftKey(eventId));
}

function formatCurrency(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatCompactDate(value) {
  if (!value) {
    return "Fecha por confirmar";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleString();
}

function formatPaymentMethodLabel(value) {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label || "No especificado";
}

function formatPaymentStatusLabel(value) {
  if (value === "paid" || value === "completed") {
    return "Pagado";
  }

  if (value === "simulated_paid") {
    return "Aprobado (simulado)";
  }

  if (value === "pending" || value === "pending_payment") {
    return "Pendiente de pago";
  }

  if (value === "failed") {
    return "No completado";
  }

  if (value === "refunded") {
    return "Reembolsado";
  }

  if (value === "cancelled") {
    return "Cancelado";
  }

  return "Por confirmar";
}

function formatReservationRefundStatus(value) {
  if (value === "completed") {
    return "Completado";
  }
  if (value === "rejected") {
    return "Rechazado";
  }
  if (value === "processing") {
    return "En proceso";
  }
  if (value === "pending") {
    return "Pendiente";
  }
  return "Sin solicitud";
}

function isExpiredReservation(reservation) {
  return Boolean(reservation?.expired_at);
}

function getReservationStatusLabel(reservationOrStatus) {
  if (reservationOrStatus && typeof reservationOrStatus === "object" && isExpiredReservation(reservationOrStatus)) {
    return "Expirada";
  }

  if (
    reservationOrStatus &&
    typeof reservationOrStatus === "object" &&
    reservationOrStatus.refund_type === "refundable_purchase" &&
    ["pending", "processing"].includes(reservationOrStatus.refund_status)
  ) {
    return "Reembolso pendiente";
  }

  if (
    reservationOrStatus &&
    typeof reservationOrStatus === "object" &&
    reservationOrStatus.refund_type === "refundable_purchase" &&
    reservationOrStatus.refund_status === "rejected"
  ) {
    return "Reembolso rechazado";
  }

  const status =
    reservationOrStatus && typeof reservationOrStatus === "object"
      ? reservationOrStatus.status
      : reservationOrStatus;

  if (status === "confirmed") {
    return "Confirmada";
  }

  if (status === "pending_payment") {
    return "Pendiente";
  }

  if (status === "refunded") {
    return "Reembolsada";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Reserva";
}

function getReservationPaymentStatusLabel(reservation) {
  if (isExpiredReservation(reservation)) {
    return "Expirado";
  }

  if (reservation?.refund_type === "refundable_purchase" && ["pending", "processing"].includes(reservation?.refund_status)) {
    return "Pendiente de reembolso";
  }

  if (reservation?.refund_type === "refundable_purchase" && reservation?.refund_status === "rejected") {
    return "Rechazado";
  }

  return formatPaymentStatusLabel(reservation?.payment_status);
}

function hasIssuedReservationAccess(reservation) {
  return reservation?.status === "confirmed" && ["simulated_paid", "completed"].includes(reservation?.payment_status);
}

function toDateTimeLocalInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function getUserInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function isValidFullName(fullName) {
  return /^[\p{L}\s]+$/u.test(fullName.trim());
}

function getRoleHomePath(role, user = null) {
  if (role === "admin") {
    if (user?.is_super_admin) {
      return "/superadmin/users";
    }
    return "/admin/users";
  }

  if (role === "organizer") {
    return "/organizer/events";
  }

  if (role === "staff") {
    return "/staff/reservations";
  }

  return "/my-tickets";
}

function resolveSafeReturnTo(returnTo, user = null) {
  if (typeof returnTo !== "string" || !returnTo.startsWith("/")) {
    return "";
  }

  const role = user?.role;
  const isSuperAdmin = Boolean(user?.is_super_admin);

  if (returnTo.startsWith("/superadmin")) {
    return role === "admin" && isSuperAdmin ? returnTo : "";
  }

  if (returnTo.startsWith("/admin")) {
    return role === "admin" ? returnTo : "";
  }

  if (returnTo.startsWith("/staff")) {
    return role === "staff" ? returnTo : "";
  }

  if (returnTo.startsWith("/organizer")) {
    return role === "organizer" ? returnTo : "";
  }

  if (returnTo.startsWith("/my-")) {
    return role === "customer" ? returnTo : "";
  }

  if (returnTo.startsWith("/events/") && returnTo.includes("/reserve")) {
    return role === "customer" ? returnTo : "";
  }

  if (returnTo.startsWith("/checkout/")) {
    return role === "customer" ? returnTo : "";
  }

  return returnTo;
}

function buildEventsTimeFilterRange(timeFilter) {
  const now = new Date();

  if (timeFilter === "this_month") {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  if (timeFilter === "next_30_days") {
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 30);
    return {
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  return {
    startDate: "",
    endDate: "",
  };
}

function getRoleLabel(role) {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "organizer") {
    return "Organizador";
  }

  if (role === "staff") {
    return "Staff";
  }

  return "Cliente";
}

function getRoleMemberLink(role, user = null) {
  if (role === "admin") {
    if (user?.is_super_admin) {
      return { path: "/superadmin/users", label: "Super Admin" };
    }
    return { path: "/admin/users", label: "Panel" };
  }

  if (role === "organizer") {
    return { path: "/organizer/events", label: "Mis eventos" };
  }

  if (role === "staff") {
    return { path: "/staff/reservations", label: "Operaciones" };
  }

  return { path: "/my-tickets", label: "Mis entradas" };
}

function getOrganizerStatusLabel(status) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "approved") {
    return "Aprobado";
  }

  if (status === "rejected") {
    return "Rechazado";
  }

  return "Sin solicitud";
}

function getEventStatusLabel(status) {
  if (status === "pending_review") {
    return "Pendiente de revision";
  }

  if (status === "published") {
    return "Publicado";
  }

  if (status === "paused") {
    return "Pausado";
  }

  if (status === "finished") {
    return "Finalizado";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  if (status === "rejected") {
    return "Rechazado";
  }

  if (status === "active") {
    return "Activo";
  }

  return "Borrador";
}

function getChangeRequestTypeLabel(type) {
  if (type === "cancellation") {
    return "Cancelacion";
  }

  return "Cambios";
}

function getChangeRequestStatusLabel(status) {
  if (status === "pending_review") {
    return "Pendiente de revision";
  }

  if (status === "needs_information") {
    return "Falta informacion";
  }

  if (status === "approved") {
    return "Aprobada";
  }

  if (status === "rejected") {
    return "Rechazada";
  }

  return "Solicitud";
}

function normalizeChangePreviewDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function normalizeTicketTypesForPreview(ticketTypes = []) {
  return ticketTypes.map((ticketType) => ({
    name: ticketType.name || "",
    currency: ticketType.currency || "PEN",
    price: Number(ticketType.price || 0),
    stockTotal: Number(ticketType.stockTotal ?? ticketType.stock_total ?? 0),
    stockAvailable: Number(ticketType.stockAvailable ?? ticketType.stock_available ?? 0),
    salesStartsAt: normalizeChangePreviewDate(ticketType.salesStartsAt ?? ticketType.sales_starts_at ?? ""),
    salesEndsAt: normalizeChangePreviewDate(ticketType.salesEndsAt ?? ticketType.sales_ends_at ?? ""),
    salesEndMode: ticketType.salesEndMode ?? ticketType.sales_end_mode ?? "until_event_start",
    maxPerOrder: Number(ticketType.maxPerOrder ?? ticketType.max_per_order ?? 0),
    maxPerUser:
      ticketType.maxPerUser === null ||
        ticketType.maxPerUser === undefined ||
        ticketType.max_per_user === null ||
        ticketType.max_per_user === undefined
        ? null
        : Number(ticketType.maxPerUser ?? ticketType.max_per_user),
  }));
}

function normalizeEventForChangePreview(event) {
  return {
    title: event.title || "",
    category: event.category || event.category_slug || "",
    description: event.description || "",
    additionalInfo: event.additionalInfo || event.additional_info || "",
    featuredImageUrl: event.featuredImageUrl || event.featured_image_url || "",
    promoVideoUrl: event.promoVideoUrl || event.promo_video_url || "",
    venue: event.venue || "",
    startsAt: normalizeChangePreviewDate(event.startsAt || event.starts_at || event.event_date || ""),
    endsAt: normalizeChangePreviewDate(event.endsAt || event.ends_at || ""),
    visibility: event.visibility || "public",
    ageRestriction: event.ageRestriction || event.age_restriction || "all_audiences",
    country: event.country || "",
    city: event.city || "",
    addressLine: event.addressLine || event.address_line || "",
    addressReference: event.addressReference || event.address_reference || "",
    meetingPoint: event.meetingPoint || event.meeting_point || "",
    status: event.status || "draft",
    ticketTypes: normalizeTicketTypesForPreview(event.ticketTypes || event.ticket_types || []),
  };
}

function buildEventChangePreview(currentEvent, nextEventData) {
  const current = normalizeEventForChangePreview(currentEvent);
  const next = normalizeEventForChangePreview(nextEventData);

  return CHANGE_REQUEST_FIELD_DEFINITIONS.reduce((changes, fieldDefinition) => {
    const before = current[fieldDefinition.key];
    const after = next[fieldDefinition.key];

    if (JSON.stringify(before) === JSON.stringify(after)) {
      return changes;
    }

    changes.push({
      field: fieldDefinition.key,
      label: fieldDefinition.label,
      before,
      after,
      isSensitive: ORGANIZER_PROTECTED_EVENT_STATUSES.includes(currentEvent.status)
        && ["venue", "startsAt", "endsAt", "visibility", "city", "country", "addressLine", "status", "ticketTypes"].includes(
          fieldDefinition.key
        ),
    });

    return changes;
  }, []);
}

function formatChangeRequestValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item.name} · ${item.currency} ${Number(item.price || 0).toFixed(2)} · ${item.stockAvailable}/${item.stockTotal}`)
      .join(" | ");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  if (!value && value !== 0) {
    return "Sin valor";
  }

  return String(value);
}

function formatFileSize(size) {
  if (!size) {
    return "0 KB";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(size / 1024, 0.1).toFixed(1)} KB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("No pudimos leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function getAgeRestrictionLabel(value) {
  if (value === "18_plus") {
    return "Solo para mayores de 18";
  }

  if (value === "under_18_with_adult") {
    return "Menores solo con acompanante";
  }

  return "Todo publico";
}

function usePublicEventDetail(eventId, auth) {
  const [event, setEvent] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);

    try {
      const response = await apiRequest(`/events/${eventId}`, { method: "GET" });
      setEvent(response.data || null);
      setFeedback("");
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      if (error?.status === 404) {
        setEvent(null);
        setFeedback("");
        setNotFound(true);
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar este evento en este momento."));
    } finally {
      setIsLoading(false);
    }
  }, [auth, eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  return { event, feedback, isLoading, notFound, reload: loadEvent };
}

function getUserFacingErrorMessage(error, fallback = "No pudimos completar tu solicitud en este momento.") {
  const rawMessage = String(error?.message || "").trim();

  if (!rawMessage) {
    return fallback;
  }

  if (error?.isConnectionError || (error?.status && error.status >= 500)) {
    return fallback;
  }

  if (error?.status === 401 && /token|expirad|sesion/i.test(rawMessage)) {
    return "Tu sesion expiro. Vuelve a iniciar sesion para continuar.";
  }

  if (error?.status === 401) {
    return rawMessage;
  }

  if (error?.status === 403 && /permisos|acceder|cancelar|crear reservas/i.test(rawMessage)) {
    return rawMessage;
  }

  const technicalPatterns = [
    /failed to fetch/i,
    /timeout/i,
    /\bapi\b/i,
    /\bbackend\b/i,
    /\bserver\b/i,
    /\bservidor\b/i,
    /\btoken\b/i,
    /\bjwt\b/i,
    /\bsql\b/i,
    /\bpostgres/i,
    /\bnetwork\b/i,
    /\bconnect/i,
  ];

  if (technicalPatterns.some((pattern) => pattern.test(rawMessage))) {
    return fallback;
  }

  return rawMessage;
}

function getPasswordRuleStates(password) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    isMet: rule.test(password),
  }));
}

function getPasswordStrengthMeta(password) {
  const satisfiedCount = getPasswordRuleStates(password).filter((rule) => rule.isMet).length;

  if (!password) {
    return { label: "Sin evaluar", tone: "neutral", progress: 0 };
  }

  if (satisfiedCount <= 2) {
    return { label: "Baja", tone: "weak", progress: 33 };
  }

  if (satisfiedCount === 3 || satisfiedCount === 4) {
    return { label: "Media", tone: "medium", progress: 68 };
  }

  return { label: "Alta", tone: "strong", progress: 100 };
}

function buildEmptyTicketType() {
  return {
    name: "General",
    currency: "PEN",
    price: "0",
    stockTotal: "100",
    stockAvailable: "100",
    salesStartsAt: "",
    salesEndsAt: "",
    salesEndMode: "until_event_start",
    maxPerOrder: "4",
    maxPerUser: "8",
  };
}

function buildEmptyEventForm() {
  return {
    title: "",
    category: "",
    description: "",
    additionalInfo: "",
    featuredImageUrl: "",
    promoVideoUrl: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    visibility: "public",
    ageRestriction: "all_audiences",
    country: "Peru",
    city: "",
    addressLine: "",
    addressReference: "",
    meetingPoint: "",
    status: "draft",
    ticketTypes: [buildEmptyTicketType()],
    organizerType: "registered",
    organizerId: "",
    externalOrganizerName: "",
  };
}

function mapEventToForm(eventItem) {
  return {
    title: eventItem.title || "",
    category: eventItem.category_slug || "",
    description: eventItem.description || "",
    additionalInfo: eventItem.additional_info || "",
    featuredImageUrl: eventItem.featured_image_url || "",
    promoVideoUrl: eventItem.promo_video_url || "",
    venue: eventItem.venue || "",
    startsAt: toDateTimeLocalInput(eventItem.starts_at || eventItem.event_date),
    endsAt: toDateTimeLocalInput(eventItem.ends_at),
    visibility: eventItem.visibility || "public",
    ageRestriction: eventItem.age_restriction || "all_audiences",
    country: eventItem.country || "Peru",
    city: eventItem.city || "",
    addressLine: eventItem.address_line || "",
    addressReference: eventItem.address_reference || "",
    meetingPoint: eventItem.meeting_point || "",
    status: eventItem.status === "published" ? "pending_review" : eventItem.status || "draft",
    ticketTypes: (eventItem.ticket_types || []).length
      ? eventItem.ticket_types.map((ticketType) => ({
        name: ticketType.name || "",
        currency: ticketType.currency || "PEN",
        price: String(ticketType.price ?? 0),
        stockTotal: String(ticketType.stock_total ?? 0),
        stockAvailable: String(ticketType.stock_available ?? 0),
        salesStartsAt: toDateTimeLocalInput(ticketType.sales_starts_at),
        salesEndsAt: toDateTimeLocalInput(ticketType.sales_ends_at),
        salesEndMode: ticketType.sales_end_mode || "until_event_start",
        maxPerOrder: String(ticketType.max_per_order ?? 4),
        maxPerUser: String(ticketType.max_per_user ?? 8),
      }))
      : [buildEmptyTicketType()],
    organizerType: eventItem.organizer_id ? "registered" : eventItem.external_organizer_name ? "external" : "registered",
    organizerId: eventItem.organizer_id ? String(eventItem.organizer_id) : "",
    externalOrganizerName: eventItem.external_organizer_name || "",
  };
}

function useManagedEventsData(auth, options = {}) {
  const { errorMessage = "No pudimos cargar los eventos en este momento." } = options;
  const [events, setEvents] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizersList, setOrganizersList] = useState([]);
  const [formData, setFormData] = useState(buildEmptyEventForm());
  const [editingEventId, setEditingEventId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [disablingId, setDisablingId] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [changeRequestMode, setChangeRequestMode] = useState("update");
  const [changeRequestEventId, setChangeRequestEventId] = useState(null);
  const [changeRequestEventTitle, setChangeRequestEventTitle] = useState("");
  const [changeRequestExplanation, setChangeRequestExplanation] = useState("");
  const [changeRequestSummary, setChangeRequestSummary] = useState([]);
  const [changeRequestAttachments, setChangeRequestAttachments] = useState([]);
  const [pendingRequestedEventData, setPendingRequestedEventData] = useState(null);

  const currentEditingEvent = useMemo(
    () => events.find((eventItem) => Number(eventItem.id) === Number(editingEventId)) || null,
    [editingEventId, events]
  );

  const loadEventsData = useCallback(
    async ({ silent = false } = {}) => {
      if (!auth.token) {
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const requests = [
          apiRequest("/events/mine", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }),
          apiRequest("/events/categories", { method: "GET" }),
        ];

        if (auth.currentUser?.role === "organizer") {
          requests.push(
            apiRequest("/events/change-requests/mine", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            })
          );
        }

        const [eventsResponse, categoriesResponse, changeRequestsResponse] = await Promise.all(requests);

        setEvents(eventsResponse.data || []);
        setCategories(categoriesResponse.data || []);
        setChangeRequests(changeRequestsResponse?.data || []);
        setFeedback({ type: "", message: "" });
      } catch (error) {
        setFeedback({ type: "error", message: getUserFacingErrorMessage(error, errorMessage) });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token, errorMessage]
  );

  const loadOrganizers = useCallback(async () => {
    if (auth.currentUser?.role === "admin" && auth.token) {
      try {
        const response = await apiRequest("/users?group=organizers&limit=100", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        setOrganizersList(response.data || []);
      } catch (err) {
        console.error("No se pudieron cargar los organizadores", err);
      }
    }
  }, [auth.token, auth.currentUser?.role]);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  useEffect(() => {
    loadOrganizers();
  }, [loadOrganizers]);

  useAutoRefresh(() => loadEventsData({ silent: true }), ORGANIZER_REFRESH_INTERVAL, Boolean(auth.token));

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTicketType = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((ticketType, ticketIndex) =>
        ticketIndex === index ? { ...ticketType, [field]: value } : ticketType
      ),
    }));
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, buildEmptyTicketType()],
    }));
  };

  const removeTicketType = (index) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, ticketIndex) => ticketIndex !== index),
    }));
  };

  const resetForm = () => {
    setFormData(buildEmptyEventForm());
    setEditingEventId(null);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    resetForm();
  };

  const closeChangeRequestModal = () => {
    setIsChangeRequestModalOpen(false);
    setChangeRequestMode("update");
    setChangeRequestEventId(null);
    setChangeRequestEventTitle("");
    setChangeRequestExplanation("");
    setChangeRequestSummary([]);
    setChangeRequestAttachments([]);
    setPendingRequestedEventData(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFeedback({ type: "", message: "" });
    setIsEventModalOpen(true);
  };

  const editEvent = (eventItem) => {
    setEditingEventId(eventItem.id);
    setFormData(mapEventToForm(eventItem));
    setFeedback({ type: "", message: "" });
    setIsEventModalOpen(true);
  };

  const submitEvent = async (event) => {
    event.preventDefault();

    if (
      auth.currentUser?.role === "organizer" &&
      currentEditingEvent &&
      ORGANIZER_PROTECTED_EVENT_STATUSES.includes(currentEditingEvent.status)
    ) {
      const normalizedEventData = {
        ...formData,
        latitude: null,
        longitude: null,
      };
      const diffSummary = buildEventChangePreview(currentEditingEvent, normalizedEventData);

      if (diffSummary.length === 0) {
        setFeedback({ type: "error", message: "No detectamos cambios reales para enviar a revision." });
        return;
      }

      setPendingRequestedEventData(normalizedEventData);
      setChangeRequestMode("update");
      setChangeRequestEventId(currentEditingEvent.id);
      setChangeRequestEventTitle(currentEditingEvent.title);
      setChangeRequestSummary(diffSummary);
      setChangeRequestExplanation("");
      setChangeRequestAttachments([]);
      setIsEventModalOpen(false);
      setIsChangeRequestModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        ...formData,
        latitude: null,
        longitude: null,
      };

      if (auth.currentUser?.role === "admin") {
        if (formData.organizerType === "external") {
          payload.organizerId = null;
          payload.externalOrganizerName = formData.externalOrganizerName || null;
        } else {
          payload.organizerId = formData.organizerId ? Number(formData.organizerId) : null;
          payload.externalOrganizerName = null;
        }
      }

      const response = await apiRequest(editingEventId ? `/events/${editingEventId}` : "/events", {
        method: editingEventId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });

      setFeedback({ type: "success", message: response.message });
      closeEventModal();
      await loadEventsData({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos guardar el evento en este momento.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvent = async (eventId) => {
    const targetEvent = events.find((eventItem) => Number(eventItem.id) === Number(eventId));

    if (
      auth.currentUser?.role === "organizer" &&
      targetEvent &&
      ORGANIZER_PROTECTED_EVENT_STATUSES.includes(targetEvent.status)
    ) {
      setFeedback({ type: "", message: "" });
      setChangeRequestMode("cancellation");
      setChangeRequestEventId(targetEvent.id);
      setChangeRequestEventTitle(targetEvent.title);
      setChangeRequestSummary([
        {
          field: "status",
          label: "Estado solicitado",
          before: getEventStatusLabel(targetEvent.status),
          after: "Cancelado",
          isSensitive: true,
        },
      ]);
      setChangeRequestExplanation("");
      setChangeRequestAttachments([]);
      setPendingRequestedEventData(null);
      setIsChangeRequestModalOpen(true);
      return;
    }

    setDeletingId(eventId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      await loadEventsData({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos eliminar el evento en este momento.") });
    } finally {
      setDeletingId(null);
    }
  };

  const disableEvent = async (eventId) => {
    const targetEvent = events.find((eventItem) => Number(eventItem.id) === Number(eventId));

    if (!targetEvent) {
      return;
    }

    if (targetEvent.status === "paused") {
      setFeedback({ type: "error", message: "El evento ya se encuentra deshabilitado." });
      return;
    }

    const confirmed = window.confirm(
      `Se deshabilitara el evento "${targetEvent.title}". Esto detiene nuevas reservas inmediatamente. Deseas continuar?`
    );

    if (!confirmed) {
      return;
    }

    setDisablingId(eventId);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest(`/events/${eventId}/disable`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setFeedback({ type: "success", message: response.message });
      await loadEventsData({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos deshabilitar el evento en este momento.") });
    } finally {
      setDisablingId(null);
    }
  };

  const updateChangeRequestExplanation = (value) => {
    setChangeRequestExplanation(value);
  };

  const updateChangeRequestAttachments = async (fileList) => {
    const files = Array.from(fileList || []);

    if (files.length > 3) {
      setFeedback({ type: "error", message: "Solo puedes adjuntar hasta 3 evidencias por solicitud." });
      return;
    }

    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => {
          if (file.size > 1.5 * 1024 * 1024) {
            throw new Error(`El archivo ${file.name} supera el limite de 1.5 MB.`);
          }

          return {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            dataUrl: await readFileAsDataUrl(file),
          };
        })
      );

      setChangeRequestAttachments(nextAttachments);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No pudimos procesar los adjuntos." });
    }
  };

  const removeChangeRequestAttachment = (attachmentName) => {
    setChangeRequestAttachments((current) => current.filter((attachment) => attachment.name !== attachmentName));
  };

  const submitChangeRequest = async () => {
    if (!changeRequestEventId) {
      return;
    }

    setIsRequestSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest(`/events/${changeRequestEventId}/change-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          requestType: changeRequestMode,
          explanation: changeRequestExplanation,
          attachments: changeRequestAttachments,
          eventData: changeRequestMode === "update" ? pendingRequestedEventData : null,
        }),
      });

      setFeedback({ type: "success", message: response.message });
      closeChangeRequestModal();
      closeEventModal();
      await loadEventsData({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos enviar la solicitud en este momento.") });
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  return {
    events,
    changeRequests,
    categories,
    formData,
    editingEventId,
    currentEditingEvent,
    feedback,
    isLoading,
    isRefreshing,
    isSubmitting,
    isRequestSubmitting,
    disablingId,
    deletingId,
    isEventModalOpen,
    isChangeRequestModalOpen,
    changeRequestMode,
    changeRequestEventId,
    changeRequestEventTitle,
    changeRequestExplanation,
    changeRequestSummary,
    changeRequestAttachments,
    setFeedback,
    organizersList,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    submitChangeRequest,
    editEvent,
    deleteEvent,
    disableEvent,
    updateChangeRequestExplanation,
    updateChangeRequestAttachments,
    removeChangeRequestAttachment,
    openCreateModal,
    closeEventModal,
    closeChangeRequestModal,
    loadEventsData,
  };
}

function useAdminEventInsights(events) {
  const adminSalesSummary = useMemo(() => {
    return events.reduce(
      (summary, eventItem) => {
        const ticketsSold = Number(eventItem.tickets_sold || 0);
        const totalRevenue = Number(eventItem.revenue_total || 0);
        const platformRevenue = Number(eventItem.platform_revenue || 0);
        const organizerRevenue = Number(eventItem.organizer_revenue || 0);
        const isSoldOut = eventItem.is_sold_out || Number(eventItem.available_tickets || 0) <= 0;

        return {
          soldTickets: summary.soldTickets + ticketsSold,
          soldOutEvents: summary.soldOutEvents + (isSoldOut ? 1 : 0),
          totalRevenue: summary.totalRevenue + totalRevenue,
          platformRevenue: summary.platformRevenue + platformRevenue,
          organizerRevenue: summary.organizerRevenue + organizerRevenue,
        };
      },
      {
        soldTickets: 0,
        soldOutEvents: 0,
        totalRevenue: 0,
        platformRevenue: 0,
        organizerRevenue: 0,
      }
    );
  }, [events]);

  const revenueChartData = useMemo(() => {
    return [...events]
      .sort((left, right) => Number(right.revenue_total || 0) - Number(left.revenue_total || 0))
      .slice(0, 6);
  }, [events]);

  const topRevenueValue = useMemo(() => {
    return revenueChartData.reduce((maxValue, eventItem) => Math.max(maxValue, Number(eventItem.revenue_total || 0)), 0) || 1;
  }, [revenueChartData]);

  return { adminSalesSummary, revenueChartData, topRevenueValue };
}

const BACKEND_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api").replace(/\/api$/, "");

function ImageUploadField({ value, onChange, auth }) {
  const [tab, setTab] = useState("url");
  const [urlInput, setUrlInput] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  // Reset image error whenever the URL changes
  useEffect(() => {
    setImgError(false);
  }, [value]);

  // Sync url tab with external value
  useEffect(() => {
    if (tab === "url") {
      setUrlInput(value || "");
    }
  }, [value, tab]);

  const handleUrlChange = (e) => {
    setUrlInput(e.target.value);
    onChange(e.target.value);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = auth?.token || auth?.currentUser?.token || localStorage.getItem("crowdpass_token");
      const response = await fetch(`${BACKEND_ORIGIN}/api/uploads/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Error al subir la imagen.");
      }

      onChange(json.data?.url || "");
    } catch (err) {
      setUploadError(err.message || "No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const previewUrl = value || "";

  return (
    <div className="image-upload-field">
      <p className="image-upload-label">Imagen destacada</p>
      <div className="image-upload-tabs">
        <button
          type="button"
          className={`image-upload-tab${tab === "url" ? " active" : ""}`}
          onClick={() => setTab("url")}
        >
          🔗 Pegar enlace
        </button>
        <button
          type="button"
          className={`image-upload-tab${tab === "file" ? " active" : ""}`}
          onClick={() => setTab("file")}
        >
          📁 Subir archivo
        </button>
      </div>

      {tab === "url" && (
        <div className="image-upload-panel">
          <input
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={urlInput}
            onChange={handleUrlChange}
            className="image-upload-url-input"
          />
        </div>
      )}

      {tab === "file" && (
        <div className="image-upload-panel">
          <label className={`image-upload-dropzone${uploading ? " uploading" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: "none" }}
            />
            {uploading ? (
              <>
                <span className="image-upload-icon">⏳</span>
                <span>Subiendo imagen...</span>
              </>
            ) : (
              <>
                <span className="image-upload-icon">⬆️</span>
                <span>Haz clic o arrastra una imagen</span>
                <small>JPEG, PNG, WebP o GIF · máx. 5 MB</small>
              </>
            )}
          </label>
          {uploadError && <p className="image-upload-error">{uploadError}</p>}
        </div>
      )}

      {previewUrl && (
        <div className="image-upload-preview">
          {imgError ? (
            <div className="image-upload-broken">
              <span>⚠️</span>
              <p>No se puede previsualizar esta URL. Asegúrate de pegar un enlace directo a una imagen (termina en .jpg, .png, .webp, etc.).</p>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Vista previa de imagen destacada"
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
            />
          )}
          <button type="button" className="image-upload-clear" onClick={() => { onChange(""); setUrlInput(""); setImgError(false); }}>
            ✕ Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}

function EventEditorModal({
  categories,
  formData,
  editingEventId,
  isSubmitting,
  isOpen,
  onClose,
  onSubmit,
  onUpdateField,
  onUpdateTicketType,
  onAddTicketType,
  onRemoveTicketType,
  auth = null,
  organizersList = [],
  requiresMinDate = false,
}) {
  const getMinEventDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 30);
    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, "0");
    const day = String(minDate.getDate()).padStart(2, "0");
    const hours = String(minDate.getHours()).padStart(2, "0");
    const minutes = String(minDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ticket-preview-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ticket-preview-dialog admin-event-modal">
        <section className="panel-card admin-event-modal-card">
          <div className="ticket-preview-header">
            <div>
              <p className="eyebrow">Eventos</p>
              <h3>{editingEventId ? "Editar evento" : "Crear evento"}</h3>
              <p className="muted">Completa la informacion principal, las fechas y los tipos de entrada.</p>
            </div>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <form className="form-grid compact-grid organizer-form" onSubmit={onSubmit}>
            {auth?.currentUser?.role === "admin" && (
              <div className="form-span-2 form-grid compact-grid" style={{ gridColumn: "span 2", display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr", paddingBottom: "0.5rem" }}>
                <label>
                  Tipo de Organizador
                  <select
                    value={formData.organizerType || "registered"}
                    onChange={(event) => {
                      onUpdateField("organizerType", event.target.value);
                      if (event.target.value === "external") {
                        onUpdateField("organizerId", "");
                      } else {
                        onUpdateField("externalOrganizerName", "");
                      }
                    }}
                  >
                    <option value="registered">Registrado en la plataforma</option>
                    <option value="external">Externo (No registrado)</option>
                  </select>
                </label>

                {formData.organizerType === "external" ? (
                  <label>
                    Nombre del Organizador Externo
                    <input
                      value={formData.externalOrganizerName || ""}
                      onChange={(event) => onUpdateField("externalOrganizerName", event.target.value)}
                      placeholder="Ej. Productora XYZ"
                      required
                    />
                  </label>
                ) : (
                  <label>
                    Selecciona Organizador
                    <select
                      value={formData.organizerId || ""}
                      onChange={(event) => onUpdateField("organizerId", event.target.value)}
                      required
                    >
                      <option value="">-- Elige un organizador --</option>
                      {organizersList.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.full_name} ({org.email})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            <label>
              Titulo
              <input value={formData.title} onChange={(event) => onUpdateField("title", event.target.value)} required />
            </label>
            <label>
              Categoria
              <select value={formData.category} onChange={(event) => onUpdateField("category", event.target.value)} required>
                <option value="">Selecciona</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-span-2">
              Descripcion
              <textarea value={formData.description} onChange={(event) => onUpdateField("description", event.target.value)} rows="4" required />
            </label>
            <label className="form-span-2">
              Informacion adicional
              <textarea value={formData.additionalInfo} onChange={(event) => onUpdateField("additionalInfo", event.target.value)} rows="3" />
            </label>
            <div className="form-span-2 image-uploader-field">
              <ImageUploadField
                value={formData.featuredImageUrl}
                onChange={(url) => onUpdateField("featuredImageUrl", url)}
                auth={auth}
              />
            </div>
            <label>
              Video promocional
              <input
                value={formData.promoVideoUrl}
                onChange={(event) => onUpdateField("promoVideoUrl", event.target.value)}
                placeholder="https://drive.google.com/file/d/... o https://youtube.com/watch?v=..."
              />
              <span className="field-assist-message">Pega un enlace de Google Drive (público) o YouTube. Se mostrará como reproductor en la ficha del evento.</span>
            </label>
            <label>
              Venue
              <input value={formData.venue} onChange={(event) => onUpdateField("venue", event.target.value)} required />
            </label>
            <label>
              Direccion
              <input value={formData.addressLine} onChange={(event) => onUpdateField("addressLine", event.target.value)} required />
            </label>
            <label>
              Ciudad
              <input value={formData.city} onChange={(event) => onUpdateField("city", event.target.value)} required />
            </label>
            <label>
              Pais
              <input value={formData.country} onChange={(event) => onUpdateField("country", event.target.value)} required />
            </label>
            <label>
              Inicio
              <input 
                type="datetime-local" 
                value={formData.startsAt} 
                min={requiresMinDate ? getMinEventDate() : undefined} 
                onChange={(event) => onUpdateField("startsAt", event.target.value)} 
                required 
              />
              {requiresMinDate && (
                <span className="field-assist-message">
                  La fecha del evento debe programarse con un mínimo de 1 mes de anticipación.
                </span>
              )}
            </label>
            <label>
              Fin
              <input 
                type="datetime-local" 
                value={formData.endsAt} 
                min={requiresMinDate ? getMinEventDate() : undefined} 
                onChange={(event) => onUpdateField("endsAt", event.target.value)} 
                required 
              />
            </label>
            <label>
              Visibilidad
              <select value={formData.visibility} onChange={(event) => onUpdateField("visibility", event.target.value)}>
                <option value="public">Publico</option>
                <option value="private">Privado</option>
              </select>
            </label>
            <label>
              Restriccion de edad
              <select value={formData.ageRestriction} onChange={(event) => onUpdateField("ageRestriction", event.target.value)}>
                <option value="all_audiences">Todo publico</option>
                <option value="18_plus">18+</option>
                <option value="under_18_with_adult">Menores con acompanante</option>
              </select>
            </label>
            <label>
              Estado
              <select value={formData.status} onChange={(event) => onUpdateField("status", event.target.value)}>
                {EVENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-span-2 ticket-type-editor">
              <div className="panel-card-header">
                <h3>Tipos de ticket</h3>
                <button className="secondary-button" type="button" onClick={onAddTicketType}>
                  Agregar tipo
                </button>
              </div>
              <div className="ticket-type-editor-list">
                {formData.ticketTypes.map((ticketType, index) => (
                  <div className="ticket-type-editor-item" key={`${ticketType.name}-${index}`}>
                    <div className="form-grid compact-grid">
                      <label>
                        Nombre
                        <input value={ticketType.name} onChange={(event) => onUpdateTicketType(index, "name", event.target.value)} required />
                      </label>
                      <label>
                        Moneda
                        <select value={ticketType.currency} onChange={(event) => onUpdateTicketType(index, "currency", event.target.value)}>
                          <option value="PEN">PEN</option>
                          <option value="USD">USD</option>
                        </select>
                      </label>
                      <label>
                        Precio
                        <input type="number" min="0" value={ticketType.price} onChange={(event) => onUpdateTicketType(index, "price", event.target.value)} required />
                      </label>
                      <label>
                        Stock total
                        <input type="number" min="1" value={ticketType.stockTotal} onChange={(event) => onUpdateTicketType(index, "stockTotal", event.target.value)} required />
                      </label>
                      <label>
                        Stock disponible
                        <input type="number" min="0" value={ticketType.stockAvailable} onChange={(event) => onUpdateTicketType(index, "stockAvailable", event.target.value)} required />
                      </label>
                      <label>
                        Max por orden
                        <input type="number" min="1" value={ticketType.maxPerOrder} onChange={(event) => onUpdateTicketType(index, "maxPerOrder", event.target.value)} required />
                      </label>
                      <label>
                        Max por usuario
                        <input type="number" min="1" value={ticketType.maxPerUser} onChange={(event) => onUpdateTicketType(index, "maxPerUser", event.target.value)} />
                      </label>
                      <label>
                        Inicio de venta
                        <input type="datetime-local" value={ticketType.salesStartsAt} onChange={(event) => onUpdateTicketType(index, "salesStartsAt", event.target.value)} />
                      </label>
                      <label>
                        Fin de venta
                        <input type="datetime-local" value={ticketType.salesEndsAt} onChange={(event) => onUpdateTicketType(index, "salesEndsAt", event.target.value)} />
                      </label>
                      <label>
                        Modo de cierre
                        <select value={ticketType.salesEndMode} onChange={(event) => onUpdateTicketType(index, "salesEndMode", event.target.value)}>
                          <option value="until_event_start">Hasta el inicio</option>
                          <option value="until_event_end">Hasta el final</option>
                          <option value="one_hour_before">Una hora antes</option>
                          <option value="one_day_before">Un dia antes</option>
                          <option value="two_days_before">Dos dias antes</option>
                          <option value="custom">Personalizado</option>
                        </select>
                      </label>
                    </div>
                    {formData.ticketTypes.length > 1 ? (
                      <button className="ghost-button inline-action" type="button" onClick={() => onRemoveTicketType(index)}>
                        Quitar tipo
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="cta-row compact-actions admin-event-modal-actions">
              <button className="ghost-button" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : editingEventId ? "Actualizar evento" : "Crear evento"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function EventChangeRequestModal({
  attachments,
  eventTitle,
  explanation,
  isOpen,
  isSubmitting,
  mode,
  onAttachmentsChange,
  onClose,
  onExplanationChange,
  onRemoveAttachment,
  onSubmit,
  summary,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ticket-preview-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ticket-preview-dialog admin-event-modal">
        <section className="panel-card admin-event-modal-card">
          <div className="ticket-preview-header">
            <div>
              <p className="eyebrow">{mode === "cancellation" ? "Solicitud de cancelacion" : "Solicitud de cambios"}</p>
              <h3>{eventTitle || "Evento"}</h3>
              <p className="muted">
                {mode === "cancellation"
                  ? "Esta accion no elimina el evento directamente. Administracion revisara tu motivo y decidira si procede la cancelacion."
                  : "Los cambios sensibles del evento se enviaran a revision antes de aplicarse al evento publicado."}
              </p>
            </div>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className="change-request-layout">
            <section className="panel-card change-request-summary-card">
              <div className="panel-card-header">
                <div>
                  <h3>Resumen de cambios detectados</h3>
                  <p className="muted">Esto es lo que revisara el administrador antes de aprobar la solicitud.</p>
                </div>
              </div>

              {!summary.length ? (
                <div className="empty-state compact-state">
                  <h3>Sin cambios detallados</h3>
                  <p className="muted">La solicitud no reporta diferencias adicionales.</p>
                </div>
              ) : (
                <div className="change-request-diff-list">
                  {summary.map((item) => (
                    <article className="change-request-diff-item" key={`${item.field}-${item.label}`}>
                      <div className="change-request-diff-header">
                        <strong>{item.label}</strong>
                        {item.isSensitive ? <span className="status-pill pending_review">Sensible</span> : null}
                      </div>
                      <div className="change-request-diff-values">
                        <div>
                          <span>Antes</span>
                          <p>{formatChangeRequestValue(item.before)}</p>
                        </div>
                        <div>
                          <span>Despues</span>
                          <p>{formatChangeRequestValue(item.after)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="panel-card change-request-form-card">
              <div className="panel-card-header">
                <div>
                  <h3>Justificacion y evidencia</h3>
                  <p className="muted">Explica el motivo real y agrega archivos de respaldo si ayudan a la revision.</p>
                </div>
              </div>

              <label>
                Explicacion para administracion
                <textarea
                  value={explanation}
                  onChange={(event) => onExplanationChange(event.target.value)}
                  rows="5"
                  placeholder={
                    mode === "cancellation"
                      ? "Explica por que el evento debe cancelarse, el impacto esperado y si ya informaste a los asistentes."
                      : "Explica por que necesitas estos cambios, su impacto y cualquier contexto relevante para la revision."
                  }
                  required
                />
              </label>

              <label>
                Adjuntar evidencia
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                  multiple
                  onChange={(event) => onAttachmentsChange(event.target.files)}
                />
                <small className="muted">Hasta 3 archivos. Limite por archivo: 1.5 MB.</small>
              </label>

              {attachments.length ? (
                <div className="change-request-attachment-list">
                  {attachments.map((attachment) => (
                    <div className="change-request-attachment-item" key={attachment.name}>
                      <div>
                        <strong>{attachment.name}</strong>
                        <span>{formatFileSize(attachment.size)} · {attachment.mimeType}</span>
                      </div>
                      <button className="ghost-button inline-action" type="button" onClick={() => onRemoveAttachment(attachment.name)}>
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="cta-row compact-actions admin-event-modal-actions">
                <button className="ghost-button" type="button" onClick={onClose}>
                  Cancelar
                </button>
                <button className="primary-button" type="button" disabled={isSubmitting} onClick={onSubmit}>
                  {isSubmitting
                    ? "Enviando..."
                    : mode === "cancellation"
                      ? "Enviar solicitud de cancelacion"
                      : "Enviar solicitud de cambios"}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminRevenueOverview({ adminSalesSummary, revenueChartData, topRevenueValue }) {
  return (
    <section className="dashboard-two-column align-start admin-events-overview">
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Recaudacion por evento</h3>
            <p className="muted">Vista comparativa de monto total y comision de plataforma por evento.</p>
          </div>
        </div>
        <div className="revenue-chart-list">
          {revenueChartData.map((eventItem) => {
            const totalRevenue = Number(eventItem.revenue_total || 0);
            const platformRevenue = Number(eventItem.platform_revenue || 0);
            const totalWidth = `${Math.max((totalRevenue / topRevenueValue) * 100, totalRevenue > 0 ? 8 : 0)}%`;
            const platformWidth = `${Math.max((platformRevenue / topRevenueValue) * 100, platformRevenue > 0 ? 4 : 0)}%`;

            return (
              <article className="revenue-chart-item" key={`chart-${eventItem.id}`}>
                <div className="revenue-chart-copy">
                  <strong>{eventItem.title}</strong>
                  <span>{formatDate(eventItem.starts_at || eventItem.event_date)}</span>
                </div>
                <div className="revenue-chart-bars">
                  <div className="revenue-bar-group">
                    <span>Total</span>
                    <div className="chart-bar-track">
                      <div className="chart-bar total" style={{ width: totalWidth }} />
                    </div>
                    <strong>{formatCurrency(totalRevenue)}</strong>
                  </div>
                  <div className="revenue-bar-group">
                    <span>Plataforma</span>
                    <div className="chart-bar-track">
                      <div className="chart-bar platform" style={{ width: platformWidth }} />
                    </div>
                    <strong>{formatCurrency(platformRevenue)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="dashboard-stack">
        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Resumen economico</h3>
              <p className="muted">La comision actual de plataforma se calcula con el fee existente.</p>
            </div>
          </div>
          <div className="summary-stat-list">
            <div>
              <span>Recaudacion bruta</span>
              <strong>{formatCurrency(adminSalesSummary.totalRevenue)}</strong>
            </div>
            <div>
              <span>Comision plataforma</span>
              <strong>{formatCurrency(adminSalesSummary.platformRevenue)}</strong>
            </div>
            <div>
              <span>Ingreso neto organizadores</span>
              <strong>{formatCurrency(adminSalesSummary.organizerRevenue)}</strong>
            </div>
          </div>
        </section>
      </aside>
    </section>
  );
}

function AdminEventCatalogGrid({ events, deletingId, disablingId, onEdit, onDisable, onDelete }) {
  return (
    <div className="admin-event-catalog-grid">
      {events.map((eventItem) => {
        const ticketsSold = Number(eventItem.tickets_sold || 0);
        const totalTickets = Number(eventItem.total_tickets || 0);
        const availableTickets = Number(eventItem.available_tickets || 0);
        const isSoldOut = eventItem.is_sold_out || availableTickets <= 0;
        const sellThrough = totalTickets > 0 ? Math.min((ticketsSold / totalTickets) * 100, 100) : 0;

        return (
          <article className="admin-event-card" key={`admin-card-${eventItem.id}`}>
            <div className="admin-event-card-top">
              <div>
                <strong>{eventItem.title}</strong>
                <span>{eventItem.category_name || "Evento"} · {eventItem.city || "Peru"}</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <span className={`status-pill ${isSoldOut ? "cancelled" : eventItem.status}`}>{isSoldOut ? "Agotado" : getEventStatusLabel(eventItem.status)}</span>
                {isEventExpired(eventItem) && (
                  <span className="status-pill cancelled">Vencido</span>
                )}
              </div>
            </div>
            <div className="admin-event-card-metrics">
              <div>
                <span>Vendidas</span>
                <strong>{ticketsSold}</strong>
              </div>
              <div>
                <span>Disponibles</span>
                <strong>{availableTickets}</strong>
              </div>
              <div>
                <span>Recaudacion</span>
                <strong>{formatCurrency(eventItem.revenue_total || 0)}</strong>
              </div>
              <div>
                <span>Plataforma</span>
                <strong>{formatCurrency(eventItem.platform_revenue || 0)}</strong>
              </div>
            </div>
            <div className="admin-event-progress">
              <div className="chart-bar-track">
                <div className="chart-bar total" style={{ width: `${sellThrough}%` }} />
              </div>
              <span>{ticketsSold} de {totalTickets} entradas colocadas</span>
            </div>
            <div className="cta-row compact-actions">
              <button className="secondary-button" type="button" onClick={() => onEdit(eventItem)}>
                Editar
              </button>
              {["published", "active"].includes(eventItem.status) ? (
                <button className="ghost-button" type="button" disabled={disablingId === eventItem.id} onClick={() => onDisable(eventItem.id)}>
                  {disablingId === eventItem.id ? "Deshabilitando..." : "Deshabilitar"}
                </button>
              ) : null}
              <button className="ghost-button" type="button" disabled={deletingId === eventItem.id} onClick={() => onDelete(eventItem.id)}>
                {deletingId === eventItem.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [serverState, setServerState] = useState({ status: "idle", message: "" });
  const previousServerStatusRef = useRef("idle");

  const saveSession = useCallback((sessionToken, user) => {
    localStorage.setItem(TOKEN_KEY, sessionToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(sessionToken);
    setCurrentUser(user);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setCurrentUser(null);
  }, []);

  const checkServer = useCallback(async () => {
    try {
      await apiRequest("/health", { method: "GET" });
      setServerState({ status: "online", message: "" });
      return true;
    } catch {
      setServerState({
        status: "offline",
        message: "No pudimos verificar la disponibilidad en este momento.",
      });
      return false;
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const response = await apiRequest("/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    setCurrentUser(response.data);
    return response.data;
  }, [token]);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshCurrentUser().catch((error) => {
      if (error?.status === 401 || error?.status === 403) {
        clearSession();
      }
    });
  }, [token, refreshCurrentUser, clearSession]);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [clearSession]);

  useEffect(() => {
    const previousStatus = previousServerStatusRef.current;

    if (serverState.status === "offline" && previousStatus !== "offline") {
      console.warn("Server temporarily unavailable.");
    }

    if (serverState.status === "online" && previousStatus === "offline") {
      console.info("Server back online and running normally.");
    }

    previousServerStatusRef.current = serverState.status;
  }, [serverState.status]);

  useAutoRefresh(checkServer, SERVER_STATUS_INTERVAL, currentUser?.role === "admin");

  const authValue = useMemo(
    () => ({
      token,
      currentUser,
      saveSession,
      clearSession,
      checkServer,
      serverState,
      refreshCurrentUser,
    }),
    [token, currentUser, saveSession, clearSession, checkServer, serverState, refreshCurrentUser]
  );

  return (
    <Routes>
      <Route element={<PublicLayout auth={authValue} />}>
        <Route path="/" element={<HomePage auth={authValue} />} />
        <Route path="/events" element={<EventsPage auth={authValue} />} />
        <Route path="/events/:eventId" element={<EventDetailPage auth={authValue} />} />
        <Route path="/events/:eventId/reserve" element={<EventReservationFlowPage auth={authValue} />} />
        <Route path="/events/:eventId/reserve/:step" element={<EventReservationFlowPage auth={authValue} />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute token={token}>
              <NotificationsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route path="/server-error" element={<ServerErrorPage auth={authValue} />} />
        <Route path="/access-denied" element={<AccessDeniedPage auth={authValue} />} />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute token={token}>
              <RegisterPage auth={authValue} />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute token={token}>
              <LoginPage auth={authValue} />
            </PublicOnlyRoute>
          }
        />
        <Route path="/superadmin/login" element={<SuperAdminLoginPage auth={authValue} />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute token={token}>
            <RoleDashboardRedirect auth={authValue} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-space"
        element={
          <ProtectedRoute token={token}>
            <Navigate to={getRoleHomePath(currentUser?.role, currentUser)} replace />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute token={token}>
            <MemberLayout auth={authValue} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute token={token} allowedRoles={["customer"]} currentUser={currentUser}>
              <CustomerTicketsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/:reservationId"
          element={
            <ProtectedRoute token={token} allowedRoles={["customer"]} currentUser={currentUser}>
              <CustomerCheckoutPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute token={token} allowedRoles={["customer"]} currentUser={currentUser}>
              <CustomerProfilePage auth={authValue} />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute token={token} requireSuperAdmin currentUser={currentUser}>
            <BackofficeRouteShell
              auth={authValue}
              avatarImage={ADMIN_AVATAR_IMAGE}
              roleConfig={BACKOFFICE_ROLE_CONFIGS.superadmin}
              roleLabel="Super Admin"
            />
          </ProtectedRoute>
        }
      >
        <Route
          path="/superadmin/users"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} requireSuperAdmin currentUser={currentUser}>
              <SuperAdminUsersPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/events"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} requireSuperAdmin currentUser={currentUser}>
              <SuperAdminEventsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/events/catalog"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} requireSuperAdmin currentUser={currentUser}>
              <AdminEventCatalogPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/events/review"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} requireSuperAdmin currentUser={currentUser}>
              <AdminEventReviewPage auth={authValue} />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute token={token}>
            <BackofficeRouteShell
              auth={authValue}
              avatarImage={ADMIN_AVATAR_IMAGE}
              roleConfig={BACKOFFICE_ROLE_CONFIGS.staff}
              roleLabel={getRoleLabel("staff")}
            />
          </ProtectedRoute>
        }
      >
        <Route
          path="/staff/reservations"
          element={
            <ProtectedRoute token={token} allowedRoles={["staff", "admin"]} currentUser={currentUser}>
              <StaffReservationsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/refunds"
          element={
            <ProtectedRoute token={token} allowedRoles={["staff", "admin"]} currentUser={currentUser}>
              <StaffRefundsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/cancellations"
          element={
            <ProtectedRoute token={token} allowedRoles={["staff", "admin"]} currentUser={currentUser}>
              <StaffEventCancellationsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/cancellations/:eventId"
          element={
            <ProtectedRoute token={token} allowedRoles={["staff", "admin"]} currentUser={currentUser}>
              <StaffEventCancellationDetailPage auth={authValue} />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute token={token}>
            <BackofficeRouteShell
              auth={authValue}
              avatarImage={ADMIN_AVATAR_IMAGE}
              roleConfig={BACKOFFICE_ROLE_CONFIGS.organizer}
              roleLabel={getRoleLabel("organizer")}
            />
          </ProtectedRoute>
        }
      >
        <Route
          path="/organizer/events"
          element={
            <ProtectedRoute token={token} allowedRoles={["organizer"]} currentUser={currentUser}>
              <OrganizerEventsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute token={token}>
            <BackofficeRouteShell
              auth={authValue}
              avatarImage={ADMIN_AVATAR_IMAGE}
              roleConfig={BACKOFFICE_ROLE_CONFIGS.admin}
              roleLabel={getRoleLabel("admin")}
            />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} currentUser={currentUser}>
              <AdminEventsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/catalog"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} currentUser={currentUser}>
              <AdminEventCatalogPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} currentUser={currentUser}>
              <AdminUsersPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/review"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} currentUser={currentUser}>
              <AdminEventReviewPage auth={authValue} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute token={token} allowedRoles={["admin"]} currentUser={currentUser}>
              <AdminSettingsPage auth={authValue} />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage auth={authValue} />} />
    </Routes>
  );
}

function MarketplaceTopbar({ auth, showMemberLink = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isCustomerArea = auth.currentUser?.role === "customer";
  const memberLink = getRoleMemberLink(auth.currentUser?.role, auth.currentUser);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isDiscoverMenuOpen, setIsDiscoverMenuOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [activeFilterModal, setActiveFilterModal] = useState("");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [searchDraft, setSearchDraft] = useState(() => readCatalogFiltersFromSearch(location.search));
  const discoverMenuRef = useRef(null);
  const searchShellRef = useRef(null);
  const filterModalRef = useRef(null);

  useEffect(() => {
    setSearchDraft(readCatalogFiltersFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    apiRequest("/events/categories", { method: "GET" })
      .then((response) => {
        if (isMounted) {
          setCategories(response.data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategories([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!auth.token) {
      setUnreadNotifications(0);
      return;
    }

    try {
      const response = await apiRequest("/notifications/unread-count", {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setUnreadNotifications(Number(response.data?.unreadCount || 0));
    } catch {
      setUnreadNotifications(0);
    }
  }, [auth.token]);

  useEffect(() => {
    refreshUnreadNotifications();
  }, [refreshUnreadNotifications]);

  useAutoRefresh(refreshUnreadNotifications, RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  useEffect(() => {
    const handleNotificationsUpdated = () => {
      refreshUnreadNotifications();
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
    };
  }, [refreshUnreadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!discoverMenuRef.current?.contains(event.target)) {
        setIsDiscoverMenuOpen(false);
      }

      if (filterModalRef.current?.contains(event.target)) {
        return;
      }

      if (event.target.closest(".market-filter-backdrop")) {
        setActiveFilterModal("");
        return;
      }

      if (!searchShellRef.current?.contains(event.target)) {
        setIsSearchPanelOpen(false);
        setActiveFilterModal("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("market-search-open", isSearchPanelOpen);
    document.body.classList.toggle("market-filter-open", isSearchPanelOpen && Boolean(activeFilterModal));

    return () => {
      document.body.classList.remove("market-search-open");
      document.body.classList.remove("market-filter-open");
    };
  }, [activeFilterModal, isSearchPanelOpen]);

  const groupedCategories = useMemo(() => {
    const buckets = [[], [], [], []];
    categories.forEach((category, index) => {
      buckets[index % buckets.length].push(category);
    });
    return buckets.filter((bucket) => bucket.length);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = categorySearchValue.trim().toLowerCase();
    if (!query) {
      return categories;
    }

    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, categorySearchValue]);

  const selectedCategory = categories.find((category) => category.slug === searchDraft.category) || null;
  const searchPlaceholder = selectedCategory
    ? `${selectedCategory.name}${searchDraft.q ? ` · ${searchDraft.q}` : ""}`
    : searchDraft.q || "Buscar por eventos o artistas";
  const hasPriceFilter = searchDraft.freeOnly || Boolean(searchDraft.minPrice) || Boolean(searchDraft.maxPrice);
  const activeSearchFilters = useMemo(() => {
    const items = [];

    if (searchDraft.freeOnly) {
      items.push({
        id: "price",
        label: "Gratis",
        clear: () => setSearchDraft((prev) => ({ ...prev, freeOnly: false })),
      });
    } else if (searchDraft.minPrice || searchDraft.maxPrice) {
      items.push({
        id: "price",
        label: `S/${searchDraft.minPrice || 0} - S/${searchDraft.maxPrice || "..."}`,
        clear: () => setSearchDraft((prev) => ({ ...prev, minPrice: "", maxPrice: "" })),
      });
    }

    if (selectedCategory) {
      items.push({
        id: "category",
        label: selectedCategory.name,
        clear: () => setSearchDraft((prev) => ({ ...prev, category: "" })),
      });
    }

    if (searchDraft.city) {
      items.push({
        id: "city",
        label: searchDraft.city,
        clear: () => setSearchDraft((prev) => ({ ...prev, city: "" })),
      });
    }

    if (searchDraft.venue) {
      items.push({
        id: "venue",
        label: searchDraft.venue,
        clear: () => setSearchDraft((prev) => ({ ...prev, venue: "" })),
      });
    }

    return items;
  }, [searchDraft, selectedCategory]);

  const handleLogout = () => {
    auth.clearSession();
    navigate("/");
  };

  const applySearch = () => {
    navigate(`/events${buildCatalogNavigationQuery(searchDraft)}`);
    setIsSearchPanelOpen(false);
    setActiveFilterModal("");
  };

  const handleDiscoverCategoryClick = (slug) => {
    const nextFilters = { ...searchDraft, category: slug };
    setSearchDraft(nextFilters);
    navigate(`/events${buildCatalogNavigationQuery(nextFilters)}`);
    setIsDiscoverMenuOpen(false);
  };

  const renderFilterModal = () => {
    if (!activeFilterModal) {
      return null;
    }

    if (activeFilterModal === "price") {
      return (
        <div className="market-filter-modal" ref={filterModalRef}>
          <div className="market-filter-modal-header">
            <h3>Precio</h3>
            <button className="market-filter-close" type="button" onClick={() => setActiveFilterModal("")}>
              x
            </button>
          </div>
          <div className="market-filter-pill-row">
            <button
              className={`market-filter-pill ${!searchDraft.freeOnly ? "active" : ""}`}
              type="button"
              onClick={() => setSearchDraft((prev) => ({ ...prev, freeOnly: false }))}
            >
              Rango de precios
            </button>
            <button
              className={`market-filter-pill ${searchDraft.freeOnly ? "active" : ""}`}
              type="button"
              onClick={() => setSearchDraft((prev) => ({ ...prev, freeOnly: true, minPrice: "", maxPrice: "" }))}
            >
              Eventos gratuitos
            </button>
          </div>
          {!searchDraft.freeOnly ? (
            <div className="market-filter-range">
              <input
                min="0"
                placeholder="S/. 0.00"
                type="number"
                value={searchDraft.minPrice}
                onChange={(event) => setSearchDraft((prev) => ({ ...prev, minPrice: event.target.value }))}
              />
              <input
                min="0"
                placeholder="S/. 100.00"
                type="number"
                value={searchDraft.maxPrice}
                onChange={(event) => setSearchDraft((prev) => ({ ...prev, maxPrice: event.target.value }))}
              />
            </div>
          ) : null}
          <button className="secondary-button market-filter-save" type="button" onClick={() => setActiveFilterModal("")}>
            Guardar
          </button>
        </div>
      );
    }

    if (activeFilterModal === "categories") {
      return (
        <div className="market-filter-modal" ref={filterModalRef}>
          <div className="market-filter-modal-header">
            <h3>Categorias</h3>
            <button className="market-filter-close" type="button" onClick={() => setActiveFilterModal("")}>
              x
            </button>
          </div>
          <div className="market-filter-search">
            <span aria-hidden="true">⌕</span>
            <input
              placeholder="Buscar categoria"
              value={categorySearchValue}
              onChange={(event) => setCategorySearchValue(event.target.value)}
            />
          </div>
          <div className="market-filter-category-list">
            {filteredCategories.map((category) => (
              <button
                className={`market-filter-category-item ${searchDraft.category === category.slug ? "active" : ""}`}
                key={category.id}
                type="button"
                onClick={() => setSearchDraft((prev) => ({ ...prev, category: prev.category === category.slug ? "" : category.slug }))}
              >
                <span className="market-filter-checkbox" aria-hidden="true">
                  {searchDraft.category === category.slug ? "✓" : ""}
                </span>
                {category.name}
              </button>
            ))}
          </div>
          <button className="secondary-button market-filter-save" type="button" onClick={() => setActiveFilterModal("")}>
            Guardar
          </button>
        </div>
      );
    }

    if (activeFilterModal === "city") {
      return (
        <div className="market-filter-modal compact" ref={filterModalRef}>
          <div className="market-filter-modal-header">
            <h3>Ubicacion</h3>
            <button className="market-filter-close" type="button" onClick={() => setActiveFilterModal("")}>
              x
            </button>
          </div>
          <input
            placeholder="Ciudad"
            value={searchDraft.city}
            onChange={(event) => setSearchDraft((prev) => ({ ...prev, city: event.target.value }))}
          />
          <button className="secondary-button market-filter-save" type="button" onClick={() => setActiveFilterModal("")}>
            Guardar
          </button>
        </div>
      );
    }

    return (
      <div className="market-filter-modal compact" ref={filterModalRef}>
        <div className="market-filter-modal-header">
          <h3>Local</h3>
          <button className="market-filter-close" type="button" onClick={() => setActiveFilterModal("")}>
            x
          </button>
        </div>
        <input
          placeholder="Nombre del local o venue"
          value={searchDraft.venue}
          onChange={(event) => setSearchDraft((prev) => ({ ...prev, venue: event.target.value }))}
        />
        <button className="secondary-button market-filter-save" type="button" onClick={() => setActiveFilterModal("")}>
          Guardar
        </button>
      </div>
    );
  };

  return (
    <>
      <header className="public-topbar market-topbar">
        <div className="market-topbar-inner">
          <div className="market-brand-section" ref={discoverMenuRef}>
            <Link className="brand-mark" to="/">
              CrowdPass
            </Link>
            <button
              className={`market-discover-trigger ${isDiscoverMenuOpen || location.pathname.startsWith("/events") ? "active" : ""}`}
              type="button"
              onClick={() => {
                setIsDiscoverMenuOpen((current) => !current);
                setIsSearchPanelOpen(false);
              }}
            >
              Descubrir
              <span aria-hidden="true">{isDiscoverMenuOpen ? "⌃" : "⌄"}</span>
            </button>
            {showMemberLink ? (
              <Link
                className={location.pathname === memberLink.path ? "market-member-link active" : "market-member-link"}
                to={memberLink.path}
              >
                {memberLink.label}
              </Link>
            ) : null}

            {isDiscoverMenuOpen ? (
              <div className="market-discover-menu">
                <button className="market-discover-all" type="button" onClick={() => navigate("/events")}>
                  Ver todas las categorias
                </button>
                <div className="market-discover-grid">
                  {groupedCategories.map((bucket, columnIndex) => (
                    <div className="market-discover-column" key={`discover-column-${columnIndex}`}>
                      {bucket.map((category) => (
                        <button
                          className="market-discover-item"
                          key={category.id}
                          type="button"
                          onClick={() => handleDiscoverCategoryClick(category.slug)}
                        >
                          <span>{category.name}</span>
                          <span aria-hidden="true">›</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="market-search-shell" ref={searchShellRef}>
            <div className={`market-search-input-shell ${isSearchPanelOpen ? "active" : ""}`}>
              <span className="market-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="market-search-navbar-input"
                placeholder={searchPlaceholder}
                value={searchDraft.q}
                onFocus={() => {
                  setIsSearchPanelOpen(true);
                  setIsDiscoverMenuOpen(false);
                }}
                onChange={(event) => {
                  setSearchDraft((prev) => ({ ...prev, q: event.target.value }));
                  setIsSearchPanelOpen(true);
                  setIsDiscoverMenuOpen(false);
                }}
              />
              <button
                aria-label={searchDraft.q ? "Limpiar busqueda" : "Cerrar buscador"}
                className="market-search-clear"
                type="button"
                onClick={() => {
                  if (searchDraft.q) {
                    setSearchDraft((prev) => ({ ...prev, q: "" }));
                    return;
                  }

                  setIsSearchPanelOpen(false);
                  setActiveFilterModal("");
                }}
              >
                x
              </button>
            </div>

            {isSearchPanelOpen ? (
              <div className="market-search-dropdown">
                <div className="market-search-dropdown-inner">
                  <div className="market-search-panel">
                    <div className="market-filter-chip-row">
                      <button
                        className={`market-filter-chip ${activeFilterModal === "price" || hasPriceFilter ? "active" : ""}`}
                        type="button"
                        onClick={() => setActiveFilterModal("price")}
                      >
                        Precio
                      </button>
                      <button
                        className={`market-filter-chip ${activeFilterModal === "categories" || selectedCategory ? "active" : ""}`}
                        type="button"
                        onClick={() => setActiveFilterModal("categories")}
                      >
                        Categorias
                      </button>
                      <button
                        className={`market-filter-chip ${activeFilterModal === "city" || searchDraft.city ? "active" : ""}`}
                        type="button"
                        onClick={() => setActiveFilterModal("city")}
                      >
                        Ubicacion
                      </button>
                      <button
                        className={`market-filter-chip ${activeFilterModal === "venue" || searchDraft.venue ? "active" : ""}`}
                        type="button"
                        onClick={() => setActiveFilterModal("venue")}
                      >
                        Local
                      </button>
                    </div>
                    {activeSearchFilters.length ? (
                      <div className="market-search-selected-filters">
                        {activeSearchFilters.map((filterItem) => (
                          <button
                            className="market-search-selected-chip"
                            key={filterItem.id}
                            type="button"
                            onClick={filterItem.clear}
                          >
                            <span>{filterItem.label}</span>
                            <span aria-hidden="true">x</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="market-search-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setIsSearchPanelOpen(false);
                          setActiveFilterModal("");
                        }}
                      >
                        Cancelar
                      </button>
                      <button className="primary-button market-search-submit" type="button" onClick={applySearch}>
                        Buscar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="market-topbar-actions">
            {auth.token ? (
              <>
                <Link
                  className={`navbar-notifications-link ${location.pathname === "/notifications" ? "active" : ""}`}
                  to="/notifications"
                >
                  Notificaciones
                  {unreadNotifications > 0 ? <span className="navbar-notifications-count">{unreadNotifications}</span> : null}
                </Link>
                {isCustomerArea ? (
                  <Link
                    aria-label="Mi perfil"
                    className={`navbar-avatar-button ${location.pathname === "/my-profile" ? "active" : ""}`}
                    to="/my-profile"
                  >
                    <img src={CUSTOMER_AVATAR_IMAGE} alt="Mi perfil" />
                  </Link>
                ) : (
                  <Link className="subtle-link" to={getRoleHomePath(auth.currentUser?.role, auth.currentUser)}>
                    {getRoleMemberLink(auth.currentUser?.role, auth.currentUser).label}
                  </Link>
                )}
                <button className="ghost-button" type="button" onClick={handleLogout}>
                  Cerrar sesion
                </button>
              </>
            ) : (
              <>
                <Link className="subtle-link" to="/register">
                  Registrarse
                </Link>
                <Link className="ghost-button" to="/login">
                  Iniciar sesion
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {activeFilterModal ? <div className="market-filter-backdrop" /> : null}
      {renderFilterModal()}
    </>
  );
}

function PublicLayout({ auth }) {
  return (
    <>
      <MaintenanceRedirect auth={auth} />
      <div className="public-shell app-shell marketplace-shell">
        <MarketplaceTopbar auth={auth} />

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="public-footer">
          <p>© 2026 CrowdPass. Plataforma para descubrir, publicar y reservar experiencias.</p>
          <div className="public-footer-links">
            <Link to="/events">Descubrir</Link>
            <Link to="/terms">Terminos y condiciones</Link>
            <span>Soporte</span>
          </div>
        </footer>
      </div>
    </>
  );
}

function MemberLayout({ auth }) {
  return (
    <>
      <MaintenanceRedirect auth={auth} />
      <div className="public-shell app-shell marketplace-shell member-shell">
        <MarketplaceTopbar auth={auth} showMemberLink />

        <main className="page-content">
          <section className="dashboard-content">
            <Outlet />
          </section>
        </main>
      </div>
    </>
  );
}

function BackofficeRouteShell({ auth, roleConfig, roleLabel, avatarImage }) {
  return (
    <>
      <MaintenanceRedirect auth={auth} />
      <BackofficeLayout auth={auth} avatarImage={avatarImage} roleConfig={roleConfig} roleLabel={roleLabel} />
    </>
  );
}

function MaintenanceRedirect({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.serverState.status !== "offline" || location.pathname === "/server-error") {
      return;
    }

    navigate("/server-error", { replace: true, state: { from: location.pathname } });
  }, [auth.serverState.status, location.pathname, navigate]);

  return auth.serverState.status === "offline" ? null : null;
}

function HomePage({ auth }) {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reservationsFeedback, setReservationsFeedback] = useState("");
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [carouselAutoplayMs, setCarouselAutoplayMs] = useState(() => getHomeCarouselAutoplayMs());

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);
    const shouldLoadReservations = Boolean(auth.token) && ["customer", "client"].includes(auth.currentUser?.role);
    setIsLoadingReservations(shouldLoadReservations);

    try {
      const reservationsPromise = shouldLoadReservations
        ? apiRequest("/reservations", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          })
            .then((payload) => ({ ok: true, data: payload.data || [] }))
            .catch((error) => ({ ok: false, error }))
        : Promise.resolve({ ok: true, data: [] });

      const [eventsResponse, categoriesResponse, reservationsResult] = await Promise.all([
        apiRequest("/events?limit=24", { method: "GET" }),
        apiRequest("/events/categories", { method: "GET" }).catch(() => ({ data: [] })),
        reservationsPromise,
      ]);

      setEvents(eventsResponse.data || []);
      setCategories(categoriesResponse.data || []);
      setFeedback("");

      if (reservationsResult.ok) {
        setReservations(Array.isArray(reservationsResult.data) ? reservationsResult.data : []);
        setReservationsFeedback("");
      } else if (reservationsResult.error) {
        if (isServiceUnavailableError(reservationsResult.error)) {
          setReservationsFeedback("");
          await auth.checkServer();
        } else {
          setReservationsFeedback(
            getUserFacingErrorMessage(reservationsResult.error, "No pudimos cargar tus entradas en este momento.")
          );
        }
      }
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar la portada en este momento."));
    } finally {
      setIsLoading(false);
      setIsLoadingReservations(false);
    }
  }, [auth]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((left, right) => {
        const leftDate = left.starts_at ? new Date(left.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDate = right.starts_at ? new Date(right.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 6);
  }, [events]);
  const discoverEvents = useMemo(() => {
    return [...events]
      .sort((left, right) => {
        const leftDate = left.starts_at ? new Date(left.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDate = right.starts_at ? new Date(right.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 6);
  }, [events]);
  const categoryEventCounts = useMemo(() => {
    return events.reduce((accumulator, eventItem) => {
      const categoryKey = eventItem.category_slug || slugifyText(eventItem.category_name || "");

      if (!categoryKey) {
        return accumulator;
      }

      accumulator[categoryKey] = (accumulator[categoryKey] || 0) + 1;
      return accumulator;
    }, {});
  }, [events]);
  const interestCategories = useMemo(() => {
    const fallbackCategories = Array.from(
      new Map(
        events
          .filter((eventItem) => eventItem.category_name)
          .map((eventItem) => [
            eventItem.category_slug || slugifyText(eventItem.category_name),
            {
              slug: eventItem.category_slug || slugifyText(eventItem.category_name),
              name: eventItem.category_name,
            },
          ]),
      ).values(),
    );
    const sourceCategories = categories.length ? categories : fallbackCategories;

    return sourceCategories.slice(0, 8).map((category) => {
      const fallbackSlug = slugifyText(category.name || category.slug || "");
      const categorySlug = category.slug || fallbackSlug;
      const visual = getHomeInterestVisual(category.name || categorySlug);

      return {
        ...category,
        slug: categorySlug,
        icon: visual.icon,
        accent: visual.accent,
        surface: visual.surface,
        totalEvents: categoryEventCounts[categorySlug] || 0,
      };
    });
  }, [categories, categoryEventCounts, events]);
  const featuredEvent = upcomingEvents[activeSlideIndex] || null;
  const sidebarSpotlightEvents = useMemo(() => upcomingEvents.slice(1, 4), [upcomingEvents]);
  const sidebarInterestPreview = useMemo(() => interestCategories.slice(0, 4), [interestCategories]);
  const shouldShowTickets = Boolean(auth.token) && ["customer", "client"].includes(auth.currentUser?.role);
  const orderedReservations = useMemo(() => {
    return [...reservations].sort((left, right) => {
      const leftDate = left.event_starts_at ? new Date(left.event_starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.event_starts_at ? new Date(right.event_starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    });
  }, [reservations]);
  const confirmedReservations = useMemo(
    () => orderedReservations.filter((reservation) => reservation.status === "confirmed"),
    [orderedReservations]
  );
  const historyReservations = useMemo(
    () => orderedReservations.filter((reservation) => reservation.status !== "confirmed"),
    [orderedReservations]
  );

  useEffect(() => {
    if (!upcomingEvents.length) {
      setActiveSlideIndex(0);
      return;
    }

    setActiveSlideIndex((currentIndex) => (currentIndex >= upcomingEvents.length ? 0 : currentIndex));
  }, [upcomingEvents]);

  useEffect(() => {
    const syncCarouselAutoplay = () => {
      setCarouselAutoplayMs(getHomeCarouselAutoplayMs());
    };

    syncCarouselAutoplay();
    window.addEventListener("resize", syncCarouselAutoplay);

    return () => window.removeEventListener("resize", syncCarouselAutoplay);
  }, []);

  useEffect(() => {
    if (isCarouselPaused || upcomingEvents.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % upcomingEvents.length);
    }, carouselAutoplayMs);

    return () => window.clearInterval(intervalId);
  }, [carouselAutoplayMs, isCarouselPaused, upcomingEvents.length]);

  const goToPreviousSlide = () => {
    setActiveSlideIndex((currentIndex) => {
      if (!upcomingEvents.length) {
        return 0;
      }

      return currentIndex === 0 ? upcomingEvents.length - 1 : currentIndex - 1;
    });
  };

  const goToNextSlide = () => {
    setActiveSlideIndex((currentIndex) => {
      if (!upcomingEvents.length) {
        return 0;
      }

      return currentIndex === upcomingEvents.length - 1 ? 0 : currentIndex + 1;
    });
  };

  return (
    <section className="page-section home-page">
      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <div className="home-page-layout">
        <div className="home-main-column">
          <section className="page-section home-hero-section">
            {isLoading ? <p className="muted">Cargando portada del catalogo...</p> : null}

            {!isLoading && upcomingEvents.length === 0 ? (
              <div className="empty-state card compact-state">
                <h3>No hay eventos publicados todavia</h3>
                <p className="muted">Cuando existan eventos en estado publicado, apareceran aqui en el inicio.</p>
              </div>
            ) : null}

            {featuredEvent ? (
              <div
                className="home-carousel-shell"
                onMouseEnter={() => setIsCarouselPaused(true)}
                onMouseLeave={() => setIsCarouselPaused(false)}
                style={{ "--home-carousel-duration": `${carouselAutoplayMs}ms` }}
              >
                <article className="home-carousel-card card">
                  <div className="home-carousel-media">
                    <div className="home-carousel-slides">
                      {upcomingEvents.map((eventItem, index) => (
                        <div
                          className={`home-carousel-slide ${index === activeSlideIndex ? "active" : ""}`}
                          key={eventItem.id}
                          style={{
                            transform: `translate3d(${(index - activeSlideIndex) * 100}%, 0, 0)`,
                            zIndex: index === activeSlideIndex ? 2 : 1,
                          }}
                        >
                          <Link
                            aria-label={`Ver evento ${eventItem.title}`}
                            className="home-carousel-slide-link"
                            to={`/events/${eventItem.id}`}
                          >
                            <img
                              className={`home-carousel-image ${index === activeSlideIndex ? "active" : ""}`}
                              src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                              alt={eventItem.title}
                            />
                            <div className="home-carousel-copy">
                              <p className="eyebrow">Proximos eventos</p>
                              <span className="event-tile-category">{eventItem.category_name || "Evento"}</span>
                              <h3>{eventItem.title}</h3>
                              <div className="home-carousel-meta">
                                <span>{formatCompactDate(eventItem.starts_at)}</span>
                                <span>{eventItem.city || "Peru"}</span>
                                <span>{eventItem.venue || "Venue por confirmar"}</span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                    <button
                      aria-label="Evento anterior"
                      className="home-carousel-control previous"
                      type="button"
                      onClick={goToPreviousSlide}
                    >
                      <span className="home-carousel-control-icon" aria-hidden="true">
                        {"<"}
                      </span>
                    </button>
                    <button
                      aria-label="Evento siguiente"
                      className="home-carousel-control next"
                      type="button"
                      onClick={goToNextSlide}
                    >
                      <span className="home-carousel-control-icon" aria-hidden="true">
                        {">"}
                      </span>
                    </button>
                  </div>
                </article>

                <div className="home-carousel-track">
                  {upcomingEvents.map((eventItem, index) => (
                    <button
                      className={`home-carousel-thumb ${index === activeSlideIndex ? "active" : ""}`}
                      key={eventItem.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(index)}
                    >
                      <img
                        src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                        alt={eventItem.title}
                      />
                      <div>
                        <span>{formatCompactDate(eventItem.starts_at)}</span>
                        <strong>{eventItem.title}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="page-section home-discovery-section">
            <div className="card home-discovery-main">
              <div className="home-discovery-header">
                <div>
                  <p className="eyebrow">Descubrir</p>
                  <h2>Descubre tus intereses</h2>
                  <p className="muted">
                    Explora categorias reales del catalogo y entra rapido a eventos alineados con lo que quieres ver.
                  </p>
                </div>
              </div>

              {interestCategories.length ? (
                <div className="home-interest-grid">
                  {interestCategories.map((category) => (
                    <Link
                      className="home-interest-card"
                      key={category.slug || category.name}
                      to={`/events${buildCatalogNavigationQuery({ category: category.slug })}`}
                      style={{
                        "--home-interest-accent": category.accent,
                        "--home-interest-surface": category.surface,
                      }}
                    >
                      <span className="home-interest-icon" aria-hidden="true">
                        <span className="material-symbols-outlined">{category.icon}</span>
                      </span>
                      <div className="home-interest-copy">
                        <strong>{category.name}</strong>
                        <span>
                          {category.totalEvents
                            ? `${category.totalEvents} evento${category.totalEvents === 1 ? "" : "s"} disponibles`
                            : "Explora esta categoria"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Las categorias apareceran aqui cuando tengamos eventos publicados en el catalogo.</p>
              )}

              <div className="home-discovery-divider" />

              <div className="home-discovery-events-head">
                <div>
                  <p className="eyebrow">Seleccion rapida</p>
                  <h3>Eventos que van contigo</h3>
                  <p className="muted">
                    Esta grilla queda fija a 3 cards por ancho en desktop para que la seccion debajo del carrusel se vea mas ordenada.
                  </p>
                </div>
              </div>

              <div className="event-tile-grid home-featured-grid">
                {discoverEvents.map((eventItem, index) => (
                  <Link className="event-tile-card home-event-card" key={eventItem.id} to={`/events/${eventItem.id}`}>
                    <div className="event-tile-media">
                      <img
                        src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                        alt={eventItem.title}
                      />
                    </div>
                    <div className="event-tile-copy">
                      <span className="event-tile-category">{eventItem.category_name || "Evento"}</span>
                      <h3>{eventItem.title}</h3>
                      <p>{formatCompactDate(eventItem.starts_at || eventItem.event_date)}</p>
                      <strong>{eventItem.city || "Peru"}</strong>
                      <small>{eventItem.venue}</small>
                      <span className="event-tile-price">Desde {formatCurrency(eventItem.price)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="home-sidebar-column">
          <div className="home-sidebar-stack">
            {shouldShowTickets ? (
              <div className="card home-sidebar-card">
                <span className="home-sidebar-kicker">Mis entradas</span>
                <h3>Tus entradas</h3>
                {isLoadingReservations ? <p className="muted">Cargando tus entradas...</p> : null}
                {reservationsFeedback ? <p className="muted">{reservationsFeedback}</p> : null}

                {!isLoadingReservations && !reservationsFeedback && reservations.length === 0 ? (
                  <div className="empty-state compact-state">
                    <h3>Aun no tienes entradas</h3>
                    <p className="muted">Cuando confirmes una compra, aqui veras tus entradas confirmadas y el historial.</p>
                  </div>
                ) : null}

                {!isLoadingReservations && reservations.length > 0 ? (
                  <>
                    <div className="home-discovery-divider" />

                    <div>
                      <strong>Mis entradas confirmadas</strong>
                      <p className="muted">Solo entradas confirmadas ({confirmedReservations.length}).</p>
                      {confirmedReservations.length ? (
                        <div className="activity-list">
                          {confirmedReservations.slice(0, 3).map((reservation) => (
                            <article className="activity-item" key={`home-confirmed-${reservation.id}`}>
                              <span className="activity-badge" aria-hidden="true">
                                <span className="material-symbols-outlined">confirmation_number</span>
                              </span>
                              <div>
                                <strong>{reservation.event_title || `Evento #${reservation.event_id}`}</strong>
                                <span>{formatCompactDate(reservation.event_starts_at)}</span>
                                <small>{reservation.reservation_code || `RES-${reservation.id}`}</small>
                              </div>
                              <span className={`status-pill ${reservation.status}`} style={{ marginLeft: "auto" }}>
                                {getReservationStatusLabel(reservation)}
                              </span>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">No tienes entradas confirmadas por ahora.</p>
                      )}
                    </div>

                    <div className="home-discovery-divider" />

                    <div>
                      <strong>Historial de entradas</strong>
                      <p className="muted">Pendientes, canceladas, expiradas o reembolsadas ({historyReservations.length}).</p>
                      {historyReservations.length ? (
                        <div className="activity-list">
                          {historyReservations.slice(0, 3).map((reservation) => (
                            <article className="activity-item" key={`home-history-${reservation.id}`}>
                              <span className="activity-badge" aria-hidden="true">
                                <span className="material-symbols-outlined">history</span>
                              </span>
                              <div>
                                <strong>{reservation.event_title || `Evento #${reservation.event_id}`}</strong>
                                <span>{formatCompactDate(reservation.event_starts_at)}</span>
                                <small>{reservation.reservation_code || `RES-${reservation.id}`}</small>
                              </div>
                              <span className={`status-pill ${reservation.status}`} style={{ marginLeft: "auto" }}>
                                {getReservationStatusLabel(reservation)}
                              </span>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">No tienes historial aun.</p>
                      )}
                    </div>

                    <Link className="ghost-button full-width-button" to="/my-tickets">
                      Ver todas mis entradas
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="card home-sidebar-card home-sidebar-media-card">
              <span className="home-side-mock-badge">Mock lateral</span>
              <div className="home-sidebar-card-copy">
                <h3>Promociones y vitrinas del lateral</h3>
                <p className="muted">Esta columna ahora nace al lado del carrusel y acompana todo el home como un sidebar continuo.</p>
              </div>

              <div className="home-sidebar-media-list">
                {sidebarSpotlightEvents.map((eventItem, index) => (
                  <Link className="home-sidebar-media-item" key={eventItem.id} to={`/events/${eventItem.id}`}>
                    <img
                      src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[(index + 1) % EVENT_FALLBACK_IMAGES.length]}
                      alt={eventItem.title}
                    />
                    <div className="home-sidebar-media-overlay">
                      <strong>{eventItem.title}</strong>
                      <span>{eventItem.category_name || "Evento"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card home-sidebar-card home-sidebar-cta-card">
              <span className="home-sidebar-kicker">Organizadores</span>
              <h3>Te ayudamos a crear y vender tu evento</h3>
              <p className="muted">Sidebar mock listo para banners comerciales, captacion de organizadores y bloques promocionales persistentes.</p>
              <a
                className="primary-button full-width-button"
                href={buildWhatsAppUrl(WHATSAPP_SUPPORT_PHONE, WHATSAPP_SUPPORT_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contactanos
              </a>
            </div>

            <div className="card home-sidebar-card home-sidebar-interest-card">
              <span className="home-sidebar-kicker">Tendencias</span>
              <h3>Categorias en foco</h3>
              <div className="home-sidebar-interest-list">
                {sidebarInterestPreview.map((category) => (
                  <Link
                    className="home-sidebar-interest-chip"
                    key={category.slug || category.name}
                    to={`/events${buildCatalogNavigationQuery({ category: category.slug })}`}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {category.icon}
                    </span>
                    <strong>{category.name}</strong>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RegisterPage({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo;
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "Peru",
    city: "",
    documentNumber: "",
    gender: "unspecified",
    phone: "+51",
    acceptsTerms: false,
    acceptsMarketing: false,
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [availabilityFeedback, setAvailabilityFeedback] = useState({
    email: { tone: "", message: "" },
    documentNumber: { tone: "", message: "" },
    phone: { tone: "", message: "" },
  });
  const availabilityRequestSequence = useRef({
    email: 0,
    documentNumber: 0,
    phone: 0,
  });
  const passwordRuleStates = useMemo(() => getPasswordRuleStates(formData.password), [formData.password]);
  const passwordStrength = useMemo(() => getPasswordStrengthMeta(formData.password), [formData.password]);
  const hasPassword = formData.password.trim().length > 0;
  const hasConfirmPassword = formData.confirmPassword.trim().length > 0;
  const passwordsMatch = formData.password === formData.confirmPassword;
  const shouldShowPasswordAssistant = (isPasswordFocused || hasPassword) && !(hasConfirmPassword && passwordsMatch);
  const shouldShowConfirmPasswordHint = isConfirmPasswordFocused || hasConfirmPassword;
  const isRegisterFormComplete = useMemo(() => {
    const requiredTextFields = [
      formData.fullName,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.country,
      formData.city,
      formData.documentNumber,
      formData.phone,
    ];

    const hasAllRequiredTextFields = requiredTextFields.every((value) => String(value || "").trim().length > 0);
    const hasValidGender = Boolean(formData.gender);
    const hasValidPassword = passwordRuleStates.every((rule) => rule.isMet);

    return (
      hasAllRequiredTextFields &&
      hasValidGender &&
      hasValidPassword &&
      passwordsMatch &&
      formData.acceptsTerms &&
      formData.acceptsMarketing
    );
  }, [formData, passwordRuleStates, passwordsMatch]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "email" || name === "documentNumber" || name === "phone") {
      availabilityRequestSequence.current[name] += 1;
      setAvailabilityFeedback((prev) => ({
        ...prev,
        [name]: { tone: "", message: "" },
      }));
    }
  };

  const handlePhoneChange = (value, country) => {
    if (!value) {
      setFormData((prev) => ({
        ...prev,
        phone: "",
      }));
      availabilityRequestSequence.current.phone += 1;
      setAvailabilityFeedback((prev) => ({
        ...prev,
        phone: { tone: "", message: "" },
      }));
      return;
    }

    // Calcular el límite dinámico de dígitos del país seleccionado
    // dialCode.length + número de puntos (.) en el formato
    let maxDigits = 15; // fallback
    if (country && country.format) {
      const dotsCount = (country.format.match(/\./g) || []).length;
      const dialCodeLength = country.dialCode ? country.dialCode.length : 0;
      maxDigits = dialCodeLength + dotsCount;
    }

    // Si los dígitos ingresados superan el límite del país, ignoramos
    if (value.length > maxDigits) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      phone: "+" + value,
    }));

    availabilityRequestSequence.current.phone += 1;
    setAvailabilityFeedback((prev) => ({
      ...prev,
      phone: { tone: "", message: "" },
    }));
  };

  const handleAvailabilityBlur = async (fieldName) => {
    const rawValue = formData[fieldName];
    const value = String(rawValue || "").trim();

    if (!value) {
      setAvailabilityFeedback((prev) => ({
        ...prev,
        [fieldName]: { tone: "", message: "" },
      }));
      return;
    }

    if (fieldName === "email" && !value.includes("@")) {
      setAvailabilityFeedback((prev) => ({
        ...prev,
        email: { tone: "error", message: "Ingresa un correo valido para poder verificarlo." },
      }));
      return;
    }

    if (fieldName === "documentNumber" && !REGISTER_DOCUMENT_REGEX.test(value)) {
      setAvailabilityFeedback((prev) => ({
        ...prev,
        documentNumber: { tone: "error", message: "El documento debe tener entre 8 y 20 caracteres alfanumericos." },
      }));
      return;
    }

    if (fieldName === "phone" && !isValidPhoneNumber(value)) {
      setAvailabilityFeedback((prev) => ({
        ...prev,
        phone: { tone: "error", message: "El número de teléfono no es válido para el país seleccionado." },
      }));
      return;
    }

    const nextRequestId = availabilityRequestSequence.current[fieldName] + 1;
    availabilityRequestSequence.current[fieldName] = nextRequestId;

    setAvailabilityFeedback((prev) => ({
      ...prev,
      [fieldName]: { tone: "checking", message: "Validando disponibilidad..." },
    }));

    try {
      const response = await apiRequest("/auth/check-availability", {
        method: "POST",
        body: JSON.stringify({ [fieldName]: value }),
      });

      if (availabilityRequestSequence.current[fieldName] !== nextRequestId) {
        return;
      }

      const fieldResult = response?.data?.[fieldName];
      setAvailabilityFeedback((prev) => ({
        ...prev,
        [fieldName]: fieldResult?.available
          ? { tone: "success", message: "Disponible." }
          : { tone: "error", message: fieldResult?.message || "Ya existe un usuario con este dato." },
      }));
    } catch (error) {
      if (availabilityRequestSequence.current[fieldName] !== nextRequestId) {
        return;
      }

      setAvailabilityFeedback((prev) => ({
        ...prev,
        [fieldName]: { tone: "error", message: getUserFacingErrorMessage(error, "No pudimos validar este dato.") },
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedFullName = formData.fullName.trim();

    if (!isValidFullName(trimmedFullName)) {
      setFeedback({ type: "error", message: "El nombre completo solo puede contener letras y espacios." });
      return;
    }

    if (passwordRuleStates.some((rule) => !rule.isMet)) {
      setFeedback({
        type: "error",
        message: "La contrasena debe incluir al menos 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo.",
      });
      return;
    }

    if (!passwordsMatch) {
      setFeedback({ type: "error", message: "Las contrasenas no coinciden." });
      return;
    }

    if (!formData.acceptsTerms) {
      setFeedback({ type: "error", message: "Debes aceptar los terminos y condiciones." });
      return;
    }

    if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
      setFeedback({ type: "error", message: "El número de teléfono no es válido para el país seleccionado." });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          confirmPassword: undefined,
          fullName: trimmedFullName,
          country: formData.country.trim(),
          city: formData.city.trim(),
          documentNumber: formData.documentNumber.trim(),
          phone: formData.phone.trim(),
        }),
      });

      auth.saveSession(response.data.token, response.data.user);
      await auth.checkServer();
      const safeReturnTo = resolveSafeReturnTo(returnTo, response.data.user);
      navigate(safeReturnTo || getRoleHomePath(response.data.user?.role, response.data.user), { replace: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos crear tu cuenta en este momento.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard
      title="Crea tu cuenta"
      description="Completa tu perfil base para reservar eventos y solicitar el rol de organizador."
      feedback={feedback}
    >
      <form className="form-grid form-grid-expanded" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input name="fullName" value={formData.fullName} onChange={handleChange} required />
        </label>
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleAvailabilityBlur("email")}
            autoComplete="email"
            required
          />
          {availabilityFeedback.email.message ? (
            <span className={`field-assist-message ${availabilityFeedback.email.tone}`}>{availabilityFeedback.email.message}</span>
          ) : null}
        </label>
        <label>
          Contrasena
          <div className="password-field">
            <input
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              aria-describedby="password-help"
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((current) => !current)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isPasswordVisible ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          <div className={`password-assistant-dropdown ${shouldShowPasswordAssistant ? "visible" : ""}`} id="password-help">
            <div className="password-assistant-dropdown-content">
              <span className="password-help-text">Usa 8+ caracteres, mayuscula, minuscula, numero y simbolo.</span>
              <div className="password-strength-inline">
                <span className="password-strength-label">Seguridad</span>
                <span className={`password-strength-status ${passwordStrength.tone}`}>{passwordStrength.label}</span>
              </div>
              <div className="password-strength compact" aria-live="polite">
                <div className={`password-strength-bar ${passwordStrength.tone}`} style={{ width: `${passwordStrength.progress}%` }} />
              </div>
            </div>
          </div>
        </label>
        <label>
          Confirmar contrasena
          <div className="password-field">
            <input
              name="confirmPassword"
              type={isPasswordVisible ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              aria-describedby="confirm-password-status"
              onFocus={() => setIsConfirmPasswordFocused(true)}
              onBlur={() => setIsConfirmPasswordFocused(false)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((current) => !current)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isPasswordVisible ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {shouldShowConfirmPasswordHint ? (
            <span
              className={`confirm-password-message ${hasConfirmPassword ? (passwordsMatch ? "match" : "mismatch") : ""}`}
              id="confirm-password-status"
            >
              {!hasConfirmPassword
                ? "Vuelve a escribir tu contrasena para confirmar que no hay errores."
                : passwordsMatch
                  ? "Las contrasenas coinciden."
                  : "Las contrasenas no coinciden."}
            </span>
          ) : null}
        </label>
        <label>
          Pais
          <input name="country" value={formData.country} onChange={handleChange} required />
        </label>
        <label>
          Ciudad
          <input name="city" value={formData.city} onChange={handleChange} required />
        </label>
        <label>
          Tipo de Documento
          <select 
            name="documentType" 
            value={formData.documentType || "dni"} 
            onChange={(e) => {
              handleChange(e);
              setFormData(prev => ({ ...prev, documentNumber: "" }));
            }}
          >
            <option value="dni">DNI (Perú)</option>
            <option value="other">Carnet de Extranjería / Pasaporte</option>
          </select>
        </label>
        <label>
          Número de Documento
          <input
            name="documentNumber"
            value={formData.documentNumber}
            onChange={(e) => {
              const activeType = formData.documentType || "dni";
              let rawVal = e.target.value;
              if (activeType === "dni") {
                rawVal = rawVal.replace(/\D/g, "").slice(0, 8);
              } else {
                rawVal = rawVal.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
              }
              e.target.value = rawVal;
              handleChange(e);
            }}
            onBlur={() => handleAvailabilityBlur("documentNumber")}
            required
            placeholder={formData.documentType === "other" ? "Ej: 1234567890AB" : "8 dígitos numéricos"}
          />
          {availabilityFeedback.documentNumber.message ? (
            <span className={`field-assist-message ${availabilityFeedback.documentNumber.tone}`}>
              {availabilityFeedback.documentNumber.message}
            </span>
          ) : null}
        </label>
        <label>
          Genero
          <select name="gender" value={formData.gender} onChange={handleChange}>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Telefono con prefijo
          <PhoneInput
            country="pe"
            value={formData.phone}
            onChange={handlePhoneChange}
            onBlur={() => handleAvailabilityBlur("phone")}
            inputProps={{
              name: "phone",
              required: true,
            }}
            placeholder="912 345 678"
            specialLabel=""
          />
          {availabilityFeedback.phone.message ? (
            <span className={`field-assist-message ${availabilityFeedback.phone.tone}`}>{availabilityFeedback.phone.message}</span>
          ) : null}
        </label>
        <label className="checkbox-field form-span-2">
          <input name="acceptsTerms" type="checkbox" checked={formData.acceptsTerms} onChange={handleChange} />
          <span>
            Acepto los <Link className="inline-link" to="/terms">terminos y condiciones</Link> de CrowdPass.
          </span>
        </label>
        <label className="checkbox-field form-span-2">
          <input name="acceptsMarketing" type="checkbox" checked={formData.acceptsMarketing} onChange={handleChange} />
          <span>Deseo recibir novedades comerciales y promociones.</span>
        </label>
        <button className="primary-button" type="submit" disabled={isSubmitting || !isRegisterFormComplete}>
          {isSubmitting ? "Registrando..." : "Registrarme"}
        </button>
      </form>
    </FormCard>
  );
}

function LoginPage({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo;
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    const routeMessage = typeof location.state?.authMessage === "string" ? location.state.authMessage : "";
    const transientNotice = consumeTransientAuthNotice();
    const message = transientNotice || routeMessage;

    if (message) {
      setFeedback({ type: "error", message });
    }
  }, [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      auth.saveSession(response.data.token, response.data.user);
      await auth.checkServer();
      const safeReturnTo = resolveSafeReturnTo(returnTo, response.data.user);
      navigate(safeReturnTo || getRoleHomePath(response.data.user?.role, response.data.user), { replace: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos iniciar sesion en este momento.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard title="Inicia sesion" description="Accede con tu correo y contrasena." feedback={feedback}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={formData.email}
            autoComplete="email"
            onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label>
          Contrasena
          <div className="password-field">
            <input
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              value={formData.password}
              autoComplete="current-password"
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((current) => !current)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isPasswordVisible ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </label>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </FormCard>
  );
}

function SuperAdminLoginPage({ auth }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    if (auth.token && auth.currentUser?.is_super_admin) {
      navigate("/superadmin/users", { replace: true });
    }
  }, [auth.currentUser, auth.token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/auth/superadmin-login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      auth.saveSession(response.data.token, response.data.user);
      await auth.checkServer();
      navigate("/superadmin/users", { replace: true });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getUserFacingErrorMessage(error, "No pudimos iniciar sesion en este momento."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="root-admin-shell">
      <div className="root-admin-grid" />
      <section className="root-admin-card" aria-label="SuperAdmin Login">
        <header className="root-admin-header">
          <div className="root-admin-title-row">
            <span className="root-admin-badge" aria-hidden="true">
              ⟁
            </span>
            <div>
              <h1>ROOT_ADMIN</h1>
              <p>SYSTEM_ACCESS_PROTOCOL_v4.0</p>
            </div>
          </div>
        </header>

        {feedback?.message ? <InlineMessage type="error" message={feedback.message} /> : null}

        <form className="root-admin-form" onSubmit={handleSubmit}>
          <label className="root-admin-field">
            <span>ADMIN_ID</span>
            <div className="root-admin-input-row">
              <input
                name="email"
                type="email"
                value={formData.email}
                autoComplete="email"
                placeholder="IDENTIFIER_STRING"
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <span className="material-symbols-outlined" aria-hidden="true">
                badge
              </span>
            </div>
          </label>

          <label className="root-admin-field">
            <span>ACCESS_KEY</span>
            <div className="root-admin-input-row">
              <input
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                value={formData.password}
                autoComplete="current-password"
                placeholder="••••••••••••"
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <button
                className="root-admin-eye"
                type="button"
                aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((current) => !current)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isPasswordVisible ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </label>

          <button className="root-admin-submit" type="submit" disabled={isSubmitting}>
            <span className="material-symbols-outlined" aria-hidden="true">
              login
            </span>
            <span>{isSubmitting ? "ACCESS_PENDING" : "ACCESS_GRANTED"}</span>
          </button>

          <div className="root-admin-footer">
            <Link className="root-admin-recover" to="/login">
              RECOVER_KEY
            </Link>
            <span className="root-admin-dots" aria-hidden="true">
              •••
            </span>
          </div>
        </form>

        <footer className="root-admin-meta">
          <span>SYSTEM_ENCRYPTION_ACTIVE</span>
          <span>|</span>
          <span>AES-256_RSA</span>
        </footer>
      </section>
    </div>
  );
}

function SuperAdminUsersPage({ auth }) {
  return <AdminUsersPage auth={auth} />;
}

function SuperAdminEventsPage({ auth }) {
  return <AdminEventsPage auth={auth} />;
}

function EventsPage({ auth }) {
  const location = useLocation();
  const eventsPerPage = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: eventsPerPage,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filters = useMemo(() => readCatalogFiltersFromSearch(location.search), [location.search]);
  const timeFilterRange = useMemo(() => buildEventsTimeFilterRange(timeFilter), [timeFilter]);
  const apiFilters = useMemo(
    () => ({
      q: filters.q,
      category: filters.category,
      city: filters.city,
      venue: filters.venue,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      freeOnly: filters.freeOnly,
      startDate: timeFilterRange.startDate,
      endDate: timeFilterRange.endDate,
      sort: sortOrder,
      page: currentPage,
      limit: eventsPerPage,
    }),
    [currentPage, eventsPerPage, filters, sortOrder, timeFilterRange.endDate, timeFilterRange.startDate]
  );

  const loadEvents = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [eventsResponse, categoriesResponse] = await Promise.all([
          apiRequest(`/events${buildEventsApiQuery(apiFilters)}`, { method: "GET" }),
          apiRequest("/events/categories", { method: "GET" }),
        ]);

        setEvents(eventsResponse.data || []);
        setPagination({
          page: eventsResponse.meta?.page || currentPage,
          limit: eventsResponse.meta?.limit || eventsPerPage,
          total: eventsResponse.meta?.total || 0,
          totalPages: eventsResponse.meta?.totalPages || 0,
          hasNextPage: Boolean(eventsResponse.meta?.hasNextPage),
          hasPreviousPage: Boolean(eventsResponse.meta?.hasPreviousPage),
        });
        setCategories(categoriesResponse.data || []);
        setFeedback("");
      } catch (error) {
        if (isServiceUnavailableError(error)) {
          setFeedback("");
          await auth.checkServer();
          return;
        }

        setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar los eventos en este momento."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiFilters, auth, currentPage, eventsPerPage]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useAutoRefresh(() => loadEvents({ silent: true }), EVENTS_REFRESH_INTERVAL);
  const selectedCategory = categories.find((category) => category.slug === filters.category) || null;
  const activeFilterLabels = [
    filters.city ? `Ubicacion: ${filters.city}` : "",
    filters.venue ? `Local: ${filters.venue}` : "",
    filters.minPrice ? `Desde S/. ${filters.minPrice}` : "",
    filters.maxPrice ? `Hasta S/. ${filters.maxPrice}` : "",
    filters.freeOnly ? "Eventos gratuitos" : "",
  ].filter(Boolean);
  const totalPages = pagination.totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [location.search, sortOrder, timeFilter]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <section className="page-section events-page marketplace-results-page">
      {selectedCategory ? (
        <div className="market-breadcrumbs">
          <Link to="/">Inicio</Link>
          <span>›</span>
          <span>Categorias</span>
          <span>›</span>
          <strong>{selectedCategory.name}</strong>
        </div>
      ) : null}

      <div className="market-results-panel card">
        <div className="market-results-header">
          <div className="market-results-header-copy">
            <h2>Resultados de busqueda</h2>
            {!isLoading ? (
              <p className="market-results-count">
                Mostrando {events.length} de {pagination.total} {pagination.total === 1 ? "resultado" : "resultados"}
              </p>
            ) : null}
            {filters.q ? <p className="muted">Busqueda: "{filters.q}"</p> : null}
            {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
          </div>

          <div className="market-results-toolbar">
            <label className="market-results-control">
              <span>Filtro por mes:</span>
              <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
                <option value="all">Todos los eventos</option>
                <option value="this_month">Este mes</option>
                <option value="next_30_days">Proximos 30 dias</option>
              </select>
            </label>

            <label className="market-results-control">
              <span>Ordenar por:</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="upcoming">Proximos</option>
                <option value="price_asc">Precio menor</option>
                <option value="price_desc">Precio mayor</option>
              </select>
            </label>
          </div>
        </div>

        {activeFilterLabels.length ? (
          <div className="market-active-filters">
            {activeFilterLabels.map((label) => (
              <span className="market-active-filter" key={label}>
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {feedback ? <InlineMessage type="error" message={feedback} /> : null}
        {isLoading ? <p className="muted">Cargando eventos...</p> : null}

        {!isLoading && events.length === 0 ? (
          <div className="empty-state compact-state market-results-empty">
            <h3>No encontramos eventos con esos filtros</h3>
            <p className="muted">Prueba con otra categoria, ciudad, local o rango de precios desde el buscador superior.</p>
          </div>
        ) : null}

        <div className="event-tile-grid market-results-grid">
          {events.map((eventItem, index) => (
            <Link className="event-tile-card market-result-card" key={eventItem.id} to={`/events/${eventItem.id}`}>
              <div className="event-tile-media">
                <img
                  src={
                    eventItem.featured_image_url ||
                    EVENT_FALLBACK_IMAGES[((currentPage - 1) * eventsPerPage + index) % EVENT_FALLBACK_IMAGES.length]
                  }
                  alt={eventItem.title}
                />
              </div>
              <div className="event-tile-copy">
                <span className="event-tile-category">{eventItem.category_name || "Evento"}</span>
                <h3>{eventItem.title}</h3>
                <p>{formatCompactDate(eventItem.starts_at || eventItem.event_date)}</p>
                <strong>{eventItem.city || "Peru"}</strong>
                <small>{eventItem.venue}</small>
                <span className="event-tile-price">Desde {formatCurrency(eventItem.price)}</span>
              </div>
            </Link>
          ))}
        </div>

        {!isLoading && events.length > 0 && totalPages > 0 ? (
          <div className="market-results-pagination">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={!pagination.hasPreviousPage}
            >
              Anterior
            </button>
            <div className="market-pagination-pages">
              {Array.from({ length: totalPages }, (_, pageIndex) => {
                const pageNumber = pageIndex + 1;
                return (
                  <button
                    className={`market-pagination-page ${pageNumber === currentPage ? "active" : ""}`}
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={!pagination.hasNextPage}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventDetailPage({ auth }) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { event, feedback, isLoading, notFound } = usePublicEventDetail(eventId, auth);
  const primaryTicket = event?.ticket_types?.[0] || null;
  const currentRole = auth.currentUser?.role;
  const canStartReservation = !currentRole || !["admin", "organizer"].includes(currentRole);
  const availabilityPercent =
    event?.total_tickets && Number(event.total_tickets) > 0
      ? Math.max(0, Math.min(100, Math.round((Number(event.available_tickets) / Number(event.total_tickets)) * 100)))
      : 0;

  const handleStartReservation = () => {
    if (!event) {
      return;
    }

    if (currentRole === "admin") {
      navigate("/admin/events");
      return;
    }

    if (currentRole === "organizer") {
      navigate("/organizer/events");
      return;
    }

    if (!auth.token) {
      navigate("/login", { state: { returnTo: `/events/${event.id}/reserve/tickets` } });
      return;
    }

    navigate(`/events/${event.id}/reserve/tickets`);
  };

  if (!isLoading && notFound) {
    return <NotFoundPage auth={auth} />;
  }

  return (
    <section className="page-section public-detail-page">
      {feedback ? <InlineMessage type="error" message={feedback} /> : null}
      {isLoading ? <p className="muted">Cargando evento...</p> : null}

      {!isLoading && !event ? (
        <div className="empty-state card compact-state">
          <h3>No encontramos este evento</h3>
          <p className="muted">Puede que ya no este disponible o que el enlace haya cambiado.</p>
        </div>
      ) : null}

      {event ? (
        <>
          <section className="card event-detail-hero">
            <img
              className="event-detail-cover"
              src={event.featured_image_url || HERO_EVENT_IMAGE}
              alt={event.title}
            />
            <div className="event-detail-hero-copy">
              <span className="event-tile-category">{event.category_name || "Evento"}</span>
              <h1>{event.title}</h1>
              <p>{event.description}</p>
              <div className="event-detail-meta-row">
                <span>{formatCompactDate(event.starts_at || event.event_date)}</span>
                <span>{event.venue}</span>
                <span>{event.city}</span>
              </div>
            </div>
          </section>

          <div className="event-detail-layout">
            <div className="event-detail-main">
              <section className="panel-card detail-section">
                <div className="panel-card-header">
                  <h3>Sobre el evento</h3>
                </div>
                <p className="muted">{event.description}</p>
                {event.additional_info ? <p className="muted">{event.additional_info}</p> : null}
              </section>

              {/* Video promocional */}
              {getPromoVideoEmbedUrl(event.promo_video_url) && (
                <section className="panel-card detail-section promo-video-section">
                  <div className="panel-card-header">
                    <h3>Video promocional</h3>
                  </div>
                  <div className="promo-video-wrapper">
                    <iframe
                      src={getPromoVideoEmbedUrl(event.promo_video_url)}
                      title={`Video promocional de ${event.title}`}
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      frameBorder="0"
                      loading="lazy"
                    />
                  </div>
                </section>
              )}

              <section className="panel-card detail-section">
                <div className="panel-card-header">
                  <h3>Tipos de entrada</h3>
                </div>
                <div className="ticket-selection-list">
                  {(event.ticket_types || []).map((ticketType) => (
                    <article className="ticket-selection-card simple" key={ticketType.id}>
                      <div>
                        <strong>{ticketType.name}</strong>
                        <p className="muted">{ticketType.stock_available} disponibles</p>
                      </div>
                      <strong>{formatCurrency(ticketType.price)}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel-card detail-section">
                <div className="panel-card-header">
                  <h3>Ubicacion</h3>
                </div>
                <div className="detail-location-card">
                  <strong>{event.venue}</strong>
                  <p className="muted">{event.address_line || `${event.city}, ${event.country}`}</p>
                  {event.meeting_point ? <p className="muted">Punto de encuentro: {event.meeting_point}</p> : null}
                </div>
              </section>
            </div>

            <aside className="event-detail-side">
              <section className="panel-card event-summary-card">
                <span className="summary-kicker">Desde</span>
                <strong className="summary-price">{primaryTicket ? formatCurrency(primaryTicket.price) : formatCurrency(event.price)}</strong>
                <div className="summary-meta-list">
                  <div>
                    <span>Horario</span>
                    <strong>{formatDate(event.starts_at || event.event_date)}</strong>
                  </div>
                  <div>
                    <span>Disponibilidad</span>
                    <strong>{event.available_tickets} de {event.total_tickets}</strong>
                    <div className="availability-bar">
                      <span style={{ width: `${availabilityPercent}%` }} />
                    </div>
                  </div>
                  <div>
                    <span>Edad</span>
                    <strong>{getAgeRestrictionLabel(event.age_restriction)}</strong>
                  </div>
                </div>
                <button className="primary-button full-width-button" type="button" onClick={handleStartReservation}>
                  {canStartReservation ? "Iniciar reserva" : currentRole === "admin" ? "Gestionar eventos" : "Ir a mis eventos"}
                </button>
                <p className="muted summary-note">
                  {canStartReservation
                    ? auth.token
                      ? "Continuaras con la seleccion de entradas."
                      : "Primero veras el detalle; al iniciar reserva te pediremos iniciar sesion."
                    : currentRole === "admin"
                      ? "Tu cuenta de administrador solo usa herramientas de gestion."
                      : "Tu cuenta de organizador gestiona publicaciones, no reservas."}
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}

function EventReservationFlowPage({ auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId, step: rawStep } = useParams();
  const validSteps = ["tickets", "attendee", "payment"];
  const currentStep = rawStep && validSteps.includes(rawStep) ? rawStep : "tickets";
  const { event, feedback: eventFeedback, isLoading, notFound } = usePublicEventDetail(eventId, auth);
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletCards, setWalletCards] = useState([]);
  const [walletFeedback, setWalletFeedback] = useState({ type: "", message: "" });
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  useEffect(() => {
    if (!event) {
      return;
    }

    setDraft((current) => {
      if (current) {
        return current;
      }

      const storedDraft = readReservationDraft(event.id);
      const firstTicketType = event.ticket_types?.[0];
      const isStoredTicketValid = event.ticket_types?.some((ticketType) => String(ticketType.id) === String(storedDraft?.ticketTypeId));

      return {
        ticketTypeId: isStoredTicketValid ? String(storedDraft.ticketTypeId) : firstTicketType ? String(firstTicketType.id) : "",
        quantity: Math.max(1, Number(storedDraft?.quantity || 1)),
        attendeeName: storedDraft?.attendeeName || auth.currentUser?.full_name || "",
        attendeeDocumentNumber: storedDraft?.attendeeDocumentNumber || auth.currentUser?.document_number || "",
        attendeeEmail: storedDraft?.attendeeEmail || auth.currentUser?.email || "",
        paymentMethod: "credit_card",
        installmentCount: "1",
        isRefundablePurchase: Boolean(storedDraft?.isRefundablePurchase),
        paymentMode: storedDraft?.paymentMode === "temp" ? "temp" : "saved",
        walletCardId: storedDraft?.walletCardId ? String(storedDraft.walletCardId) : "",
        saveCard: Boolean(storedDraft?.saveCard),
        cardNumber: storedDraft?.cardNumber || "",
        cardExpiry: storedDraft?.cardExpiry || "",
        cardHolder: storedDraft?.cardHolder || auth.currentUser?.full_name || "",
      };
    });
  }, [auth.currentUser?.document_number, auth.currentUser?.email, auth.currentUser?.full_name, event]);

  useEffect(() => {
    if (event && draft) {
      writeReservationDraft(event.id, draft);
    }
  }, [draft, event]);

  const ticketTypes = event?.ticket_types || [];
  const selectedTicket = ticketTypes.find((ticketType) => String(ticketType.id) === String(draft?.ticketTypeId)) || null;
  const quantity = Math.max(0, Number(draft?.quantity || 0));
  const subtotal = selectedTicket ? Number(selectedTicket.price) * quantity : 0;
  const refundableFee = draft?.isRefundablePurchase ? Number((subtotal * 0.05).toFixed(2)) : 0;
  const totalAmount = Number((subtotal + refundableFee).toFixed(2));
  const attendeeComplete =
    draft?.attendeeName?.trim().length >= 3 &&
    draft?.attendeeDocumentNumber?.trim().length >= 6 &&
    String(draft?.attendeeEmail || "").includes("@");
  const paymentComplete =
    draft?.paymentMode === "saved"
      ? Boolean(draft?.walletCardId)
      : Boolean(draft?.cardNumber && draft?.cardExpiry && draft?.cardHolder);
  const stepIndex = validSteps.indexOf(currentStep);
  const reservationRequestKeyRef = useRef("");

  const resetReservationRequestKey = () => {
    reservationRequestKeyRef.current = "";
  };

  const updateDraft = (field, value) => {
    resetReservationRequestKey();
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectedWalletCard = useMemo(() => {
    if (!draft?.walletCardId) {
      return null;
    }
    return walletCards.find((card) => String(card.id) === String(draft.walletCardId)) || null;
  }, [draft?.walletCardId, walletCards]);

  const loadWalletCards = useCallback(async () => {
    if (!auth.token) {
      return;
    }

    setIsLoadingWallet(true);
    setWalletFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/wallet/cards", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      const cards = Array.isArray(response.data) ? response.data : [];
      setWalletCards(cards);

      if (cards.length === 0) {
        if (draft?.paymentMode !== "temp") {
          updateDraft("paymentMode", "temp");
        }
        if (draft?.walletCardId) {
          updateDraft("walletCardId", "");
        }
      } else if (draft?.paymentMode === "saved" && !draft?.walletCardId) {
        const defaultCard = cards.find((card) => card.is_default) || cards[0] || null;
        if (defaultCard) {
          updateDraft("walletCardId", String(defaultCard.id));
        }
      }
    } catch (error) {
      setWalletFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos cargar tus tarjetas.") });
    } finally {
      setIsLoadingWallet(false);
    }
  }, [auth.token, draft?.paymentMode, draft?.walletCardId]);

  useEffect(() => {
    if (currentStep !== "payment") {
      return;
    }
    loadWalletCards();
  }, [currentStep, loadWalletCards]);

  const parseExpiry = (value) => {
    const raw = String(value || "").trim();
    const normalized = raw.replace(/\s+/g, "");
    const match = normalized.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!match) {
      return null;
    }
    const month = Number(match[1]);
    const yearRaw = Number(match[2]);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }
    const year = String(match[2]).length === 2 ? 2000 + yearRaw : yearRaw;
    if (!Number.isFinite(year) || year < 2020 || year > 2100) {
      return null;
    }
    return { month, year };
  };

  const normalizeCardNumber = (value) => String(value || "").replace(/\s+/g, "").trim();
  const inferCardBrand = (cardNumber) => {
    const normalized = normalizeCardNumber(cardNumber);
    if (normalized.startsWith("4")) {
      return "VISA";
    }
    if (normalized.startsWith("34") || normalized.startsWith("37")) {
      return "AMEX";
    }
    if (normalized.startsWith("5") || normalized.startsWith("2")) {
      return "MASTERCARD";
    }
    return "";
  };
  const detectedDraftBrand = useMemo(() => inferCardBrand(draft?.cardNumber), [draft?.cardNumber]);
  const cardBrandLabel = useMemo(() => {
    if (draft?.paymentMode === "saved") {
      return selectedWalletCard?.brand || "—";
    }
    return detectedDraftBrand || "—";
  }, [detectedDraftBrand, draft?.paymentMode, selectedWalletCard?.brand]);

  const adjustTicketSelection = (ticketType, delta) => {
    resetReservationRequestKey();
    setDraft((current) => {
      const isCurrentTicket = String(current.ticketTypeId) === String(ticketType.id);
      const currentQuantity = isCurrentTicket ? Number(current.quantity || 0) : 0;
      const nextQuantity = isCurrentTicket ? currentQuantity + delta : delta > 0 ? 1 : 0;
      const maxQuantity = Math.max(1, Math.min(Number(ticketType.max_per_order || 10), Number(ticketType.stock_available || 10)));

      if (nextQuantity <= 0) {
        return {
          ...current,
          ticketTypeId: "",
          quantity: 0,
        };
      }

      return {
        ...current,
        ticketTypeId: String(ticketType.id),
        quantity: Math.min(nextQuantity, maxQuantity),
      };
    });
  };

  const goToStep = (step) => {
    navigate(`/events/${eventId}/reserve/${step}`);
  };

  const continueFromTickets = () => {
    if (!selectedTicket || quantity <= 0) {
      setFeedback("Selecciona una entrada y una cantidad para continuar.");
      return;
    }

    setFeedback("");
    goToStep("attendee");
  };

  const continueFromAttendee = () => {
    if (!attendeeComplete) {
      setFeedback("Completa los datos de la persona asistente antes de continuar.");
      return;
    }

    setFeedback("");
    goToStep("payment");
  };

  const completeReservation = async () => {
    if (!selectedTicket || quantity <= 0) {
      setFeedback("Selecciona una entrada valida para continuar.");
      goToStep("tickets");
      return;
    }

    if (!attendeeComplete) {
      setFeedback("Completa la informacion del asistente.");
      goToStep("attendee");
      return;
    }

    if (!paymentComplete) {
      setFeedback("Completa los datos del metodo de pago.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const checkoutState = {};

      if (draft.walletCardId) {
        checkoutState.walletCardId = Number(draft.walletCardId);
      } else {
        const cardNumber = normalizeCardNumber(draft.cardNumber);
        if (!/^\d{12,19}$/.test(cardNumber)) {
          throw new Error("El numero de tarjeta es invalido.");
        }

        const expiry = parseExpiry(draft.cardExpiry);
        if (!expiry) {
          throw new Error("La fecha de expiracion es invalida.");
        }

        const holderName = String(draft.cardHolder || "").trim();
        if (holderName.length < 3) {
          throw new Error("El nombre del titular es invalido.");
        }

        checkoutState.tempCard = {
          cardNumber,
          expMonth: expiry.month,
          expYear: expiry.year,
          holderName,
        };
        checkoutState.saveToWallet = Boolean(draft.saveCard);
      }
      if (!reservationRequestKeyRef.current) {
        reservationRequestKeyRef.current = buildIdempotencyKey("reservation");
      }

      const response = await apiRequest("/reservations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Idempotency-Key": reservationRequestKeyRef.current,
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: Number(draft.ticketTypeId),
          quantity,
          paymentMethod: "credit_card",
          installmentCount: 1,
          isRefundablePurchase: Boolean(draft.isRefundablePurchase),
          attendeeName: draft.attendeeName.trim(),
          attendeeDocumentNumber: draft.attendeeDocumentNumber.trim(),
        }),
      });

      resetReservationRequestKey();
      clearReservationDraft(event.id);
      if (response?.data?.status === "pending_payment") {
        navigate(`/checkout/${response.data.id}`, { replace: true, state: checkoutState });
        return;
      }

      navigate("/my-tickets", { replace: true });
    } catch (error) {
      if (error?.message && String(error.message).includes("tarjeta")) {
        setFeedback(String(error.message));
      } else {
        if (!error?.isConnectionError && (!error?.status || error.status < 500)) {
          resetReservationRequestKey();
        }
        setFeedback(getUserFacingErrorMessage(error, "No pudimos completar tu reserva en este momento."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rawStep || !validSteps.includes(rawStep)) {
    return <Navigate to={`/events/${eventId}/reserve/tickets`} replace />;
  }

  if (!auth.token) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  }

  if (auth.currentUser && ["admin", "organizer"].includes(auth.currentUser.role)) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  if (!isLoading && notFound) {
    return <NotFoundPage auth={auth} />;
  }

  return (
    <section className="page-section reservation-flow-page">
      {eventFeedback ? <InlineMessage type="error" message={eventFeedback} /> : null}
      {feedback ? <InlineMessage type="error" message={feedback} /> : null}
      {isLoading ? <p className="muted">Cargando seleccion...</p> : null}

      {!isLoading && !event ? (
        <div className="empty-state card compact-state">
          <h3>No encontramos este evento</h3>
          <p className="muted">Vuelve al catalogo y elige otra experiencia.</p>
        </div>
      ) : null}

      {event && draft ? (
        <>
          <div className="reservation-stepper">
            {[
              { id: "tickets", label: "Tickets" },
              { id: "attendee", label: "Detalles" },
              { id: "payment", label: "Pago" },
            ].map((step, index) => {
              const isComplete = index < stepIndex;
              const isActive = step.id === currentStep;

              return (
                <div className={`reservation-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`} key={step.id}>
                  <span>{isComplete ? "✓" : index + 1}</span>
                  <strong>{step.label}</strong>
                </div>
              );
            })}
          </div>

          <div className="reservation-flow-layout">
            <div className="reservation-flow-main">
              {currentStep === "tickets" ? (
                <section className="panel-card checkout-section">
                  <div className="panel-card-header">
                    <div>
                      <h3>Selecciona tus entradas</h3>
                      <p className="muted">Elige el tipo de experiencia y la cantidad que deseas reservar.</p>
                    </div>
                  </div>

                  <div className="ticket-selection-list">
                    {ticketTypes.map((ticketType) => {
                      const isSelected = String(draft.ticketTypeId) === String(ticketType.id);
                      const shownQuantity = isSelected ? quantity : 0;

                      return (
                        <article className={`ticket-selection-card ${isSelected ? "selected" : ""}`} key={ticketType.id}>
                          <div className="ticket-selection-copy">
                            <strong>{ticketType.name}</strong>
                            <p className="muted">{ticketType.stock_available} entradas disponibles</p>
                            <span>{formatCurrency(ticketType.price)} por persona</span>
                          </div>
                          <div className="ticket-stepper">
                            <button className="ghost-button" type="button" onClick={() => adjustTicketSelection(ticketType, -1)}>
                              -
                            </button>
                            <strong>{shownQuantity}</strong>
                            <button className="primary-button" type="button" onClick={() => adjustTicketSelection(ticketType, 1)}>
                              +
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="checkout-actions">
                    <Link className="ghost-button" to={`/events/${event.id}`}>
                      Volver al evento
                    </Link>
                    <button className="primary-button" type="button" onClick={continueFromTickets} disabled={!selectedTicket || quantity <= 0}>
                      Continuar
                    </button>
                  </div>
                </section>
              ) : null}

              {currentStep === "attendee" ? (
                <section className="panel-card checkout-section">
                  <div className="panel-card-header">
                    <div>
                      <h3>Informacion del asistente</h3>
                      <p className="muted">Completa los datos de la persona que asistira al evento.</p>
                    </div>
                  </div>

                  <div className="form-grid compact-grid">
                    <label>
                      Nombre completo
                      <input value={draft.attendeeName} onChange={(event) => updateDraft("attendeeName", event.target.value)} />
                    </label>
                    <label>
                      DNI o documento
                      <input value={draft.attendeeDocumentNumber} onChange={(event) => updateDraft("attendeeDocumentNumber", event.target.value)} />
                    </label>
                    <label className="form-span-2">
                      Correo electronico
                      <input type="email" value={draft.attendeeEmail} onChange={(event) => updateDraft("attendeeEmail", event.target.value)} />
                    </label>
                    <label className="checkbox-field form-span-2 attendee-insurance-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(draft.isRefundablePurchase)}
                        onChange={(event) => updateDraft("isRefundablePurchase", event.target.checked)}
                      />
                      <span>Agregar compra reembolsable por {formatCurrency(refundableFee || subtotal * 0.05)}</span>
                    </label>
                  </div>

                  <div className="checkout-actions">
                    <button className="ghost-button" type="button" onClick={() => goToStep("tickets")}>
                      Atras
                    </button>
                    <button className="primary-button" type="button" onClick={continueFromAttendee} disabled={!attendeeComplete}>
                      Continuar al pago
                    </button>
                  </div>
                </section>
              ) : null}

              {currentStep === "payment" ? (
                <section className="panel-card checkout-section">
                  <div className="panel-card-header">
                    <div>
                      <h3>Metodo de pago</h3>
                      <p className="muted">Solo aceptamos tarjeta. Puedes elegir una guardada o registrar una nueva.</p>
                    </div>
                  </div>

                  {walletFeedback.message ? <InlineMessage type={walletFeedback.type} message={walletFeedback.message} /> : null}

                  <div className="form-grid compact-grid payment-details-grid">
                    <label className="form-span-2">
                      Metodo
                      <select
                        value={draft.paymentMode}
                        onChange={(event) => {
                          const nextMode = event.target.value === "temp" ? "temp" : "saved";
                          updateDraft("paymentMode", nextMode);
                          if (nextMode === "temp") {
                            updateDraft("walletCardId", "");
                          } else if (!draft.walletCardId) {
                            const defaultCard = walletCards.find((card) => card.is_default) || walletCards[0] || null;
                            if (defaultCard) {
                              updateDraft("walletCardId", String(defaultCard.id));
                            }
                          }
                        }}
                        disabled={isLoadingWallet}
                      >
                        <option value="saved" disabled={walletCards.length === 0}>
                          Tarjeta guardada
                        </option>
                        <option value="temp">Tarjeta temporal</option>
                      </select>
                    </label>

                    {draft.paymentMode === "saved" ? (
                      <label className="form-span-2">
                        Mis tarjetas
                        <select
                          value={draft.walletCardId}
                          onChange={(event) => updateDraft("walletCardId", event.target.value)}
                          disabled={isLoadingWallet || walletCards.length === 0}
                        >
                          <option value="">Selecciona...</option>
                          {walletCards.map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.brand} · {card.masked} · {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="form-span-2">
                      Numero de tarjeta
                      <div className="input-prefix-field">
                        <span className="input-prefix-label">{cardBrandLabel}</span>
                        <input
                          value={draft.paymentMode === "saved" && selectedWalletCard ? selectedWalletCard.masked : draft.cardNumber}
                          onChange={(event) => updateDraft("cardNumber", event.target.value.replace(/[^\d\s]/g, ""))}
                          placeholder="0000 0000 0000 0000"
                          disabled={draft.paymentMode === "saved"}
                        />
                      </div>
                    </label>
                    <label>
                      Fecha de expiracion
                      <input
                        value={
                          draft.walletCardId && selectedWalletCard
                            ? `${String(selectedWalletCard.exp_month).padStart(2, "0")}/${String(selectedWalletCard.exp_year).slice(-2)}`
                            : draft.cardExpiry
                        }
                        onChange={(event) => updateDraft("cardExpiry", event.target.value)}
                        placeholder="MM/YY"
                        disabled={draft.paymentMode === "saved"}
                      />
                    </label>
                    <label className="form-span-2">
                      Nombre del titular
                      <input
                        value={draft.walletCardId && selectedWalletCard ? selectedWalletCard.holder_name : draft.cardHolder}
                        onChange={(event) => updateDraft("cardHolder", event.target.value)}
                        disabled={draft.paymentMode === "saved"}
                      />
                    </label>
                    {draft.paymentMode === "temp" ? (
                      <label className="form-span-2 checkbox-row">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.saveCard)}
                          onChange={(event) => updateDraft("saveCard", event.target.checked)}
                        />
                        Guardar esta tarjeta en mi perfil (opcional)
                      </label>
                    ) : null}
                  </div>

                  <div className="checkout-actions">
                    <button className="ghost-button" type="button" onClick={() => goToStep("attendee")}>
                      Atras
                    </button>
                    <button className="primary-button" type="button" disabled={isSubmitting || !paymentComplete} onClick={completeReservation}>
                      {isSubmitting ? "Procesando..." : "Finalizar reserva"}
                    </button>
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="reservation-flow-side">
              <section className="panel-card checkout-summary-card">
                <div className="checkout-summary-event">
                  <img src={event.featured_image_url || HERO_EVENT_IMAGE} alt={event.title} />
                  <div>
                    <strong>{event.title}</strong>
                    <span>{formatCompactDate(event.starts_at || event.event_date)}</span>
                    <span>{event.city}</span>
                  </div>
                </div>

                <div className="checkout-summary-list">
                  <div>
                    <span>Entrada</span>
                    <strong>{selectedTicket ? selectedTicket.name : "Aun sin elegir"}</strong>
                  </div>
                  <div>
                    <span>Cantidad</span>
                    <strong>{quantity}</strong>
                  </div>
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatCurrency(subtotal)}</strong>
                  </div>
                  <div>
                    <span>Compra reembolsable</span>
                    <strong>{formatCurrency(refundableFee)}</strong>
                  </div>
                  <div className="summary-total-row">
                    <span>Total</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}

function NotificationsPage({ auth }) {
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [markingId, setMarkingId] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const getNotificationAction = useCallback(
    (notification) => {
      const role = auth.currentUser?.role;
      const isSuperAdmin = Boolean(auth.currentUser?.is_super_admin);
      const data = notification?.data || {};
      const eventId = data.eventId ?? data.event_id;
      const reservationId = data.reservationId ?? data.reservation_id;

      if (role === "admin") {
        const reviewPath = isSuperAdmin ? "/superadmin/events/review" : "/admin/events/review";
        if (
          [
            "event_review_pending",
            "change_request_submitted",
            "refund_action_required_admin",
            "refund_escalated",
          ].includes(notification.type)
        ) {
          return { label: "Ver detalle", to: notification.type.startsWith("refund") ? "/staff/refunds" : reviewPath };
        }
      }

      if (role === "staff") {
        if (notification.type === "refund_action_required" || notification.type === "refund_escalated") {
          return { label: "Ver reembolsos", to: "/staff/refunds" };
        }
        if (notification.type === "event_paused_staff" || notification.type === "event_cancelled_staff") {
          return { label: "Ver cancelaciones", to: "/staff/cancellations" };
        }
      }

      if (role === "organizer") {
        if (
          [
            "event_review_approved",
            "event_review_rejected",
            "change_request_approved",
            "change_request_rejected",
            "change_request_needs_information",
          ].includes(notification.type)
        ) {
          return { label: "Ver solicitudes", to: "/organizer/events?view=requests" };
        }
      }

      if (role === "customer") {
        if (notification.type === "payment_failed" && reservationId) {
          return { label: "Ir al pago", to: `/checkout/${reservationId}` };
        }
        if (["purchase_confirmed", "refund_requested", "refund_processing", "refund_completed", "refund_rejected"].includes(notification.type)) {
          return { label: "Ver mis tickets", to: "/my-tickets" };
        }
        if ((notification.type === "event_paused" || notification.type === "event_cancelled") && eventId) {
          return { label: "Ver evento", to: `/events/${eventId}` };
        }
      }

      return null;
    },
    [auth.currentUser]
  );

  const loadNotifications = useCallback(async () => {
    if (!auth.token) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }).toString();
      const response = await apiRequest(`/notifications?${query}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setItems(response.data || []);
      setTotalPages(Number(response.meta?.totalPages || 0));
      setFeedback("");
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar tus notificaciones en este momento."));
    } finally {
      setIsLoading(false);
    }
  }, [auth, page, statusFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId) => {
    setMarkingId(notificationId);
    setFeedback("");

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
      await loadNotifications();
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos actualizar esta notificacion."));
    } finally {
      setMarkingId(null);
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    setFeedback("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
      await loadNotifications();
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos marcar tus notificaciones como leidas."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <h2>Notificaciones</h2>
          <p className="muted">Aqui veras novedades importantes sobre eventos, reservas y reembolsos.</p>
        </div>
        <div className="cta-row">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="unread">No leidas</option>
            <option value="read">Leidas</option>
          </select>
          <button className="ghost-button" type="button" disabled={isMarkingAll} onClick={markAllAsRead}>
            {isMarkingAll ? "Marcando..." : "Marcar todo como leido"}
          </button>
        </div>
      </div>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}
      {isLoading ? <p className="muted">Cargando notificaciones...</p> : null}

      {!isLoading && items.length === 0 ? (
        <div className="empty-state card compact-state">
          <h3>Sin notificaciones</h3>
          <p className="muted">Cuando ocurra algo importante, lo veras aqui.</p>
        </div>
      ) : null}

      {items.length ? (
        <div className="notification-list">
          {items.map((notification) => (
            <article className={`notification-card card ${notification.status === "unread" ? "unread" : ""}`} key={notification.id}>
              <div className="notification-card-header">
                <div>
                  <strong>{notification.title}</strong>
                  <span className="muted">{formatCompactDate(notification.created_at)}</span>
                </div>
                <div className="cta-row">
                  {(() => {
                    const action = getNotificationAction(notification);
                    return action ? (
                      <Link className="ghost-button" to={action.to}>
                        {action.label}
                      </Link>
                    ) : null;
                  })()}
                  {notification.status === "unread" ? (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={markingId === notification.id}
                      onClick={() => markAsRead(notification.id)}
                    >
                      {markingId === notification.id ? "Marcando..." : "Marcar leida"}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="muted">{notification.message}</p>
            </article>
          ))}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="pagination-bar">
          <button className="ghost-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span className="muted">
            Pagina {page} de {totalPages}
          </span>
          <button
            className="ghost-button"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  );
}

function CustomerCheckoutPage({ auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState(null);
  const [walletCards, setWalletCards] = useState([]);
  const [paymentMode, setPaymentMode] = useState("saved");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [tempCardNumber, setTempCardNumber] = useState("");
  const [tempExpMonth, setTempExpMonth] = useState("");
  const [tempExpYear, setTempExpYear] = useState("");
  const [tempHolderName, setTempHolderName] = useState("");
  const [tempSaveToWallet, setTempSaveToWallet] = useState(false);
  const [tempCvv, setTempCvv] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [simulateOutcome, setSimulateOutcome] = useState("approved");

  const normalizedReservationId = useMemo(() => {
    const parsed = Number(reservationId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [reservationId]);

  const loadCheckoutData = useCallback(async () => {
    if (!auth.token || !normalizedReservationId) {
      setReservation(null);
      setWalletCards([]);
      setSelectedCardId("");
      setFeedback({ type: "error", message: "El id de reserva es invalido." });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const [reservationResponse, cardsResponse] = await Promise.all([
        apiRequest(`/reservations/${normalizedReservationId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }),
        apiRequest("/wallet/cards", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }),
      ]);

      const nextReservation = reservationResponse.data || null;
      const nextCards = Array.isArray(cardsResponse.data) ? cardsResponse.data : [];
      setReservation(nextReservation);
      setWalletCards(nextCards);

      const preferredWalletCardId = location?.state?.walletCardId ? String(location.state.walletCardId) : "";
      const preferredCard = preferredWalletCardId ? nextCards.find((card) => String(card.id) === preferredWalletCardId) : null;
      const defaultCard = nextCards.find((card) => card.is_default) || nextCards[0] || null;
      const finalCard = preferredCard || defaultCard;
      const incomingTempCard = location?.state?.tempCard || null;
      if (incomingTempCard && typeof incomingTempCard === "object") {
        setPaymentMode("temp");
        setTempCardNumber(String(incomingTempCard.cardNumber || ""));
        setTempExpMonth(incomingTempCard.expMonth ? String(incomingTempCard.expMonth) : "");
        setTempExpYear(incomingTempCard.expYear ? String(incomingTempCard.expYear) : "");
        setTempHolderName(String(incomingTempCard.holderName || ""));
        setTempSaveToWallet(Boolean(location?.state?.saveToWallet));
        setSelectedCardId(finalCard ? String(finalCard.id) : "");
      } else {
        setPaymentMode("saved");
        setSelectedCardId(finalCard ? String(finalCard.id) : "");
      }
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos cargar el checkout.") });
    } finally {
      setIsLoading(false);
    }
  }, [auth.token, location?.state, normalizedReservationId]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const selectedCard = useMemo(() => {
    return walletCards.find((card) => String(card.id) === String(selectedCardId)) || null;
  }, [selectedCardId, walletCards]);

  const normalizedTempCardNumber = useMemo(() => String(tempCardNumber || "").replace(/\s+/g, "").trim(), [tempCardNumber]);
  const detectedTempBrand = useMemo(() => {
    if (normalizedTempCardNumber.startsWith("4")) {
      return "VISA";
    }
    if (normalizedTempCardNumber.startsWith("34") || normalizedTempCardNumber.startsWith("37")) {
      return "AMEX";
    }
    if (normalizedTempCardNumber.startsWith("5") || normalizedTempCardNumber.startsWith("2")) {
      return "MASTERCARD";
    }
    return "";
  }, [normalizedTempCardNumber]);
  const tempCardBrandLabel = detectedTempBrand || "—";

  const handlePay = async () => {
    if (!auth.token || !normalizedReservationId) {
      return;
    }

    const wantsSavedCard = paymentMode === "saved";

    setIsPaying(true);
    setFeedback({ type: "", message: "" });

    try {
      const body = { reservationId: normalizedReservationId, simulateOutcome };

      if (wantsSavedCard) {
        if (!selectedCardId) {
          setFeedback({ type: "error", message: "Selecciona una tarjeta guardada para continuar." });
          setIsPaying(false);
          return;
        }
        body.walletCardId = Number(selectedCardId);
      } else {
        if (!/^\d{12,19}$/.test(normalizedTempCardNumber)) {
          setFeedback({ type: "error", message: "El numero de tarjeta es invalido." });
          setIsPaying(false);
          return;
        }

        const month = Number(tempExpMonth);
        const year = Number(tempExpYear);
        if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year) || year < 2020 || year > 2100) {
          setFeedback({ type: "error", message: "La fecha de expiracion es invalida." });
          setIsPaying(false);
          return;
        }

        const holderName = String(tempHolderName || "").trim();
        if (holderName.length < 3) {
          setFeedback({ type: "error", message: "El nombre del titular es invalido." });
          setIsPaying(false);
          return;
        }

        const cvv = String(tempCvv || "").trim().replace(/\s+/g, "");
        if (!/^\d{3,4}$/.test(cvv)) {
          setFeedback({ type: "error", message: "El CVV es invalido." });
          setIsPaying(false);
          return;
        }

        body.cardNumber = normalizedTempCardNumber;
        body.expMonth = month;
        body.expYear = year;
        body.holderName = holderName;
        body.saveToWallet = Boolean(tempSaveToWallet);
      }

      const response = await apiRequest("/payments/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      });

      setFeedback({ type: "success", message: response.message });
      navigate("/my-tickets", { replace: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos procesar el pago.") });
      await loadCheckoutData();
    } finally {
      setIsPaying(false);
    }
  };

  if (!normalizedReservationId) {
    return (
      <section className="page-section dashboard-page">
        <InlineMessage type="error" message="El id de reserva es invalido." />
      </section>
    );
  }

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Pasarela de pagos simulada</h2>
          <p className="muted">Paga con una tarjeta guardada o usa una tarjeta temporal.</p>
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}
      {isLoading ? <p className="muted">Cargando checkout...</p> : null}

      {!isLoading && reservation ? (
        <div className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>Resumen</h3>
                <p className="muted">{reservation.event_title}</p>
              </div>
            </div>
            <div className="reservation-detail-grid">
              <div>
                <span>Reserva</span>
                <strong>{reservation.reservation_code || `#${reservation.id}`}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(reservation.total_amount)}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{getReservationStatusLabel(reservation)}</strong>
              </div>
              <div>
                <span>Pago</span>
                <strong>{getReservationPaymentStatusLabel(reservation)}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>Tarjeta</h3>
                <p className="muted">Usaremos tu tarjeta seleccionada para la devolución si aplica.</p>
              </div>
            </div>

            <div className="form-grid compact-grid">
              <label className="form-span-2">
                Metodo
                <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                  <option value="saved">Tarjeta guardada</option>
                  <option value="temp">Tarjeta temporal</option>
                </select>
              </label>

              {paymentMode === "saved" ? (
                <>
                  <label className="form-span-2">
                    Selecciona una tarjeta
                    <select value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)} disabled={walletCards.length === 0}>
                      <option value="">Selecciona...</option>
                      {walletCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.brand} · {card.masked} · {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                        </option>
                      ))}
                    </select>
                  </label>

                  {walletCards.length === 0 ? (
                    <div className="form-span-2">
                      <p className="muted">No tienes tarjetas guardadas. Usa una tarjeta temporal o agrega una en tu perfil.</p>
                      <button className="ghost-button" type="button" onClick={() => navigate("/my-profile#tarjetas")}>
                        Ir a mis tarjetas
                      </button>
                    </div>
                  ) : (
                    <div className="form-span-2">
                      <span>Tarjeta seleccionada</span>
                      <strong>{selectedCard ? `${selectedCard.brand} · ${selectedCard.masked}` : "-"}</strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="form-span-2">
                    Numero de tarjeta
                    <div className="input-prefix-field">
                      <span className="input-prefix-label">{tempCardBrandLabel}</span>
                      <input
                        value={tempCardNumber}
                        onChange={(event) => setTempCardNumber(event.target.value.replace(/[^\d\s]/g, ""))}
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                  </label>
                  <label>
                    Mes
                    <input value={tempExpMonth} onChange={(event) => setTempExpMonth(event.target.value)} placeholder="12" />
                  </label>
                  <label>
                    Año
                    <input value={tempExpYear} onChange={(event) => setTempExpYear(event.target.value)} placeholder="2029" />
                  </label>
                  <label className="form-span-2">
                    Titular
                    <input value={tempHolderName} onChange={(event) => setTempHolderName(event.target.value)} placeholder="Nombre Apellido" />
                  </label>
                  <label>
                    CVV
                    <input value={tempCvv} onChange={(event) => setTempCvv(event.target.value)} placeholder="123" />
                  </label>
                  <label className="form-span-2 checkbox-row">
                    <input type="checkbox" checked={tempSaveToWallet} onChange={(event) => setTempSaveToWallet(event.target.checked)} />
                    Guardar esta tarjeta en mi perfil (opcional)
                  </label>
                </>
              )}

              <label>
                Simulacion
                <select value={simulateOutcome} onChange={(event) => setSimulateOutcome(event.target.value)}>
                  <option value="approved">Aprobado</option>
                  <option value="declined">Rechazado</option>
                </select>
              </label>
            </div>

            <div className="checkout-actions">
              <button className="ghost-button" type="button" onClick={() => navigate("/my-tickets")}>
                Volver
              </button>
              <button className="primary-button" type="button" onClick={handlePay} disabled={isPaying}>
                {isPaying ? "Procesando..." : "Confirmar pago"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function CustomerTicketsPage({ auth }) {
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [requestingRefundId, setRequestingRefundId] = useState(null);
  const [isDownloadingTicketsPdf, setIsDownloadingTicketsPdf] = useState(false);
  const [expandedReservationId, setExpandedReservationId] = useState(null);
  const [previewReservationId, setPreviewReservationId] = useState(null);
  const [activeReservationGroup, setActiveReservationGroup] = useState("all");
  const [issuedTickets, setIssuedTickets] = useState([]);
  const [isLoadingIssuedTickets, setIsLoadingIssuedTickets] = useState(false);
  const [issuedTicketsQrMap, setIssuedTicketsQrMap] = useState({});
  const [refundConfirmTarget, setRefundConfirmTarget] = useState(null);

  const loadReservations = useCallback(
    async ({ silent = false } = {}) => {
      if (!auth.token) {
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await apiRequest("/reservations", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        setReservations(response.data || []);
        setFeedback({ type: "", message: "" });
      } catch (error) {
        if (isServiceUnavailableError(error)) {
          setFeedback({ type: "", message: "" });
          await auth.checkServer();
          return;
        }

        setFeedback({
          type: "error",
          message: getUserFacingErrorMessage(error, "No pudimos cargar tus reservas en este momento."),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth]
  );

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useAutoRefresh(() => loadReservations({ silent: true }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  const orderedReservations = useMemo(() => {
    return [...reservations].sort((left, right) => {
      const leftDate = left.event_starts_at ? new Date(left.event_starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.event_starts_at ? new Date(right.event_starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    });
  }, [reservations]);

  const reservationGroupCounts = useMemo(() => {
    const counts = {
      all: orderedReservations.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      expired: 0,
    };

    orderedReservations.forEach((reservation) => {
      if (isExpiredReservation(reservation)) {
        counts.expired += 1;
        return;
      }

      if (reservation.status === "confirmed") {
        counts.confirmed += 1;
        return;
      }

      if (reservation.status === "pending_payment") {
        counts.pending += 1;
        return;
      }

      if (reservation.status === "cancelled") {
        counts.cancelled += 1;
      }
    });

    return counts;
  }, [orderedReservations]);

  const filteredReservations = useMemo(() => {
    if (activeReservationGroup === "confirmed") {
      return orderedReservations.filter((reservation) => reservation.status === "confirmed" && !isExpiredReservation(reservation));
    }

    if (activeReservationGroup === "pending") {
      return orderedReservations.filter(
        (reservation) => reservation.status === "pending_payment" && !isExpiredReservation(reservation)
      );
    }

    if (activeReservationGroup === "cancelled") {
      return orderedReservations.filter((reservation) => reservation.status === "cancelled");
    }

    if (activeReservationGroup === "expired") {
      return orderedReservations.filter((reservation) => isExpiredReservation(reservation));
    }

    return orderedReservations;
  }, [activeReservationGroup, orderedReservations]);

  const previewReservation = useMemo(
    () => orderedReservations.find((reservation) => reservation.id === previewReservationId) || null,
    [orderedReservations, previewReservationId]
  );
  const previewHasIssuedAccess = hasIssuedReservationAccess(previewReservation);
  const previewPrimaryTicketKey = useMemo(() => {
    const firstTicket = issuedTickets[0];
    if (!firstTicket) {
      return "";
    }
    return firstTicket?.id ? String(firstTicket.id) : String(firstTicket?.ticket_code || firstTicket?.qr_code || "");
  }, [issuedTickets]);
  const previewPrimaryTicketQr = previewPrimaryTicketKey ? issuedTicketsQrMap[previewPrimaryTicketKey] : "";

  useEffect(() => {
    if (!previewReservationId || !previewHasIssuedAccess || !auth.token) {
      setIssuedTickets([]);
      setIssuedTicketsQrMap({});
      setIsLoadingIssuedTickets(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingIssuedTickets(true);

    apiRequest(`/reservations/${previewReservationId}/issued-tickets`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }
        const nextTickets = response?.data?.issuedTickets;
        setIssuedTickets(Array.isArray(nextTickets) ? nextTickets : []);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        setIssuedTickets([]);
        setIssuedTicketsQrMap({});
        setFeedback({
          type: "error",
          message: getUserFacingErrorMessage(error, "No pudimos cargar los codigos de tus entradas."),
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingIssuedTickets(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.token, previewHasIssuedAccess, previewReservationId]);

  useEffect(() => {
    if (!issuedTickets.length) {
      setIssuedTicketsQrMap({});
      return;
    }

    let isCancelled = false;

    const buildQrMap = async () => {
      const nextMap = {};

      for (const ticket of issuedTickets) {
        const key = ticket?.id ? String(ticket.id) : String(ticket?.ticket_code || ticket?.qr_code || "");
        if (!key) {
          continue;
        }

        const payload = String(ticket?.qr_code || ticket?.ticket_code || "");
        if (!payload) {
          continue;
        }

        const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 220 });
        nextMap[key] = dataUrl;
      }

      if (!isCancelled) {
        setIssuedTicketsQrMap(nextMap);
      }
    };

    buildQrMap().catch(() => {
      if (!isCancelled) {
        setIssuedTicketsQrMap({});
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [issuedTickets]);

  useEffect(() => {
    if (expandedReservationId && !filteredReservations.some((reservation) => reservation.id === expandedReservationId)) {
      setExpandedReservationId(null);
    }
    if (previewReservationId && !filteredReservations.some((reservation) => reservation.id === previewReservationId)) {
      setPreviewReservationId(null);
    }
  }, [expandedReservationId, filteredReservations, previewReservationId]);

  const cancelReservation = async (reservationId) => {
    setCancellingId(reservationId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/reservations/${reservationId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      await loadReservations({ silent: true });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getUserFacingErrorMessage(error, "No pudimos cancelar tu reserva en este momento."),
      });
    } finally {
      setCancellingId(null);
    }
  };

  const requestRefund = (reservation) => {
    setRefundConfirmTarget(reservation);
  };

  const executeRefundRequest = async (reservationId) => {
    if (!reservationId) return;
    setRefundConfirmTarget(null);
    setRequestingRefundId(reservationId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/reservations/${reservationId}/refund/force-majeure/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setFeedback({
        type: "success",
        message: "Solicitud de reembolso enviada de manera exitosa.",
      });
      await loadReservations({ silent: true });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getUserFacingErrorMessage(error, "No pudimos registrar tu solicitud de reembolso."),
      });
    } finally {
      setRequestingRefundId(null);
    }
  };

  const downloadIssuedTicketsPdf = async () => {
    if (!auth.token || !previewReservationId) {
      return;
    }

    setIsDownloadingTicketsPdf(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/${previewReservationId}/tickets/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        let message = "No pudimos descargar el PDF de tus entradas.";
        try {
          const payload = await response.json();
          message = payload?.message || message;
        } catch {
          message = String(message);
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeCode = previewReservation?.reservation_code || `RES-${previewReservationId}`;
      link.download = `crowdpass-${safeCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({
        type: "error",
        message: getUserFacingErrorMessage(error, "No pudimos descargar el PDF de tus entradas."),
      });
    } finally {
      setIsDownloadingTicketsPdf(false);
    }
  };

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Mis entradas</p>
          <h2>Tus entradas y compras</h2>
          <p className="muted">
            Visualiza tus compras por evento, abre la entrada digital y revisa el detalle completo de cada reserva.
          </p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type || "error"} message={feedback.message} /> : null}

      <div className="dashboard-stack">
        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Mis entradas</h3>
              <p className="muted">Abre cada compra para ver la entrada digital y el detalle del pedido.</p>
            </div>
          </div>

          {isLoading ? <p className="muted">Cargando reservas...</p> : null}

          {!isLoading && reservations.length === 0 ? (
            <div className="empty-state compact-state">
              <h3>Aun no tienes entradas</h3>
              <p className="muted">Cuando completes una compra, aqui aparecera tu entrada digital y el detalle del evento.</p>
            </div>
          ) : null}

          <div className="ticket-stack">
            {!isLoading && reservations.length > 0 ? (
              <div className="market-filter-pill-row">
                <button
                  className={`market-filter-pill ${activeReservationGroup === "all" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveReservationGroup("all")}
                >
                  {`Todas (${reservationGroupCounts.all})`}
                </button>
                <button
                  className={`market-filter-pill ${activeReservationGroup === "confirmed" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveReservationGroup("confirmed")}
                >
                  {`Confirmadas (${reservationGroupCounts.confirmed})`}
                </button>
                <button
                  className={`market-filter-pill ${activeReservationGroup === "pending" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveReservationGroup("pending")}
                >
                  {`Pendientes (${reservationGroupCounts.pending})`}
                </button>
                <button
                  className={`market-filter-pill ${activeReservationGroup === "cancelled" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveReservationGroup("cancelled")}
                >
                  {`Canceladas (${reservationGroupCounts.cancelled})`}
                </button>
                <button
                  className={`market-filter-pill ${activeReservationGroup === "expired" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveReservationGroup("expired")}
                >
                  {`Expiradas (${reservationGroupCounts.expired})`}
                </button>
              </div>
            ) : null}

            {!isLoading && reservations.length > 0 && filteredReservations.length === 0 ? (
              <div className="empty-state compact-state">
                <h3>No hay entradas en este estado</h3>
                <p className="muted">Prueba seleccionando otra categoria para ver tus reservas.</p>
              </div>
            ) : null}

            {filteredReservations.map((reservation, index) => {
              const isExpanded = expandedReservationId === reservation.id;
              const isCancellable = reservation.status === "pending_payment";
              const hasIssuedAccess = hasIssuedReservationAccess(reservation);
              const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];
              const startsAtMs = reservation.event_starts_at ? new Date(reservation.event_starts_at).getTime() : Number.NaN;
              const hoursUntilEvent = Number.isFinite(startsAtMs) ? (startsAtMs - Date.now()) / (1000 * 60 * 60) : Number.NaN;
              const isRefundWindowOpen = Number.isFinite(hoursUntilEvent) && hoursUntilEvent >= 24;
              const canRequestRefund =
                Boolean(reservation.is_refundable_purchase) &&
                reservation.status === "confirmed" &&
                hasIssuedAccess &&
                isRefundWindowOpen &&
                !["pending", "processing"].includes(reservation.refund_status);
              const refundDisabledReason = !reservation.is_refundable_purchase
                ? "Disponible solo si compraste el seguro reembolsable."
                : !isRefundWindowOpen
                  ? "Disponible solo si faltan 24 horas o mas para el evento."
                  : ["pending", "processing"].includes(reservation.refund_status)
                    ? "Ya existe una solicitud de reembolso en proceso."
                  : "";

              return (
                <article className="ticket-card" key={reservation.id}>
                  <div className="ticket-card-media">
                    <img src={EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]} alt={reservation.event_title || `Evento ${reservation.event_id}`} />
                  </div>
                  <div className="ticket-card-body">
                    <div className="ticket-card-top">
                      <span className={`status-pill ${reservation.status}`}>{getReservationStatusLabel(reservation)}</span>
                      <span>{formatDate(reservation.event_starts_at)}</span>
                    </div>
                    <h3>{reservation.event_title || `Evento #${reservation.event_id}`}</h3>
                    <p className="muted">
                      Reserva {reservation.reservation_code || `#${reservation.id}`} · {reservation.quantity} entrada(s)
                    </p>
                    {reservation.status === "pending_payment" ? (
                      <p className="muted">
                        Tu stock quedo reservado temporalmente. La entrada digital se habilitara cuando el pago se confirme.
                      </p>
                    ) : null}
                    {reservation.status === "pending_payment" && reservation.expires_at ? (
                      <p className="muted">Vence: {formatDate(reservation.expires_at)}</p>
                    ) : null}
                    {isExpiredReservation(reservation) ? (
                      <p className="muted">La reserva expiro y el stock fue liberado automaticamente.</p>
                    ) : null}
                    {reservation.refund_type === "refundable_purchase" && reservation.refund_status === "rejected" ? (
                      <p className="muted">{`Solicitud de reembolso rechazada: ${reservation.refund_notes || "Sin detalle disponible."}`}</p>
                    ) : null}
                    <div className="ticket-card-footer compact-footer customer-ticket-footer">
                      <div>
                        <span>{hasIssuedAccess ? "Total pagado" : "Total reservado"}</span>
                        <strong>{formatCurrency(reservation.total_amount)}</strong>
                      </div>
                      <div>
                        <span>Pago</span>
                        <strong>{getReservationPaymentStatusLabel(reservation)}</strong>
                      </div>
                      <div>
                        <span>Metodo</span>
                        <strong>{formatPaymentMethodLabel(reservation.payment_method)}</strong>
                      </div>
                    </div>
                    <div className="ticket-card-actions">
                      <button className="primary-button inline-action" type="button" onClick={() => setPreviewReservationId(reservation.id)}>
                        {hasIssuedAccess ? "Ver entrada" : "Ver resumen"}
                      </button>
                      <button
                        className="secondary-button inline-action"
                        type="button"
                        onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                      {reservation.status === "confirmed" ? (
                        <button
                          className="ghost-button inline-action"
                          type="button"
                          disabled={!canRequestRefund || requestingRefundId === reservation.id}
                          title={canRequestRefund ? "" : refundDisabledReason}
                          onClick={() => requestRefund(reservation)}
                        >
                          {requestingRefundId === reservation.id ? "Solicitando..." : "Solicitar reembolso"}
                        </button>
                      ) : null}
                      {isCancellable ? (
                        <button
                          className="ghost-button inline-action"
                          type="button"
                          disabled={cancellingId === reservation.id}
                          onClick={() => cancelReservation(reservation.id)}
                        >
                          {cancellingId === reservation.id ? "Cancelando..." : "Cancelar reserva"}
                        </button>
                      ) : null}
                    </div>

                    {isExpanded ? (
                      <div className="reservation-detail-panel">
                        <div className="reservation-detail-grid">
                          <div>
                            <span>Fecha del evento</span>
                            <strong>{formatDate(reservation.event_starts_at)}</strong>
                          </div>
                          <div>
                            <span>Fecha de compra</span>
                            <strong>{formatDate(reservation.reserved_at)}</strong>
                          </div>
                          <div>
                            <span>Estado del pago</span>
                            <strong>{getReservationPaymentStatusLabel(reservation)}</strong>
                          </div>
                          <div>
                            <span>Vigencia</span>
                            <strong>
                              {reservation.expires_at
                                ? isExpiredReservation(reservation)
                                  ? `Expirada el ${formatDate(reservation.expired_at || reservation.expires_at)}`
                                  : `Hasta ${formatDate(reservation.expires_at)}`
                                : "Sin limite"}
                            </strong>
                          </div>
                          <div>
                            <span>Cuotas</span>
                            <strong>{reservation.installment_count || 1}</strong>
                          </div>
                          <div>
                            <span>Compra reembolsable</span>
                            <strong>{reservation.is_refundable_purchase ? "Si" : "No"}</strong>
                          </div>
                          <div>
                            <span>Descuento aplicado</span>
                            <strong>{Number(reservation.discount_amount || 0) > 0 ? formatCurrency(reservation.discount_amount) : "Sin descuento"}</strong>
                          </div>
                        </div>

                        <div className="ticket-item-list">
                          <h4>Detalle de entrada</h4>
                          {reservationItems.length ? (
                            reservationItems.map((item, itemIndex) => (
                              <div className="ticket-item-row" key={item.id || `${reservation.id}-${itemIndex}`}>
                                <div>
                                  <strong>{`Entrada ${itemIndex + 1}`}</strong>
                                  <span>
                                    {item.quantity} unidad(es) · {formatCurrency(item.unit_price)} c/u
                                  </span>
                                </div>
                                <strong>{formatCurrency(item.total_amount)}</strong>
                              </div>
                            ))
                          ) : (
                            <div className="ticket-item-row">
                              <div>
                                <strong>Entrada general</strong>
                                <span>{reservation.quantity} unidad(es)</span>
                              </div>
                              <strong>{formatCurrency(reservation.total_amount)}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {previewReservation ? (
        <div className="ticket-preview-overlay" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) {
            setPreviewReservationId(null);
          }
        }}>
          <div className="ticket-preview-dialog">
            <div className="panel-card ticket-preview-card">
              <div className="ticket-preview-header">
                <div>
                  <p className="eyebrow">{previewHasIssuedAccess ? "Entrada digital" : "Resumen de reserva"}</p>
                  <h3>{previewReservation.event_title || `Evento #${previewReservation.event_id}`}</h3>
                  <p className="muted">{formatDate(previewReservation.event_starts_at)}</p>
                </div>
                <div className="cta-row compact-actions">
                  {previewHasIssuedAccess ? (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={isDownloadingTicketsPdf}
                      onClick={downloadIssuedTicketsPdf}
                    >
                      {isDownloadingTicketsPdf ? "Descargando..." : "Descargar PDF"}
                    </button>
                  ) : null}
                  <button className="ghost-button" type="button" onClick={() => setPreviewReservationId(null)}>
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="ticket-preview-body">
                <div className="ticket-qr-card">
                  {previewHasIssuedAccess ? (
                    isLoadingIssuedTickets ? (
                      <div className="ticket-qr-placeholder" aria-hidden="true">
                        <span>QR</span>
                      </div>
                    ) : previewPrimaryTicketQr ? (
                      <img className="ticket-qr-image" src={previewPrimaryTicketQr} alt="Codigo QR de acceso" />
                    ) : (
                      <div className="ticket-qr-placeholder" aria-hidden="true">
                        <span>QR</span>
                      </div>
                    )
                  ) : (
                    <div className="ticket-qr-placeholder" aria-hidden="true">
                      <span>RES</span>
                    </div>
                  )}
                  <strong>{previewReservation.reservation_code || `RES-${previewReservation.id}`}</strong>
                  <span>{previewHasIssuedAccess ? "Codigo digital de acceso" : "Reserva aun pendiente de pago"}</span>
                  {previewHasIssuedAccess ? (
                    isLoadingIssuedTickets ? (
                      <p className="muted">Generando codigos QR...</p>
                    ) : issuedTickets.length ? (
                      <div className="ticket-qr-list">
                        {issuedTickets.map((ticket) => {
                          const key = ticket?.id ? String(ticket.id) : String(ticket?.ticket_code || ticket?.qr_code || "");
                          const qrUrl = key ? issuedTicketsQrMap[key] : "";
                          return (
                            <div className="ticket-qr-list-item" key={`qr-${key || ticket.ticket_code}`}>
                              {qrUrl ? (
                                <img className="ticket-qr-thumb" src={qrUrl} alt={`QR ${ticket.ticket_code}`} />
                              ) : (
                                <div className="ticket-qr-placeholder small" aria-hidden="true">
                                  <span>QR</span>
                                </div>
                              )}
                              <div>
                                <strong>{ticket.ticket_code || "Entrada"}</strong>
                                <span className="muted">{ticket.status || "active"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted">Aun no hay entradas emitidas.</p>
                    )
                  ) : null}
                </div>

                <div className="ticket-preview-meta">
                  <div>
                    <span>Entradas</span>
                    <strong>{previewReservation.quantity}</strong>
                  </div>
                  <div>
                    <span>{previewHasIssuedAccess ? "Total pagado" : "Total reservado"}</span>
                    <strong>{formatCurrency(previewReservation.total_amount)}</strong>
                  </div>
                  <div>
                    <span>Metodo</span>
                    <strong>{formatPaymentMethodLabel(previewReservation.payment_method)}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>{getReservationStatusLabel(previewReservation)}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>{getReservationPaymentStatusLabel(previewReservation)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Premium de Confirmación de Reembolso */}
      {refundConfirmTarget ? (
        <div 
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div 
            className="modal-card"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              border: "1px solid #f1f5f9"
            }}
          >
            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div 
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444",
                  fontSize: "24px",
                  flexShrink: 0
                }}
              >
                🛡️
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1e1b4b", margin: "0 0 6px 0" }}>
                  Confirmar solicitud de reembolso
                </h3>
                <p className="muted" style={{ fontSize: "14px", margin: 0 }}>
                  Tu compra califica para reembolso garantizado bajo la cobertura del seguro adquirido.
                </p>
              </div>
            </div>

            <div 
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                padding: "16px",
                fontSize: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "24px",
                border: "1px solid #f1f5f9"
              }}
            >
              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>Evento</span>
                <strong style={{ color: "#0f172a" }}>{refundConfirmTarget.event_title}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span className="muted" style={{ display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>Fecha del evento</span>
                  <strong style={{ color: "#0f172a" }}>{formatDate(refundConfirmTarget.event_starts_at)}</strong>
                </div>
                <div>
                  <span className="muted" style={{ display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>Monto de Devolución</span>
                  <strong style={{ color: "#4d44e3" }}>{formatCurrency(refundConfirmTarget.total_amount)}</strong>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                <span className="muted" style={{ display: "block", fontSize: "11px", textTransform: "uppercase", fontWeight: "bold" }}>Destino del reembolso</span>
                <strong style={{ color: "#0f172a", fontSize: "13px" }}>
                  {refundConfirmTarget.card_snapshot_masked || formatPaymentMethodLabel(refundConfirmTarget.payment_method)}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                className="ghost-button" 
                type="button" 
                onClick={() => setRefundConfirmTarget(null)}
                style={{ padding: "10px 20px" }}
              >
                Volver
              </button>
              <button 
                className="primary-button" 
                type="button" 
                onClick={() => executeRefundRequest(refundConfirmTarget.id)}
                style={{ padding: "10px 20px", backgroundColor: "#ef4444" }}
              >
                Confirmar reembolso
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CustomerProfilePage({ auth }) {
  const [profileFeedback, setProfileFeedback] = useState({ type: "", message: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRequestingOrganizer, setIsRequestingOrganizer] = useState(false);
  const [walletCards, setWalletCards] = useState([]);
  const [walletFeedback, setWalletFeedback] = useState({ type: "", message: "" });
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isSavingWalletCard, setIsSavingWalletCard] = useState(false);
  const [walletCardForm, setWalletCardForm] = useState({
    brand: "VISA",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    holderName: "",
    isDefault: true,
  });
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    country: "Peru",
    city: "",
    documentNumber: "",
    gender: "unspecified",
    phone: "+51",
    acceptsMarketing: false,
  });

  useEffect(() => {
    setProfileForm({
      fullName: auth.currentUser?.full_name || "",
      country: auth.currentUser?.country || "Peru",
      city: auth.currentUser?.city || "",
      documentNumber: auth.currentUser?.document_number || "",
      gender: auth.currentUser?.gender || "unspecified",
      phone: auth.currentUser?.phone || "+51",
      acceptsMarketing: Boolean(auth.currentUser?.accepts_marketing),
    });
  }, [auth.currentUser]);

  const loadWalletCards = useCallback(async () => {
    if (!auth.token || !["customer", "client"].includes(auth.currentUser?.role)) {
      return;
    }

    setIsLoadingWallet(true);
    setWalletFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/wallet/cards", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setWalletCards(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setWalletFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos cargar tus tarjetas.") });
    } finally {
      setIsLoadingWallet(false);
    }
  }, [auth.currentUser?.role, auth.token]);

  useEffect(() => {
    loadWalletCards();
  }, [loadWalletCards]);

  const registerWalletCard = async (event) => {
    event.preventDefault();
    if (!auth.token) {
      return;
    }

    setIsSavingWalletCard(true);
    setWalletFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/wallet/cards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          brand: walletCardForm.brand,
          cardNumber: walletCardForm.cardNumber,
          expMonth: walletCardForm.expMonth,
          expYear: walletCardForm.expYear,
          holderName: walletCardForm.holderName,
          isDefault: Boolean(walletCardForm.isDefault),
        }),
      });

      setWalletCardForm((prev) => ({ ...prev, cardNumber: "" }));
      setWalletFeedback({ type: "success", message: response.message });
      await loadWalletCards();
    } catch (error) {
      setWalletFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos registrar la tarjeta.") });
    } finally {
      setIsSavingWalletCard(false);
    }
  };

  const setDefaultWalletCard = async (cardId) => {
    if (!auth.token) {
      return;
    }

    setIsSavingWalletCard(true);
    setWalletFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest(`/wallet/cards/${cardId}/default`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setWalletFeedback({ type: "success", message: response.message });
      await loadWalletCards();
    } catch (error) {
      setWalletFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos actualizar tu tarjeta predeterminada.") });
    } finally {
      setIsSavingWalletCard(false);
    }
  };

  const deleteWalletCard = async (cardId) => {
    if (!auth.token) {
      return;
    }

    setIsSavingWalletCard(true);
    setWalletFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest(`/wallet/cards/${cardId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setWalletFeedback({ type: "success", message: response.message });
      await loadWalletCards();
    } catch (error) {
      setWalletFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos eliminar la tarjeta.") });
    } finally {
      setIsSavingWalletCard(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!isValidFullName(profileForm.fullName)) {
      setProfileFeedback({ type: "error", message: "El nombre completo solo puede contener letras y espacios." });
      return;
    }

    setIsSavingProfile(true);
    setProfileFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/users/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(profileForm),
      });

      auth.saveSession(auth.token, response.data);
      setProfileFeedback({ type: "success", message: response.message });
    } catch (error) {
      setProfileFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos actualizar tu perfil.") });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const requestOrganizerRole = async () => {
    setIsRequestingOrganizer(true);
    setProfileFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/users/me/request-organizer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      auth.saveSession(auth.token, response.data);
      setProfileFeedback({ type: "success", message: response.message });
    } catch (error) {
      setProfileFeedback({
        type: "error",
        message: getUserFacingErrorMessage(error, "No pudimos enviar tu solicitud en este momento."),
      });
    } finally {
      setIsRequestingOrganizer(false);
    }
  };

  const canRequestOrganizerRole =
    auth.currentUser?.role === "customer" && auth.currentUser?.organizer_status !== "approved";

  return (
    <section className="page-section dashboard-page customer-profile-page">
      <div className="profile-settings-layout">
        <aside className="panel-card profile-settings-sidebar">
          <p className="eyebrow">Configuracion</p>
          <nav className="profile-settings-nav" aria-label="Configuracion de perfil">
            <a className="active" href="#perfil">
              Mi perfil
            </a>
            <a href="#tarjetas">Mis tarjetas</a>
            <a href="#cuenta">Cuenta</a>
          </nav>
        </aside>

        <div className="dashboard-stack">
          <section className="panel-card profile-overview-card" id="perfil">
            <div className="profile-overview-main">
              <img src={CUSTOMER_AVATAR_IMAGE} alt="Mi perfil" />
              <div>
                <p className="eyebrow">Mi perfil</p>
                <h2>{auth.currentUser?.full_name || "Usuario CrowdPass"}</h2>
                <p className="muted">Actualiza tus datos personales y mantén tu cuenta al día desde un solo lugar.</p>
              </div>
            </div>
            <div className="profile-overview-meta">
              <div>
                <span>Correo</span>
                <strong>{auth.currentUser?.email}</strong>
              </div>
              <div>
                <span>Pais</span>
                <strong>{auth.currentUser?.country || "Peru"}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>Datos personales</h3>
                <p className="muted">Edita solo la información necesaria para tus próximas compras.</p>
              </div>
            </div>
            {profileFeedback.message ? <InlineMessage type={profileFeedback.type} message={profileFeedback.message} /> : null}
            <form className="form-grid compact-grid" onSubmit={saveProfile}>
              <label>
                Nombre completo
                <input value={profileForm.fullName} onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
              </label>
              <label>
                Pais
                <input value={profileForm.country} onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))} required />
              </label>
              <label>
                Ciudad
                <input value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} required />
              </label>
              <label>
                Documento
                <input value={profileForm.documentNumber} onChange={(event) => setProfileForm((prev) => ({ ...prev, documentNumber: event.target.value }))} required />
              </label>
              <label>
                Genero
                <select value={profileForm.gender} onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))}>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Telefono
                <input value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} required />
              </label>
              <label className="checkbox-field form-span-2">
                <input type="checkbox" checked={profileForm.acceptsMarketing} onChange={(event) => setProfileForm((prev) => ({ ...prev, acceptsMarketing: event.target.checked }))} />
                <span>Recibir comunicaciones comerciales.</span>
              </label>
              <button className="primary-button" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>

          <section className="panel-card" id="tarjetas">
            <div className="panel-card-header">
              <div>
                <h3>Mis tarjetas</h3>
                <p className="muted">Guarda métodos de pago simulados. Solo se almacenan los últimos 4 dígitos.</p>
              </div>
            </div>

            {walletFeedback.message ? <InlineMessage type={walletFeedback.type} message={walletFeedback.message} /> : null}

            <div className="ticket-item-list">
              {isLoadingWallet ? <p className="muted">Cargando tarjetas...</p> : null}
              {!isLoadingWallet && walletCards.length === 0 ? <p className="muted">Aún no tienes tarjetas registradas.</p> : null}
              {walletCards.map((card) => (
                <div className="ticket-item-row" key={card.id}>
                  <div>
                    <strong>
                      {card.brand} · {card.masked}
                    </strong>
                    <span>
                      Expira {String(card.exp_month).padStart(2, "0")}/{card.exp_year} · {card.holder_name}
                    </span>
                  </div>
                  <div className="ticket-card-actions">
                    {card.is_default ? (
                      <span className="table-status">Default</span>
                    ) : (
                      <button className="ghost-button" type="button" disabled={isSavingWalletCard} onClick={() => setDefaultWalletCard(card.id)}>
                        Hacer default
                      </button>
                    )}
                    <button className="ghost-button danger-button" type="button" disabled={isSavingWalletCard} onClick={() => deleteWalletCard(card.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="form-grid compact-grid" onSubmit={registerWalletCard}>
              <label>
                Marca
                <select value={walletCardForm.brand} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, brand: event.target.value }))}>
                  <option value="VISA">VISA</option>
                  <option value="MASTERCARD">MASTERCARD</option>
                  <option value="AMEX">AMEX</option>
                </select>
              </label>
              <label>
                Numero
                <input inputMode="numeric" value={walletCardForm.cardNumber} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, cardNumber: event.target.value }))} required />
              </label>
              <label>
                Mes
                <input inputMode="numeric" value={walletCardForm.expMonth} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, expMonth: event.target.value }))} placeholder="MM" required />
              </label>
              <label>
                Año
                <input inputMode="numeric" value={walletCardForm.expYear} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, expYear: event.target.value }))} placeholder="YYYY" required />
              </label>
              <label className="form-span-2">
                Titular
                <input value={walletCardForm.holderName} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, holderName: event.target.value }))} required />
              </label>
              <label className="checkbox-field form-span-2">
                <input type="checkbox" checked={Boolean(walletCardForm.isDefault)} onChange={(event) => setWalletCardForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
                <span>Marcar como predeterminada.</span>
              </label>
              <button className="primary-button" type="submit" disabled={isSavingWalletCard}>
                {isSavingWalletCard ? "Registrando..." : "Registrar tarjeta"}
              </button>
            </form>
          </section>

          <section className="panel-card account-danger-card" id="cuenta">
            <div className="panel-card-header">
              <div>
                <h3>Cuenta</h3>
                <p className="muted">Centraliza aquí las acciones sensibles de tu cuenta.</p>
              </div>
            </div>
            <div className="account-danger-row">
              <div>
                <strong>Eliminar cuenta</strong>
                <p className="muted">La opción quedará habilitada cuando terminemos el flujo seguro de eliminación en backend.</p>
              </div>
              <button className="ghost-button danger-button" type="button" disabled>
                Eliminar cuenta
              </button>
            </div>
          </section>

          {canRequestOrganizerRole ? (
            <section className="panel-card promo-card">
              <div className="panel-card-header">
                <div>
                  <h3>Publica como organizer</h3>
                  <p className="muted">Cuando tu perfil esté listo, solicita acceso para crear y gestionar tus eventos.</p>
                </div>
              </div>
              <div className="account-danger-row organizer-request-row">
                <div>
                  <strong>
                    {auth.currentUser?.organizer_status === "pending"
                      ? "Solicitud pendiente de revisión"
                      : "Solicitar acceso como organizer"}
                  </strong>
                  <p className="muted">
                    {auth.currentUser?.organizer_status === "pending"
                      ? "Tu solicitud ya fue enviada. Un administrador la revisará antes de habilitar tu panel."
                      : "Una vez aprobada, verás el panel de organizer para crear eventos, tickets y publicaciones."}
                  </p>
                </div>
                <button
                  className="primary-button inline-action"
                  type="button"
                  disabled={isRequestingOrganizer || auth.currentUser?.organizer_status === "pending"}
                  onClick={requestOrganizerRole}
                >
                  {auth.currentUser?.organizer_status === "pending"
                    ? "Solicitud pendiente"
                    : isRequestingOrganizer
                      ? "Enviando..."
                      : "Solicitar acceso"}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StaffReservationsPage({ auth }) {
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewReservationId, setPreviewReservationId] = useState(null);

  const loadReservations = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await apiRequest("/reservations", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        setReservations(response.data || []);
        setFeedback("");
      } catch (error) {
        setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar las reservas operativas en este momento."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token]
  );

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useAutoRefresh(() => loadReservations({ silent: true }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  const orderedReservations = useMemo(() => {
    return [...reservations].sort((left, right) => {
      const leftDate = left.reserved_at ? new Date(left.reserved_at).getTime() : 0;
      const rightDate = right.reserved_at ? new Date(right.reserved_at).getTime() : 0;
      return rightDate - leftDate;
    });
  }, [reservations]);

  const metrics = useMemo(() => {
    return orderedReservations.reduce(
      (summary, reservation) => {
        summary.total += 1;

        if (reservation.status === "confirmed") {
          summary.confirmed += 1;
        }

        if (reservation.status === "pending_payment") {
          summary.pending += 1;
        }

        if (isExpiredReservation(reservation)) {
          summary.expired += 1;
        }

        return summary;
      },
      {
        total: 0,
        confirmed: 0,
        pending: 0,
        expired: 0,
      }
    );
  }, [orderedReservations]);

  const previewReservation = useMemo(
    () => orderedReservations.find((reservation) => reservation.id === previewReservationId) || null,
    [orderedReservations, previewReservationId]
  );

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h2>Monitoreo operativo de reservas</h2>
          <p className="muted">Consulta el estado de las reservas del sistema sin exponer acciones de compra ni privilegios administrativos totales.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <div className="metrics-grid">
        <article className="metric-card highlight">
          <span>Total reservas</span>
          <strong>{metrics.total}</strong>
          <small>Operaciones registradas</small>
        </article>
        <article className="metric-card">
          <span>Confirmadas</span>
          <strong>{metrics.confirmed}</strong>
          <small>Con acceso emitido</small>
        </article>
        <article className="metric-card">
          <span>Pendientes</span>
          <strong>{metrics.pending}</strong>
          <small>Esperando pago</small>
        </article>
        <article className="metric-card">
          <span>Expiradas</span>
          <strong>{metrics.expired}</strong>
          <small>Stock ya liberado</small>
        </article>
      </div>

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Reservas recientes</h3>
            <p className="muted">Vista operacional para seguimiento y soporte.</p>
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando reservas...</p> : null}

        {!isLoading && orderedReservations.length === 0 ? (
          <div className="empty-state compact-state">
            <h3>No hay reservas registradas</h3>
            <p className="muted">Cuando existan operaciones en el sistema apareceran aqui.</p>
          </div>
        ) : null}

        {!isLoading && orderedReservations.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Cliente</th>
                  <th>Evento</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {orderedReservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>{reservation.reservation_code || `#${reservation.id}`}</td>
                    <td>
                      <div className="summary-stat-list compact-summary">
                        <div>
                          <strong>{reservation.user_full_name || `Usuario #${reservation.user_id}`}</strong>
                          <span>{reservation.user_email || "Correo no disponible"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="summary-stat-list compact-summary">
                        <div>
                          <strong>{reservation.event_title || `Evento #${reservation.event_id}`}</strong>
                          <span>{formatDate(reservation.event_starts_at)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${reservation.status}`}>{getReservationStatusLabel(reservation)}</span>
                    </td>
                    <td>{getReservationPaymentStatusLabel(reservation)}</td>
                    <td>{formatCurrency(reservation.total_amount)}</td>
                    <td>
                      <button className="secondary-button inline-action" type="button" onClick={() => setPreviewReservationId(reservation.id)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {previewReservation ? (
        <div className="ticket-preview-overlay" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) {
            setPreviewReservationId(null);
          }
        }}>
          <div className="ticket-preview-dialog">
            <div className="panel-card ticket-preview-card">
              <div className="ticket-preview-header">
                <div>
                  <p className="eyebrow">Detalle operativo</p>
                  <h3>{previewReservation.reservation_code || `RES-${previewReservation.id}`}</h3>
                  <p className="muted">{previewReservation.user_full_name || `Usuario #${previewReservation.user_id}`}</p>
                </div>
                <button className="ghost-button" type="button" onClick={() => setPreviewReservationId(null)}>
                  Cerrar
                </button>
              </div>

              <div className="ticket-preview-body">
                <div className="ticket-preview-meta">
                  <div>
                    <span>Evento</span>
                    <strong>{previewReservation.event_title || `Evento #${previewReservation.event_id}`}</strong>
                  </div>
                  <div>
                    <span>Fecha del evento</span>
                    <strong>{formatDate(previewReservation.event_starts_at)}</strong>
                  </div>
                  <div>
                    <span>Cliente</span>
                    <strong>{previewReservation.user_email || "Correo no disponible"}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>{getReservationStatusLabel(previewReservation)}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>{getReservationPaymentStatusLabel(previewReservation)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{formatCurrency(previewReservation.total_amount)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StaffRefundsPage({ auth }) {
  const [refundQueue, setRefundQueue] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingReservationId, setProcessingReservationId] = useState(null);
  const [activeRefundStatus, setActiveRefundStatus] = useState("pending");

  const loadRefundQueue = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await apiRequest("/reservations/refund-queue?refundType=refundable_purchase", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        setRefundQueue(Array.isArray(response.data) ? response.data : []);
        setFeedback({ type: "", message: "" });
      } catch (error) {
        setFeedback({
          type: "error",
          message: getUserFacingErrorMessage(error, "No pudimos cargar la cola de reembolsos en este momento."),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token]
  );

  useEffect(() => {
    loadRefundQueue();
  }, [loadRefundQueue]);

  useAutoRefresh(() => loadRefundQueue({ silent: true }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  const refundStatusCounts = useMemo(() => {
    return refundQueue.reduce(
      (summary, item) => {
        summary.all += 1;
        if (["pending", "processing"].includes(item.refund_status)) {
          summary.pending += 1;
        }
        if (item.refund_status === "rejected") {
          summary.rejected += 1;
        }
        if (item.refund_status === "completed") {
          summary.completed += 1;
        }
        return summary;
      },
      { all: 0, pending: 0, rejected: 0, completed: 0 }
    );
  }, [refundQueue]);

  const filteredQueue = useMemo(() => {
    if (activeRefundStatus === "pending") {
      return refundQueue.filter((item) => ["pending", "processing"].includes(item.refund_status));
    }
    if (activeRefundStatus === "rejected") {
      return refundQueue.filter((item) => item.refund_status === "rejected");
    }
    if (activeRefundStatus === "completed") {
      return refundQueue.filter((item) => item.refund_status === "completed");
    }
    return refundQueue;
  }, [activeRefundStatus, refundQueue]);

  const orderedQueue = useMemo(() => {
    return [...filteredQueue].sort((left, right) => {
      const leftDate = left.refund_requested_at ? new Date(left.refund_requested_at).getTime() : 0;
      const rightDate = right.refund_requested_at ? new Date(right.refund_requested_at).getTime() : 0;
      return leftDate - rightDate;
    });
  }, [filteredQueue]);

  const approveRefund = async (reservationId) => {
    setProcessingReservationId(reservationId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/reservations/${reservationId}/refund/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ notes: "Aprobado por staff (seguro reembolsable)." }),
      });

      setFeedback({ type: "success", message: "Reembolso aprobado y procesado." });
      await loadRefundQueue({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos aprobar el reembolso.") });
    } finally {
      setProcessingReservationId(null);
    }
  };

  const rejectRefund = async (reservationId) => {
    const notes = window.prompt("Motivo del rechazo (min 5 caracteres):", "");
    if (!notes) {
      return;
    }

    const normalizedNotes = String(notes).trim();
    if (normalizedNotes.length < 5) {
      setFeedback({ type: "error", message: "Debes indicar un motivo mas claro para rechazar el reembolso." });
      return;
    }

    setProcessingReservationId(reservationId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/reservations/${reservationId}/refund/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ notes: normalizedNotes }),
      });

      setFeedback({ type: "success", message: "Reembolso rechazado." });
      await loadRefundQueue({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos rechazar el reembolso.") });
    } finally {
      setProcessingReservationId(null);
    }
  };

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h2>Reembolsos por seguro</h2>
          <p className="muted">Aprueba solicitudes de reembolso hechas por clientes con seguro (antes de 24 horas del evento).</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type || "error"} message={feedback.message} /> : null}

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Cola de solicitudes</h3>
            <p className="muted">Revisa solicitudes por seguro y aprueba o rechaza segun corresponda.</p>
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando cola...</p> : null}

        {!isLoading && refundQueue.length > 0 ? (
          <div className="market-filter-pill-row">
            <button
              className={`market-filter-pill ${activeRefundStatus === "pending" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("pending")}
            >
              {`Pendientes (${refundStatusCounts.pending})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "rejected" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("rejected")}
            >
              {`Rechazadas (${refundStatusCounts.rejected})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "completed" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("completed")}
            >
              {`Completadas (${refundStatusCounts.completed})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "all" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("all")}
            >
              {`Todas (${refundStatusCounts.all})`}
            </button>
          </div>
        ) : null}

        {!isLoading && orderedQueue.length === 0 ? (
          <div className="empty-state compact-state">
            <h3>No hay solicitudes</h3>
            <p className="muted">No hay registros para el filtro seleccionado.</p>
          </div>
        ) : null}

        {!isLoading && orderedQueue.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Cliente</th>
                  <th>Evento</th>
                  <th>Solicitado</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {orderedQueue.map((item) => (
                  <tr key={`refund-${item.id}`}>
                    <td>{item.reservation_code || `#${item.id}`}</td>
                    <td>
                      <div className="summary-stat-list compact-summary">
                        <div>
                          <strong>{item.user_full_name || `Usuario #${item.user_id}`}</strong>
                          <span>{item.user_email || "Correo no disponible"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="summary-stat-list compact-summary">
                        <div>
                          <strong>{item.event_title || `Evento #${item.event_id}`}</strong>
                          <span>{formatDate(item.event_starts_at)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.refund_requested_at ? formatDate(item.refund_requested_at) : "-"}</td>
                    <td>{formatReservationRefundStatus(item.refund_status)}</td>
                    <td>{formatCurrency(item.refund_amount || item.total_amount)}</td>
                    <td>
                      <div className="cta-row compact-actions">
                        {["pending", "processing"].includes(item.refund_status) ? (
                          <>
                            <button
                              className="primary-button inline-action"
                              type="button"
                              disabled={processingReservationId === item.id}
                              onClick={() => approveRefund(item.id)}
                            >
                              {processingReservationId === item.id ? "Procesando..." : "Aprobar"}
                            </button>
                            <button
                              className="ghost-button inline-action"
                              type="button"
                              disabled={processingReservationId === item.id}
                              onClick={() => rejectRefund(item.id)}
                            >
                              Rechazar
                            </button>
                          </>
                        ) : (
                          <span className="muted">Sin acciones</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function StaffEventCancellationsPage({ auth }) {
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCancellations = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await apiRequest("/events/cancellations?limit=20&page=1", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        setItems(Array.isArray(response.data) ? response.data : []);
        setFeedback({ type: "", message: "" });
      } catch (error) {
        setFeedback({
          type: "error",
          message: getUserFacingErrorMessage(error, "No pudimos cargar las cancelaciones en este momento."),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token]
  );

  useEffect(() => {
    loadCancellations();
  }, [loadCancellations]);

  useAutoRefresh(() => loadCancellations({ silent: true }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  const orderedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const leftDate = left.cancelled_at ? new Date(left.cancelled_at).getTime() : 0;
      const rightDate = right.cancelled_at ? new Date(right.cancelled_at).getTime() : 0;
      return rightDate - leftDate;
    });
  }, [items]);

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h2>Cancelaciones y reembolsos masivos</h2>
          <p className="muted">Monitorea el progreso de reembolsos cuando un evento es cancelado.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type || "error"} message={feedback.message} /> : null}

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Eventos cancelados</h3>
            <p className="muted">El sistema procesa reembolsos en segundo plano en lotes.</p>
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando eventos cancelados...</p> : null}

        {!isLoading && orderedItems.length === 0 ? (
          <div className="empty-state compact-state">
            <h3>No hay eventos cancelados</h3>
            <p className="muted">Cuando se cancele un evento, aparecera aqui con su progreso de reembolso.</p>
          </div>
        ) : null}

        {!isLoading && orderedItems.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Cancelado</th>
                  <th>Pagos capturados</th>
                  <th>Completados</th>
                  <th>Pendientes</th>
                  <th>Rechazados</th>
                  <th>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {orderedItems.map((eventItem) => {
                  const captured = Number(eventItem.captured_reservations || 0);
                  const completed = Number(eventItem.refunds_completed || 0);
                  const pending = Number(eventItem.refunds_pending || 0) + Number(eventItem.refunds_processing || 0);
                  const rejected = Number(eventItem.refunds_rejected || 0);
                  const progress = captured ? Math.min(100, Math.round((completed / captured) * 100)) : 0;

                  return (
                    <tr key={`cancelled-${eventItem.id}`}>
                      <td>
                        <div className="summary-stat-list compact-summary">
                          <div>
                            <strong>
                              <Link className="plain-link" to={`/staff/cancellations/${eventItem.id}`}>
                                {eventItem.title || `Evento #${eventItem.id}`}
                              </Link>
                            </strong>
                            <span>{[eventItem.city, eventItem.country].filter(Boolean).join(", ") || "Ubicacion no disponible"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{eventItem.cancelled_at ? formatDate(eventItem.cancelled_at) : "-"}</td>
                      <td>{captured}</td>
                      <td>{completed}</td>
                      <td>{pending}</td>
                      <td>{rejected}</td>
                      <td>{`${progress}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function StaffEventCancellationDetailPage({ auth }) {
  const { eventId } = useParams();
  const [eventInfo, setEventInfo] = useState(null);
  const [refundQueue, setRefundQueue] = useState([]);
  const [activeRefundStatus, setActiveRefundStatus] = useState("rejected");
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingReservationId, setProcessingReservationId] = useState(null);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadData = useCallback(
    async ({ silent = false, page = 1, append = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [eventResponse, queueResponse] = await Promise.all([
          apiRequest(`/events/${eventId}/communication-targets`, {
            method: "GET",
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          apiRequest(
            `/reservations/refund-queue?eventId=${encodeURIComponent(eventId)}&refundType=event_cancelled&limit=200&page=${encodeURIComponent(
              page
            )}`,
            {
            method: "GET",
            headers: { Authorization: `Bearer ${auth.token}` },
            }
          ),
        ]);

        setEventInfo(eventResponse.data?.event || null);
        const nextItems = Array.isArray(queueResponse.data) ? queueResponse.data : [];
        setRefundQueue((current) => (append ? [...current, ...nextItems] : nextItems));
        setCurrentPage(page);
        setHasNextPage(Boolean(queueResponse.meta?.hasNextPage));
        setFeedback({ type: "", message: "" });
      } catch (error) {
        setFeedback({
          type: "error",
          message: getUserFacingErrorMessage(error, "No pudimos cargar el detalle de cancelacion."),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token, eventId]
  );

  useEffect(() => {
    loadData({ page: 1, append: false });
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true, page: 1, append: false }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  const refundStatusCounts = useMemo(() => {
    return refundQueue.reduce(
      (summary, item) => {
        summary.all += 1;
        if (["pending", "processing"].includes(item.refund_status)) {
          summary.pending += 1;
        }
        if (item.refund_status === "rejected") {
          summary.rejected += 1;
        }
        if (item.refund_status === "completed") {
          summary.completed += 1;
        }
        return summary;
      },
      { all: 0, pending: 0, rejected: 0, completed: 0 }
    );
  }, [refundQueue]);

  const filteredQueue = useMemo(() => {
    if (activeRefundStatus === "pending") {
      return refundQueue.filter((item) => ["pending", "processing"].includes(item.refund_status));
    }
    if (activeRefundStatus === "rejected") {
      return refundQueue.filter((item) => item.refund_status === "rejected");
    }
    if (activeRefundStatus === "completed") {
      return refundQueue.filter((item) => item.refund_status === "completed");
    }
    return refundQueue;
  }, [activeRefundStatus, refundQueue]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchedQueue = useMemo(() => {
    if (!normalizedSearch) {
      return filteredQueue;
    }

    return filteredQueue.filter((item) => {
      const haystack = [
        item.reservation_code,
        item.user_email,
        item.user_full_name,
        item.refund_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [filteredQueue, normalizedSearch]);

  const orderedQueue = useMemo(() => {
    return [...searchedQueue].sort((left, right) => {
      const leftDate = left.refund_requested_at ? new Date(left.refund_requested_at).getTime() : 0;
      const rightDate = right.refund_requested_at ? new Date(right.refund_requested_at).getTime() : 0;
      return leftDate - rightDate;
    });
  }, [searchedQueue]);

  const retryRefund = async (reservationId) => {
    const notes = window.prompt("Nota opcional para el reintento:", "");
    setProcessingReservationId(reservationId);
    setFeedback({ type: "", message: "" });

    try {
      await apiRequest(`/reservations/${reservationId}/refund/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ notes: notes ? String(notes).trim() : null }),
      });

      setFeedback({ type: "success", message: "Reembolso reprogramado. El worker lo procesara en breve." });
      await loadData({ silent: true });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos reintentar el reembolso.") });
    } finally {
      setProcessingReservationId(null);
    }
  };

  const retryRejectedBatch = async () => {
    const confirmed = window.confirm("Se reintentaran reembolsos rechazados (hasta 50). Deseas continuar?");
    if (!confirmed) {
      return;
    }

    setFeedback({ type: "", message: "" });
    try {
      const response = await apiRequest(`/events/${eventId}/refunds/retry-rejected`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ limit: 50, notes: "Reintento masivo solicitado por staff." }),
      });

      const updated = Number(response.data?.updated || 0);
      setFeedback({ type: "success", message: `Reprogramados: ${updated}.` });
      await loadData({ silent: true, page: 1, append: false });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos reprogramar reembolsos rechazados.") });
    }
  };

  const runWorkerNow = async () => {
    const rawLimit = window.prompt("Cuantos reembolsos quieres procesar ahora? (1-50)", "8");
    if (rawLimit === null) {
      return;
    }

    const normalizedLimit =
      Number.isFinite(Number(rawLimit)) && Number(rawLimit) > 0 ? Math.min(Number(rawLimit), 50) : 8;

    setIsRunningWorker(true);
    setFeedback({ type: "", message: "" });
    try {
      const response = await apiRequest("/reservations/refund-worker/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ limit: normalizedLimit }),
      });

      const claimed = Number(response.data?.claimed || 0);
      const completed = Number(response.data?.completed || 0);
      const rejected = Number(response.data?.rejected || 0);
      setFeedback({
        type: "success",
        message: `Worker ejecutado. Tomados: ${claimed}, completados: ${completed}, rechazados: ${rejected}.`,
      });
      await loadData({ silent: true, page: 1, append: false });
    } catch (error) {
      setFeedback({ type: "error", message: getUserFacingErrorMessage(error, "No pudimos ejecutar el worker.") });
    } finally {
      setIsRunningWorker(false);
    }
  };

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h2>{`Cancelacion: ${eventInfo?.title || `Evento #${eventId}`}`}</h2>
          <p className="muted">Reintenta reembolsos rechazados y monitorea el avance del procesamiento masivo.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type || "error"} message={feedback.message} /> : null}

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Reembolsos por cancelacion de evento</h3>
            <p className="muted">Filtra por estado para ver pendientes, completados o rechazados.</p>
          </div>
          <div className="cta-row">
            <button
              className="primary-button"
              type="button"
              disabled={isLoading || isRunningWorker}
              onClick={runWorkerNow}
            >
              {isRunningWorker ? "Ejecutando worker..." : "Ejecutar worker ahora"}
            </button>
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando...</p> : null}

        {!isLoading && refundQueue.length > 0 ? (
          <div className="market-filter-pill-row">
            <button
              className={`market-filter-pill ${activeRefundStatus === "pending" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("pending")}
            >
              {`Pendientes (${refundStatusCounts.pending})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "rejected" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("rejected")}
            >
              {`Rechazados (${refundStatusCounts.rejected})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "completed" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("completed")}
            >
              {`Completados (${refundStatusCounts.completed})`}
            </button>
            <button
              className={`market-filter-pill ${activeRefundStatus === "all" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveRefundStatus("all")}
            >
              {`Todos (${refundStatusCounts.all})`}
            </button>
            {refundStatusCounts.rejected > 0 ? (
              <button className="market-filter-pill" type="button" onClick={retryRejectedBatch}>
                Reintentar rechazados
              </button>
            ) : null}
          </div>
        ) : null}

        {!isLoading && refundQueue.length > 0 ? (
          <div className="market-filter-search-row">
            <input
              className="text-input"
              placeholder="Buscar por reserva, correo o nota..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        ) : null}

        {!isLoading && orderedQueue.length === 0 ? (
          <div className="empty-state compact-state">
            <h3>No hay registros</h3>
            <p className="muted">No hay reembolsos para el filtro seleccionado.</p>
          </div>
        ) : null}

        {!isLoading && orderedQueue.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>Cliente</th>
                  <th>Solicitado</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Detalle</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {orderedQueue.map((item) => (
                  <tr key={`cancel-refund-${item.id}`}>
                    <td>{item.reservation_code || `#${item.id}`}</td>
                    <td>{item.user_email || item.user_full_name || `Usuario #${item.user_id}`}</td>
                    <td>{item.refund_requested_at ? formatDate(item.refund_requested_at) : "-"}</td>
                    <td>{formatReservationRefundStatus(item.refund_status)}</td>
                    <td>{formatCurrency(item.refund_amount || item.total_amount)}</td>
                    <td>{item.refund_notes ? String(item.refund_notes).slice(0, 80) : "-"}</td>
                    <td>
                      {item.refund_status === "rejected" ? (
                        <button
                          className="primary-button inline-action"
                          type="button"
                          disabled={processingReservationId === item.id}
                          onClick={() => retryRefund(item.id)}
                        >
                          {processingReservationId === item.id ? "Reintentando..." : "Reintentar"}
                        </button>
                      ) : (
                        <span className="muted">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!isLoading && hasNextPage ? (
          <div className="cta-row">
            <button
              className="ghost-button"
              type="button"
              onClick={() => loadData({ silent: true, page: currentPage + 1, append: true })}
            >
              Cargar mas
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function OrganizerEventsPage({ auth }) {
  const {
    events,
    changeRequests,
    categories,
    formData,
    editingEventId,
    feedback,
    isLoading,
    isRefreshing,
    isSubmitting,
    isRequestSubmitting,
    deletingId,
    disablingId,
    isEventModalOpen,
    isChangeRequestModalOpen,
    changeRequestMode,
    changeRequestEventTitle,
    changeRequestExplanation,
    changeRequestSummary,
    changeRequestAttachments,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    submitChangeRequest,
    editEvent,
    deleteEvent,
    disableEvent,
    updateChangeRequestExplanation,
    updateChangeRequestAttachments,
    removeChangeRequestAttachment,
    openCreateModal,
    closeEventModal,
    closeChangeRequestModal,
    organizersList,
  } = useManagedEventsData(auth, { errorMessage: "No pudimos cargar tus eventos en este momento." });
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeView = params.get("view") || "dashboard";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const organizerInsights = useMemo(() => {
    return events.reduce(
      (summary, eventItem) => {
        const ticketsSold = Number(eventItem.tickets_sold || 0);
        const totalTickets = Number(eventItem.total_tickets || 0);
        const availableTickets = Number(eventItem.available_tickets || 0);
        const totalRevenue = Number(eventItem.revenue_total || 0);
        const organizerRevenue = Number(eventItem.organizer_revenue || 0);
        const isSoldOut = eventItem.is_sold_out || availableTickets <= 0;

        summary.totalEvents += 1;
        summary.totalTicketsSold += ticketsSold;
        summary.totalRevenue += totalRevenue;
        summary.organizerRevenue += organizerRevenue;
        summary.totalTicketCapacity += totalTickets;

        if (eventItem.status === "pending_review") {
          summary.pendingReview += 1;
        }

        if (["published", "active"].includes(eventItem.status)) {
          summary.published += 1;
        }

        if (["draft", "rejected"].includes(eventItem.status)) {
          summary.pipelineBacklog += 1;
        }

        if (isSoldOut) {
          summary.soldOut += 1;
        }

        return summary;
      },
      {
        totalEvents: 0,
        pendingReview: 0,
        published: 0,
        soldOut: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        organizerRevenue: 0,
        totalTicketCapacity: 0,
        pipelineBacklog: 0,
      }
    );
  }, [events]);

  const sellThroughAverage = useMemo(() => {
    if (!organizerInsights.totalTicketCapacity) {
      return 0;
    }

    return Math.min(100, Math.round((organizerInsights.totalTicketsSold / organizerInsights.totalTicketCapacity) * 100));
  }, [organizerInsights]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredEvents = useMemo(() => {
    return events.filter((eventItem) => {
      const matchesStatus = statusFilter === "all" ? true : eventItem.status === statusFilter;
      const searchableText = [
        eventItem.title,
        eventItem.category_name,
        eventItem.city,
        eventItem.venue,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = normalizedSearchTerm ? searchableText.includes(normalizedSearchTerm) : true;

      const isExpired = isEventExpired(eventItem);
      if (activeView === "history") {
        return matchesStatus && matchesSearch && isExpired;
      } else if (activeView === "events") {
        return matchesStatus && matchesSearch && !isExpired;
      }

      return matchesStatus && matchesSearch;
    });
  }, [events, normalizedSearchTerm, statusFilter, activeView]);

  const sortedByRevenue = useMemo(() => {
    return [...filteredEvents].sort((left, right) => Number(right.revenue_total || 0) - Number(left.revenue_total || 0));
  }, [filteredEvents]);

  const topPerformingEvents = useMemo(() => sortedByRevenue.slice(0, 5), [sortedByRevenue]);

  const recentEvents = useMemo(() => {
    return [...filteredEvents]
      .sort((left, right) => {
        const leftDate = new Date(left.starts_at || left.event_date || left.created_at || 0).getTime();
        const rightDate = new Date(right.starts_at || right.event_date || right.created_at || 0).getTime();
        return rightDate - leftDate;
      })
      .slice(0, 6);
  }, [filteredEvents]);

  const topRevenueValue = useMemo(() => {
    return topPerformingEvents.reduce((maxValue, eventItem) => Math.max(maxValue, Number(eventItem.revenue_total || 0)), 0) || 1;
  }, [topPerformingEvents]);

  const latestRequestByEventId = useMemo(() => {
    return changeRequests.reduce((summary, request) => {
      if (!summary[request.event_id]) {
        summary[request.event_id] = request;
      }

      return summary;
    }, {});
  }, [changeRequests]);

  const publishedEvents = useMemo(() => filteredEvents.filter((eventItem) => ["published", "active"].includes(eventItem.status)), [filteredEvents]);
  const pendingEvents = useMemo(() => filteredEvents.filter((eventItem) => eventItem.status === "pending_review"), [filteredEvents]);
  const draftEvents = useMemo(() => filteredEvents.filter((eventItem) => ["draft", "rejected", "paused"].includes(eventItem.status)), [filteredEvents]);
  const soldOutEvents = useMemo(
    () => filteredEvents.filter((eventItem) => eventItem.is_sold_out || Number(eventItem.available_tickets || 0) <= 0),
    [filteredEvents]
  );

  const rankingLeadEvent = topPerformingEvents[0] || null;
  const pipelineHeroEvent = pendingEvents[0] || publishedEvents[0] || draftEvents[0] || filteredEvents[0] || null;

  const viewTitles = {
    dashboard: {
      eyebrow: "Dashboard de organizador",
      title: "Controla tu operacion sin distracciones",
      subtitle: "Mira ingresos, ventas, publicacion y movimiento reciente de tus eventos en una sola consola.",
    },
    events: {
      eyebrow: "Gestion de eventos",
      title: "Administra tu listado principal",
      subtitle: "Filtra, revisa disponibilidad y entra directo a editar sin cambiar de pantalla.",
    },
    history: {
      eyebrow: "Historial de eventos",
      title: "Revisa tus eventos pasados",
      subtitle: "Consulta métricas de tus eventos finalizados o vuelve a programarlos para una nueva fecha.",
    },
    ranking: {
      eyebrow: "Ranking de recaudacion",
      title: "Detecta tus eventos mas fuertes",
      subtitle: "Compara bruto, neto y traccion comercial con la misma fuente real del sistema.",
    },
    pipeline: {
      eyebrow: "Pipeline de publicacion",
      title: "Ubica que esta listo y que esta trabado",
      subtitle: "Revisa borradores, pendientes de revision y eventos ya publicados desde una vista operativa.",
    },
    catalog: {
      eyebrow: "Catalogo del organizer",
      title: "Explora tu portafolio visual",
      subtitle: "Consulta tus eventos como vitrina interna, con imagen, precio base y estado actual.",
    },
  };

  const activeViewCopy = viewTitles[activeView] || viewTitles.dashboard;

  const navigateOrganizerView = (viewId) => {
    const nextParams = new URLSearchParams(location.search);

    if (viewId === "dashboard") {
      nextParams.delete("view");
    } else {
      nextParams.set("view", viewId);
    }

    navigate({
      pathname: "/organizer/events",
      search: nextParams.toString() ? `?${nextParams.toString()}` : "",
    });
  };

  const getEventCover = (eventItem, index = 0) => {
    return eventItem?.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length];
  };

  const renderEventRows = (collection) => {
    if (!collection.length) {
      return (
        <div className="empty-state compact-state">
          <h3>No hay eventos para mostrar</h3>
          <p className="muted">Ajusta tus filtros o crea un nuevo evento para comenzar.</p>
        </div>
      );
    }

    return (
      <div className="table-wrapper">
        <table className="data-table organizer-data-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Vendidos</th>
              <th>Disponibles</th>
              <th>Bruto</th>
              <th>Neto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {collection.map((eventItem, index) => {
              const ticketsSold = Number(eventItem.tickets_sold || 0);
              const availableTickets = Number(eventItem.available_tickets || 0);
              const totalTickets = Number(eventItem.total_tickets || 0);
              const sellThrough = totalTickets > 0 ? Math.round(Math.min((ticketsSold / totalTickets) * 100, 100)) : 0;
              const isSoldOut = eventItem.is_sold_out || availableTickets <= 0;
              const latestRequest = latestRequestByEventId[eventItem.id];
              const requiresModeratedChange = ORGANIZER_PROTECTED_EVENT_STATUSES.includes(eventItem.status);

              return (
                <tr key={`org-row-${eventItem.id}`}>
                  <td>
                    <div className="organizer-table-event">
                      <img src={getEventCover(eventItem, index)} alt={eventItem.title} />
                      <div>
                        <strong>{eventItem.title}</strong>
                        <span>{eventItem.venue || "Venue por confirmar"}</span>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(eventItem.starts_at || eventItem.event_date)}</td>
                  <td>
                    <span className={`status-pill ${isSoldOut ? "cancelled" : eventItem.status}`}>
                      {isSoldOut ? "Sold out" : getEventStatusLabel(eventItem.status)}
                    </span>
                  </td>
                  <td>{ticketsSold}</td>
                  <td>{availableTickets}</td>
                  <td>{formatCurrency(eventItem.revenue_total || 0)}</td>
                  <td>{formatCurrency(eventItem.organizer_revenue || 0)}</td>
                  <td>
                    <div className="cta-row compact-actions organizer-row-actions">
                      {isEventExpired(eventItem) ? (
                        <button className="secondary-button highlight-action" type="button" onClick={() => editEvent(eventItem)}>
                          Volver a programar
                        </button>
                      ) : (
                        <button className="secondary-button" type="button" onClick={() => editEvent(eventItem)}>
                          {requiresModeratedChange ? "Solicitar cambios" : "Editar"}
                        </button>
                      )}
                      {["published", "active"].includes(eventItem.status) ? (
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={disablingId === eventItem.id}
                          onClick={() => disableEvent(eventItem.id)}
                        >
                          {disablingId === eventItem.id ? "Deshabilitando..." : "Deshabilitar"}
                        </button>
                      ) : null}
                      <button className="ghost-button" type="button" disabled={deletingId === eventItem.id} onClick={() => deleteEvent(eventItem.id)}>
                        {deletingId === eventItem.id
                          ? "Eliminando..."
                          : requiresModeratedChange
                            ? "Solicitar cancelacion"
                            : "Eliminar"}
                      </button>
                      <span className="organizer-sell-through-label">{sellThrough}%</span>
                    </div>
                    {latestRequest ? (
                      <div className="organizer-request-hint">
                        <span className={`status-pill ${latestRequest.status}`}>{getChangeRequestStatusLabel(latestRequest.status)}</span>
                        <small>{getChangeRequestTypeLabel(latestRequest.request_type)} en seguimiento</small>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDashboardView = () => (
    <>
      <div className="metrics-grid organizer-console-metrics">
        <article className="metric-card highlight">
          <span>Recaudacion bruta</span>
          <strong>{formatCurrency(organizerInsights.totalRevenue)}</strong>
          <small>Ingresos confirmados en tu portafolio</small>
        </article>
        <article className="metric-card">
          <span>Ganancia neta</span>
          <strong>{formatCurrency(organizerInsights.organizerRevenue)}</strong>
          <small>Proyeccion neta del organizer</small>
        </article>
        <article className="metric-card">
          <span>Entradas vendidas</span>
          <strong>{organizerInsights.totalTicketsSold}</strong>
          <small>Sell-through promedio {sellThroughAverage}%</small>
        </article>
        <article className="metric-card">
          <span>Eventos sold out</span>
          <strong>{organizerInsights.soldOut}</strong>
          <small>Exito operativo total</small>
        </article>
      </div>

      <div className="dashboard-two-column organizer-console-overview">
        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <h3>Ranking de mayor recaudacion</h3>
              <p className="muted">Los eventos con mejor rendimiento segun pagos realmente completados.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => navigateOrganizerView("ranking")}>
              Ver ranking
            </button>
          </div>
          {!topPerformingEvents.length ? (
            <div className="empty-state compact-state">
              <h3>Aun no hay ventas registradas</h3>
              <p className="muted">Cuando lleguen pagos confirmados, el ranking aparecera aqui.</p>
            </div>
          ) : (
            <div className="revenue-chart-list">
              {topPerformingEvents.map((eventItem) => {
                const totalRevenue = Number(eventItem.revenue_total || 0);
                const totalWidth = `${Math.max((totalRevenue / topRevenueValue) * 100, totalRevenue > 0 ? 8 : 0)}%`;

                return (
                  <article className="revenue-chart-item" key={`organizer-chart-${eventItem.id}`}>
                    <div className="revenue-chart-copy">
                      <strong>{eventItem.title}</strong>
                      <span>{Number(eventItem.tickets_sold || 0)} entradas vendidas</span>
                    </div>
                    <div className="revenue-chart-bars">
                      <div className="revenue-bar-group">
                        <span>{formatCurrency(totalRevenue)}</span>
                        <div className="chart-bar-track">
                          <div className="chart-bar total" style={{ width: totalWidth }} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel-card organizer-pipeline-summary-card">
          <div className="panel-card-header">
            <div>
              <h3>Pipeline de publicacion</h3>
              <p className="muted">Estado actual de avance y moderacion.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => navigateOrganizerView("pipeline")}>
              Abrir
            </button>
          </div>
          <div className="organizer-pipeline-visual">
            <img src={pipelineHeroEvent ? getEventCover(pipelineHeroEvent) : AUTH_PANEL_IMAGE} alt="Pipeline visual" />
          </div>
          <div className="summary-stat-list">
            <div>
              <strong>{organizerInsights.pendingReview}</strong>
              <span>En revision</span>
            </div>
            <div>
              <strong>{organizerInsights.published}</strong>
              <span>Publicados</span>
            </div>
            <div>
              <strong>{organizerInsights.pipelineBacklog}</strong>
              <span>Borrador o ajuste</span>
            </div>
          </div>
        </aside>
      </div>

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Mis eventos recientes</h3>
            <p className="muted">Vista rapida para abrir y editar tus eventos mas cercanos.</p>
          </div>
        </div>
        {renderEventRows(recentEvents)}
      </section>

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Solicitudes recientes</h3>
            <p className="muted">Aqui veras observaciones administrativas y el avance de tus solicitudes sobre eventos publicados.</p>
          </div>
        </div>
        {!changeRequests.length ? (
          <div className="empty-state compact-state">
            <h3>Aun no tienes solicitudes</h3>
            <p className="muted">Cuando envies cambios o cancelaciones para eventos operativos, apareceran aqui.</p>
          </div>
        ) : (
          <div className="change-request-queue">
            {changeRequests.slice(0, 4).map((request) => (
              <article className="change-request-queue-item" key={request.id}>
                <div>
                  <strong>{request.event_title}</strong>
                  <span>{getChangeRequestTypeLabel(request.request_type)} · {getChangeRequestStatusLabel(request.status)}</span>
                </div>
                <p className="muted">{request.explanation}</p>
                {request.admin_response ? <small>Observacion admin: {request.admin_response}</small> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderRequestsView = () => (
    <section className="panel-card">
      <div className="panel-card-header">
        <div>
          <h3>Historial de Solicitudes de Cambio</h3>
          <p className="muted">Consulta el estado de tus solicitudes de edición o cancelación enviadas para moderación del administrador.</p>
        </div>
      </div>
      {!changeRequests.length ? (
        <div className="empty-state compact-state">
          <h3>Aún no tienes solicitudes</h3>
          <p className="muted">Cuando envíes solicitudes de edición o cancelación para tus eventos activos, aparecerán aquí con su respectivo seguimiento.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table organizer-data-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Tipo de Solicitud</th>
                <th>Estado de Aprobación</th>
                <th>Explicación / Motivo</th>
                <th>Respuesta del Administrador</th>
                <th>Última Actualización</th>
              </tr>
            </thead>
            <tbody>
              {changeRequests.map((request) => (
                <tr key={`req-row-${request.id}`}>
                  <td><strong>{request.event_title}</strong></td>
                  <td>
                    <span>
                      {getChangeRequestTypeLabel(request.request_type)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${request.status}`}>
                      {getChangeRequestStatusLabel(request.status)}
                    </span>
                  </td>
                  <td>{request.explanation || <span className="muted">Sin explicación</span>}</td>
                  <td>
                    {request.admin_response ? (
                      <span style={{ fontWeight: 600, color: "var(--cp-primary)" }}>{request.admin_response}</span>
                    ) : (
                      <span className="muted">Sin comentarios aún</span>
                    )}
                  </td>
                  <td>{formatDate(request.updated_at || request.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderEventsView = () => (
    <section className="panel-card">
      <div className="panel-card-header">
        <div>
          <h3>Gestion de eventos</h3>
          <p className="muted">Todo tu listado operativo en una tabla directa.</p>
        </div>
      </div>
      {renderEventRows(filteredEvents)}
    </section>
  );

  const renderRankingView = () => (
    <div className="dashboard-two-column organizer-console-overview">
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Ranking detallado</h3>
            <p className="muted">Comparativa de ingresos y conversion de tus eventos.</p>
          </div>
        </div>
        {renderEventRows(topPerformingEvents)}
      </section>

      <aside className="dashboard-stack">
        <section className="panel-card organizer-featured-event-card">
          <div className="panel-card-header">
            <div>
              <h3>Top performance</h3>
              <p className="muted">Tu evento con mejor recaudacion actual.</p>
            </div>
          </div>
          {rankingLeadEvent ? (
            <>
              <img src={getEventCover(rankingLeadEvent)} alt={rankingLeadEvent.title} />
              <div className="organizer-featured-event-copy">
                <strong>{rankingLeadEvent.title}</strong>
                <span>{formatDate(rankingLeadEvent.starts_at || rankingLeadEvent.event_date)}</span>
                <p className="muted">
                  {formatCurrency(rankingLeadEvent.revenue_total || 0)} brutos · {Number(rankingLeadEvent.tickets_sold || 0)} tickets vendidos
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state compact-state">
              <h3>Sin ranking aun</h3>
              <p className="muted">Todavia no hay suficientes ventas para destacar un evento.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );

  const renderPipelineColumn = (title, description, collection) => (
    <section className="panel-card organizer-pipeline-column">
      <div className="panel-card-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
      </div>
      {!collection.length ? (
        <p className="muted">Sin eventos en esta etapa.</p>
      ) : (
        <div className="activity-list">
          {collection.map((eventItem, index) => (
            <article className="activity-item organizer-pipeline-item" key={`pipeline-${title}-${eventItem.id}`}>
              <img src={getEventCover(eventItem, index)} alt={eventItem.title} />
              <div>
                <strong>{eventItem.title}</strong>
                <span>{getEventStatusLabel(eventItem.status)}</span>
                <small>{formatDate(eventItem.starts_at || eventItem.event_date)}</small>
              </div>
              <button className="ghost-button" type="button" onClick={() => editEvent(eventItem)}>
                Editar
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderPipelineView = () => (
    <>
      <section className="panel-card organizer-pipeline-hero">
        <div className="organizer-pipeline-hero-media">
          <img src={pipelineHeroEvent ? getEventCover(pipelineHeroEvent) : AUTH_PANEL_IMAGE} alt="Pipeline de publicacion" />
        </div>
        <div className="organizer-pipeline-hero-copy">
          <p className="eyebrow">Pipeline visual</p>
          <h3>{pipelineHeroEvent?.title || "Tu siguiente lanzamiento empieza aqui"}</h3>
          <p className="muted">
            {pipelineHeroEvent
              ? `Estado actual: ${getEventStatusLabel(pipelineHeroEvent.status)}. Ajusta tickets, contenido y publicacion desde esta misma consola.`
              : "Aun no tienes eventos cargados. Crea uno nuevo para activar tu pipeline de publicacion."}
          </p>
          <div className="cta-row compact-actions">
            <button className="primary-button" type="button" onClick={openCreateModal}>
              Nuevo evento
            </button>
            {pipelineHeroEvent ? (
              <button className="secondary-button" type="button" onClick={() => editEvent(pipelineHeroEvent)}>
                Abrir evento
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="organizer-pipeline-grid">
        {renderPipelineColumn("Backlog", "Borradores, pausados o rechazados.", draftEvents)}
        {renderPipelineColumn("Revision", "Eventos esperando aprobacion.", pendingEvents)}
        {renderPipelineColumn("Live", "Eventos publicados, activos o agotados.", [...publishedEvents, ...soldOutEvents.filter((item) => !publishedEvents.some((candidate) => candidate.id === item.id))])}
      </div>
    </>
  );

  const renderCatalogView = () => (
    <section className="panel-card">
      <div className="panel-card-header">
        <div>
          <h3>Catalogo visual</h3>
          <p className="muted">Portafolio visual de tus eventos, manteniendo la paleta y el estilo de CrowdPass.</p>
        </div>
      </div>
      {!filteredEvents.length ? (
        <div className="empty-state compact-state">
          <h3>No hay eventos en tu catalogo interno</h3>
          <p className="muted">Crea un nuevo evento para alimentar tu portafolio visual.</p>
        </div>
      ) : (
        <div className="organizer-catalog-grid">
          {filteredEvents.map((eventItem, index) => {
            const availableTickets = Number(eventItem.available_tickets || 0);
            const totalTickets = Number(eventItem.total_tickets || 0);
            const sellThrough = totalTickets > 0 ? Math.round(Math.min(((totalTickets - availableTickets) / totalTickets) * 100, 100)) : 0;

            return (
              <article className="organizer-catalog-card" key={`catalog-${eventItem.id}`}>
                <div className="organizer-catalog-media">
                  <img src={getEventCover(eventItem, index)} alt={eventItem.title} />
                  <span className={`status-pill ${eventItem.status}`}>{getEventStatusLabel(eventItem.status)}</span>
                </div>
                <div className="organizer-catalog-copy">
                  <strong>{eventItem.title}</strong>
                  <span>{eventItem.category_name || "Evento"} · {eventItem.city || "Peru"}</span>
                  <p className="muted">{eventItem.venue || "Venue por confirmar"}</p>
                </div>
                <div className="organizer-catalog-meta">
                  <div>
                    <span>Bruto</span>
                    <strong>{formatCurrency(eventItem.revenue_total || 0)}</strong>
                  </div>
                  <div>
                    <span>Progreso</span>
                    <strong>{sellThrough}%</strong>
                  </div>
                </div>
                <div className="chart-bar-track">
                  <div className="chart-bar total" style={{ width: `${sellThrough}%` }} />
                </div>
                <div className="cta-row compact-actions">
                  <button className="secondary-button" type="button" onClick={() => editEvent(eventItem)}>
                    Editar
                  </button>
                  <button className="ghost-button" type="button" onClick={() => navigate(`/events/${eventItem.id}`)}>
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}
          <button className="organizer-catalog-card organizer-catalog-create" type="button" onClick={openCreateModal}>
            <span>+</span>
            <strong>Nuevo evento</strong>
            <small>Publica una nueva experiencia desde tu consola</small>
          </button>
        </div>
      )}
    </section>
  );

  const renderActiveView = () => {
    if (activeView === "events") {
      return renderEventsView();
    }

    if (activeView === "history") {
      return renderEventsView();
    }

    if (activeView === "requests") {
      return renderRequestsView();
    }

    if (activeView === "ranking") {
      return renderRankingView();
    }

    if (activeView === "pipeline") {
      return renderPipelineView();
    }

    if (activeView === "catalog") {
      return renderCatalogView();
    }

    return renderDashboardView();
  };

  return (
    <section className="page-section organizer-page">
      <div className="organizer-console-main">
        <header className="organizer-console-topbar">
          <div>
            <p className="eyebrow">{activeViewCopy.eyebrow}</p>
            <h2>{activeViewCopy.title}</h2>
          </div>

          <div className="organizer-console-topbar-actions">
            <label className="organizer-console-search">
              <span aria-hidden="true">⌕</span>
              <input
                placeholder="Buscar eventos, venues o categorias"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <select className="organizer-console-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="pending_review">Pendiente</option>
              <option value="published">Publicado</option>
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="rejected">Rechazado</option>
            </select>
            <button className="primary-button" type="button" onClick={openCreateModal}>
              + Nuevo evento
            </button>
            <div className="organizer-console-profile">
              <img src={ADMIN_AVATAR_IMAGE} alt="Perfil organizador" />
              <div>
                <strong>{auth.currentUser?.full_name || auth.currentUser?.email}</strong>
                <span>{getRoleLabel(auth.currentUser?.role)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="organizer-console-subtitle-row">
          <p className="muted">{activeViewCopy.subtitle}</p>
          {!isLoading && isRefreshing ? <span className="muted">Actualizando informacion...</span> : null}
        </div>

        {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}
        {isLoading ? <p className="muted">Cargando consola del organizer...</p> : null}

        {!isLoading ? renderActiveView() : null}
      </div>

      <EventEditorModal
        categories={categories}
        formData={formData}
        editingEventId={editingEventId}
        isSubmitting={isSubmitting}
        isOpen={isEventModalOpen}
        onClose={closeEventModal}
        onSubmit={submitEvent}
        onUpdateField={updateField}
        onUpdateTicketType={updateTicketType}
        onAddTicketType={addTicketType}
        onRemoveTicketType={removeTicketType}
        auth={auth}
        organizersList={organizersList}
        requiresMinDate={!editingEventId || isEventExpired(events.find(item => item.id === editingEventId))}
      />
      <EventChangeRequestModal
        attachments={changeRequestAttachments}
        eventTitle={changeRequestEventTitle}
        explanation={changeRequestExplanation}
        isOpen={isChangeRequestModalOpen}
        isSubmitting={isRequestSubmitting}
        mode={changeRequestMode}
        onAttachmentsChange={updateChangeRequestAttachments}
        onClose={closeChangeRequestModal}
        onExplanationChange={updateChangeRequestExplanation}
        onRemoveAttachment={removeChangeRequestAttachment}
        onSubmit={submitChangeRequest}
        summary={changeRequestSummary}
      />
    </section>
  );
}

function AdminEventsPage({ auth }) {
  const location = useLocation();
  const backofficePrefix = location.pathname.startsWith("/superadmin") ? "/superadmin" : "/admin";
  const {
    events,
    categories,
    formData,
    editingEventId,
    feedback,
    isLoading,
    isRefreshing,
    isSubmitting,
    deletingId,
    disablingId,
    isEventModalOpen,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    disableEvent,
    openCreateModal,
    closeEventModal,
    organizersList,
  } = useManagedEventsData(auth, { errorMessage: "No pudimos cargar los eventos de administracion en este momento." });
  const { adminSalesSummary, revenueChartData, topRevenueValue } = useAdminEventInsights(events);
  const recentEvents = useMemo(() => events.slice(0, 6), [events]);

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Gestion de eventos</h2>
          <p className="muted">Administra publicaciones desde una vista enfocada y usa modales para crear o editar.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <div className="cta-row compact-actions">
          <button className="primary-button" type="button" onClick={openCreateModal}>
            Crear evento
          </button>
          <Link className="secondary-button" to={`${backofficePrefix}/events/catalog`}>
            Ver catalogo completo
          </Link>
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span>Total gestionados</span>
          <strong>{events.length}</strong>
          <small>Disponibles en tu panel</small>
        </article>
        <article className="metric-card">
          <span>En revision</span>
          <strong>{events.filter((item) => item.status === "pending_review").length}</strong>
          <small>Esperando moderacion</small>
        </article>
        <article className="metric-card highlight">
          <span>Publicados</span>
          <strong>{events.filter((item) => ["published", "active"].includes(item.status)).length}</strong>
          <small>Visibles en catalogo</small>
        </article>
        <article className="metric-card">
          <span>Entradas vendidas</span>
          <strong>{adminSalesSummary.soldTickets}</strong>
          <small>Ventas confirmadas</small>
        </article>
        <article className="metric-card">
          <span>Agotados</span>
          <strong>{adminSalesSummary.soldOutEvents}</strong>
          <small>Eventos sin stock disponible</small>
        </article>
        <article className="metric-card">
          <span>Recaudacion total</span>
          <strong>{formatCurrency(adminSalesSummary.totalRevenue)}</strong>
          <small>Monto bruto confirmado</small>
        </article>
        <article className="metric-card">
          <span>Comision plataforma</span>
          <strong>{formatCurrency(adminSalesSummary.platformRevenue)}</strong>
          <small>Fee actual del 10%</small>
        </article>
      </div>

      <AdminRevenueOverview
        adminSalesSummary={adminSalesSummary}
        revenueChartData={revenueChartData}
        topRevenueValue={topRevenueValue}
      />

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Eventos administrados</h3>
            <p className="muted">Acceso rapido a las publicaciones mas recientes para editar o eliminar.</p>
          </div>
        </div>
        {isLoading ? <p className="muted">Cargando eventos...</p> : null}
        <div className="activity-list organizer-event-list">
          {recentEvents.map((eventItem) => (
            <article className="activity-item organizer-event-item" key={eventItem.id}>
              <div>
                <p>
                  <strong>{eventItem.title}</strong>
                </p>
                <span>
                  {getEventStatusLabel(eventItem.status)} · {formatDate(eventItem.starts_at || eventItem.event_date)}
                  {isEventExpired(eventItem) && (
                    <span className="status-pill cancelled" style={{ marginLeft: "8px" }}>Vencido</span>
                  )}
                </span>
                <div className="admin-event-inline-metrics">
                  <span>{Number(eventItem.tickets_sold || 0)} entradas vendidas</span>
                  <span>{formatCurrency(eventItem.revenue_total || 0)} recaudados</span>
                  {eventItem.is_sold_out || Number(eventItem.available_tickets || 0) <= 0 ? (
                    <strong className="status-pill cancelled">Agotado</strong>
                  ) : null}
                </div>
                {eventItem.rejection_reason ? <small>Motivo: {eventItem.rejection_reason}</small> : null}
              </div>
              <div className="cta-row compact-actions">
                <button className="secondary-button" type="button" onClick={() => editEvent(eventItem)}>
                  Editar
                </button>
                {["published", "active"].includes(eventItem.status) ? (
                  <button className="ghost-button" type="button" disabled={disablingId === eventItem.id} onClick={() => disableEvent(eventItem.id)}>
                    {disablingId === eventItem.id ? "Deshabilitando..." : "Deshabilitar"}
                  </button>
                ) : null}
                <button className="ghost-button" type="button" disabled={deletingId === eventItem.id} onClick={() => deleteEvent(eventItem.id)}>
                  {deletingId === eventItem.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EventEditorModal
        categories={categories}
        formData={formData}
        editingEventId={editingEventId}
        isSubmitting={isSubmitting}
        isOpen={isEventModalOpen}
        onClose={closeEventModal}
        onSubmit={submitEvent}
        onUpdateField={updateField}
        onUpdateTicketType={updateTicketType}
        onAddTicketType={addTicketType}
        onRemoveTicketType={removeTicketType}
        auth={auth}
        organizersList={organizersList}
        requiresMinDate={!editingEventId || isEventExpired(events.find(item => item.id === editingEventId))}
      />
    </section>
  );
}

function AdminEventCatalogPage({ auth }) {
  const location = useLocation();
  const backofficePrefix = location.pathname.startsWith("/superadmin") ? "/superadmin" : "/admin";
  const {
    events,
    categories,
    formData,
    editingEventId,
    feedback,
    isLoading,
    isRefreshing,
    isSubmitting,
    deletingId,
    disablingId,
    isEventModalOpen,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    disableEvent,
    openCreateModal,
    closeEventModal,
    organizersList,
  } = useManagedEventsData(auth, { errorMessage: "No pudimos cargar el catalogo administrativo en este momento." });

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Catalogo de eventos</h2>
          <p className="muted">Vista completa de los eventos actuales con stock, ventas y estado del catalogo.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <div className="cta-row compact-actions">
          <button className="primary-button" type="button" onClick={openCreateModal}>
            Crear evento
          </button>
          <Link className="secondary-button" to={`${backofficePrefix}/events`}>
            Volver a gestion
          </Link>
        </div>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <h3>Todos los eventos actuales</h3>
            <p className="muted">Cada tarjeta resume entradas vendidas, disponibilidad, recaudacion y comision.</p>
          </div>
        </div>
        {isLoading ? <p className="muted">Cargando eventos...</p> : null}
        <AdminEventCatalogGrid
          events={events}
          deletingId={deletingId}
          disablingId={disablingId}
          onEdit={editEvent}
          onDisable={disableEvent}
          onDelete={deleteEvent}
        />
      </section>

      <EventEditorModal
        categories={categories}
        formData={formData}
        editingEventId={editingEventId}
        isSubmitting={isSubmitting}
        isOpen={isEventModalOpen}
        onClose={closeEventModal}
        onSubmit={submitEvent}
        onUpdateField={updateField}
        onUpdateTicketType={updateTicketType}
        onAddTicketType={addTicketType}
        onRemoveTicketType={removeTicketType}
        auth={auth}
        organizersList={organizersList}
        requiresMinDate={!editingEventId || isEventExpired(events.find(item => item.id === editingEventId))}
      />
    </section>
  );
}

function AdminUsersPage({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [page, setPage] = useState(1);
  const isSuperAdmin = Boolean(auth.currentUser?.is_super_admin);
  const [userGroup, setUserGroup] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("group") || "organizers";
  });
  const [organizerStatusFilter, setOrganizerStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: USERS_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [userDrafts, setUserDrafts] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [createUserDraft, setCreateUserDraft] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "customer",
    organizerStatus: "",
    isActive: true,
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createFeedback, setCreateFeedback] = useState("");

  useEffect(() => {
    const nextGroup = new URLSearchParams(location.search).get("group") || "organizers";
    if (nextGroup !== userGroup) {
      setUserGroup(nextGroup);
      setPage(1);
    }
  }, [location.search, userGroup]);

  useEffect(() => {
    if (!isSuperAdmin && (userGroup === "admins" || userGroup === "all")) {
      setUserGroup("organizers");
      setPage(1);
    }
  }, [isSuperAdmin, userGroup]);

  const setGroupAndSyncUrl = (nextGroup) => {
    setOrganizerStatusFilter("");
    setPage(1);
    setUserGroup(nextGroup);
    navigate({ pathname: location.pathname, search: `?group=${encodeURIComponent(nextGroup)}` });
  };

  const loadUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        let url = `/users?page=${page}&limit=${USERS_PAGE_SIZE}&group=${encodeURIComponent(userGroup)}`;
        if (isSuperAdmin && (userGroup === "all" || userGroup === "admins")) {
          url += "&include_admins=1";
        }
        if (userGroup === "organizers" && organizerStatusFilter) {
          url += `&organizer_status=${encodeURIComponent(organizerStatusFilter)}`;
        }
        const response = await apiRequest(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        const responseUsers = response.data || [];
        let nextUsers = responseUsers;

        if (!isSuperAdmin) {
          nextUsers = nextUsers.filter((user) => user.role !== "admin");
        }

        if (userGroup === "customers") {
          nextUsers = nextUsers.filter((user) => user.role === "customer" && user.organizer_status === "not_requested");
        } else if (userGroup === "staff") {
          nextUsers = nextUsers.filter((user) => user.role === "staff");
        } else if (userGroup === "organizers") {
          nextUsers = nextUsers.filter(
            (user) => user.role === "organizer" || (user.role === "customer" && user.organizer_status !== "not_requested")
          );
        } else if (userGroup === "admins") {
          nextUsers = nextUsers.filter((user) => user.role === "admin");
        }

        setUsers(nextUsers);
        setPagination({
          page: response.meta?.page || page,
          limit: response.meta?.limit || USERS_PAGE_SIZE,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 0,
          hasNextPage: Boolean(response.meta?.hasNextPage),
          hasPreviousPage: Boolean(response.meta?.hasPreviousPage),
        });
        setUserDrafts(
          nextUsers.reduce((accumulator, user) => {
            accumulator[user.id] = {
              role: user.role,
              organizerStatus: user.organizer_status,
              isActive: Boolean(user.is_active),
            };
            return accumulator;
          }, {})
        );
        setFeedback("");
      } catch (error) {
        setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar los usuarios en este momento."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [auth.token, isSuperAdmin, page, organizerStatusFilter, userGroup]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useAutoRefresh(() => loadUsers({ silent: true }), USERS_REFRESH_INTERVAL, Boolean(auth.token));

  const canEditUser = (user) => {
    if (isSuperAdmin) {
      return true;
    }

    if (user.role === "admin") {
      return false;
    }

    if (user.role === "staff") {
      return true;
    }

    if (user.role === "organizer") {
      return true;
    }

    if (user.role === "customer" && user.organizer_status !== "not_requested") {
      return true;
    }

    return false;
  };

  const canEditIsActive = (user) => {
    if (isSuperAdmin) {
      return true;
    }

    return user.role === "staff";
  };

  const canEditRole = (user) => {
    if (isSuperAdmin) {
      return true;
    }

    return user.role === "organizer";
  };

  const canEditOrganizerStatus = (user) => {
    if (isSuperAdmin) {
      return true;
    }

    return user.role === "customer" && user.organizer_status !== "not_requested";
  };

  const allowedRolesForUser = (user) => {
    if (isSuperAdmin) {
      return ["customer", "organizer", "staff", "admin"];
    }

    if (user.role === "organizer") {
      return ["organizer", "customer"];
    }

    return [user.role];
  };

  const canDeleteUser = () => isSuperAdmin;

  const resolveDefaultRoleForGroup = useCallback(
    (group) => {
      if (!isSuperAdmin) {
        return "customer";
      }

      if (group === "customers") {
        return "customer";
      }

      if (group === "staff") {
        return "staff";
      }

      if (group === "admins") {
        return "admin";
      }

      if (group === "organizers") {
        return "organizer";
      }

      return "customer";
    },
    [isSuperAdmin]
  );

  const openCreateUserModal = () => {
    const defaultRole = resolveDefaultRoleForGroup(userGroup);
    setCreateFeedback("");
    setCreateUserDraft({
      fullName: "",
      email: "",
      password: "",
      role: defaultRole,
      organizerStatus: defaultRole === "organizer" ? "approved" : "",
      isActive: true,
    });
    setIsCreateUserOpen(true);
  };

  const closeCreateUserModal = () => {
    setIsCreateUserOpen(false);
  };

  const submitCreateUser = async (event) => {
    event.preventDefault();
    setIsCreatingUser(true);
    setCreateFeedback("");

    try {
      await apiRequest("/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          fullName: createUserDraft.fullName,
          email: createUserDraft.email,
          password: createUserDraft.password,
          role: createUserDraft.role,
          organizerStatus: createUserDraft.organizerStatus || undefined,
          isActive: Boolean(createUserDraft.isActive),
        }),
      });

      setIsCreateUserOpen(false);
      await loadUsers({ silent: true });
    } catch (error) {
      setCreateFeedback(getUserFacingErrorMessage(error, "No pudimos crear el usuario en este momento."));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const saveUser = async (userId) => {
    setSavingUserId(userId);
    setFeedback("");

    try {
      await apiRequest(`/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(userDrafts[userId]),
      });

      await loadUsers({ silent: true });
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos guardar los cambios del usuario."));
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (userId) => {
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    const confirmed = window.confirm(`Se eliminara el usuario ${user.full_name}. Esta accion solo funciona si no tiene historial operativo. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setFeedback("");

    try {
      await apiRequest(`/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (users.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadUsers({ silent: true });
      }
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos eliminar el usuario seleccionado."));
    } finally {
      setDeletingUserId(null);
    }
  };

  const metricsCards = useMemo(() => {
    const activeCount = users.filter((user) => Boolean(user.is_active)).length;
    const inactiveCount = users.length - activeCount;
    const pendingCount = users.filter((user) => user.organizer_status === "pending").length;
    const approvedCount = users.filter((user) => user.organizer_status === "approved" || user.role === "organizer").length;
    const rejectedCount = users.filter((user) => user.organizer_status === "rejected").length;

    if (userGroup === "customers") {
      return [
        { highlight: true, label: "Clientes", value: pagination.total, small: "Base registrada" },
        { label: "Activos", value: activeCount, small: "En esta pagina" },
        { label: "Inactivos", value: inactiveCount, small: "En esta pagina" },
      ];
    }

    if (userGroup === "staff") {
      return [
        { highlight: true, label: "Staff", value: pagination.total, small: "Cuentas operativas" },
        { label: "Activos", value: activeCount, small: "En esta pagina" },
        { label: "Inactivos", value: inactiveCount, small: "En esta pagina" },
      ];
    }

    if (userGroup === "admins") {
      return [
        { highlight: true, label: "Admins", value: pagination.total, small: "Cuentas administrativas" },
        { label: "Activos", value: activeCount, small: "En esta pagina" },
        { label: "Inactivos", value: inactiveCount, small: "En esta pagina" },
      ];
    }

    if (userGroup === "all" && isSuperAdmin) {
      return [
        { highlight: true, label: "Total usuarios", value: pagination.total, small: "Base registrada" },
        { label: "Activos", value: activeCount, small: "En esta pagina" },
        { label: "Pendientes", value: pendingCount, small: "Solicitudes organizer" },
      ];
    }

    return [
      { highlight: true, label: "Organizadores", value: pagination.total, small: "Vista actual" },
      { label: "Aprobados", value: approvedCount, small: "En esta pagina" },
      { label: "Pendientes", value: pendingCount, small: "En esta pagina" },
      rejectedCount > 0 ? { label: "Rechazados", value: rejectedCount, small: "En esta pagina" } : null,
    ].filter(Boolean);
  }, [isSuperAdmin, pagination.total, userGroup, users]);

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestion de usuarios y aprobaciones</h2>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <Link className="secondary-button" to={`${location.pathname.startsWith("/superadmin") ? "/superadmin" : "/admin"}/events/review`}>
          Ver revision de eventos
        </Link>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <div className="metrics-grid admin-metrics">
        {metricsCards.map((card) => (
          <article className={`metric-card ${card.highlight ? "highlight" : ""}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.small}</small>
          </article>
        ))}
      </div>

      <section className="panel-card table-panel">
        <div className="panel-card-header">
          <h3>Usuarios registrados</h3>
          <div className="admin-users-panel-actions">
            {isSuperAdmin ? (
              <button className="primary-button" type="button" onClick={openCreateUserModal}>
                Crear nuevo
              </button>
            ) : null}
            <div className="market-filter-pill-row admin-users-group-tabs">
              <button
                type="button"
                className={`market-filter-pill ${userGroup === "customers" ? "active" : ""}`}
                onClick={() => {
                  setGroupAndSyncUrl("customers");
                }}
              >
                Clientes
              </button>
              <button
                type="button"
                className={`market-filter-pill ${userGroup === "organizers" ? "active" : ""}`}
                onClick={() => {
                  setGroupAndSyncUrl("organizers");
                }}
              >
                Organizadores
              </button>
              <button
                type="button"
                className={`market-filter-pill ${userGroup === "staff" ? "active" : ""}`}
                onClick={() => {
                  setGroupAndSyncUrl("staff");
                }}
              >
                Staff
              </button>
              {isSuperAdmin ? (
                <>
                  <button
                    type="button"
                    className={`market-filter-pill ${userGroup === "admins" ? "active" : ""}`}
                    onClick={() => {
                      setGroupAndSyncUrl("admins");
                    }}
                  >
                    Admins
                  </button>
                  <button
                    type="button"
                    className={`market-filter-pill ${userGroup === "all" ? "active" : ""}`}
                    onClick={() => {
                      setGroupAndSyncUrl("all");
                    }}
                  >
                    Todos
                  </button>
                </>
              ) : null}
            </div>

            {userGroup === "organizers" ? (
              <div className="admin-users-organizer-filter">
                <label>Filtrar organizer:</label>
                <select
                  value={organizerStatusFilter}
                  onChange={(event) => {
                    setOrganizerStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobado</option>
                  <option value="rejected">Rechazado</option>
                  <option value="not_requested">No solicitado</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando usuarios...</p> : null}

        <div className="table-wrapper">
          <table className="data-table editable-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Organizer</th>
                <th>Activo</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = userDrafts[user.id] || {
                  role: user.role,
                  organizerStatus: user.organizer_status,
                  isActive: user.is_active,
                };
                const roleOptions = allowedRolesForUser(user);
                const rowCanEdit = canEditUser(user);

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar">{getUserInitials(user.full_name)}</span>
                        <div>
                          <strong>{user.full_name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={draft.role}
                        disabled={!rowCanEdit || !canEditRole(user)}
                        onChange={(event) =>
                          setUserDrafts((prev) => ({
                            ...prev,
                            [user.id]: { ...prev[user.id], role: event.target.value },
                          }))
                        }
                      >
                        {roleOptions.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {getRoleLabel(roleOption)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {canEditOrganizerStatus(user) && rowCanEdit ? (
                        <select
                          value={draft.organizerStatus}
                          onChange={(event) =>
                            setUserDrafts((prev) => ({
                              ...prev,
                              [user.id]: { ...prev[user.id], organizerStatus: event.target.value },
                            }))
                          }
                        >
                          {["pending", "approved", "rejected"].map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {getOrganizerStatusLabel(statusOption)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="status-pill">{getOrganizerStatusLabel(draft.organizerStatus)}</span>
                      )}
                    </td>
                    <td>
                      <label className="checkbox-field inline-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isActive)}
                          disabled={!rowCanEdit || !canEditIsActive(user)}
                          onChange={(event) =>
                            setUserDrafts((prev) => ({
                              ...prev,
                              [user.id]: { ...prev[user.id], isActive: event.target.checked },
                            }))
                          }
                        />
                        <span>{draft.isActive ? "Activo" : "Inactivo"}</span>
                      </label>
                    </td>
                    <td>
                      <div className="cta-row compact-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={savingUserId === user.id || !rowCanEdit}
                          onClick={() => saveUser(user.id)}
                        >
                          {savingUserId === user.id ? "Guardando..." : "Guardar"}
                        </button>
                        {canDeleteUser() ? (
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={deletingUserId === user.id}
                            onClick={() => deleteUser(user.id)}
                          >
                            {deletingUserId === user.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {!isLoading && pagination.totalPages > 0 ? (
        <div className="market-results-pagination">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={!pagination.hasPreviousPage}
          >
            Anterior
          </button>
          <div className="market-pagination-pages">
            {Array.from({ length: pagination.totalPages }, (_, pageIndex) => {
              const pageNumber = pageIndex + 1;
              return (
                <button
                  className={`market-pagination-page ${pageNumber === page ? "active" : ""}`}
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
            disabled={!pagination.hasNextPage}
          >
            Siguiente
          </button>
        </div>
      ) : null}

      {isCreateUserOpen ? (
        <div
          className="ticket-preview-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isCreatingUser) {
              closeCreateUserModal();
            }
          }}
        >
          <div className="ticket-preview-dialog admin-event-modal">
            <section className="panel-card admin-event-modal-card">
              <div className="ticket-preview-header">
                <div>
                  <p className="eyebrow">Usuarios</p>
                  <h3>Crear nuevo usuario</h3>
                  <p className="muted">Crea cuentas para clientes, staff, organizers o administradores.</p>
                </div>
                <button className="ghost-button" type="button" onClick={closeCreateUserModal} disabled={isCreatingUser}>
                  Cerrar
                </button>
              </div>

              {createFeedback ? <InlineMessage type="error" message={createFeedback} /> : null}

              <form className="form-grid compact-grid organizer-form" onSubmit={submitCreateUser}>
                <label className="form-span-2">
                  Nombre completo
                  <input
                    value={createUserDraft.fullName}
                    onChange={(event) => setCreateUserDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-span-2">
                  Correo
                  <input
                    type="email"
                    value={createUserDraft.email}
                    onChange={(event) => setCreateUserDraft((prev) => ({ ...prev, email: event.target.value }))}
                    required
                  />
                </label>
                <label className="form-span-2">
                  Contrasena
                  <input
                    type="password"
                    value={createUserDraft.password}
                    onChange={(event) => setCreateUserDraft((prev) => ({ ...prev, password: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Rol
                  <select
                    value={createUserDraft.role}
                    onChange={(event) => {
                      const nextRole = event.target.value;
                      setCreateUserDraft((prev) => ({
                        ...prev,
                        role: nextRole,
                        organizerStatus: nextRole === "organizer" ? "approved" : "",
                      }));
                    }}
                    required
                  >
                    <option value="customer">Cliente</option>
                    <option value="organizer">Organizador</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>
                <label>
                  Activo
                  <select
                    value={createUserDraft.isActive ? "true" : "false"}
                    onChange={(event) => setCreateUserDraft((prev) => ({ ...prev, isActive: event.target.value === "true" }))}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </label>
                {createUserDraft.role === "organizer" ? (
                  <label className="form-span-2">
                    Estado organizer
                    <select
                      value={createUserDraft.organizerStatus || "approved"}
                      onChange={(event) => setCreateUserDraft((prev) => ({ ...prev, organizerStatus: event.target.value }))}
                    >
                      <option value="approved">Aprobado</option>
                      <option value="pending">Pendiente</option>
                      <option value="rejected">Rechazado</option>
                    </select>
                  </label>
                ) : null}

                <div className="cta-row compact-actions admin-event-modal-actions form-span-2">
                  <button className="primary-button" type="submit" disabled={isCreatingUser}>
                    {isCreatingUser ? "Creando..." : "Crear usuario"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminSettingsPage({ auth }) {
  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Ajustes</h2>
          <p className="muted">Gestiona la informacion principal de tu cuenta administrativa.</p>
        </div>
      </header>

      <section className="dashboard-two-column align-start">
        <section className="panel-card">
          <div className="panel-card-header">
            <h3>Perfil</h3>
          </div>
          <div className="summary-stat-list">
            <div>
              <span>Nombre</span>
              <strong>{auth.currentUser?.full_name || "Administrador"}</strong>
            </div>
            <div>
              <span>Correo</span>
              <strong>{auth.currentUser?.email || "No disponible"}</strong>
            </div>
            <div>
              <span>Rol</span>
              <strong>{getRoleLabel(auth.currentUser?.role)}</strong>
            </div>
          </div>
        </section>

        <aside className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <h3>Acciones</h3>
            </div>
            <div className="cta-row compact-actions">
              <Link className="secondary-button" to="/admin/events">
                Ir a eventos
              </Link>
              <Link className="secondary-button" to="/admin/users">
                Ir a usuarios
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}

function AdminEventReviewPage({ auth }) {
  const [events, setEvents] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [requestResponses, setRequestResponses] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [requestProcessingId, setRequestProcessingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPendingEvents = useCallback(async () => {
    setIsLoading(true);

    try {
      const [pendingEventsResponse, pendingRequestsResponse] = await Promise.all([
        apiRequest("/events/review/pending", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }),
        apiRequest("/events/change-requests/review", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }),
      ]);

      setEvents(pendingEventsResponse.data || []);
      setChangeRequests(pendingRequestsResponse.data || []);
      setFeedback("");
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar los eventos pendientes en este momento."));
    } finally {
      setIsLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadPendingEvents();
  }, [loadPendingEvents]);

  const reviewEvent = async (eventId, decision) => {
    setProcessingId(eventId);
    setFeedback("");

    try {
      await apiRequest(`/events/${eventId}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          decision,
          rejectionReason: rejectionReasons[eventId] || "",
        }),
      });

      await loadPendingEvents();
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos actualizar el estado del evento."));
    } finally {
      setProcessingId(null);
    }
  };

  const reviewChangeRequest = async (requestId, decision) => {
    setRequestProcessingId(requestId);
    setFeedback("");

    try {
      await apiRequest(`/events/change-requests/${requestId}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          decision,
          adminResponse: requestResponses[requestId] || "",
        }),
      });

      await loadPendingEvents();
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos revisar la solicitud en este momento."));
    } finally {
      setRequestProcessingId(null);
    }
  };

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Moderacion</p>
          <h2>Eventos pendientes de publicacion</h2>
        </div>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}
      {isLoading ? <p className="muted">Cargando eventos pendientes...</p> : null}

      {!isLoading && events.length === 0 ? (
        <div className="panel-card empty-state compact-state">
          <h3>No hay eventos pendientes</h3>
          <p className="muted">Cuando un organizer envie un evento a revision aparecera aqui.</p>
        </div>
      ) : null}

      <div className="dashboard-stack">
        {events.map((eventItem, index) => (
          <article className="panel-card review-card" key={eventItem.id}>
            <div className="review-card-media">
              <img src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]} alt={eventItem.title} />
            </div>
            <div className="review-card-copy">
              <div className="panel-card-header">
                <div>
                  <h3>{eventItem.title}</h3>
                  <p className="muted">
                    {eventItem.category_name} · {eventItem.city}
                  </p>
                </div>
                <span className="status-pill pending_review">Pendiente</span>
              </div>
              <p className="muted">{eventItem.description}</p>
              <div className="ticket-type-list">
                {(eventItem.ticket_types || []).map((ticketType) => (
                  <article className="ticket-type-chip" key={ticketType.id}>
                    <strong>{ticketType.name}</strong>
                    <span>{formatCurrency(ticketType.price)}</span>
                    <small>{ticketType.stock_available} disponibles</small>
                  </article>
                ))}
              </div>
              <label>
                Motivo de rechazo
                <textarea value={rejectionReasons[eventItem.id] || ""} onChange={(event) => setRejectionReasons((prev) => ({ ...prev, [eventItem.id]: event.target.value }))} rows="3" />
              </label>
              <div className="cta-row compact-actions">
                <button className="primary-button" type="button" disabled={processingId === eventItem.id} onClick={() => reviewEvent(eventItem.id, "approve")}>
                  Aprobar
                </button>
                <button className="secondary-button" type="button" disabled={processingId === eventItem.id} onClick={() => reviewEvent(eventItem.id, "reject")}>
                  Rechazar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Solicitudes especiales</p>
          <h2>Cambios y cancelaciones de eventos publicados</h2>
        </div>
      </header>

      {!isLoading && changeRequests.length === 0 ? (
        <div className="panel-card empty-state compact-state">
          <h3>No hay solicitudes pendientes</h3>
          <p className="muted">Cuando un organizer solicite cambios o cancelaciones apareceran aqui.</p>
        </div>
      ) : null}

      <div className="dashboard-stack">
        {changeRequests.map((requestItem, index) => (
          <article className="panel-card review-card" key={`request-${requestItem.id}`}>
            <div className="review-card-media">
              <img
                src={requestItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                alt={requestItem.event_title}
              />
            </div>
            <div className="review-card-copy">
              <div className="panel-card-header">
                <div>
                  <h3>{requestItem.event_title}</h3>
                  <p className="muted">
                    {requestItem.organizer_name || requestItem.organizer_email || "Organizer"} · {getChangeRequestTypeLabel(requestItem.request_type)}
                  </p>
                </div>
                <span className="status-pill pending_review">{getChangeRequestStatusLabel(requestItem.status)}</span>
              </div>

              <p className="muted">{requestItem.explanation}</p>

              <div className="change-request-diff-list compact-request-list">
                {(requestItem.change_summary || []).map((item) => (
                  <article className="change-request-diff-item" key={`summary-${requestItem.id}-${item.field}`}>
                    <div className="change-request-diff-header">
                      <strong>{item.label}</strong>
                      {item.isSensitive ? <span className="status-pill pending_review">Sensible</span> : null}
                    </div>
                    <div className="change-request-diff-values">
                      <div>
                        <span>Antes</span>
                        <p>{formatChangeRequestValue(item.before)}</p>
                      </div>
                      <div>
                        <span>Despues</span>
                        <p>{formatChangeRequestValue(item.after)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {(requestItem.attachments || []).length ? (
                <div className="change-request-attachment-list">
                  {requestItem.attachments.map((attachment) => (
                    <a
                      className="change-request-attachment-item attachment-link"
                      download={attachment.name}
                      href={attachment.dataUrl}
                      key={`${requestItem.id}-${attachment.name}`}
                    >
                      <div>
                        <strong>{attachment.name}</strong>
                        <span>{formatFileSize(attachment.size)} · {attachment.mimeType}</span>
                      </div>
                      <span>Descargar</span>
                    </a>
                  ))}
                </div>
              ) : null}

              <label>
                Respuesta administrativa
                <textarea
                  rows="3"
                  value={requestResponses[requestItem.id] || ""}
                  onChange={(event) => setRequestResponses((prev) => ({ ...prev, [requestItem.id]: event.target.value }))}
                  placeholder="Indica observaciones, informacion faltante o justificacion de rechazo."
                />
              </label>

              <div className="cta-row compact-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={requestProcessingId === requestItem.id}
                  onClick={() => reviewChangeRequest(requestItem.id, "approve")}
                >
                  Aprobar
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={requestProcessingId === requestItem.id}
                  onClick={() => reviewChangeRequest(requestItem.id, "needs_information")}
                >
                  Pedir informacion
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={requestProcessingId === requestItem.id}
                  onClick={() => reviewChangeRequest(requestItem.id, "reject")}
                >
                  Rechazar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServerErrorPage({ auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from || "/";

  useEffect(() => {
    let isCancelled = false;

    const attemptReconnect = async () => {
      const isOnline = await auth.checkServer();

      if (!isCancelled && isOnline) {
        navigate(returnPath, { replace: true });
      }
    };

    const intervalId = window.setInterval(() => {
      attemptReconnect();
    }, 3000);

    attemptReconnect();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [auth, navigate, returnPath]);

  return (
    <section className="page-section server-error-page maintenance-page">
      <div className="maintenance-topbar">
        <Link className="brand-mark" to="/">
          CrowdPass
        </Link>
        <span className="maintenance-status">Interrupcion temporal</span>
      </div>

      <div className="card state-card maintenance-card">
        <div className="maintenance-visual">
          <img src={SERVER_ERROR_IMAGE} alt="Mantenimiento CrowdPass" />
        </div>
        <div className="maintenance-copy">
          <p className="maintenance-badge">Pausa breve</p>
          <h2>Estamos teniendo una interrupcion temporal</h2>
          <p className="muted">Puedes volver a intentarlo en unos instantes. Tus datos y tus compras siguen protegidos.</p>
          <div className="cta-row maintenance-actions">
            <button className="primary-button" type="button" onClick={() => auth.checkServer()}>
              Volver a intentar
            </button>
            <Link className="secondary-button" to="/">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <section className="page-section narrow terms-page">
      <div className="card state-card terms-card">
        <div className="state-copy terms-copy">
          <p className="eyebrow">CrowdPass</p>
          <h2>Terminos y condiciones</h2>
          <p className="muted">
            Estos terminos regulan el uso de la plataforma CrowdPass para clientes, organizadores,
            administradores y staff. Al registrarte, navegar o reservar dentro del sistema, aceptas las
            siguientes condiciones de uso.
          </p>

          <section className="terms-section">
            <h3>1. Objeto del servicio</h3>
            <p>
              CrowdPass es una plataforma web orientada al descubrimiento, publicacion, gestion y reserva
              de eventos. El sistema permite la administracion de perfiles, catalogo publico, tickets por
              tipo, solicitudes de organizador y operaciones relacionadas con reservas.
            </p>
          </section>

          <section className="terms-section">
            <h3>2. Registro y veracidad de la informacion</h3>
            <p>
              El usuario se compromete a registrar informacion veraz, actual y completa. CrowdPass puede
              restringir, suspender o deshabilitar cuentas cuando detecte datos falsos, duplicados o uso
              indebido del sistema.
            </p>
          </section>

          <section className="terms-section">
            <h3>3. Roles dentro de la plataforma</h3>
            <p>
              El rol de cliente permite reservar eventos y gestionar su perfil. El rol de organizer
              habilita la creacion y administracion de eventos sujetos a revision. El rol admin supervisa
              usuarios, estados y aprobaciones. El rol staff se reserva para funciones operativas
              definidas por la organizacion.
            </p>
          </section>

          <section className="terms-section">
            <h3>4. Publicacion y moderacion de eventos</h3>
            <p>
              Todo evento puede ser revisado antes de su publicacion. CrowdPass se reserva el derecho de
              rechazar o pausar eventos que incumplan politicas internas, presenten informacion engañosa o
              afecten la seguridad operativa de la plataforma.
            </p>
          </section>

          <section className="terms-section">
            <h3>5. Reservas, pagos y disponibilidad</h3>
            <p>
              Las reservas dependen del stock disponible por tipo de ticket. El sistema puede aplicar
              validaciones por cantidad, uso de descuentos, metodo de pago y politicas de cancelacion. Una
              reserva no garantiza acceso si posteriormente se detecta fraude, error operativo o
              incumplimiento de estas condiciones.
            </p>
          </section>

          <section className="terms-section">
            <h3>6. Cancelaciones y reembolsos</h3>
            <p>
              Las cancelaciones, devoluciones de stock y reembolsos se rigen por las reglas implementadas
              en CrowdPass y por el estado operativo del evento. Algunas compras pueden incluir condiciones
              especiales, como modalidad reembolsable u otras restricciones definidas por la plataforma.
            </p>
          </section>

          <section className="terms-section">
            <h3>7. Seguridad y disponibilidad</h3>
            <p>
              CrowdPass aplica controles de autenticacion, rate limiting y monitoreo para proteger el
              sistema. Aun asi, la plataforma puede experimentar mantenimientos, interrupciones temporales
              o cambios de infraestructura necesarios para garantizar continuidad y seguridad del servicio.
            </p>
          </section>

          <section className="terms-section">
            <h3>8. Tratamiento de datos</h3>
            <p>
              Los datos personales registrados se utilizan con fines funcionales, operativos y de mejora
              del servicio. La aceptacion del consentimiento comercial es opcional y no condiciona el uso
              principal de la plataforma.
            </p>
          </section>

          <section className="terms-section">
            <h3>9. Modificaciones</h3>
            <p>
              CrowdPass puede actualizar estos terminos para reflejar cambios funcionales, legales o
              tecnicos. La version publicada en esta pagina sera la referencia vigente para el uso del
              sistema.
            </p>
          </section>

          <div className="cta-row">
            <Link className="primary-button" to="/register">
              Volver al registro
            </Link>
            <Link className="secondary-button" to="/">
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function NotFoundPage({ auth }) {
  const returnPath = auth.currentUser ? getRoleHomePath(auth.currentUser.role, auth.currentUser) : "/";

  return (
    <div className="public-shell app-shell">
      <section className="page-section not-found-page">
        <div className="card state-card split-state-card">
          <div className="state-visual">
            <img src={NOT_FOUND_IMAGE} alt="Ruta no encontrada" />
          </div>
          <div className="state-copy">
            <p className="eyebrow">404</p>
            <h2>Ruta no encontrada</h2>
            <p className="muted">La pagina que intentas visitar no existe o ya no esta disponible.</p>
            <Link className="primary-button" to={returnPath}>
              {auth.currentUser ? "Volver al panel" : "Volver al inicio"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function AccessDeniedPage({ auth }) {
  const location = useLocation();
  const homePath = getRoleHomePath(auth.currentUser?.role, auth.currentUser);
  const attemptedPath = typeof location.state?.from === "string" ? location.state.from : "";

  return (
    <div className="public-shell app-shell">
      <section className="page-section not-found-page">
        <div className="card state-card split-state-card">
          <div className="state-visual">
            <img src={NOT_FOUND_IMAGE} alt="Acceso denegado" />
          </div>
          <div className="state-copy">
            <p className="eyebrow">403</p>
            <h2>Acceso denegado</h2>
            <p className="muted">Tu cuenta no tiene permisos para ingresar a esa seccion.</p>
            {attemptedPath ? <p className="muted">Ruta solicitada: {attemptedPath}</p> : null}
            <div className="cta-row">
              <Link className="primary-button" to={homePath}>
                Volver a mi panel
              </Link>
              <Link className="secondary-button" to="/">
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProtectedRoute({ token, currentUser, allowedRoles, requireSuperAdmin, children }) {
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: `${location.pathname}${location.search}`,
          authMessage: "Inicia sesion para continuar.",
        }}
      />
    );
  }

  if (allowedRoles?.length && currentUser && !allowedRoles.includes(currentUser.role)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (requireSuperAdmin && !currentUser?.is_super_admin) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  return children || <Outlet />;
}

function PublicOnlyRoute({ token, children }) {
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === "string" && location.state.returnTo.startsWith("/")
      ? location.state.returnTo
      : null;

  if (token) {
    return <Navigate to={returnTo || "/"} replace />;
  }

  return children;
}

function RoleDashboardRedirect({ auth }) {
  return <Navigate to={getRoleHomePath(auth.currentUser?.role, auth.currentUser)} replace />;
}

function FormCard({ title, description, feedback, children }) {
  return (
    <section className="page-section narrow auth-section">
      <div className="card form-card">
        <div className="auth-visual" aria-hidden="true">
          <img src={AUTH_PANEL_IMAGE} alt="" className="auth-visual-image" />
          <div className="auth-visual-copy">
            <p className="eyebrow">CrowdPass</p>
            <h2>Descubre experiencias que merecen ser recordadas</h2>
            <p>Explora eventos, organiza tus planes y compra entradas desde una experiencia simple y directa.</p>
          </div>
        </div>
        <div className="auth-content">
          <h2>{title}</h2>
          <p className="muted">{description}</p>
          {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

function InlineMessage({ type, message }) {
  return <div className={`inline-message ${type}`}>{message}</div>;
}

export default App;
