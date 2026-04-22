import { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Plane,
  Users,
  Building,
  ClipboardList,
  BarChart2,
  Settings,
  UserCog,
  FileText,
  Shield,
  X,
  LayoutGrid,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRolColor } from "../../utils/roleUtils";
import styles from "./Sidebar.module.css";

/* ──────────────────────────────────────────────────────────────
   Menús por SECCIÓN (path prefix) — independientes del rol
   Un admin que navega a /lider/vuelo ve el menú de Líder, etc.
   ────────────────────────────────────────────────────────────── */
const NAV_BY_SECTION = {
  "/lider": {
    // label: "Registro de Vuelo",
    color: "var(--rol-lider)",
    items: [{ to: "/lider/vuelo", icon: Plane, label: "Registro de Vuelo" }],
  },
  "/agente": {
    // label: "Compensación",
    color: "var(--rol-agente)",
    items: [
      { to: "/agente/atencion", icon: Users, label: "Atención al Pasajero" },
    ],
  },
  "/reportes": {
    // label: "Reportes",
    color: "var(--rol-aerea)",
    items: [{ to: "/reportes", icon: BarChart2, label: "Reportes" }],
  },
  "/admin": {
    // label: "Administración",
    color: "var(--rol-admin)",
    items: [
      { to: "/admin", icon: Building, label: "Dashboard" },
      { to: "/admin/proveedores", icon: ClipboardList, label: "Proveedores" },
      { to: "/admin/usuarios", icon: UserCog, label: "Usuarios" },
      { to: "/admin/vuelos", icon: Plane, label: "Carga de Vuelos" },
      { to: "/reportes", icon: BarChart2, label: "Reportes" },
      { to: "/auditoria", icon: Shield, label: "Auditoría" },
    ],
  },
  "/auditoria": {
    // label: "Auditoría",
    color: "var(--rol-admin)",
    items: [{ to: "/auditoria", icon: Shield, label: "Auditoría" }],
  },
};

/* Menú fijo por rol (cuando el path no coincide con ninguna sección) */
const NAV_FALLBACK = {
  LIDER_SAASA: "/lider",
  AGENTE_SAASA: "/agente",
  LINEA_AEREA: "/reportes",
  PROVEEDOR: "/reportes",
  ADMINISTRADOR: "/admin",
};

/* Determina qué sección del menú mostrar según el path actual */
function resolveSection(pathname, rol) {
  // Si es admin y está en reportes o auditoría, mantener menú de admin
  if (
    rol === "ADMINISTRADOR" &&
    (pathname.startsWith("/reportes") || pathname.startsWith("/auditoria"))
  ) {
    return NAV_BY_SECTION["/admin"];
  }
  // Orden importa: /admin/proveedores debe coincidir con /admin
  const prefixes = ["/auditoria", "/lider", "/agente", "/reportes", "/admin"];
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) return NAV_BY_SECTION[prefix];
  }
  return null;
}

export default function Sidebar({ open, onClose }) {
  const { rol } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar sección actual por path
  const section = resolveSection(location.pathname, rol);
  const rolColor = section?.color ?? getRolColor(rol);
  const navItems = section?.items ?? [];

  // Cerrar con Escape en móvil
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleBack = () => {
    onClose();
    navigate("/dashboard");
  };

  return (
    <>
      {open && (
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      )}

      <aside className={[styles.sidebar, open ? styles.open : ""].join(" ")}>
        {/* ── Cabecera ── */}
        <div
          className={styles.header}
          style={{ borderBottom: `3px solid ${rolColor}` }}
        >
          <div className={styles.brand}>
            <Plane size={22} color={rolColor} />
            <div>
              <span className={styles.brandName}>Devlynk</span>
              <span className={styles.brandSub}>SAASA</span>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Etiqueta de sección activa */}
        {section && (
          <div className={styles.sectionLabel} style={{ color: rolColor }}>
            {section.label}
          </div>
        )}

        {/* ── Navegación ── */}
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              onClick={onClose}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.active : ""].join(" ")
              }
              style={({ isActive }) =>
                isActive ? { color: rolColor } : undefined
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Botón de retroceso al dashboard ── */}
        <div className={styles.backArea}>
          <button className={styles.backBtn} onClick={handleBack}>
            <LayoutGrid size={16} />
            <span>Módulos principales</span>
          </button>
        </div>
      </aside>
    </>
  );
}
