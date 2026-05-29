import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const TOKEN_KEY = "crowdpass_token";
const USER_KEY = "crowdpass_user";
const RESERVATION_DRAFT_PREFIX = "crowdpass_reservation_draft_";
const USERS_PAGE_SIZE = 12;
const EVENTS_REFRESH_INTERVAL = 15000;
const RESERVATIONS_REFRESH_INTERVAL = 15000;
const USERS_REFRESH_INTERVAL = 5000;
const ORGANIZER_REFRESH_INTERVAL = 10000;
const SERVER_STATUS_INTERVAL = 10000;

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

const PASSWORD_RULES = [
  { id: "length", label: "Minimo 8 caracteres", test: (value) => value.length >= 8 },
  { id: "uppercase", label: "Al menos una mayuscula", test: (value) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "Al menos una minuscula", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "Al menos un numero", test: (value) => /\d/.test(value) },
  { id: "symbol", label: "Al menos un simbolo", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

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

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    const networkError = new Error("No pudimos conectar con el servidor.");
    networkError.isConnectionError = true;
    networkError.cause = error;
    throw networkError;
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || "No se pudo completar la solicitud.";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
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
  if (value === "paid") {
    return "Pagado";
  }

  if (value === "pending" || value === "pending_payment") {
    return "Pendiente";
  }

  if (value === "failed") {
    return "Pago rechazado";
  }

  if (value === "refunded") {
    return "Reembolsado";
  }

  if (value === "cancelled") {
    return "Cancelado";
  }

  return "Por confirmar";
}

function getReservationStatusLabel(status) {
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

function getRoleHomePath(role) {
  if (role === "admin") {
    return "/admin/users";
  }

  if (role === "organizer") {
    return "/organizer/events";
  }

  return "/my-space";
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

  const loadEvent = useCallback(async () => {
    setIsLoading(true);

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

      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar este evento en este momento."));
    } finally {
      setIsLoading(false);
    }
  }, [auth, eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  return { event, feedback, isLoading, reload: loadEvent };
}

function getUserFacingErrorMessage(error, fallback = "No pudimos completar tu solicitud en este momento.") {
  const rawMessage = String(error?.message || "").trim();

  if (!rawMessage) {
    return fallback;
  }

  if (error?.isConnectionError || (error?.status && error.status >= 500)) {
    return fallback;
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
  };
}

function useManagedEventsData(auth, options = {}) {
  const { errorMessage = "No pudimos cargar los eventos en este momento." } = options;
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(buildEmptyEventForm());
  const [editingEventId, setEditingEventId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

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
        const [eventsResponse, categoriesResponse] = await Promise.all([
          apiRequest("/events/mine", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }),
          apiRequest("/events/categories", { method: "GET" }),
        ]);

        setEvents(eventsResponse.data || []);
        setCategories(categoriesResponse.data || []);
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

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

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
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest(editingEventId ? `/events/${editingEventId}` : "/events", {
        method: editingEventId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...formData,
          latitude: null,
          longitude: null,
        }),
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

  return {
    events,
    categories,
    formData,
    editingEventId,
    feedback,
    isLoading,
    isRefreshing,
    isSubmitting,
    deletingId,
    isEventModalOpen,
    setFeedback,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    openCreateModal,
    closeEventModal,
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
              <p className="eyebrow">Eventos</p>
              <h3>{editingEventId ? "Editar evento" : "Crear evento"}</h3>
              <p className="muted">Completa la informacion principal, las fechas y los tipos de entrada.</p>
            </div>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <form className="form-grid compact-grid organizer-form" onSubmit={onSubmit}>
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
            <label>
              Imagen destacada
              <input value={formData.featuredImageUrl} onChange={(event) => onUpdateField("featuredImageUrl", event.target.value)} />
            </label>
            <label>
              Video promocional
              <input value={formData.promoVideoUrl} onChange={(event) => onUpdateField("promoVideoUrl", event.target.value)} />
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
              <input type="datetime-local" value={formData.startsAt} onChange={(event) => onUpdateField("startsAt", event.target.value)} required />
            </label>
            <label>
              Fin
              <input type="datetime-local" value={formData.endsAt} onChange={(event) => onUpdateField("endsAt", event.target.value)} required />
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

function AdminEventCatalogGrid({ events, deletingId, onEdit, onDelete }) {
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
              <span className={`status-pill ${isSoldOut ? "cancelled" : eventItem.status}`}>{isSoldOut ? "Agotado" : getEventStatusLabel(eventItem.status)}</span>
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
    } catch (error) {
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
        <Route path="/server-error" element={<ServerErrorPage auth={authValue} />} />
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
        element={
          <ProtectedRoute token={token}>
            <MemberLayout auth={authValue} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/my-space"
          element={
            <ProtectedRoute token={token} allowedRoles={["customer", "staff"]} currentUser={currentUser}>
              <DashboardPage auth={authValue} />
            </ProtectedRoute>
          }
        />
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
            <AdminLayout auth={authValue} />
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

function PublicLayout({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomeRoute = location.pathname === "/";
  const isEventsRoute = location.pathname.startsWith("/events");

  const handleLogout = () => {
    auth.clearSession();
    navigate("/");
  };

  return (
    <div className="public-shell app-shell">
      <header className="public-topbar">
        <div className="public-brand">
          <Link className="brand-mark" to="/">
            CrowdPass
          </Link>
          <nav className="nav-links">
            <Link className={isHomeRoute ? "active" : ""} to="/">
              Inicio
            </Link>
            <Link className={isEventsRoute ? "active" : ""} to="/events">
              Eventos
            </Link>
          </nav>
        </div>

        <div className="public-actions">
          {auth.token ? (
            <>
              <Link className="secondary-button" to={getRoleHomePath(auth.currentUser?.role)}>
                {auth.currentUser?.role === "admin"
                  ? "Panel"
                  : auth.currentUser?.role === "organizer"
                    ? "Mis eventos"
                    : "Mi espacio"}
              </Link>
              <button className="ghost-button" type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link className={location.pathname === "/login" ? "active subtle-link" : "subtle-link"} to="/login">
                Iniciar sesion
              </Link>
              <Link className="primary-button" to="/register">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>© 2026 CrowdPass. Plataforma para descubrir, publicar y reservar experiencias.</p>
        <div className="public-footer-links">
          <Link to="/events">Catalogo</Link>
          <Link to="/terms">Terminos y condiciones</Link>
          <span>Soporte</span>
        </div>
      </footer>
    </div>
  );
}

function MemberLayout({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = auth.currentUser?.role;
  const navItems =
    role === "organizer"
      ? [
          { label: "Mis eventos", path: "/organizer/events" },
          { label: "Catalogo", path: "/events" },
          { label: "Terminos", path: "/terms" },
        ]
      : [
          { label: "Mi espacio", path: "/my-space" },
          { label: "Catalogo", path: "/events" },
          { label: "Terminos", path: "/terms" },
        ];

  const titleMap = {
    organizer: "Espacio de organizador",
    staff: "Mi espacio",
    customer: "Mi espacio",
  };

  const subtitleMap = {
    organizer: "Organiza tus publicaciones, actualiza tus fechas y prepara tus proximos eventos.",
    staff: "Consulta tu espacio personal y mantente al tanto de tu actividad dentro de CrowdPass.",
    customer: "Revisa tus entradas, actualiza tu perfil y gestiona tu cuenta de forma simple.",
  };

  const handleLogout = () => {
    auth.clearSession();
    navigate("/");
  };

  return (
    <div className="public-shell app-shell member-shell">
      <header className="public-topbar member-topbar">
        <div className="public-brand">
          <Link className="brand-mark" to="/">
            CrowdPass
          </Link>
          <nav className="nav-links member-nav">
            {navItems.map((item) => (
              <Link className={location.pathname === item.path ? "active" : ""} key={item.path} to={item.path}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="public-actions">
          <Link className="secondary-button" to={getRoleHomePath(role)}>
            {role === "organizer" ? "Mi espacio" : "Resumen"}
          </Link>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="card member-header-card">
          <div>
            <p className="eyebrow">CrowdPass</p>
            <h1>{titleMap[role] || "Tu espacio"}</h1>
            <p className="muted">{subtitleMap[role] || "Continua gestionando tu experiencia."}</p>
          </div>

          <div className="member-profile-card">
            <img src={CUSTOMER_AVATAR_IMAGE} alt="Perfil" />
            <div>
              <strong>{auth.currentUser?.full_name || auth.currentUser?.email}</strong>
              <span>{getRoleLabel(role)}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function AdminLayout({ auth }) {
  const location = useLocation();
  const role = auth.currentUser?.role;
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const sidebarItems =
    [
      { label: "Usuarios", path: "/admin/users" },
      { label: "Eventos", path: "/admin/events" },
      { label: "Catalogo", path: "/admin/events/catalog" },
      { label: "Revision", path: "/admin/events/review" },
    ];

  const titleMap = {
    admin: "Panel administrativo",
  };

  const subtitleMap = {
    admin: "Administra usuarios, crea eventos y revisa publicaciones pendientes.",
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <MaintenanceRedirect auth={auth} />

      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <Link className="brand-mark" to="/admin/users">
            CrowdPass
          </Link>
          <p>{getRoleLabel(role)}</p>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <Link
              className={`sidebar-link ${location.pathname === item.path ? "active" : ""}`}
              key={item.label}
              to={item.path}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-profile-menu" ref={profileMenuRef}>
          <button
            className={`sidebar-profile ${isProfileMenuOpen ? "open" : ""}`}
            type="button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
          >
            <img src={ADMIN_AVATAR_IMAGE} alt="Perfil" />
            <div>
              <strong>{auth.currentUser?.full_name || auth.currentUser?.email}</strong>
              <span>{getRoleLabel(role)}</span>
            </div>
          </button>

          {isProfileMenuOpen ? (
            <div className="sidebar-profile-dropdown">
              <Link className="sidebar-profile-option" to="/admin/settings" onClick={() => setIsProfileMenuOpen(false)}>
                Ajustes
              </Link>
              <button className="sidebar-profile-option danger" type="button" onClick={auth.clearSession}>
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CrowdPass</p>
            <h1>{titleMap[role] || "Panel"}</h1>
            <p className="muted">{subtitleMap[role] || "Continua gestionando tu experiencia."}</p>
          </div>

          <div className="dashboard-header-actions" />
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
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
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [eventsResponse, categoriesResponse] = await Promise.all([
        apiRequest("/events", { method: "GET" }),
        apiRequest("/events/categories", { method: "GET" }),
      ]);

      setEvents(eventsResponse.data || []);
      setCategories(categoriesResponse.data || []);
      setFeedback("");
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar la portada en este momento."));
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const upcomingEvents = events.slice(0, 6);
  const activeCategories = categories.slice(0, 5);

  return (
    <section className="page-section home-page">
      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <section className="card home-intro-card">
        <div>
          <p className="eyebrow">Descubre</p>
          <h1>Proximos eventos</h1>
          <p className="muted">
            Explora experiencias publicadas, entra al detalle del evento y comienza tu reserva cuando estes listo.
          </p>
        </div>
        <div className="cta-row">
          <Link className="primary-button" to="/events">
            Ver todos
          </Link>
          <Link className="secondary-button" to={auth.currentUser ? getRoleHomePath(auth.currentUser.role) : "/login"}>
            {auth.currentUser ? "Ir a mi cuenta" : "Iniciar sesion"}
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Eventos publicados para reservar</h2>
          </div>
        </div>

        {isLoading ? <p className="muted">Cargando portada del catalogo...</p> : null}

        {!isLoading && upcomingEvents.length === 0 ? (
          <div className="empty-state card compact-state">
            <h3>No hay eventos publicados todavia</h3>
            <p className="muted">Cuando existan eventos en estado publicado, apareceran aqui en el inicio.</p>
          </div>
        ) : null}

        <div className="event-tile-grid">
          {upcomingEvents.map((eventItem, index) => (
            <Link className="event-tile-card" key={eventItem.id} to={`/events/${eventItem.id}`}>
              <div className="event-tile-media">
                <img
                  src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                  alt={eventItem.title}
                />
              </div>
              <div className="event-tile-copy">
                <span className="event-tile-category">{eventItem.category_name || "Evento"}</span>
                <h3>{eventItem.title}</h3>
                <p>{formatCompactDate(eventItem.starts_at)}</p>
                <strong>{eventItem.city || "Peru"}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Explora</p>
            <h2>Tambien puedes buscar por categoria</h2>
          </div>
        </div>

        <div className="home-category-strip">
          {activeCategories.map((item) => (
            <Link className="secondary-button" key={item.id || item.slug} to={`/events${buildQueryString({ category: item.slug })}`}>
              {item.name}
            </Link>
          ))}
        </div>
      </section>
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
  const passwordRuleStates = useMemo(() => getPasswordRuleStates(formData.password), [formData.password]);
  const passwordStrength = useMemo(() => getPasswordStrengthMeta(formData.password), [formData.password]);
  const hasConfirmPassword = formData.confirmPassword.trim().length > 0;
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      navigate(returnTo || getRoleHomePath(response.data.user.role), { replace: true });
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
          <input name="email" type="email" value={formData.email} onChange={handleChange} required />
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
              aria-describedby="password-help password-rules"
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
          <span className="password-help-text" id="password-help">
            Usa una contrasena segura como en formularios modernos: combina letras, numeros y simbolos.
          </span>
          <div className="password-strength" aria-live="polite">
            <div className={`password-strength-bar ${passwordStrength.tone}`} style={{ width: `${passwordStrength.progress}%` }} />
          </div>
          <span className="password-strength-label">Seguridad: {passwordStrength.label}</span>
          <div className="password-checklist" id="password-rules">
            {passwordRuleStates.map((rule) => (
              <span key={rule.id} className={`password-check ${rule.isMet ? "met" : ""}`}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {rule.isMet ? "check_circle" : "radio_button_unchecked"}
                </span>
                {rule.label}
              </span>
            ))}
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
          <span className={`confirm-password-message ${hasConfirmPassword ? (passwordsMatch ? "match" : "mismatch") : ""}`} id="confirm-password-status">
            {!hasConfirmPassword
              ? "Vuelve a escribir tu contrasena para confirmar que no hay errores."
              : passwordsMatch
                ? "Las contrasenas coinciden."
                : "Las contrasenas no coinciden."}
          </span>
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
          Documento / DNI
          <input name="documentNumber" value={formData.documentNumber} onChange={handleChange} required />
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
          <input name="phone" value={formData.phone} onChange={handleChange} required />
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
        <button className="primary-button" type="submit" disabled={isSubmitting}>
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
      navigate(returnTo || getRoleHomePath(response.data.user.role), { replace: true });
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

function EventsPage({ auth }) {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: "", category: "", city: "", minPrice: "", maxPrice: "" });
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [eventsResponse, categoriesResponse] = await Promise.all([
          apiRequest(`/events${buildQueryString(filters)}`, { method: "GET" }),
          apiRequest("/events/categories", { method: "GET" }),
        ]);

        setEvents(eventsResponse.data || []);
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
    [auth, filters]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useAutoRefresh(() => loadEvents({ silent: true }), EVENTS_REFRESH_INTERVAL);

  return (
    <section className="page-section events-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h2>Encuentra el evento ideal para ti</h2>
          <p className="muted">Explora, entra al detalle y continua con tu reserva cuando elijas una experiencia.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </div>

      <section className="panel-card filter-panel">
        <div className="form-grid compact-grid">
          <label>
            Buscar
            <input name="q" value={filters.q} onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))} />
          </label>
          <label>
            Categoria
            <select name="category" value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}>
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciudad
            <input name="city" value={filters.city} onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))} />
          </label>
          <label>
            Precio minimo
            <input type="number" min="0" value={filters.minPrice} onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))} />
          </label>
          <label>
            Precio maximo
            <input type="number" min="0" value={filters.maxPrice} onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))} />
          </label>
        </div>
      </section>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}
      {isLoading ? <p className="muted">Cargando eventos...</p> : null}

      {!isLoading && events.length === 0 ? (
        <div className="empty-state card compact-state">
          <h3>No encontramos eventos con esos filtros</h3>
          <p className="muted">Prueba con otra categoria, ciudad o rango de precios.</p>
        </div>
      ) : null}

      <div className="event-tile-grid">
        {events.map((eventItem, index) => (
          <Link className="event-tile-card" key={eventItem.id} to={`/events/${eventItem.id}`}>
            <div className="event-tile-media">
              <img src={eventItem.featured_image_url || EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]} alt={eventItem.title} />
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
    </section>
  );
}

function EventDetailPage({ auth }) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { event, feedback, isLoading } = usePublicEventDetail(eventId, auth);
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
  const { event, feedback: eventFeedback, isLoading } = usePublicEventDetail(eventId, auth);
  const [draft, setDraft] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!rawStep) {
    return <Navigate to={`/events/${eventId}/reserve/tickets`} replace />;
  }

  if (!validSteps.includes(rawStep)) {
    return <Navigate to={`/events/${eventId}/reserve/tickets`} replace />;
  }

  if (!auth.token) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  }

  if (auth.currentUser && ["admin", "organizer"].includes(auth.currentUser.role)) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

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
        paymentMethod: storedDraft?.paymentMethod || "credit_card",
        installmentCount: String(storedDraft?.installmentCount || 1),
        isRefundablePurchase: Boolean(storedDraft?.isRefundablePurchase),
        cardNumber: storedDraft?.cardNumber || "",
        cardExpiry: storedDraft?.cardExpiry || "",
        cardCvv: storedDraft?.cardCvv || "",
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
  const paymentRequiresCard = draft?.paymentMethod === "credit_card" || draft?.paymentMethod === "debit_card";
  const paymentComplete = paymentRequiresCard
    ? Boolean(draft?.cardNumber && draft?.cardExpiry && draft?.cardCvv && draft?.cardHolder)
    : true;
  const stepIndex = validSteps.indexOf(currentStep);

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const adjustTicketSelection = (ticketType, delta) => {
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
      await apiRequest("/reservations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: Number(draft.ticketTypeId),
          quantity,
          paymentMethod: draft.paymentMethod,
          installmentCount: Number(draft.installmentCount || 1),
          isRefundablePurchase: Boolean(draft.isRefundablePurchase),
          attendeeName: draft.attendeeName.trim(),
          attendeeDocumentNumber: draft.attendeeDocumentNumber.trim(),
        }),
      });

      clearReservationDraft(event.id);
      navigate("/my-space", { replace: true });
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos completar tu reserva en este momento."));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    <button className="primary-button" type="button" onClick={continueFromTickets}>
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
                    <button className="primary-button" type="button" onClick={continueFromAttendee}>
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
                      <p className="muted">Elige como quieres finalizar tu reserva.</p>
                    </div>
                  </div>

                  <div className="payment-method-grid">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <button
                        className={`payment-method-card ${draft.paymentMethod === option.value ? "active" : ""}`}
                        key={option.value}
                        type="button"
                        onClick={() => updateDraft("paymentMethod", option.value)}
                      >
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                  </div>

                  {paymentRequiresCard ? (
                    <div className="form-grid compact-grid payment-details-grid">
                      <label className="form-span-2">
                        Numero de tarjeta
                        <input value={draft.cardNumber} onChange={(event) => updateDraft("cardNumber", event.target.value)} placeholder="0000 0000 0000 0000" />
                      </label>
                      <label>
                        Fecha de expiracion
                        <input value={draft.cardExpiry} onChange={(event) => updateDraft("cardExpiry", event.target.value)} placeholder="MM/YY" />
                      </label>
                      <label>
                        CVV
                        <input value={draft.cardCvv} onChange={(event) => updateDraft("cardCvv", event.target.value)} placeholder="123" />
                      </label>
                      <label className="form-span-2">
                        Nombre del titular
                        <input value={draft.cardHolder} onChange={(event) => updateDraft("cardHolder", event.target.value)} />
                      </label>
                      <label>
                        Cuotas
                        <select value={draft.installmentCount} onChange={(event) => updateDraft("installmentCount", event.target.value)}>
                          {[1, 3, 4, 5].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="payment-hint-card">
                      <p className="muted">Al finalizar, registraremos tu reserva con el metodo seleccionado y veras tu entrada en tu espacio personal.</p>
                    </div>
                  )}

                  <div className="checkout-actions">
                    <button className="ghost-button" type="button" onClick={() => goToStep("attendee")}>
                      Atras
                    </button>
                    <button className="primary-button" type="button" disabled={isSubmitting} onClick={completeReservation}>
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

function DashboardPage({ auth }) {
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [profileFeedback, setProfileFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRequestingOrganizer, setIsRequestingOrganizer] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedReservationId, setExpandedReservationId] = useState(null);
  const [previewReservationId, setPreviewReservationId] = useState(null);
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
        setFeedback("");
      } catch (error) {
        if (isServiceUnavailableError(error)) {
          setFeedback("");
          await auth.checkServer();
          return;
        }

        setFeedback(getUserFacingErrorMessage(error, "No pudimos cargar tus reservas en este momento."));
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

  const previewReservation = useMemo(
    () => orderedReservations.find((reservation) => reservation.id === previewReservationId) || null,
    [orderedReservations, previewReservationId]
  );

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

  const cancelReservation = async (reservationId) => {
    setCancellingId(reservationId);
    setFeedback("");

    try {
      await apiRequest(`/reservations/${reservationId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      await loadReservations({ silent: true });
    } catch (error) {
      setFeedback(getUserFacingErrorMessage(error, "No pudimos cancelar tu reserva en este momento."));
    } finally {
      setCancellingId(null);
    }
  };

  const currentRole = auth.currentUser?.role;
  const isCustomer = currentRole === "customer";

  return (
    <section className="page-section dashboard-page customer-dashboard">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">{isCustomer ? "Mis entradas" : "Mi cuenta"}</p>
          <h2>{isCustomer ? "Tus entradas y compras" : "Tu cuenta y reservas"}</h2>
          <p className="muted">
            {isCustomer
              ? "Visualiza tus compras por evento, abre la entrada digital y revisa el detalle completo de cada reserva."
              : "Consulta tus reservas, mantente al dia con tu cuenta y actualiza tus datos personales."}
          </p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <Link className="secondary-button" to="/events">
          Ir al catalogo
        </Link>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <div className="dashboard-two-column align-start">
        <section className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <div>
                <h3>{isCustomer ? "Mis entradas" : "Mis reservas"}</h3>
                <p className="muted">
                  {isCustomer
                    ? "Abre cada compra para ver la entrada digital y el detalle del pedido."
                    : "Revisa el estado de tus compras y el resumen de cada reserva."}
                </p>
              </div>
            </div>

            {isLoading ? <p className="muted">Cargando reservas...</p> : null}

            {!isLoading && reservations.length === 0 ? (
              <div className="empty-state compact-state">
                <h3>{isCustomer ? "Aun no tienes entradas" : "Aun no tienes reservas"}</h3>
                <p className="muted">
                  {isCustomer
                    ? "Cuando completes una compra, aqui aparecera tu entrada digital y el detalle del evento."
                    : "Cuando reserves eventos, apareceran aqui con detalle de tickets y pago."}
                </p>
              </div>
            ) : null}

            <div className="ticket-stack">
              {orderedReservations.map((reservation, index) => {
                const isExpanded = expandedReservationId === reservation.id;
                const isCancellable = reservation.status === "confirmed" || reservation.status === "pending_payment";
                const reservationItems = Array.isArray(reservation.items) ? reservation.items : [];

                return (
                <article className="ticket-card" key={reservation.id}>
                  <div className="ticket-card-media">
                    <img src={EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]} alt={reservation.event_title || `Evento ${reservation.event_id}`} />
                  </div>
                  <div className="ticket-card-body">
                    <div className="ticket-card-top">
                      <span className={`status-pill ${reservation.status}`}>{getReservationStatusLabel(reservation.status)}</span>
                      <span>{formatDate(reservation.event_starts_at)}</span>
                    </div>
                    <h3>{reservation.event_title || `Evento #${reservation.event_id}`}</h3>
                    <p className="muted">
                      Reserva {reservation.reservation_code || `#${reservation.id}`} · {reservation.quantity} entrada(s)
                    </p>
                    <div className="ticket-card-footer compact-footer customer-ticket-footer">
                      <div>
                        <span>Total pagado</span>
                        <strong>{formatCurrency(reservation.total_amount)}</strong>
                      </div>
                      <div>
                        <span>Pago</span>
                        <strong>{formatPaymentStatusLabel(reservation.payment_status)}</strong>
                      </div>
                      <div>
                        <span>Metodo</span>
                        <strong>{formatPaymentMethodLabel(reservation.payment_method)}</strong>
                      </div>
                    </div>
                    <div className="ticket-card-actions">
                      <button className="primary-button inline-action" type="button" onClick={() => setPreviewReservationId(reservation.id)}>
                        Ver entrada
                      </button>
                      <button
                        className="secondary-button inline-action"
                        type="button"
                        onClick={() => setExpandedReservationId((current) => (current === reservation.id ? null : reservation.id))}
                      >
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
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
                            <strong>{formatPaymentStatusLabel(reservation.payment_status)}</strong>
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
        </section>

        <aside className="dashboard-stack">
          <section className="panel-card profile-card">
            <img src={CUSTOMER_AVATAR_IMAGE} alt="Perfil del usuario" />
            <h3>{auth.currentUser?.full_name || "Usuario CrowdPass"}</h3>
            <p>{auth.currentUser?.email}</p>
            <div className="profile-card-meta">
              <div>
                <span>Rol</span>
                <strong>{getRoleLabel(auth.currentUser?.role)}</strong>
              </div>
              <div>
                <span>Solicitud para publicar</span>
                <strong>{getOrganizerStatusLabel(auth.currentUser?.organizer_status)}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-card-header">
              <h3>Actualizar perfil</h3>
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
                {isSavingProfile ? "Guardando..." : "Guardar perfil"}
              </button>
            </form>
          </section>

          {auth.currentUser?.role === "customer" && auth.currentUser?.organizer_status !== "approved" ? (
            <section className="panel-card promo-card">
              <p className="eyebrow">Siguiente paso</p>
              <h3>Solicita acceso para publicar eventos</h3>
              <p className="muted">Cuando tu perfil este completo, puedes pedir acceso para crear y gestionar tus eventos.</p>
              <button className="primary-button inline-action" type="button" disabled={isRequestingOrganizer || auth.currentUser?.organizer_status === "pending"} onClick={requestOrganizerRole}>
                {auth.currentUser?.organizer_status === "pending"
                  ? "Solicitud pendiente"
                  : isRequestingOrganizer
                    ? "Enviando..."
                    : "Solicitar acceso"}
              </button>
            </section>
          ) : null}
        </aside>
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
                  <p className="eyebrow">Entrada digital</p>
                  <h3>{previewReservation.event_title || `Evento #${previewReservation.event_id}`}</h3>
                  <p className="muted">{formatDate(previewReservation.event_starts_at)}</p>
                </div>
                <button className="ghost-button" type="button" onClick={() => setPreviewReservationId(null)}>
                  Cerrar
                </button>
              </div>

              <div className="ticket-preview-body">
                <div className="ticket-qr-card">
                  <div className="ticket-qr-placeholder" aria-hidden="true">
                    <span>QR</span>
                  </div>
                  <strong>{previewReservation.reservation_code || `RES-${previewReservation.id}`}</strong>
                  <span>Codigo digital de acceso</span>
                </div>

                <div className="ticket-preview-meta">
                  <div>
                    <span>Entradas</span>
                    <strong>{previewReservation.quantity}</strong>
                  </div>
                  <div>
                    <span>Total pagado</span>
                    <strong>{formatCurrency(previewReservation.total_amount)}</strong>
                  </div>
                  <div>
                    <span>Metodo</span>
                    <strong>{formatPaymentMethodLabel(previewReservation.payment_method)}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>{getReservationStatusLabel(previewReservation.status)}</strong>
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

function OrganizerEventsPage({ auth }) {
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
    isEventModalOpen,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    openCreateModal,
    closeEventModal,
  } = useManagedEventsData(auth, { errorMessage: "No pudimos cargar tus eventos en este momento." });

  return (
    <section className="page-section organizer-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Organizer</p>
          <h2>Gestiona el ciclo de vida de tus eventos</h2>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <button className="primary-button" type="button" onClick={openCreateModal}>
          Crear evento
        </button>
      </header>

      {feedback.message ? <InlineMessage type={feedback.type} message={feedback.message} /> : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span>Total eventos</span>
          <strong>{events.length}</strong>
          <small>Creados por tu cuenta</small>
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
      </div>

      <div className="dashboard-two-column align-start">
        <section className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <h3>Acciones rapidas</h3>
            </div>
            <p className="muted">Crea nuevos eventos, actualiza informacion clave y revisa el estado de publicacion de tus experiencias.</p>
            <div className="cta-row compact-actions">
              <button className="primary-button" type="button" onClick={openCreateModal}>
                Nuevo evento
              </button>
              <Link className="secondary-button" to="/events">
                Ver catalogo
              </Link>
            </div>
          </section>
        </section>

        <aside className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <h3>Mis eventos</h3>
            </div>
            {isLoading ? <p className="muted">Cargando eventos...</p> : null}
            <div className="activity-list organizer-event-list">
              {events.map((eventItem) => (
                <article className="activity-item organizer-event-item" key={eventItem.id}>
                  <div>
                    <p>
                      <strong>{eventItem.title}</strong>
                    </p>
                    <span>
                      {getEventStatusLabel(eventItem.status)} · {formatDate(eventItem.starts_at || eventItem.event_date)}
                    </span>
                    {eventItem.rejection_reason ? <small>Motivo: {eventItem.rejection_reason}</small> : null}
                  </div>
                  <div className="cta-row compact-actions">
                    <button className="secondary-button" type="button" onClick={() => editEvent(eventItem)}>
                      Editar
                    </button>
                    <button className="ghost-button" type="button" disabled={deletingId === eventItem.id} onClick={() => deleteEvent(eventItem.id)}>
                      {deletingId === eventItem.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
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
      />
    </section>
  );
}

function AdminEventsPage({ auth }) {
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
    isEventModalOpen,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    openCreateModal,
    closeEventModal,
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
          <Link className="secondary-button" to="/admin/events/catalog">
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
      />
    </section>
  );
}

function AdminEventCatalogPage({ auth }) {
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
    isEventModalOpen,
    updateField,
    updateTicketType,
    addTicketType,
    removeTicketType,
    submitEvent,
    editEvent,
    deleteEvent,
    openCreateModal,
    closeEventModal,
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
          <Link className="secondary-button" to="/admin/events">
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
        <AdminEventCatalogGrid events={events} deletingId={deletingId} onEdit={editEvent} onDelete={deleteEvent} />
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
      />
    </section>
  );
}

function AdminUsersPage({ auth }) {
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [page, setPage] = useState(1);
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

  const loadUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await apiRequest(`/users?page=${page}&limit=${USERS_PAGE_SIZE}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        const nextUsers = response.data || [];
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
    [auth.token, page]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useAutoRefresh(() => loadUsers({ silent: true }), USERS_REFRESH_INTERVAL, Boolean(auth.token));

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

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestion de usuarios y aprobaciones</h2>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
        <Link className="secondary-button" to="/admin/events/review">
          Ver revision de eventos
        </Link>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      <div className="metrics-grid admin-metrics">
        <article className="metric-card highlight">
          <span>Total usuarios</span>
          <strong>{pagination.total}</strong>
          <small>Base registrada</small>
        </article>
        <article className="metric-card">
          <span>Organizers</span>
          <strong>{users.filter((user) => user.role === "organizer").length}</strong>
          <small>Con permisos de publicacion</small>
        </article>
        <article className="metric-card">
          <span>Pendientes</span>
          <strong>{users.filter((user) => user.organizer_status === "pending").length}</strong>
          <small>Solicitudes de organizer</small>
        </article>
      </div>

      <section className="panel-card table-panel">
        <div className="panel-card-header">
          <h3>Usuarios registrados</h3>
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
                      <select value={draft.role} onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], role: event.target.value } }))}>
                        {["customer", "organizer", "staff", "admin"].map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {getRoleLabel(roleOption)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={draft.organizerStatus} onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], organizerStatus: event.target.value } }))}>
                        {["not_requested", "pending", "approved", "rejected"].map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {getOrganizerStatusLabel(statusOption)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="checkbox-field inline-checkbox">
                        <input type="checkbox" checked={Boolean(draft.isActive)} onChange={(event) => setUserDrafts((prev) => ({ ...prev, [user.id]: { ...prev[user.id], isActive: event.target.checked } }))} />
                        <span>{draft.isActive ? "Activo" : "Inactivo"}</span>
                      </label>
                    </td>
                    <td>
                      <button className="secondary-button" type="button" disabled={savingUserId === user.id} onClick={() => saveUser(user.id)}>
                        {savingUserId === user.id ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
  const [feedback, setFeedback] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPendingEvents = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest("/events/review/pending", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      setEvents(response.data || []);
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
  const returnPath = auth.currentUser ? getRoleHomePath(auth.currentUser.role) : "/";

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

function ProtectedRoute({ token, currentUser, allowedRoles, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getRoleHomePath(currentUser.role)} replace />;
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
    return <Navigate to={returnTo || "/dashboard"} replace />;
  }

  return children;
}

function RoleDashboardRedirect({ auth }) {
  return <Navigate to={getRoleHomePath(auth.currentUser?.role)} replace />;
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
