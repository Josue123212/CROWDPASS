import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const TOKEN_KEY = "crowdpass_token";
const USER_KEY = "crowdpass_user";
const USERS_PAGE_SIZE = 12;
const EVENTS_REFRESH_INTERVAL = 15000;
const RESERVATIONS_REFRESH_INTERVAL = 15000;
const USERS_REFRESH_INTERVAL = 5000;
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

const CATEGORY_ITEMS = [
  {
    title: "Conciertos",
    description: "Festivales, tours y experiencias en vivo.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCvOSs6AejLKBJzo2_SfmLTUKTRGPQ72crrsptWeMbhTAqO-z7ObVZBhF0A6WirsV2EcH80TyjxIbBUXsTkqNsQ2f0ETkmEOJ0XMSWTs1hgzBK_she1nEqNJHM7W0rdGRFbctLFp1iAAdcsox1V15ZNhiQTXGwN8gECRYU3njUX9dNyKlnxdcsk6HPwp6jRsr5oDBnuAS9hYSusWMcELAjJYGxZbjM4cJZRkInoTi1gfQ1WJg4JyOZ4odW0y04UCUWFEgzB9n9wOsN5",
    featured: true,
  },
  {
    title: "Deportes",
    description: "Partidos y eventos de alto impacto.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBpqTiT7KMgoOevUnOd3CJ263qxQoRdabpXT_AWTjReKtSJxZFdxCZKkx9SYEqYHoM4yUAy3Ob05ifje5Y6LOClrvCjTu6YecNm5BYkJ6gMSkPkWnlRVvehq_hNRCzy0Rzt-dnEP_0VEtt0m02YXbWgGCwW0r1QmYLKOCE5nmP_KBIg7c_tpIUsdjNQhfdRpOdT6Pgp5aI-gEFfGvnqvGQfGhSTE3zXLEZSLEM4DL5mhTRv2fobJdkOqwHM7EH7TvYTn3qJu3mkgxmc",
  },
  {
    title: "Workshops",
    description: "Aprende con experiencias guiadas y talleres.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZ2V-HAIY27EUfn0BpTDjhCKZKFZoUCDvBRVFsvZCH-NFLqIXGKQGBlf-DGqSxhPYr_pmLOwNXwAmTVc-OUxPIaXMF02bhS-TAGn6UHpTluFCrryYQ9iE1oON-c64_DP7lSkzL-sUvga58dn8kBGN4W6mDwjx65CjPbi9bAca0sWC33QSJorkKHwE1SwPb53FQu3sVWgCXKnXyGDs14Orav6dzUHSNEnM4nMHhgWOKxvr_5SPf28CmUurnfukfjUg-IOD0M2aWq3Iv",
  },
  {
    title: "Todas las categorias",
    description: "Descubre nuevas propuestas cada semana.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBau05llJtAjXkSLfjB-Ubd9TiyBzKpISJHL6qURQ0V_90D11yD1mM27zQaRR0CtVeSwp6gxHHU7cmVHbsN3zDvwnN2a-4loe78psUJJbnK0UvuNuZPwCNa2GW9nowxf05LlaR-vqbYmGmHpiXaP3l4EgcnJKklC82qco8aOd7y8u0G6RM3ZTuiEpHUyZC0rR5HaSnndgNZgzj0d-ObPADaobEBaK340K_JnSHMyzOgr25GPdN9cPVO37X3htVqCB1J1Rwbdt6U26Ru",
  },
];

const EVENT_FALLBACK_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAcXi568ihuRJEOV01OIw3FYqbSpoJpjI816Xe60I4mIPPnRjiV0z0Tl2fxWNE2bl9NX1LmuGRgYM5UpRdpMW4VPgpSCU4neZzWSfoJauW7vtSoSeXOWwsnLPaPP-U6sQoxO7Qvx9I1QWb-Q735hTE816quFpTcVlf4B395IgTc5Q7BEu52kAT5NsNgd0n8RPQgPmwu0c3fMt3uivkOALRFPIoBStnLHdM4f_bdTLNhiL2Synh7yhZaYJjLzJurq2CpaDgvjIMd9qom",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAEX_cvjCHGM1MCHUcQhC2ktRgEpOWUQOgQ5Ijsca3z52SphbADL15bYHONsHKQjCS9QM-r3x9Z5GLNG_ViPGGyyEYcjlDG7MFgnEHsJ2VHkFi-Vnxae1vMUi3eVNlz9NUJSbW2in26ouKYr1CNQwb0mRidE-2kYKIPTnUPocufkE7XpW6040Iq4lZxmlpZUpxP3y-0AdzL-fPiEobU6srw8cuyXi5bsU6r_UarAggQ40UW6YKSb4O_I7JQi59U0CRDxZUiHGCRr4Rl",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBw-r4vLWg1iVZYGwgRtNDSGF7QquQ1w4S25fDFn6YkixmrBzOxlRdMajPcL7ZgYOAo3K-ukzIBLUGPN1AzPHeZKj2X1e8def6OCpRjieRQit3sc2XqSfB2XbX5TgDPineTevRm15lNHqwl9t8SVX8-V7RQrfm_kb6EfVfVGSklVFNGSXeDUT-JdsVhiG6iFo3OlLhnCjKEawMPMn5y9jhFytcCKGz9iU0Z2MLw6W3Sw7oWFtzj8IhPpdKbAJj0ioPXRqe2SPQoc915",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC4vjQK1_MBHM1JfxlS8q8_hN-yW_NqUGo0V1V8v-YxChtGZ4FctiLeSKUHKm4cp5mh1x9HilEwcxSgoGV92AH4I5xRmd79EB6tN8euEyR6ex2GWCXAZBp2AA34_rMohwbl1wmONUJOVqOVnzRp-xFVwrzyQid75tU2ETP6O1a5TkuMWequOcOqQTMxz-8CGAGOPjFeBZZEnSHB_b4BNilUB5E-MT8w-3VYc5OxP1wf8brfvVWtGDSIXPat1XeY1x6oyCSgnZe9NFby",
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

function formatCurrency(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function getUserInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getRoleHomePath(role) {
  return role === "admin" ? "/admin/users" : "/my-space";
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [serverState, setServerState] = useState({
    status: "idle",
    message: "",
  });
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
      setServerState({
        status: "online",
        message: "",
      });
      return true;
    } catch (error) {
      setServerState({
        status: "offline",
        message: error.message || "No pudimos conectar con el servicio en este momento.",
      });
      return false;
    }
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

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

  useAutoRefresh(checkServer, SERVER_STATUS_INTERVAL);

  const authValue = useMemo(
    () => ({
      token,
      currentUser,
      saveSession,
      clearSession,
      checkServer,
      serverState,
    }),
    [token, currentUser, saveSession, clearSession, checkServer, serverState]
  );

  return (
    <Routes>
      <Route element={<PublicLayout auth={authValue} />}>
        <Route path="/" element={<HomePage auth={authValue} />} />
        <Route path="/events" element={<EventsPage auth={authValue} />} />
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
            <PrivateLayout auth={authValue} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/my-space"
          element={
            <ProtectedRoute token={token} allowedRoles={["customer"]} currentUser={currentUser}>
              <DashboardPage auth={authValue} />
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
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function PublicLayout({ auth }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.clearSession();
    navigate("/");
  };

  return (
    <div className="public-shell app-shell">
      <MaintenanceRedirect auth={auth} />

      <header className="public-topbar">
        <div className="public-brand">
          <Link className="brand-mark" to="/">
            CrowdPass
          </Link>
          <nav className="nav-links">
            <Link className={location.pathname === "/" ? "active" : ""} to="/">
              Discover
            </Link>
            <Link className={location.pathname === "/events" ? "active" : ""} to="/events">
              Events
            </Link>
          </nav>
        </div>

        <div className="public-actions">
          {auth.token ? (
            <>
              <Link className="secondary-button" to={getRoleHomePath(auth.currentUser?.role)}>
                {auth.currentUser?.role === "admin" ? "Panel" : "Mi espacio"}
              </Link>
              <button className="ghost-button" type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link className={location.pathname === "/login" ? "active subtle-link" : "subtle-link"} to="/login">
                Log In
              </Link>
              <Link className="primary-button" to="/register">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>© 2026 CrowdPass. Diseñado para descubrir y reservar experiencias.</p>
        <div className="public-footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Help Center</span>
        </div>
      </footer>
    </div>
  );
}

function PrivateLayout({ auth }) {
  const location = useLocation();
  const sidebarItems =
    auth.currentUser?.role === "admin"
      ? [
          { label: "Usuarios", path: "/admin/users" },
          { label: "Eventos", path: "/events", external: true },
        ]
      : [
          { label: "Mi espacio", path: "/my-space" },
          { label: "Eventos", path: "/events", external: true },
        ];

  const activeTitle = auth.currentUser?.role === "admin" ? "Panel administrativo" : "Mi espacio";
  const activeSubtitle =
    auth.currentUser?.role === "admin"
      ? "Gestiona usuarios y revisa la informacion principal del sistema."
      : "Consulta tus reservas y mantente cerca de tus proximas experiencias.";

  const avatar = auth.currentUser?.role === "admin" ? ADMIN_AVATAR_IMAGE : CUSTOMER_AVATAR_IMAGE;

  return (
    <div className="dashboard-shell">
      <MaintenanceRedirect auth={auth} />

      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <Link className="brand-mark" to="/">
            CrowdPass
          </Link>
          <p>{auth.currentUser?.role === "admin" ? "Administracion" : "Tu cuenta"}</p>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) =>
            item.external ? (
              <Link className="sidebar-link" key={item.label} to={item.path}>
                <span>{item.label}</span>
              </Link>
            ) : (
              <Link
                className={`sidebar-link ${location.pathname === item.path ? "active" : ""}`}
                key={item.label}
                to={item.path}
              >
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>

        <div className="sidebar-profile">
          <img src={avatar} alt="Perfil" />
          <div>
            <strong>{auth.currentUser?.full_name || auth.currentUser?.email}</strong>
            <span>{auth.currentUser?.role === "admin" ? "Administrador" : "Usuario"}</span>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">CrowdPass</p>
            <h1>{activeTitle}</h1>
            <p className="muted">{activeSubtitle}</p>
          </div>

          <div className="dashboard-header-actions">
            <button className="ghost-button" type="button" onClick={auth.clearSession}>
              Cerrar sesion
            </button>
          </div>
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
    if (auth.serverState.status !== "offline") {
      return;
    }

    if (location.pathname === "/server-error") {
      return;
    }

    navigate("/server-error", {
      replace: true,
      state: {
        from: location.pathname,
      },
    });
  }, [auth.serverState.status, location.pathname, navigate]);

  return null;
}

function HomePage({ auth }) {
  return (
    <section className="home-page">
      <section className="landing-hero">
        <div className="landing-hero-media">
          <img src={HERO_EVENT_IMAGE} alt="Festival CrowdPass" />
        </div>
        <div className="landing-hero-content">
          <p className="eyebrow">Tu proxima experiencia empieza aqui</p>
          <h1>Descubre eventos que realmente quieras vivir.</h1>
          <p>
            CrowdPass conecta conciertos, workshops y experiencias en una sola plataforma con una
            navegación clara, moderna y pensada para reservar sin fricción.
          </p>

          <div className="landing-search-bar">
            <div>
              <span>Event</span>
              <strong>Music Festival</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>Lima, Peru</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>All Categories</strong>
            </div>
            <Link className="primary-button" to="/events">
              Search
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <div>
            <p className="eyebrow">Explore Categories</p>
            <h2>Elige el tipo de experiencia que buscas</h2>
          </div>
          <p className="muted">Una identidad visual mas editorial, limpia y enfocada en descubrimiento.</p>
        </div>

        <div className="category-grid">
          {CATEGORY_ITEMS.map((category) => (
            <article className={`category-card ${category.featured ? "featured" : ""}`} key={category.title}>
              <img src={category.image} alt={category.title} />
              <div className="category-overlay">
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <div>
            <p className="eyebrow">Experiencia CrowdPass</p>
            <h2>Una experiencia de producto consistente desde el primer acceso</h2>
          </div>
          <Link className="secondary-button" to={auth.currentUser ? getRoleHomePath(auth.currentUser.role) : "/register"}>
            {auth.currentUser ? "Ir a mi dashboard" : "Comenzar ahora"}
          </Link>
        </div>

        <div className="landing-feature-panels">
          <article className="card spotlight-card">
            <h3>Explora, reserva y gestiona</h3>
            <p className="muted">
              Descubre eventos, accede a tu cuenta y gestiona tu experiencia desde una interfaz clara,
              moderna y consistente.
            </p>
            <ul className="feature-list">
              <li>Landing editorial con hero y categorias</li>
              <li>Auth con panel visual lateral</li>
              <li>Panel privado con navegacion lateral</li>
              <li>Estados especiales consistentes</li>
            </ul>
          </article>

          <article className="card spotlight-card secondary">
            <h3>Descubre una experiencia mas clara y moderna</h3>
            <p className="muted">
              Una interfaz pensada para que el usuario explore eventos, encuentre informacion clave y
              avance hacia la reserva sin friccion innecesaria.
            </p>
            <ul className="feature-list">
              <li>Navegacion visual mas limpia y enfocada</li>
              <li>Acceso rapido a eventos y dashboards privados</li>
              <li>Arquitectura separada entre sitio publico y panel interno</li>
            </ul>
            <Link
              className="primary-button inline-action"
              to={auth.currentUser ? getRoleHomePath(auth.currentUser.role) : "/login"}
            >
              {auth.currentUser ? "Abrir mi espacio" : "Iniciar sesion"}
            </Link>
          </article>
        </div>
      </section>
    </section>
  );
}

function RegisterPage({ auth }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      auth.saveSession(response.data.token, response.data.user);
      await auth.checkServer();
      setFeedback({ type: "success", message: response.message });
      navigate(response.data.user.role === "admin" ? "/admin/users" : "/my-space");
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard
      title="Crea tu cuenta"
      description="Registrate para acceder a tus reservas y continuar dentro de la plataforma."
      feedback={feedback}
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Tu nombre completo"
            required
          />
        </label>
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="usuario@crowdpass.com"
            required
          />
        </label>
        <label>
          Contrasena
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Tu contrasena"
            required
          />
        </label>
        <div className="auth-terms">
          <span>Al registrarte aceptas continuar con la experiencia CrowdPass.</span>
        </div>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrarme"}
        </button>
      </form>
    </FormCard>
  );
}

function LoginPage({ auth }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

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
      setFeedback({ type: "success", message: response.message });
      navigate(response.data.user.role === "admin" ? "/admin/users" : "/my-space");
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormCard
      title="Inicia sesion"
      description="Accede con tu correo y contrasena para continuar."
      feedback={feedback}
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="tu@correo.com"
            required
          />
        </label>
        <label>
          Contrasena
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Tu contrasena"
            required
          />
        </label>
        <div className="auth-terms">
          <span>Accede con tu cuenta para abrir tu dashboard personalizado.</span>
        </div>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </FormCard>
  );
}

function EventsPage({ auth }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await apiRequest("/events", { method: "GET" });
      setEvents(response.data || []);
      setFeedback("");
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useAutoRefresh(() => loadEvents({ silent: true }), EVENTS_REFRESH_INTERVAL);

  return (
    <section className="page-section events-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Eventos</p>
          <h2>Explora la oferta actual</h2>
          <p className="muted">Una vista editorial, clara y enfocada en descubrir eventos activos.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </div>

      {feedback ? (
        <InlineMessage type="error" message={feedback} />
      ) : null}

      {isLoading ? <p className="muted">Cargando eventos...</p> : null}

      {!isLoading && events.length === 0 && !feedback ? (
        <div className="card empty-state">
          <h3>No hay eventos disponibles</h3>
          <p className="muted">En cuanto existan eventos activos, apareceran listados en esta vista.</p>
        </div>
      ) : null}

      <div className="card-grid">
        {events.map((eventItem, index) => (
          <article className="event-browser-card" key={eventItem.id}>
            <div className="event-browser-media">
              <img src={EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]} alt={eventItem.title} />
              <span className={`status-pill ${eventItem.status}`}>{eventItem.status}</span>
            </div>

            <div className="event-browser-body">
              <div className="event-browser-meta">
                <span>{new Date(eventItem.event_date).toLocaleDateString()}</span>
                <strong>{formatCurrency(eventItem.price)}</strong>
              </div>
              <h3>{eventItem.title}</h3>
              <p className="muted">{eventItem.description || "Sin descripcion adicional."}</p>
              <div className="event-browser-location">{eventItem.venue}</div>
              <dl className="event-meta">
                <div>
                  <dt>Tickets</dt>
                  <dd>
                    {eventItem.available_tickets} / {eventItem.total_tickets}
                  </dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatDate(eventItem.event_date)}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardPage({ auth }) {
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReservations = useCallback(async ({ silent = false } = {}) => {
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

      setFeedback(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useAutoRefresh(() => loadReservations({ silent: true }), RESERVATIONS_REFRESH_INTERVAL, Boolean(auth.token));

  return (
    <section className="page-section dashboard-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Mi cuenta</p>
          <h2>Tu espacio personal</h2>
          <p className="muted">Consulta tus reservas y mantente cerca de tus proximas experiencias.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      {isLoading ? <p className="muted">Cargando reservas...</p> : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span>Reservas activas</span>
          <strong>{reservations.filter((item) => item.status !== "cancelled").length}</strong>
          <small>Disponibles en tu cuenta</small>
        </article>
        <article className="metric-card">
          <span>Tickets totales</span>
          <strong>{reservations.reduce((total, item) => total + Number(item.quantity || 0), 0)}</strong>
          <small>Entradas registradas</small>
        </article>
        <article className="metric-card">
          <span>Importe acumulado</span>
          <strong>{formatCurrency(reservations.reduce((total, item) => total + Number(item.total_amount || 0), 0))}</strong>
          <small>Historial personal</small>
        </article>
        <article className="metric-card highlight">
          <span>Perfil</span>
          <strong>{auth.currentUser?.full_name || "CrowdPass User"}</strong>
          <small>{auth.currentUser?.email}</small>
        </article>
      </div>

      {!isLoading && reservations.length === 0 && !feedback ? (
        <div className="card empty-state">
          <h3>No hay reservas registradas</h3>
          <p className="muted">Aun no tienes reservas registradas en tu cuenta.</p>
        </div>
      ) : null}

      <div className="dashboard-two-column">
        <div className="dashboard-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <h3>Mis proximos eventos</h3>
            </div>
            <div className="ticket-stack">
              {reservations.map((reservation, index) => (
                <article className="ticket-card" key={reservation.id}>
                  <div className="ticket-card-media">
                    <img
                      src={EVENT_FALLBACK_IMAGES[index % EVENT_FALLBACK_IMAGES.length]}
                      alt={reservation.event_title || `Evento ${reservation.event_id}`}
                    />
                  </div>
                  <div className="ticket-card-body">
                    <div className="ticket-card-top">
                      <span className={`status-pill ${reservation.status}`}>{reservation.status}</span>
                      <span>{formatCurrency(reservation.total_amount)}</span>
                    </div>
                    <h3>{reservation.event_title || `Evento #${reservation.event_id}`}</h3>
                    <p className="muted">Reserva #{reservation.id}</p>
                    <div className="ticket-card-footer">
                      <div>
                        <span>Tickets</span>
                        <strong>{reservation.quantity}</strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(reservation.total_amount)}</strong>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-stack">
          <section className="panel-card profile-card">
            <img src={CUSTOMER_AVATAR_IMAGE} alt="Perfil del usuario" />
            <h3>{auth.currentUser?.full_name || "Usuario CrowdPass"}</h3>
            <p>{auth.currentUser?.email}</p>
            <div className="profile-card-meta">
              <div>
                <span>Rol</span>
                <strong>{auth.currentUser?.role}</strong>
              </div>
              <div>
                <span>Actividad</span>
                <strong>{reservations.length} reservas</strong>
              </div>
            </div>
          </section>

          <section className="panel-card promo-card">
            <p className="eyebrow">Explora mas</p>
            <h3>Encuentra nuevas experiencias en CrowdPass</h3>
            <p className="muted">
              Descubre nuevos eventos y vuelve al catalogo cuando quieras seguir explorando.
            </p>
            <Link className="primary-button inline-action" to="/events">
              Explorar eventos
            </Link>
          </section>
        </aside>
      </div>
    </section>
  );
}

function AdminUsersPage({ auth }) {
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: USERS_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (!auth.token) {
      return;
    }

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

      setUsers(response.data || []);
      setPagination({
        page: response.meta?.page || page,
        limit: response.meta?.limit || USERS_PAGE_SIZE,
        total: response.meta?.total || 0,
        totalPages: response.meta?.totalPages || 0,
        hasNextPage: Boolean(response.meta?.hasNextPage),
        hasPreviousPage: Boolean(response.meta?.hasPreviousPage),
      });
      setFeedback("");
    } catch (error) {
      if (isServiceUnavailableError(error)) {
        setFeedback("");
        await auth.checkServer();
        return;
      }

      setFeedback(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [auth, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useAutoRefresh(() => loadUsers({ silent: true }), USERS_REFRESH_INTERVAL, Boolean(auth.token));

  return (
    <section className="page-section admin-page">
      <header className="dashboard-section-header">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestion de usuarios</h2>
          <p className="muted">Visualiza usuarios y revisa la informacion principal del sistema.</p>
          {!isLoading && isRefreshing ? <p className="muted">Actualizando informacion...</p> : null}
        </div>
      </header>

      {feedback ? <InlineMessage type="error" message={feedback} /> : null}

      {isLoading ? <p className="muted">Cargando usuarios...</p> : null}

      <div className="metrics-grid admin-metrics">
        <article className="metric-card highlight">
          <span>Total usuarios</span>
          <strong>{pagination.total}</strong>
          <small>Base registrada</small>
        </article>
        <article className="metric-card">
          <span>Admins</span>
          <strong>{users.filter((user) => user.role === "admin").length}</strong>
          <small>Accesos elevados</small>
        </article>
        <article className="metric-card">
          <span>Clientes</span>
          <strong>{users.filter((user) => user.role !== "admin").length}</strong>
          <small>Usuarios finales</small>
        </article>
        <article className="metric-card">
          <span>Pagina actual</span>
          <strong>{pagination.page}</strong>
          <small>de {Math.max(pagination.totalPages, 1)}</small>
        </article>
      </div>

      {!isLoading && users.length === 0 && !feedback ? (
        <div className="card empty-state">
          <h3>No hay usuarios registrados</h3>
          <p className="muted">Los nuevos usuarios apareceran en este panel en cuanto se registren.</p>
        </div>
      ) : null}

      <div className="dashboard-two-column admin-grid">
        <section className="panel-card table-panel">
          <div className="panel-card-header">
            <h3>Usuarios registrados</h3>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
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
                    <td>{user.role}</td>
                    <td>
                      <span className={`table-status ${user.role === "admin" ? "admin" : "active"}`}>
                        {user.role === "admin" ? "Admin" : "Active"}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && pagination.totalPages > 1 ? (
            <div className="pagination-bar">
              <p>
                Pagina {pagination.page} de {pagination.totalPages}
              </p>
              <div className="cta-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  Anterior
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setPage((currentPage) =>
                      pagination.totalPages ? Math.min(currentPage + 1, pagination.totalPages) : currentPage + 1
                    )
                  }
                  disabled={!pagination.hasNextPage}
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="dashboard-stack">
          <section className="panel-card profile-card admin-profile-card">
            <img src={ADMIN_AVATAR_IMAGE} alt="Administrador CrowdPass" />
            <h3>{auth.currentUser?.full_name || "Admin CrowdPass"}</h3>
            <p>{auth.currentUser?.email}</p>
            <div className="profile-card-meta">
              <div>
                <span>Rol</span>
                <strong>{auth.currentUser?.role}</strong>
              </div>
              <div>
                <span>Usuarios visibles</span>
                <strong>{users.length}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card activity-panel">
            <h3>Usuarios recientes</h3>
            <div className="activity-list">
              {users.slice(0, 4).map((user) => (
                <article className="activity-item" key={user.id}>
                  <span className="activity-badge">{getUserInitials(user.full_name)}</span>
                  <div>
                    <p>
                      <strong>{user.full_name}</strong>
                    </p>
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
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

  const handleRetry = async () => {
    const isOnline = await auth.checkServer();

    if (isOnline) {
      navigate(returnPath, { replace: true });
    }
  };

  return (
    <section className="page-section server-error-page maintenance-page">
      <div className="maintenance-topbar">
        <Link className="brand-mark" to="/">
          CrowdPass
        </Link>
        <span className="maintenance-status">Status: Maintenance</span>
      </div>

      <div className="card state-card maintenance-card">
        <div className="maintenance-visual">
          <img src={SERVER_ERROR_IMAGE} alt="Mantenimiento CrowdPass" />
        </div>

        <div className="maintenance-copy">
          <p className="maintenance-badge">Brief Interruption</p>
          <h2>We'll be back shortly</h2>
          <p className="muted">
            Estamos realizando una recuperacion temporal del servicio. Tus datos y tus reservas siguen
            protegidos mientras el sistema vuelve a estar disponible.
          </p>
          <p className="muted">Intentaremos reconectar automaticamente cada pocos segundos.</p>

          <div className="maintenance-progress">
            <div className="maintenance-progress-label">
              <span>Update Progress</span>
              <strong>85% Complete</strong>
            </div>
            <div className="maintenance-progress-track">
              <span className="maintenance-progress-fill" />
            </div>
          </div>

          <div className="cta-row maintenance-actions">
            <button className="primary-button" type="button" onClick={handleRetry}>
              Check Again
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

function NotFoundPage() {
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
            <Link className="primary-button" to="/">
              Volver al inicio
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
    return <Navigate to={currentUser.role === "admin" ? "/admin/users" : "/my-space"} replace />;
  }

  return children || <Outlet />;
}

function PublicOnlyRoute({ token, children }) {
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RoleDashboardRedirect({ auth }) {
  if (auth.currentUser?.role === "admin") {
    return <Navigate to="/admin/users" replace />;
  }

  return <Navigate to="/my-space" replace />;
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
            <p>
              Una plataforma moderna para explorar eventos, acceder a tus reservas y gestionar tu
              experiencia con una interfaz clara y confiable.
            </p>
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
