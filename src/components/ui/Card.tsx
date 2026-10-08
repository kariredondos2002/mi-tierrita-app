import type { ReactNode } from "react";
import { m } from "motion/react";
import styles from "./Card.module.css";

type Props = { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean; soft?: boolean };

/** Tarjeta «Tierra viva»: superficie blanca, borde fino, radio 14, sombra suave; aparece al entrar en pantalla. */
export const Card = ({ title, subtitle, actions, children, className, flush = false, soft = false }: Props) => (
  <m.section
    className={[styles.card, flush ? styles.flush : "", soft ? styles.soft : "", className ?? ""].join(" ")}
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
  >
    {title !== undefined || actions !== undefined ? (
      <header className={styles.header} style={flush ? { padding: "18px 20px 0" } : undefined}>
        <div className={styles.title}>
          {title !== undefined ? <h2>{title}</h2> : null}
          {subtitle !== undefined ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </div>
        {actions}
      </header>
    ) : null}
    {children}
  </m.section>
);
