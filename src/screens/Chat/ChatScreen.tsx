import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/AppShell";
import { Modal } from "@/components/ui";
import { Conversation } from "@/components/chat/Conversation";
import { MembersPanel } from "@/components/chat/MembersPanel";
import { PersonAvatar } from "@/components/chat/PersonAvatar";
import { ChatSearch } from "@/components/chat/ChatSearch";
import { lastSeenText, previewOf, relative } from "@/components/chat/chatFormat";
import { useConversations, usePeople, useUnreadSummary } from "@/hooks/chat";
import { useRealtimeStore, useSocketEvent } from "@/realtime/socket";
import { ROLE_LABELS, useSessionStore } from "@/stores/session";
import type { ChatMessage } from "@/types/api";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/hooks/shared";
import styles from "@/components/chat/Chat.module.css";

/**
 * Chat del equipo (v4, adaptado del chat de SoftUnity): canal #general para todos y
 * conversaciones privadas 1 a 1. Rutas: /chat, /chat/general y /chat/:userId.
 */
export const ChatScreen = () => {
  const { userId: param } = useParams();
  const withThread = param !== undefined;
  const otherId = param !== undefined && param !== "general" ? Number(param) : null;
  const me = useSessionStore((s) => s.user!);
  const status = useRealtimeStore((s) => s.status);
  const online = useRealtimeStore((s) => s.online);
  const conversations = useConversations();
  const people = usePeople();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [picker, setPicker] = useState(false);
  const [membersOpen, setMembersOpen] = useState(() => window.matchMedia?.("(min-width: 1280px)").matches ?? false);
  const [searching, setSearching] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const unread = useUnreadSummary();
  const queryClient = useQueryClient();
  const generalUnread = otherId === null && withThread ? 0 : (unread.data?.general ?? 0);
  const mentions = unread.data?.mentions ?? 0;

  // Mensaje nuevo en el general: se actualizan los contadores del servidor (la fuente de verdad de los no leídos).
  useSocketEvent<ChatMessage>("chat:mensaje", (m) => {
    if (m.sender.id !== me.id) void queryClient.invalidateQueries({ queryKey: [...keys.chat, "unread"] });
  });
  useEffect(() => {
    setSearching(false);
  }, [param]);

  const isOnline = (id: number) => online.some((p) => p.id === id);
  const other = useMemo(
    () => (otherId === null ? null : (people.data?.find((p) => p.id === otherId) ?? conversations.data?.find((c) => c.person.id === otherId)?.person ?? null)),
    [otherId, people.data, conversations.data],
  );
  const otherLastSeen = otherId !== null ? people.data?.find((p) => p.id === otherId)?.lastSeenAt ?? null : null;

  const q = filter.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const convs = (conversations.data ?? []).filter((c) => matches(c.person.name));

  const head =
    otherId === null
      ? { name: "#general", text: `Canal de todo el equipo · ${online.length} en línea` }
      : {
          name: other?.name ?? "Conversación privada",
          text: other ? (isOnline(other.id) ? `${ROLE_LABELS[other.role]} · en línea` : `${ROLE_LABELS[other.role]} · ${lastSeenText(otherLastSeen)}`) : "",
        };

  return (
    <>
      <PageHeader
        eyebrow="Comunicación del equipo"
        title="Chat Mi Tierrita"
        subtitle="Caja, bodega y administración coordinados en tiempo real: canal general, mensajes privados y avisos del negocio."
      />
      <div className={[styles.page, withThread ? styles.withThread : ""].join(" ")}>
        <aside className={styles.side} aria-label="Conversaciones">
          <div className={styles.sideHead}>
            <div className={styles.sideTitle}>
              <h2>Mensajes</h2>
              <button type="button" className={styles.newBtn} onClick={() => setPicker(true)}>
                + Privado
              </button>
            </div>
            <label className={styles.search}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="sr-only">Buscar conversación</span>
              <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar conversación" />
            </label>
          </div>
          <nav className={styles.convList}>
            <p className={styles.sectionLabel}>Canales</p>
            {matches("general") ? (
              <NavLink to="/chat/general" className={() => [styles.conv, otherId === null && withThread ? styles.convActive : "", generalUnread ? styles.convUnread : ""].join(" ")}>
                <span className={styles.hash}>#</span>
                <span className={styles.convText}>
                  <span>general</span>
                  <small>Todo el equipo · {online.length} en línea</small>
                </span>
                {mentions > 0 ? <span className={styles.unreadBadge} title="Menciones sin leer">@{mentions}</span> : null}
                {generalUnread > 0 ? <span className={styles.unreadBadge}>{generalUnread}</span> : null}
              </NavLink>
            ) : null}
            <p className={styles.sectionLabel}>Mensajes privados</p>
            {convs.length === 0 ? <p className={styles.sideEmpty}>{q ? "Ninguna conversación coincide." : "Aún no tiene conversaciones privadas."}</p> : null}
            {convs.map((c) => (
              <NavLink
                key={c.person.id}
                to={`/chat/${c.person.id}`}
                className={() => [styles.conv, otherId === c.person.id ? styles.convActive : "", c.unread ? styles.convUnread : ""].join(" ")}
              >
                <PersonAvatar name={c.person.name} role={c.person.role} online={isOnline(c.person.id)} size={34} />
                <span className={styles.convText}>
                  <span>{c.person.name}</span>
                  <small>
                    {c.lastMessage.senderId === me.id ? "Usted: " : ""}
                    {previewOf(c.lastMessage)} · {relative(c.lastMessage.createdAt)}
                  </small>
                </span>
                {c.unread > 0 ? <span className={styles.unreadBadge}>{c.unread}</span> : null}
              </NavLink>
            ))}
          </nav>
          {permission === "default" ? (
            <button type="button" className={styles.newBtn} style={{ margin: "8px 12px 12px" }} onClick={() => void Notification.requestPermission().then(setPermission)}>
              🔔 Activar avisos del navegador
            </button>
          ) : null}
        </aside>

        <section className={styles.thread}>
          <header className={styles.threadHead}>
            <button type="button" className={styles.back} onClick={() => navigate("/chat")} aria-label="Volver a las conversaciones">
              ←
            </button>
            {otherId === null ? <span className={styles.hash}>#</span> : <PersonAvatar name={other?.name ?? "?"} role={other?.role} online={other ? isOnline(other.id) : undefined} />}
            <div className={styles.channel}>
              <h3>{head.name}</h3>
              <p>{head.text}</p>
            </div>
            <button type="button" className={styles.membersBtn} aria-pressed={searching} onClick={() => setSearching((v) => !v)} title="Buscar mensajes">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="sr-only">Buscar mensajes</span>
            </button>
            {otherId === null ? (
              <button type="button" className={styles.membersBtn} aria-pressed={membersOpen} onClick={() => setMembersOpen((v) => !v)}>
                <span className={styles.onlineDot} aria-hidden="true" /> {online.length}
                <span className="sr-only"> en línea; mostrar el equipo</span>
              </button>
            ) : null}
          </header>
          {status === "reconnecting" ? (
            <div className={styles.banner} role="alert">
              Se perdió la conexión con el servidor. Reintentando… Los mensajes se envían por el respaldo mientras vuelve.
            </div>
          ) : null}
          <div className={styles.body}>
            <Conversation
              key={otherId ?? "general"}
              target={otherId === null ? { kind: "general" } : { kind: "private", userId: otherId }}
              channelName={head.name}
              channelText={otherId === null ? "El canal de todo el equipo de la agropecuaria." : "Conversación privada: solo ustedes dos la ven."}
              onThreadChange={setThreadOpen}
              placeholder={otherId === null ? "Escriba un mensaje para #general" : `Mensaje para ${other?.name.split(" ")[0] ?? ""}`}
            />
            {searching ? (
              <ChatSearch
                me={me.id}
                scope={otherId ?? "general"}
                scopeLabel={head.name}
                onClose={() => setSearching(false)}
                onPick={(m) => {
                  setSearching(false);
                  const to = m.recipientId === null ? "/chat/general" : `/chat/${m.sender.id === me.id ? m.recipientId : m.sender.id}`;
                  navigate(to, { state: { focus: m.id }, replace: false });
                }}
              />
            ) : otherId === null && !threadOpen ? (
              <MembersPanel online={online} people={people.data ?? []} me={me.id} open={membersOpen} onClose={() => setMembersOpen(false)} />
            ) : null}
          </div>
        </section>
      </div>

      <Modal open={picker} title="Nuevo mensaje privado" description="Elija con quién quiere conversar." onClose={() => setPicker(false)}>
        <div className={styles.picker}>
          {(people.data ?? [])
            .filter((p) => p.id !== me.id)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.pickerItem}
                onClick={() => {
                  setPicker(false);
                  navigate(`/chat/${p.id}`);
                }}
              >
                <PersonAvatar name={p.name} role={p.role} online={isOnline(p.id)} size={34} />
                <span className={styles.memberText}>
                  <span>{p.name}</span>
                  <small>
                    {ROLE_LABELS[p.role]} · {isOnline(p.id) ? "en línea" : lastSeenText(p.lastSeenAt)}
                  </small>
                </span>
              </button>
            ))}
        </div>
      </Modal>
    </>
  );
};
