import type { Role } from "@/types/api";
import styles from "./Chat.module.css";

const ROLE_TONE: Record<Role, string> = { ADMIN: styles.toneAdmin ?? "", SALES: styles.toneSales ?? "", WAREHOUSE: styles.toneStore ?? "" };

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

/** Avatar con iniciales, color por rol y punto verde cuando la persona está en línea. */
export const PersonAvatar = ({ name, role, online, size = 36 }: { name: string; role?: Role; online?: boolean; size?: number }) => (
  <span className={[styles.avatar, role ? ROLE_TONE[role] : ""].join(" ")} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
    {initialsOf(name)}
    {online !== undefined ? <span className={[styles.presence, online ? styles.presenceOn : ""].join(" ")} /> : null}
  </span>
);
