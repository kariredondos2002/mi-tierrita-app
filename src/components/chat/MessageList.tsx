import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChatItem, MessageItem } from "@/hooks/chat";
import { ROLE_LABELS } from "@/stores/session";
import type { ChatMessage, Person } from "@/types/api";
import { AudioPlayer, FileView } from "./AttachmentView";
import { PersonAvatar } from "./PersonAvatar";
import { Ticks } from "./Ticks";
import { chunkMentions, dayLabel, isContinuation, previewOf, sameDay, timeOf } from "./chatFormat";
import styles from "./Chat.module.css";
import plus from "./ChatPlus.module.css";

const NEAR_BOTTOM_PX = 120;

export type MessageActions = {
  onReply: (m: ChatMessage) => void;
  onOpenThread: (m: ChatMessage) => void;
  /** Solo en el canal general: contesta a la persona por privado sin publicar nada en el grupo. */
  onReplyPrivate: (m: ChatMessage) => void;
  onPin: (m: ChatMessage, pinned: boolean) => void;
  onReceipts: (id: number) => void;
  onRetry: (m: MessageItem) => void;
  onDiscard: (clientId: string) => void;
  onJumpTo: (id: number) => void;
};

type Props = {
  items: ChatItem[];
  me: number;
  myRole: Person["role"] | undefined;
  loading: boolean;
  channelName: string;
  channelText: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadOlder: () => void;
  isPrivate: boolean;
  firstUnreadId: number | null;
  /** username (minúscula) → persona, para resaltar menciones con el nombre completo. */
  directory: Map<string, Person>;
  actions: MessageActions;
  /** Mensaje a resaltar y llevar a la vista (desde fijados o búsqueda). */
  focusId: number | null;
};

/**
 * Lista de mensajes: separadores por día, agrupación por autor, avisos de entrada y salida, «Nuevos mensajes»,
 * chulitos de enviado / entregado / visto, citas, hilos, fijados, audio y archivos, carga hacia atrás y la
 * píldora «N mensajes nuevos» cuando la persona está leyendo más arriba.
 */
export const MessageList = ({ items, me, myRole, loading, channelName, channelText, hasMore, loadingMore, onLoadOlder, isPrivate, firstUnreadId, directory, actions, focusId }: Props) => {
  const box = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [fresh, setFresh] = useState(0);
  const lastId = useRef<string | number | null>(null);
  const prevHeight = useRef(0);
  const [flash, setFlash] = useState<number | null>(null);

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

  // Llevar a la vista un mensaje fijado o encontrado en la búsqueda.
  useEffect(() => {
    if (focusId === null) return undefined;
    const el = box.current?.querySelector<HTMLElement>(`[data-msg="${focusId}"]`);
    if (!el) return undefined;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(focusId);
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [focusId, items.length]);

  const canPin = isPrivate || myRole === "ADMIN";
  const lastOwnPrivate = useMemo(() => (isPrivate ? [...items].reverse().find((m) => m.type === "message" && m.sender.id === me) : undefined), [items, isPrivate, me]);

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
            <Fragment key={item.type === "message" && item.clientId ? item.clientId : item.id}>
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
                  me={me}
                  own={item.sender.id === me}
                  continued={!newDay && isContinuation(prev, item)}
                  isPrivate={isPrivate}
                  canPin={canPin}
                  directory={directory}
                  actions={actions}
                  flash={flash === item.id}
                  showReadLabel={lastOwnPrivate?.id === item.id}
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

/** Texto con las @menciones resaltadas; la mía se destaca más. */
export const MentionText = ({ content, me, directory }: { content: string; me: number; directory: Map<string, Person> }) => (
  <>
    {chunkMentions(content).map((c, i) => {
      if (!c.mention) return <Fragment key={i}>{c.text}</Fragment>;
      const person = directory.get(c.mention);
      return (
        <span key={i} className={[plus.mention, person?.id === me ? plus.mentionMe : ""].join(" ")} title={person?.name}>
          {c.text}
        </span>
      );
    })}
  </>
);

const Message = ({
  item, me, own, continued, isPrivate, canPin, directory, actions, flash, showReadLabel,
}: {
  item: MessageItem; me: number; own: boolean; continued: boolean; isPrivate: boolean; canPin: boolean; directory: Map<string, Person>; actions: MessageActions; flash: boolean; showReadLabel: boolean;
}) => {
  const failed = item.pending === "failed";
  const sending = item.pending === "sending";
  const mentionedMe = item.mentions.includes(me);
  const att = item.attachment;
  return (
    <article
      data-msg={item.id}
      className={[styles.msg, continued ? styles.msgCont : "", own ? styles.msgOwn : "", flash ? plus.flash : "", mentionedMe ? plus.mentionedMe : "", sending ? plus.sending : ""].join(" ")}
    >
      {!own ? <div className={styles.msgSide}>{!continued ? <PersonAvatar name={item.sender.name} role={item.sender.role} /> : null}</div> : null}
      <div className={styles.msgBody}>
        {!continued && !own ? (
          <header className={styles.msgHead}>
            <strong>{item.sender.name}</strong>
            <span className={styles.roleTag}>{ROLE_LABELS[item.sender.role]}</span>
            <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
          </header>
        ) : null}
        <div className={plus.bubbleWrap}>
          <div className={[styles.bubble, plus.bubbleBox, failed ? plus.bubbleFailed : ""].join(" ")}>
            {item.pinnedAt ? (
              <span className={plus.pinnedTag} title="Mensaje fijado">
                📌 Fijado
              </span>
            ) : null}
            {item.replyTo ? (
              <button type="button" className={plus.quote} onClick={() => actions.onJumpTo(item.replyTo!.id)} title="Ir al mensaje citado">
                <strong>{item.replyTo.senderName}</strong>
                <span>{previewOf({ content: item.replyTo.preview, kind: item.replyTo.kind })}</span>
              </button>
            ) : null}
            {own ? <span className="sr-only">Usted: </span> : null}
            {att?.mimeType.startsWith("audio/") ? <AudioPlayer attachment={att} own={own} /> : att ? <FileView attachment={att} /> : null}
            {item.content ? (
              <span className={plus.text}>
                <MentionText content={item.content} me={me} directory={directory} />
              </span>
            ) : null}
          </div>
          {!sending && !failed ? (
            <div className={plus.actions} role="toolbar" aria-label="Acciones del mensaje">
              <button type="button" onClick={() => actions.onReply(item)} title="Responder citando">
                ↩<span className="sr-only">Responder citando</span>
              </button>
              <button type="button" onClick={() => actions.onOpenThread(item)} title="Responder en un hilo">
                💬<span className="sr-only">Abrir hilo</span>
              </button>
              {!isPrivate && !own ? (
                <button type="button" onClick={() => actions.onReplyPrivate(item)} title={`Responder a ${item.sender.name.split(" ")[0]} en privado`}>
                  🔒<span className="sr-only">Responder en privado</span>
                </button>
              ) : null}
              {canPin ? (
                <button type="button" onClick={() => actions.onPin(item, item.pinnedAt === null)} title={item.pinnedAt ? "Desfijar" : "Fijar mensaje"} aria-pressed={item.pinnedAt !== null}>
                  📌<span className="sr-only">{item.pinnedAt ? "Desfijar" : "Fijar"}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {item.replyCount > 0 ? (
          <button type="button" className={plus.threadLink} onClick={() => actions.onOpenThread(item)}>
            💬 {item.replyCount === 1 ? "1 respuesta" : `${item.replyCount} respuestas`} · Ver hilo
          </button>
        ) : null}
        {own || !continued ? (
          <span className={[styles.meta, plus.metaRow].join(" ")}>
            <time dateTime={item.createdAt}>{timeOf(item.createdAt)}</time>
            {own ? <Ticks receipts={item.receipts} readAt={item.readAt} pending={item.pending} onOpen={() => actions.onReceipts(item.id)} /> : null}
            {own && showReadLabel && item.readAt && !item.receipts ? <span className={styles.readMark}> Leído</span> : null}
            {failed ? (
              <>
                <button type="button" className={plus.retry} onClick={() => actions.onRetry(item)}>
                  Reintentar
                </button>
                <button type="button" className={plus.retry} onClick={() => item.clientId && actions.onDiscard(item.clientId)}>
                  Descartar
                </button>
              </>
            ) : null}
          </span>
        ) : null}
      </div>
    </article>
  );
};
