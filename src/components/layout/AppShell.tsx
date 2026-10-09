import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSessionStore, ROLE_LABELS } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { useThemeStore } from "@/stores/theme";
import { useSignout } from "@/hooks/session";
import { NAV_GROUPS, NAV_ICONS, findRoute, isLockedFor, isVisibleFor } from "@/router/navigation";
import { initials } from "@/lib/format";
import { Toasts } from "@/components/ui";
import { useNavBadges } from "./useNavBadges";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { NotificationBell } from "./NotificationBell";
import { ConnectionStatus } from "./ConnectionStatus";
import { GlobalSearch } from "./GlobalSearch";
import { RealtimeBridge } from "@/realtime/RealtimeBridge";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { useNotifications } from "@/hooks/notifications";
import { useUnreadInTitle } from "@/hooks/chat";
import styles from "./AppShell.module.css";

/** Marca del lienzo: hoja sobre cuadrado verde claro. */
export const BrandMark = ({ size = 38 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3DFB93" />
        <stop offset="1" stopColor="#0FD068" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="41" height="41" rx="9" fill="url(#bm-bg)" />
    <path d="M9 33.5 C 15 30.5 29 30.5 35 33.5" stroke="#121315" strokeWidth="2.2" strokeLinecap="round" opacity="0.35" />
    <path d="M22 32 L22 18.5" stroke="#121315" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M22 26 C 16 26 12.5 22 12.5 16 C 18.5 16 22 20 22 26 Z" fill="#121315" />
    <path d="M22 22 C 28 22 31.5 18 31.5 12 C 25.5 12 22 16 22 22 Z" fill="#2F3A13" />
  </svg>
);

const NavIcon = ({ paths }: { paths: string }) => <svg className={styles.icon} viewBox="0 0 22 22" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths }} />;

const Lock = () => (
  <svg className={styles.lock} width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <rect x="2.4" y="5.2" width="7.2" height="5.4" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M4.2 5.2 V3.8 a1.8 1.8 0 0 1 3.6 0 V5.2" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

const Chevron = () => (
  <svg className={styles.chevron} width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 3.5 L10.5 8 L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const groupOf = (pathname: string) => NAV_GROUPS.find((g) => g.items.some((i) => (i.path === "/" ? pathname === "/" : pathname.startsWith(i.path))))?.title ?? (pathname === "/perfil" ? "Su cuenta" : "Inicio");

/** Barra lateral, barra superior y panel de contenido, fieles al lienzo de diseño. */
export const AppShell = () => {
  const user = useSessionStore((s) => s.user);
  const navOpen = useUiStore((s) => s.navOpen);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const signout = useSignout();
  const location = useLocation();
  const navigate = useNavigate();
  const badges = useNavBadges();
  const notifications = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const isDark = themeMode === "dark" || (themeMode === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const current = findRoute(location.pathname);

  useUnreadInTitle((badges.messages ?? 0) + (notifications.data?.unread ?? 0));
  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <nav className={[styles.nav, navOpen ? "" : styles.rail, mobileOpen ? styles.navMobileOpen : ""].join(" ")} aria-label="Menú principal">
        <div className={styles.brand}>
          <BrandMark />
          <div className={styles.brandText}>
            <div className={styles.brandName}>Mi Tierrita</div>
            <div className={styles.brandSub}>SIG · Agropecuaria</div>
          </div>
        </div>
        <div className={styles.list}>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => isVisibleFor(i, user.role));
            if (items.length === 0) return null;
            return (
              <div key={group.title ?? "main"} style={{ display: "contents" }}>
                {group.title ? <div className={styles.cat}>{group.title}</div> : null}
                {items.map((item) => {
                  const locked = isLockedFor(item, user.role);
                  const count = item.badge ? badges[item.badge] : undefined;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      aria-label={item.label}
                      title={navOpen ? undefined : item.label}
                      className={({ isActive }) => [styles.item, isActive ? styles.active : "", locked ? styles.locked : ""].join(" ")}
                    >
                      <NavIcon paths={item.icon} />
                      <span className={styles.label}>{item.label}</span>
                      {locked ? <Lock /> : count !== undefined && count > 0 ? <span className={styles.badge}>{count}</span> : null}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className={styles.exitWrap}>
          <div className={styles.navUser}>
            <div className={styles.navAvatar}>{initials(user.firstName, user.lastName)}</div>
            <div className={styles.navUserText}>
              <div className={styles.navUserName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.navUserRole}>{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <button type="button" className={[styles.item, styles.exit].join(" ")} onClick={() => signout.mutate(undefined)} aria-label="Cerrar sesión" title="Cerrar sesión">
            <NavIcon paths={NAV_ICONS.signout} />
            <span className={styles.label}>Cerrar sesión</span>
          </button>
        </div>
      </nav>

      <div className={styles.panel}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={[styles.iconBtn, styles.toggle].join(" ")}
            onClick={() => (window.innerWidth <= 900 ? setMobileOpen((v) => !v) : toggleNav())}
            aria-label={navOpen ? "Ocultar el menú lateral" : "Mostrar el menú lateral"}
          >
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="2.5" y="3.5" width="17" height="15" rx="2.6" stroke="currentColor" strokeWidth="1.6" />
              <line x1="8.6" y1="3.5" x2="8.6" y2="18.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <nav className={styles.crumbs} aria-label="Ruta de navegación">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Mi Tierrita</a>
            {location.pathname !== "/" ? (
              <>
                <Chevron />
                <span className={styles.crumbGroup}>{groupOf(location.pathname)}</span>
              </>
            ) : null}
            <Chevron />
            <strong aria-current="page">{current?.label ?? "Tablero gerencial"}</strong>
            <span id="crumb-slot" style={{ display: "contents" }} />
          </nav>
          <GlobalSearch />
          <ConnectionStatus />
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={isDark ? "Usar tema claro" : "Usar tema oscuro"}
            title={isDark ? "Tema claro" : "Tema oscuro"}
            onClick={() => setThemeMode(isDark ? "light" : "dark")}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M16.5 12.3A7 7 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <NotificationBell />
          <NavLink to="/perfil" className={styles.user} title="Mi perfil">
            <div className={styles.avatar}>{initials(user.firstName, user.lastName)}</div>
            <div className={styles.userText}>
              <div className={styles.userName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.userRole}>{ROLE_LABELS[user.role]}</div>
            </div>
          </NavLink>
        </header>
        <ErrorBoundary resetKey={location.pathname}>
          <AnimatedOutlet className={styles.content} />
        </ErrorBoundary>
        <footer className={styles.footer}>
          <div className={styles.footBrand}>
            <BrandMark size={34} />
            <div>
              <div className={styles.footName}>Mi Tierrita</div>
              <div className={styles.footSub}>Agropecuaria · Sahagún, Córdoba</div>
            </div>
          </div>
          <p className={styles.footScript}>Información que siembra mejores decisiones</p>
          <div className={styles.footMeta}>
            <span>© {new Date().getFullYear()} Mi Tierrita SIG · Universidad de Cartagena</span>
            <span>Fotografías: Unsplash · Ilustraciones: unDraw</span>
          </div>
        </footer>
      </div>
      <Toasts />
      <RealtimeBridge />
    </div>
  );
};

/** Fotografía de cabecera de cada módulo (Unsplash, licencia libre; créditos en /public/img/CREDITOS.txt). */
const PHOTO_BY_ROUTE: Record<string, string> = {
  "": "tablero-ganado",
  inventario: "bodega-estibas",
  lotes: "bodega-sacos",
  ventas: "manos-granos",
  clientes: "clientes-finca",
  proveedores: "estibas-bultos",
  finanzas: "finanzas-escritorio",
  reportes: "valle-cordoba",
  usuarios: "manos-tierra",
  auditoria: "manos-tierra",
  chat: "clientes-finca",
  contactos: "valle-cordoba",
  perfil: "amanecer-pradera",
};
export const photoUrl = (name: string) => `${import.meta.env.BASE_URL}img/${name}.webp`;

/**
 * Encabezado de página al estilo editorial agrotecnológico: fotografía de campo a todo el ancho con velo oscuro,
 * antetítulo manuscrito, título condensado en mayúscula, subtítulo y acciones. La foto depende del módulo.
 */
export const PageHeader = ({ title, subtitle, actions, eyebrow, photo }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string; photo?: string }) => {
  const location = useLocation();
  const key = location.pathname.split("/")[1] ?? "";
  const img = photo ?? PHOTO_BY_ROUTE[key] ?? "amanecer-pradera";
  return (
    <div className={styles.pageHead} style={{ backgroundImage: `url(${photoUrl(img)})` }}>
      <div className={styles.pageHeadText}>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <div className={styles.pageSub}>{subtitle}</div> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </div>
  );
};
