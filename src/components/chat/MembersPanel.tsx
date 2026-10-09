import { Link } from "react-router-dom";
import { ROLE_LABELS } from "@/stores/session";
import type { DirectoryPerson, Person } from "@/types/api";
import { PersonAvatar } from "./PersonAvatar";
import { lastSeenText } from "./chatFormat";
import styles from "./Chat.module.css";

/** Panel lateral del canal general: quién está en línea y la última conexión de los demás. */
export const MembersPanel = ({ online, people, me, open, onClose }: { online: Person[]; people: DirectoryPerson[]; me: number; open: boolean; onClose: () => void }) => {
  if (!open) return null;
  const onlineIds = new Set(online.map((p) => p.id));
  const offline = people.filter((p) => !onlineIds.has(p.id));
  return (
    <aside className={styles.members} aria-label="Miembros del equipo">
      <header className={styles.membersHead}>
        <h3>Equipo</h3>
        <button type="button" className={styles.iconGhost} onClick={onClose} aria-label="Cerrar el panel de miembros">
          ×
        </button>
      </header>
      <p className={styles.membersSection}>En línea · {online.length}</p>
      {online.map((p) => (
        <Row key={p.id} person={p} online me={me} />
      ))}
      <p className={styles.membersSection}>Desconectados · {offline.length}</p>
      {offline.map((p) => (
        <Row key={p.id} person={p} online={false} me={me} lastSeen={p.lastSeenAt} />
      ))}
    </aside>
  );
};

const Row = ({ person, online, me, lastSeen }: { person: Person; online: boolean; me: number; lastSeen?: string | null }) => {
  const body = (
    <>
      <PersonAvatar name={person.name} role={person.role} online={online} size={32} />
      <span className={styles.memberText}>
        <span>
          {person.name}
          {person.id === me ? " (usted)" : ""}
        </span>
        <small>{online ? ROLE_LABELS[person.role] : lastSeenText(lastSeen).replace(/^ú/, "Ú").replace(/^a/, "A")}</small>
      </span>
    </>
  );
  return person.id === me ? (
    <div className={styles.member}>{body}</div>
  ) : (
    <Link to={`/chat/${person.id}`} className={styles.member} title={`Escribirle a ${person.name}`}>
      {body}
    </Link>
  );
};
