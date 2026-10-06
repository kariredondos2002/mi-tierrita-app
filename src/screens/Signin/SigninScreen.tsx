import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSignin } from "@/hooks/session";
import { Button, Field, Input } from "@/components/ui";
import { BrandMark } from "@/components/layout/AppShell";
import styles from "./SigninScreen.module.css";

const Eye = ({ off }: { off: boolean }) => (
  <svg width="21" height="21" viewBox="0 0 24 20" fill="none" aria-hidden="true">
    <path d="M1.8 10 C 4.9 5.2 8.5 3 12 3 C 15.5 3 19.1 5.2 22.2 10 C 19.1 14.8 15.5 17 12 17 C 8.5 17 4.9 14.8 1.8 10 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="3.1" stroke="currentColor" strokeWidth="1.6" />
    {off ? <line x1="3.4" y1="1.6" x2="20.6" y2="18.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : null}
  </svg>
);

/** CU-01 Iniciar sesión, fiel a la vista "Iniciar sesión" del lienzo. */
export const SigninScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signin = useSignin();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await signin.mutateAsync({ username, password }).then(
      () => navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true }),
      () => undefined,
    );
  };

  const demo = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== "false";
  const fill = (user: string) => {
    setUsername(user);
    setPassword("MiTierrita2026");
    signin.reset();
  };

  return (
    <div className={styles.page}>
      <aside className={styles.hero}>
        <Landscape />
        <div className={styles.brand}>
          <BrandMark size={52} />
          <div>
            <div className={styles.brandName}>Mi Tierrita</div>
            <div className={styles.brandSub}>Agropecuaria · Sahagún, Córdoba</div>
          </div>
        </div>
        <div className={styles.heroBody}>
          <span className={styles.kicker}>Sistema de información gerencial</span>
          <h1>
            Información que <em>siembra</em> mejores decisiones
          </h1>
          <p>Inventario con lotes y vencimientos, ventas, cartera y proveedores en un solo lugar, con reportes para la gerencia y la evaluación financiera de la ampliación del local.</p>
          <ul className={styles.features}>
            <li>
              <b>ERP</b> Operación diaria: inventario FEFO, punto de venta y cartera
            </li>
            <li>
              <b>BI</b> Tablero y reportes gerenciales con tendencias
            </li>
            <li>
              <b>DSS</b> VPN, TIR, sensibilidad y tornado de la inversión
            </li>
          </ul>
        </div>
        <div className={styles.heroFoot}>Universidad de Cartagena · Ingeniería de Software · 2026-2</div>
      </aside>
      <section className={styles.formSide}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHead}>
            <h2>Bienvenido de nuevo</h2>
            <p>Ingrese con el usuario que le asignó el administrador.</p>
          </div>
          <Field label="Usuario" htmlFor="username">
            <Input id="username" className={styles.input} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={signin.error?.message}>
            <div className={[styles.passwordWrap, signin.isError ? styles.passwordWrapError : ""].join(" ")}>
              <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className={styles.eye} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <Eye off={showPassword} />
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" block loading={signin.isPending}>
            Entrar al sistema
          </Button>
          <p className={styles.help}>¿Olvidó su contraseña? Pídale al administrador que la restablezca desde Usuarios y roles.</p>
          {demo ? (
            <div className={styles.demo}>
              <span className={styles.demoTitle}>Cuentas de demostración (datos simulados)</span>
              <div className={styles.demoList}>
                {[
                  ["admin", "Administrador"],
                  ["secretaria", "Secretaria"],
                  ["bodega", "Bodega"],
                ].map(([u, r]) => (
                  <button key={u} type="button" className={styles.demoBtn} onClick={() => fill(u ?? "")}>
                    <strong>{r}</strong>
                    <span>{u}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
};

/** Paisaje de surcos y colinas al pie del panel de marca (decorativo). */
const Landscape = () => (
  <svg className={styles.landscape} viewBox="0 0 600 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <circle cx="500" cy="150" r="24" fill="#E3A33B" opacity="0.85" />
    <circle cx="500" cy="150" r="40" fill="#E3A33B" opacity="0.1" />
    <path d="M0 210 C 120 150 240 170 330 195 C 420 220 510 170 600 160 V320 H0 Z" fill="#1D4A37" />
    <path d="M0 250 C 140 205 260 225 360 240 C 460 255 530 230 600 220 V320 H0 Z" fill="#2C6A4E" />
    <path d="M0 290 C 160 255 300 270 420 280 C 500 287 560 280 600 275 V320 H0 Z" fill="#3D8D68" />
    {Array.from({ length: 9 }, (_, i) => (
      <path key={i} d={`M${-40 + i * 80} 320 Q ${40 + i * 70} 285 ${120 + i * 62} 262`} stroke="#9FD4B4" strokeOpacity="0.22" strokeWidth="2" fill="none" />
    ))}
  </svg>
);
