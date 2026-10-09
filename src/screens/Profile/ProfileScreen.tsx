import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, Card, Field, FieldRow, Input } from "@/components/ui";
import { useChangePassword, useUpdateProfile } from "@/hooks/users";
import { fieldErrors } from "@/lib/errors";
import { dateOnly, initials } from "@/lib/format";
import { ROLE_LABELS, useSessionStore } from "@/stores/session";
import { useThemeStore } from "@/stores/theme";
import { useRealtimeStore } from "@/realtime/socket";
import styles from "./ProfileScreen.module.css";

const ROLE_SCOPE: Record<string, string> = {
  ADMIN: "Ve todo el sistema: tablero, operación, reportes, evaluación financiera, usuarios, auditoría y contactos del sitio.",
  SALES: "Registra ventas y abonos, consulta clientes, cartera y reportes. No ve la evaluación financiera.",
  WAREHOUSE: "Registra productos, compras y lotes con su vencimiento, y vigila el inventario.",
};

/** Mi perfil (v4, como en SoftUnity): datos propios, contraseña y preferencias. */
export const ProfileScreen = () => {
  const user = useSessionStore((s) => s.user!);
  const status = useRealtimeStore((s) => s.status);
  const theme = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setMode);
  const update = useUpdateProfile();
  const change = useChangePassword();
  const [names, setNames] = useState({ firstName: user.firstName, lastName: user.lastName });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const nameErrors = update.error ? fieldErrors(update.error) : {};
  const pwdErrors = change.error ? fieldErrors(change.error) : {};
  const dirty = names.firstName.trim() !== user.firstName || names.lastName.trim() !== user.lastName;

  const saveNames = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ firstName: names.firstName.trim(), lastName: names.lastName.trim() });
  };

  const savePwd = (e: FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwd.newPassword.length < 8) return setPwdError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (pwd.newPassword !== pwd.confirm) return setPwdError("La confirmación no coincide con la nueva contraseña.");
    return change.mutate(
      { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword },
      { onSuccess: () => setPwd({ currentPassword: "", newPassword: "", confirm: "" }) },
    );
  };

  return (
    <>
      <PageHeader eyebrow="Su cuenta" title="Mi perfil" subtitle="Sus datos, su contraseña y cómo prefiere ver Mi Tierrita." />
      <div className={styles.grid}>
        <Card className={styles.identity}>
          <div className={styles.avatar}>{initials(user.firstName, user.lastName)}</div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p className={styles.username}>@{user.username}</p>
          <span className={styles.role}>{ROLE_LABELS[user.role]}</span>
          <p className={styles.scope}>{ROLE_SCOPE[user.role]}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Miembro desde</dt>
              <dd>{dateOnly(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Tiempo real</dt>
              <dd>{status === "online" ? "Conectado" : status === "reconnecting" ? "Reconectando…" : "Sin conexión"}</dd>
            </div>
          </dl>
        </Card>

        <div className={styles.column}>
          <Card title="Datos personales" subtitle="El usuario y el rol solo los cambia el administrador.">
            <form className={styles.form} onSubmit={saveNames}>
              <FieldRow>
                <Field label="Nombre" htmlFor="pf-first" error={nameErrors["firstName"]}>
                  <Input id="pf-first" value={names.firstName} maxLength={80} onChange={(e) => setNames({ ...names, firstName: e.target.value })} required />
                </Field>
                <Field label="Apellido" htmlFor="pf-last" error={nameErrors["lastName"]}>
                  <Input id="pf-last" value={names.lastName} maxLength={80} onChange={(e) => setNames({ ...names, lastName: e.target.value })} required />
                </Field>
              </FieldRow>
              <div className={styles.actions}>
                <Button type="submit" loading={update.isPending} disabled={!dirty || !names.firstName.trim() || !names.lastName.trim()}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Cambiar contraseña" subtitle="Mínimo 8 caracteres. Las demás sesiones siguen abiertas.">
            <form className={styles.form} onSubmit={savePwd}>
              <Field label="Contraseña actual" htmlFor="pf-cur" error={change.error?.code === "610" ? "La contraseña actual no es correcta." : pwdErrors["currentPassword"]}>
                <Input id="pf-cur" type="password" autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
              </Field>
              <FieldRow>
                <Field label="Nueva contraseña" htmlFor="pf-new" error={pwdErrors["newPassword"]}>
                  <Input id="pf-new" type="password" autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required />
                </Field>
                <Field label="Confirmar" htmlFor="pf-conf">
                  <Input id="pf-conf" type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required />
                </Field>
              </FieldRow>
              {pwdError ? (
                <p className={styles.error} role="alert">
                  {pwdError}
                </p>
              ) : null}
              <div className={styles.actions}>
                <Button type="submit" loading={change.isPending}>
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </Card>

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
        </div>
      </div>
    </>
  );
};
