import { useConversation, type ChatTarget } from "@/hooks/chat";
import { useRealtimeStore } from "@/realtime/socket";
import { useSessionStore } from "@/stores/session";
import { MessageList } from "./MessageList";
import { Composer, TypingIndicator } from "./Composer";
import styles from "./Chat.module.css";

/** Conversación completa: lista, «está escribiendo…» y caja de redacción. */
export const Conversation = ({ target, channelName, channelText, placeholder }: { target: ChatTarget; channelName: string; channelText: string; placeholder: string }) => {
  const me = useSessionStore((s) => s.user?.id ?? 0);
  const status = useRealtimeStore((s) => s.status);
  const c = useConversation(target);
  return (
    <div className={styles.conversation}>
      {c.error ? (
        <div className={styles.inlineError} role="alert">
          {c.error}
        </div>
      ) : null}
      <MessageList
        items={c.items}
        me={me}
        loading={c.loading}
        channelName={channelName}
        channelText={channelText}
        hasMore={c.hasMore}
        loadingMore={c.loadingMore}
        onLoadOlder={() => void c.loadOlder()}
        isPrivate={target.kind === "private"}
        firstUnreadId={c.firstUnreadId}
      />
      <TypingIndicator people={c.typing} />
      <Composer onSend={c.send} onTyping={c.notifyTyping} disabled={status === "connecting"} placeholder={placeholder} />
    </div>
  );
};
