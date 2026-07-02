function isOrganizerViewActive(expectedView) {
  return (location) => {
    if (location.pathname !== "/organizer/events") {
      return false;
    }

    const activeView = new URLSearchParams(location.search).get("view") || "dashboard";
    return activeView === expectedView;
  };
}

export const BACKOFFICE_ROLE_CONFIGS = {
  superadmin: {
    homePath: "/superadmin/users",
    brandMark: "ROOT_ADMIN",
    brandSubtitle: "SuperAdmin Console",
    profileActions: [
      {
        label: "Admin Console",
        path: "/admin/users",
      },
    ],
    sidebarItems: [
      {
        label: "Administrador de usuarios",
        icon: "shield_person",
        children: [
          { label: "Clientes", path: "/superadmin/users?group=customers", icon: "person" },
          { label: "Organizadores", path: "/superadmin/users?group=organizers", icon: "event" },
          { label: "Staff", path: "/superadmin/users?group=staff", icon: "support_agent" },
          { label: "Admins", path: "/superadmin/users?group=admins", icon: "admin_panel_settings" },
          { label: "Todos", path: "/superadmin/users?group=all", icon: "groups" },
        ],
      },
      { label: "Eventos", path: "/superadmin/events", icon: "calendar_month" },
      { label: "Catalogo", path: "/superadmin/events/catalog", icon: "view_module" },
      { label: "Revision", path: "/superadmin/events/review", icon: "fact_check" },
    ],
  },
  admin: {
    homePath: "/admin/users",
    brandMark: "SYSTEM_ADMIN",
    brandSubtitle: "Admin Console",
    profileActions: [
      {
        label: "Catalogo",
        path: "/admin/events/catalog",
      },
      {
        label: "Ajustes",
        path: "/admin/settings",
      },
    ],
    sidebarItems: [
      {
        label: "Administrador de usuarios",
        icon: "manage_accounts",
        children: [
          { label: "Clientes", path: "/admin/users?group=customers", icon: "person" },
          { label: "Organizadores", path: "/admin/users?group=organizers", icon: "event" },
          { label: "Staff", path: "/admin/users?group=staff", icon: "support_agent" },
        ],
      },
      { label: "Eventos", path: "/admin/events", icon: "calendar_month" },
      { label: "Catalogo", path: "/admin/events/catalog", icon: "view_module" },
      { label: "Revision", path: "/admin/events/review", icon: "fact_check" },
    ],
  },
  organizer: {
    homePath: "/organizer/events",
    brandMark: "ORG_CONSOLE",
    brandSubtitle: "Organizer Console",
    profileActions: [
      {
        label: "Catalogo",
        path: "/events",
      },
    ],
    sidebarItems: [
      { label: "Dashboard", path: "/organizer/events?view=dashboard", isActive: isOrganizerViewActive("dashboard"), icon: "dashboard" },
      { label: "Eventos", path: "/organizer/events?view=events", isActive: isOrganizerViewActive("events"), icon: "calendar_month" },
      { label: "Historial", path: "/organizer/events?view=history", isActive: isOrganizerViewActive("history"), icon: "history" },
      { label: "Solicitudes", path: "/organizer/events?view=requests", isActive: isOrganizerViewActive("requests"), icon: "wysiwyg" },
      { label: "Perfil", path: "/organizer/events?view=profile", isActive: isOrganizerViewActive("profile"), icon: "account_circle" },
    ],
  },
  staff: {
    brandMark: "STAFF_NODE",
    homePath: "/staff/reservations",
    brandSubtitle: "Staff Console",
    profileActions: [
      {
        label: "Marketplace",
        path: "/events",
      },
    ],
    sidebarItems: [
      { label: "Reservas", path: "/staff/reservations", icon: "confirmation_number" },
      { label: "Reembolsos (Seguro)", path: "/staff/refunds", icon: "receipt_long" },
      { label: "Cancelaciones", path: "/staff/cancellations", icon: "event_busy" },
    ],
  },
};
