import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

function isNavItemActive(item, location) {
  if (typeof item.isActive === "function") {
    return item.isActive(location);
  }

  return `${location.pathname}${location.search}` === item.path;
}

function isNavGroupActive(item, location) {
  return (item.children || []).some((child) => isNavItemActive(child, location));
}

function SidebarNav({ items, location, expandedGroups, setExpandedGroups }) {
  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        if (Array.isArray(item.children) && item.children.length) {
          const isActive = isNavGroupActive(item, location);
          const isExpanded = expandedGroups[item.label] ?? isActive;
          return (
            <div className="sidebar-nav-group" key={item.label}>
              <button
                className={`sidebar-link sidebar-group-link ${isActive ? "active" : ""}`}
                type="button"
                onClick={() =>
                  setExpandedGroups((current) => ({
                    ...current,
                    [item.label]: !(current[item.label] ?? isActive),
                  }))
                }
              >
                <span className="sidebar-link-main">
                  {item.icon ? (
                    <span className="material-symbols-outlined sidebar-link-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </span>
                <span className="material-symbols-outlined">{isExpanded ? "expand_less" : "expand_more"}</span>
              </button>
              {isExpanded ? (
                <div className="sidebar-subnav">
                  {item.children.map((child) => (
                    <Link
                      className={`sidebar-link sidebar-sublink ${isNavItemActive(child, location) ? "active" : ""}`}
                      key={child.label}
                      to={child.path}
                    >
                      <span className="sidebar-link-main">
                        {child.icon ? (
                          <span className="material-symbols-outlined sidebar-link-icon" aria-hidden="true">
                            {child.icon}
                          </span>
                        ) : null}
                        <span>{child.label}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <Link className={`sidebar-link ${isNavItemActive(item, location) ? "active" : ""}`} key={item.label} to={item.path}>
            <span className="sidebar-link-main">
              {item.icon ? (
                <span className="material-symbols-outlined sidebar-link-icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </span>
            {item.description ? <small>{item.description}</small> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarProfileMenu({ auth, roleConfig, roleLabel, avatarImage, isProfileMenuOpen, setIsProfileMenuOpen, profileMenuRef }) {
  return (
    <div className="sidebar-profile-menu" ref={profileMenuRef}>
      <button
        className={`sidebar-profile ${isProfileMenuOpen ? "open" : ""}`}
        type="button"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
      >
        <img src={avatarImage} alt="Perfil" />
        <div>
          <strong>{auth.currentUser?.full_name || auth.currentUser?.email}</strong>
          <span>{roleLabel}</span>
        </div>
      </button>

      {isProfileMenuOpen ? (
        <div className="sidebar-profile-dropdown">
          {(roleConfig.profileActions || []).map((action) => (
            <Link className="sidebar-profile-option" key={action.path} to={action.path} onClick={() => setIsProfileMenuOpen(false)}>
              {action.label}
            </Link>
          ))}
          <button className="sidebar-profile-option danger" type="button" onClick={auth.clearSession}>
            Cerrar sesion
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SuperAdminSidebar({ auth, roleConfig, roleLabel, avatarImage, location, expandedGroups, setExpandedGroups, isProfileMenuOpen, setIsProfileMenuOpen, profileMenuRef }) {
  return (
    <aside className="dashboard-sidebar backoffice-sidebar superadmin-sidebar">
      <div className="sidebar-brand superadmin-brand">
        <div className="superadmin-brand-row">
          <span className="superadmin-brand-badge" aria-hidden="true">
            ⟁
          </span>
          <div>
            <Link className="brand-mark" to={roleConfig.homePath}>
              {roleConfig.brandMark || "CrowdPass"}
            </Link>
            <p>{roleConfig.brandSubtitle}</p>
          </div>
        </div>
        <div className="superadmin-brand-meta" aria-hidden="true">
          <span>LIVE_FEED_ACTIVE</span>
          <span className="superadmin-dot">•</span>
          <span>ACCESS_OK</span>
        </div>
      </div>

      <SidebarNav items={roleConfig.sidebarItems} location={location} expandedGroups={expandedGroups} setExpandedGroups={setExpandedGroups} />

      <SidebarProfileMenu
        auth={auth}
        roleConfig={roleConfig}
        roleLabel={roleLabel}
        avatarImage={avatarImage}
        isProfileMenuOpen={isProfileMenuOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
        profileMenuRef={profileMenuRef}
      />
    </aside>
  );
}

function StandardSidebar({ auth, roleConfig, roleLabel, avatarImage, location, expandedGroups, setExpandedGroups, isProfileMenuOpen, setIsProfileMenuOpen, profileMenuRef }) {
  return (
    <aside className="dashboard-sidebar backoffice-sidebar">
      <div className="sidebar-brand">
        <Link className="brand-mark" to={roleConfig.homePath}>
          {roleConfig.brandMark || "CrowdPass"}
        </Link>
        <p>{roleConfig.brandSubtitle}</p>
      </div>

      <SidebarNav items={roleConfig.sidebarItems} location={location} expandedGroups={expandedGroups} setExpandedGroups={setExpandedGroups} />

      <SidebarProfileMenu
        auth={auth}
        roleConfig={roleConfig}
        roleLabel={roleLabel}
        avatarImage={avatarImage}
        isProfileMenuOpen={isProfileMenuOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
        profileMenuRef={profileMenuRef}
      />
    </aside>
  );
}

export default function BackofficeLayout({ auth, roleConfig, roleLabel, avatarImage }) {
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const profileMenuRef = useRef(null);
  const isSuperAdminConsole =
    Boolean(auth.currentUser?.is_super_admin) && typeof roleConfig.homePath === "string" && roleConfig.homePath.startsWith("/superadmin");

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

  useEffect(() => {
    const groups = (roleConfig.sidebarItems || []).filter((item) => Array.isArray(item.children) && item.children.length);
    if (!groups.length) {
      return;
    }

    setExpandedGroups((current) => {
      const next = { ...current };
      for (const group of groups) {
        if (isNavGroupActive(group, location)) {
          next[group.label] = true;
        }
      }
      return next;
    });
  }, [location.pathname, location.search, roleConfig.sidebarItems]);

  return (
    <div className={`dashboard-shell backoffice-shell ${isSuperAdminConsole ? "superadmin-shell" : ""}`}>
      {isSuperAdminConsole ? (
        <SuperAdminSidebar
          auth={auth}
          roleConfig={roleConfig}
          roleLabel={roleLabel}
          avatarImage={avatarImage}
          location={location}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          profileMenuRef={profileMenuRef}
        />
      ) : (
        <StandardSidebar
          auth={auth}
          roleConfig={roleConfig}
          roleLabel={roleLabel}
          avatarImage={avatarImage}
          location={location}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          profileMenuRef={profileMenuRef}
        />
      )}

      <div className="dashboard-main backoffice-main">
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
