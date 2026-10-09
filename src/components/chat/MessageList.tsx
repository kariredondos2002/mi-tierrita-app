import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatItem } from "@/hooks/chat";
import { ROLE_LABELS } from "@/stores/session";
import { PersonAvatar } from "./PersonAvatar";
import { dayLabel, isContinuation, sameDay, timeOf } from "./chatFormat";
import styles from "./Chat.module.css";

const NEAR_BOTTOM_PX = 120;

type Props = {
  items: ChatItem[];
  me: number;
  loading: boolean;
  channelName: string;
  channelText: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadOlder: () => void;
  isPrivate: boolean;
  firstUnreadId: number | null;
};

/**
 * Lista de mensajes: separadores por día, agrupación por autor, avisos de entrada y salida,
 * «Nuevos mensajes», doble check de lectura en privados, carga hacia atrás y la píldora
 * «N mensajes nuevos» cuando la persona está leyendo más arriba.
 */
export const MessageList = ({ items, me, loading, channelName, channelText, hasMore, loadingMore, onLoadOlder, isPrivate, firstUnreadId }: Props) => {
  const box = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [fresh, setFresh] = useState(0);
  const lastId = useRef<string | number | null>(null);
  const prevHeight = useRef(0);

  const toBottom = (smooth = true) => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setFresh(0);
  };

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    setAtBottom(near);
    if (near) setFresh(0);
  };

  useLayoutEffect(() => {
    const el = box.current;
    const last = items.at(-1);
    if (!el) return;
    if (last && last.id === lastId.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current; // se agregaron mensajes antiguos arriba
    } else if (last) {
      const own = last.type === "message" && last.sender.id === me;
      if (atBottom || own || lastId.current === null) toBottom(lastId.current !== null);
      else if (last.type === "message") setFresh((n) => n + 1);
    }
    lastId.current = last?.id ?? null;
    prevHeight.current = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    lastId.current = null;
  }, [channelName]);

  if (loading && items.length === 0) {
    return (
      <div className={styles.list} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton}>
            <span className={styles.skAvatar} />
            <div>
              <span className={styles.skLine} style={{ width: 140 }} />
              <span className={styles.skLine} style={{ width: `${60 - i * 12}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const lastOwn = isPrivate ? [...items].reverse().find((m) => m.type === "message" && m.sender.id === me) : undefined;

  return (
    <div className={styles.listWrap}>
      <div ref={box} className={styles.list} onScroll={onScroll} role="log" aria-live="polite" aria-label={`Mensajes de ${channelName}`}>
        {hasMore ? (
          <button type="button" className={styles.loadMore} onClick={onLoadOlder} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar mensajes anteriores"}
          </button>
        ) : (
          <div className={items.length ? styles.welcome : styles.empty}>
            <span className={styles.welcomeIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 5.5h16v10H9l-5 4v-14z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h3>{items.length ? `Inicio de ${channelName}` : `Aún no hay mensajes en ${channelName}`}</h3>
              <p>{items.length ? channelText : "Escriba el primer mensaje de la conversación."}</p>
            </div>
          </div>
        )}

        {items.map((item, i) => {
          const prev = items[i - 1];
          const newDay = !prev || !sameDay(prev.createdAt, item.createdAt);
          return (
            <Fragment key={item.id}>
              {newDay ? (
                <div className={styles.daySep} role="separator">
                  <span>{dayLabel(item.createdAt)}</span>
                </div>
              ) : null}
              {item.type === "message" && item.id === firstUnreadId ? (
                <div className={styles.newSep} role="separator">
                  <span>Nuevos mensajes</span>
                </div>
              ) : null}
              {item.type === "system" ? (
                <div className={[styles.system, item.action === "joined" ? styles.systemIn : ""].join(" ")}>
                  <span className={styles.systemDot} aria-hidden="true" />
                  <span>
                    <strong>{item.person.name}</strong> {item.action === "joined" ? "se conectó" : "se desconectó"}
                  </span>
                  <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
                </div>
              ) : (
                <Message
                  item={item}
                  own={item.sender.id === me}
                  continued={!newDay && isContinuation(prev, item)}
                  read={isPrivate && lastOwn?.id === item.id ? item.readAt !== null : null}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      {fresh > 0 ? (
        <button type="button" className={styles.freshPill} onClick={() => toBottom()}>
          ↓ {fresh === 1 ? "1 mensaje nuevo" : `${fresh} mensajes nuevos`}
        </button>
      ) : null}
    </div>
  );
};

const Message = ({ item, own, continued, read }: { item: Extract<ChatItem, { type: "message" }>; own: boolean; continued: boolean; read: boolean | null }) => (
  <article className={[styles.msg, continued ? styles.msgCont : "", own ? styles.msgOwn : ""].join(" ")}>
    {!own ? <div className={styles.msgSide}>{!continued ? <PersonAvatar name={item.sender.name} role={item.sender.role} /> : null}</div> : null}
    <div className={styles.msgBody}>
      {!continued && !own ? (
        <header className={styles.msgHead}>
          <strong>{item.sender.name}</strong>
          <span className={styles.roleTag}>{ROLE_LABELS[item.sender.role]}</span>
          <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
        </header>
      ) : null}
      <p className={styles.bubble}>
        {own ? <span className="sr-only">Usted: </span> : null}
        {item.content}
      </p>
      {own && (!continued || read !== null) ? (
        <span className={styles.meta}>
          <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
          {read !== null ? (read ? <span className={styles.readMark}> ✓✓ Leído</span> : " · Enviado") : null}
        </span>
      ) : null}
    </div>
  </article>
);
