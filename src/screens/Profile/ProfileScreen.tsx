import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, EmptyState, Field, FieldRow, Input, QueryState, StatCard, StatGrid, Tabs, type TabOption } from "@/components/ui";
import { useChangePassword, useMyActivity, useUpdateProfile } from "@/hooks/users";
import { useSignout } from "@/hooks/session";
import { fieldErrors } from "@/lib/errors";
import { dateOnly, dateTime, initials, int } from "@/lib/format";
import { describeActivity, ROLE_PERMISSIONS } from "@/lib/activity";
import { ROLE_LABELS, useSessionStore } from "@/stores/session";
import { useThemeStore } from "@/stores/theme";
import { useRealtimeStore } from "@/realtime/socket";
import styles from "./ProfileScreen.module.css";

type ProfileTab = "datos" | "seguridad" | "actividad" | "permisos" | "preferencias";

const TABS: TabOption<ProfileTab>[] = [
  { value: "datos", label: "Datos personales" },
  { value: "seguridad", label: "Seguridad" },
  { value: "actividad", label: "Mi actividad" },
  { value: "permisos", label: "Mi rol" },
  { value: "preferencias", label: "Preferencias" },
];

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="3" width="13" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 4l6 4.6L14 4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 1.8h2.2l1 3.2-1.5 1.1a8.5 8.5 0 0 0 4.2 4.2l1.1-1.5 3.2 1v2.2a1.6 1.6 0 0 1-1.7 1.6A12.2 12.2 0 0 1 2.4 3.5 1.6 1.6 0 0 1 4 1.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const Check = ({ ok, children }: { ok: boolean; children: string }) => (
  <li className={ok ? styles.ruleOk : styles.rule}>
    <span aria-hidden="true">{ok ? "✓" : "•"}</span> {children}
  </li>
);

/** Mi perfil (v4.2, como en SoftUnity): identidad, datos de contacto, seguridad, actividad, permisos y preferencias. */
export const ProfileScreen = () => {
  const user = useSessionStore((s) => s.user!);
  const status = useRealtimeStore((s) => s.status);
  const [tab, setTab] = useState<ProfileTab>("datos");
  const activity = useMyActivity();
  const lastSignin = activity.data?.lastSigninAt ?? null;

  return (
    <>
      <PageHeader eyebrow="Su cuenta" title="Mi perfil" subtitle="Sus datos de contacto, su contraseña, lo que ha hecho en el sistema y cómo prefiere ver Mi Tierrita." />
      <div className={styles.grid}>
        <Card className={styles.identity}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{initials(user.firstName, user.lastName)}</div>
            <span className={[styles.dot, status === "online" ? styles.dotOn : ""].join(" ")} title={status === "online" ? "En línea" : "Sin conexión en tiempo real"} />
          </div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p className={styles.username}>@{user.username}</p>
          <span className={styles.role}>{ROLE_LABELS[user.role]}</span>
          <ul className={styles.contact}>
            <li>
              <MailIcon /> {user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : <em>Sin correo registrado</em>}
            </li>
            <li>
              <PhoneIcon /> {user.phone ? <span>{user.phone}</span> : <em>Sin teléfono registrado</em>}
            </li>
          </ul>
          <dl className={styles.facts}>
            <div>
              <dt>Miembro desde</dt>
              <dd>{dateOnly(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Último ingreso</dt>
              <dd>{lastSignin ? dateTime(lastSignin) : "—"}</dd>
            </div>
            <div>
              <dt>Tiempo real</dt>
              <dd>{status === "online" ? "Conectado" : status === "reconnecting" ? "Reconectando…" : "Sin conexión"}</dd>
            </div>
            <div>
              <dt>Perfil actualizado</dt>
              <dd>{user.updatedAt ? dateOnly(user.updatedAt) : "Nunca"}</dd>
            </div>
          </dl>
          {activity.data ? (
            <div className={styles.mini}>
              <div>
                <strong>{int(activity.data.last30Days.writes)}</strong>
                <span>acciones</span>
              </div>
              <div>
                <strong>{int(activity.data.last30Days.exports)}</strong>
                <span>reportes</span>
              </div>
              <div>
                <strong>{int(activity.data.last30Days.signins)}</strong>
                <span>ingresos</span>
              </div>
            </div>
          ) : null}
          <p className={styles.miniHint}>Últimos 30 días</p>
        </Card>

        <div className={styles.column}>
          <div className={styles.tabs}>
            <Tabs options={TABS} value={tab} onChange={setTab} />
          </div>
          {tab === "datos" ? <PersonalData /> : null}
          {tab === "seguridad" ? <Security lastSignin={lastSignin} /> : null}
          {tab === "actividad" ? <Activity /> : null}
          {tab === "permisos" ? <Permissions /> : null}
          {tab === "preferencias" ? <Preferences /> : null}
        </div>
      </div>
    </>
  );
};

const PersonalData = () => {
  const user = useSessionStore((s) => s.user!);
  const update = useUpdateProfile();
  const initial = { firstName: user.firstName, lastName: user.lastName, email: user.email ?? "", phone: user.phone ?? "" };
  const [form, setForm] = useState(initial);
  const errors = update.error ? fieldErrors(update.error) : {};
  const emailTaken = update.error?.code === "630" ? "Ese correo ya lo usa otra persona del equipo." : undefined;
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k].trim() !== initial[k]);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const save = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null });
  };

  return (
    <Card title="Datos personales" subtitle="Su nombre aparece en el chat, en las ventas y en el encabezado de los reportes que genere.">
      <form className={styles.form} onSubmit={save}>
        <FieldRow>
          <Field label="Nombre" htmlFor="pf-first" error={errors["firstName"]}>
            <Input id="pf-first" value={form.firstName} maxLength={80} onChange={set("firstName")} required />
          </Field>
          <Field label="Apellido" htmlFor="pf-last" error={errors["lastName"]}>
            <Input id="pf-last" value={form.lastName} maxLength={80} onChange={set("lastName")} required />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Correo electrónico" htmlFor="pf-email" error={emailTaken ?? errors["email"]} hint="Opcional · único en el equipo">
            <Input id="pf-email" type="email" autoComplete="email" value={form.email} maxLength={160} onChange={set("email")} placeholder="nombre@mitierrita.co" invalid={Boolean(emailTaken)} />
          </Field>
          <Field label="Teléfono" htmlFor="pf-phone" error={errors["phone"]} hint="Opcional · números, espacios, + y guiones">
            <Input id="pf-phone" type="tel" autoComplete="tel" value={form.phone} maxLength={40} onChange={set("phone")} placeholder="300 000 0000" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Usuario" htmlFor="pf-user" hint="Solo lo cambia el administrador">
            <Input id="pf-user" value={user.username} disabled />
          </Field>
          <Field label="Rol" htmlFor="pf-role" hint="Solo lo cambia el administrador">
            <Input id="pf-role" value={ROLE_LABELS[user.role]} disabled />
          </Field>
        </FieldRow>
        <div className={styles.actions}>
          <Button type="button" variant="ghost" disabled={!dirty || update.isPending} onClick={() => (setForm(initial), update.reset())}>
            Descartar
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!dirty || !form.firstName.trim() || !form.lastName.trim()}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
};

const Security = ({ lastSignin }: { lastSignin: string | null }) => {
  const change = useChangePassword();
  const signout = useSignout();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const errors = change.error ? fieldErrors(change.error) : {};
  const rules = {
    length: pwd.newPassword.length >= 8,
    mixed: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pwd.newPassword) && /\d/.test(pwd.newPassword),
    differs: pwd.newPassword.length > 0 && pwd.newPassword !== pwd.currentPassword,
    match: pwd.confirm.length > 0 && pwd.newPassword === pwd.confirm,
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!rules.length) return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (!rules.differs) return setError("La nueva contraseña debe ser distinta de la actual.");
    if (!rules.match) return setError("La confirmación no coincide con la nueva contraseña.");
    return change.mutate({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }, { onSuccess: () => setPwd({ currentPassword: "", newPassword: "", confirm: "" }) });
  };

  const closeEverywhere = () => signout.mutate(undefined, { onSettled: () => navigate("/iniciar-sesion", { replace: true }) });

  return (
    <>
      <Card title="Cambiar contraseña" subtitle="Use una contraseña que no use en otros sitios.">
        <form className={styles.form} onSubmit={save}>
          <Field label="Contraseña actual" htmlFor="pf-cur" error={change.error?.code === "610" ? "La contraseña actual no es correcta." : errors["currentPassword"]}>
            <Input id="pf-cur" type={show ? "text" : "password"} autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
          </Field>
          <FieldRow>
            <Field label="Nueva contraseña" htmlFor="pf-new" error={errors["newPassword"]}>
              <Input id="pf-new" type={show ? "text" : "password"} autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required />
            </Field>
            <Field label="Confirmar nueva contraseña" htmlFor="pf-conf">
              <Input id="pf-conf" type={show ? "text" : "password"} autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required />
            </Field>
          </FieldRow>
          <ul className={styles.rules} aria-label="Requisitos de la contraseña">
            <Check ok={rules.length}>Al menos 8 caracteres</Check>
            <Check ok={rules.mixed}>Letras y números (recomendado)</Check>
            <Check ok={rules.differs}>Distinta de la actual</Check>
            <Check ok={rules.match}>La confirmación coincide</Check>
          </ul>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <label className={styles.show}>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseñas
            </label>
            <Button type="submit" loading={change.isPending}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Sesión" subtitle="Cada inicio de sesión queda registrado en la auditoría con la hora y la dirección IP.">
        <div className={styles.session}>
          <div>
            <span className={styles.sessionLabel}>Último ingreso</span>
            <strong>{lastSignin ? dateTime(lastSignin) : "—"}</strong>
          </div>
          <Button variant="danger" onClick={closeEverywhere} loading={signout.isPending}>
            Cerrar sesión en todos los dispositivos
          </Button>
        </div>
        <p className={styles.sessionHint}>Al cerrar sesión el servidor invalida su token: cualquier otra pestaña o celular donde haya ingresado tendrá que volver a iniciar sesión.</p>
      </Card>
    </>
  );
};

const Activity = () => {
  const activity = useMyActivity();
  return (
    <QueryState query={activity} empty={null}>
      {(data) => (
        <>
          <StatGrid>
            <StatCard label="Ventas registradas" value={int(data.last30Days.sales)} hint="últimos 30 días" tone="good" />
            <StatCard label="Abonos" value={int(data.last30Days.payments)} hint="últimos 30 días" />
            <StatCard label="Lotes y compras" value={int(data.last30Days.batches)} hint="últimos 30 días" />
            <StatCard label="Reportes generados" value={int(data.last30Days.exports)} hint="PDF y Excel" tone="warn" />
          </StatGrid>
          <Card title="Últimas acciones" subtitle="Tomadas de la auditoría: lo que usted registró, descargó o cuándo ingresó.">
            {data.items.length === 0 ? (
              <EmptyState art={false} title="Todavía no hay acciones" text="Lo que registre en el sistema aparecerá aquí." />
            ) : (
              <ol className={styles.timeline}>
                {data.items.map((it) => (
                  <li key={it.id} className={styles[`tl${it.method.toUpperCase()}`] ?? ""}>
                    <span className={styles.tlDot} aria-hidden="true" />
                    <div>
                      <p>{describeActivity(it)}</p>
                      <time dateTime={it.createdAt}>{dateTime(it.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </QueryState>
  );
};

const Permissions = () => {
  const role = useSessionStore((s) => s.user!.role);
  const p = ROLE_PERMISSIONS[role];
  return (
    <Card title={`Qué puede hacer como ${ROLE_LABELS[role].toLowerCase()}`} subtitle="Los permisos los define el rol; si necesita otro acceso, pídaselo al administrador.">
      <div className={styles.perms}>
        <ul className={styles.can}>
          {p.can.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {p.cannot.length > 0 ? (
          <div>
            <span className={styles.cannotTitle}>No tiene acceso a</span>
            <ul className={styles.cannot}>
              {p.cannot.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

const Preferences = () => {
  const theme = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setMode);
  return (
    <Card title="Apariencia" subtitle="Se guarda en este navegador.">
      <div className={styles.themes} role="radiogroup" aria-label="Tema">
        {(
          [
            ["light", "Claro"],
            ["dark", "Oscuro"],
            ["system", "Según el sistema"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" role="radio" aria-checked={theme === value} className={[styles.theme, theme === value ? styles.themeOn : ""].join(" ")} onClick={() => setTheme(value)}>
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
};
