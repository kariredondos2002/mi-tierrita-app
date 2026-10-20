import { describe, expect, it } from "vitest";
import { mergeMessage, type ChatItem } from "@/hooks/chat/useConversation";
import { messageState } from "@/components/chat/Ticks";
import { chunkMentions, formatDuration, previewOf } from "@/components/chat/chatFormat";
import type { ChatMessage } from "@/types/api";

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 1, sender: { id: 2, name: "Ana Gil", username: "ana", role: "SALES" }, recipientId: null, content: "hola", kind: "TEXT", readAt: null,
  createdAt: "2026-10-01T10:00:00.000Z", replyTo: null, threadRootId: null, replyCount: 0, pinnedAt: null, pinnedBy: null, mentions: [], attachment: null, receipts: null, ...over,
});

describe("chulitos", () => {
  it("pasa de reloj a enviado, entregado y visto", () => {
    expect(messageState({ receipts: null, readAt: null, pending: "sending" }).level).toBe("sending");
    expect(messageState({ receipts: { total: 3, delivered: 0, read: 0 }, readAt: null }).level).toBe("sent");
    expect(messageState({ receipts: { total: 3, delivered: 3, read: 0 }, readAt: null }).level).toBe("delivered");
    expect(messageState({ receipts: { total: 3, delivered: 3, read: 1 }, readAt: null })).toMatchObject({ level: "delivered", counts: "1/3" });
    expect(messageState({ receipts: { total: 3, delivered: 3, read: 3 }, readAt: null }).level).toBe("read");
    expect(messageState({ receipts: null, readAt: "2026-10-01T10:01:00Z" }).level).toBe("read");
    expect(messageState({ receipts: null, readAt: null, pending: "failed" }).level).toBe("failed");
  });
});

describe("mergeMessage", () => {
  it("no duplica por id ni por clientId y conserva los recibos propios", () => {
    const a: ChatItem[] = [{ ...msg({ id: -5, clientId: "c1", pending: "sending" }), type: "message" }];
    const once = mergeMessage(a, msg({ id: 10, clientId: "c1", receipts: { total: 2, delivered: 1, read: 0 } }));
    expect(once).toHaveLength(1);
    expect(once[0]).toMatchObject({ id: 10 });
    const twice = mergeMessage(once, msg({ id: 10, receipts: null }));
    expect(twice).toHaveLength(1);
    expect((twice[0] as { receipts: unknown }).receipts).toEqual({ total: 2, delivered: 1, read: 0 });
  });
  it("ordena por fecha", () => {
    const out = mergeMessage([{ ...msg({ id: 2, createdAt: "2026-10-01T10:05:00.000Z" }), type: "message" }], msg({ id: 1 }));
    expect(out.map((x) => x.id)).toEqual([1, 2]);
  });
});

describe("formatos del chat", () => {
  it("resalta menciones como el servidor", () => {
    expect(chunkMentions("Hola @ana y @Luis-2, mail a@b.co").filter((c) => c.mention).map((c) => c.mention)).toEqual(["ana", "luis-2"]);
  });
  it("describe audio y archivos sin texto", () => {
    expect(previewOf({ content: "", kind: "AUDIO" })).toContain("audio");
    expect(previewOf({ content: " hola ", kind: "TEXT" })).toBe("hola");
    expect(formatDuration(83_000)).toBe("1:23");
  });
});
