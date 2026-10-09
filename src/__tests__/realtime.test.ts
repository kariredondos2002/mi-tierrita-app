import { describe, expect, it } from "vitest";
import { dayLabel, isContinuation, joinNames, relative } from "@/components/chat/chatFormat";
import { socketOrigin } from "@/realtime/socket";
import { AFFECTED_KEYS } from "@/realtime/RealtimeBridge";
import { ALL_NAV_ITEMS, findRoute, isVisibleFor } from "@/router/navigation";

const msg = (senderId: number, createdAt: string) => ({ type: "message", createdAt, sender: { id: senderId } });

describe("chat · formato", () => {
  it("agrupa mensajes seguidos del mismo autor con menos de 5 minutos", () => {
    expect(isContinuation(msg(1, "2026-10-09T10:00:00Z"), msg(1, "2026-10-09T10:04:00Z"))).toBe(true);
    expect(isContinuation(msg(1, "2026-10-09T10:00:00Z"), msg(1, "2026-10-09T10:06:00Z"))).toBe(false);
    expect(isContinuation(msg(1, "2026-10-09T10:00:00Z"), msg(2, "2026-10-09T10:01:00Z"))).toBe(false);
    expect(isContinuation(undefined, msg(2, "2026-10-09T10:01:00Z"))).toBe(false);
  });

  it("rotula los días como Hoy, Ayer o la fecha", () => {
    const now = new Date(2026, 9, 9, 15, 0);
    expect(dayLabel(new Date(2026, 9, 9, 8, 0).toISOString(), now)).toBe("Hoy");
    expect(dayLabel(new Date(2026, 9, 8, 8, 0).toISOString(), now)).toBe("Ayer");
    expect(dayLabel(new Date(2026, 9, 1, 8, 0).toISOString(), now)).toMatch(/1 de octubre/);
  });

  it("expresa la última conexión en lenguaje natural", () => {
    const now = Date.parse("2026-10-09T12:00:00Z");
    expect(relative(null, now)).toBe("sin conexiones registradas");
    expect(relative("2026-10-09T11:59:40Z", now)).toBe("hace un momento");
    expect(relative("2026-10-09T11:45:00Z", now)).toBe("hace 15 min");
    expect(relative("2026-10-09T09:00:00Z", now)).toBe("hace 3 h");
    expect(relative("2026-10-08T10:00:00Z", now)).toBe("ayer");
  });

  it("une nombres para «está escribiendo…»", () => {
    expect(joinNames(["Ana"])).toBe("Ana");
    expect(joinNames(["Ana", "Luis"])).toBe("Ana y Luis");
    expect(joinNames(["Ana", "Luis", "Marta"])).toBe("Ana, Luis y Marta");
  });
});

describe("tiempo real · conexión y refresco", () => {
  it("deduce el origen del servidor de sockets desde la URL de la API", () => {
    expect(socketOrigin("http://localhost:4300/api/v1")).toBe("http://localhost:4300");
    expect(socketOrigin("https://api.mitierrita.co/api/v1")).toBe("https://api.mitierrita.co");
    expect(socketOrigin("/api/v1")).toBeUndefined();
    expect(socketOrigin("")).toBeUndefined();
  });

  it("una venta de otro usuario refresca ventas, inventario, cartera y reportes", () => {
    const flat = (AFFECTED_KEYS["sales"] ?? []).map((k) => k[0]);
    expect(flat).toEqual(expect.arrayContaining(["sales", "products", "customers", "reports"]));
  });
});

describe("navegación v4", () => {
  it("el chat está para los tres roles y los contactos solo para el administrador", () => {
    const chat = ALL_NAV_ITEMS.find((i) => i.path === "/chat")!;
    const contact = ALL_NAV_ITEMS.find((i) => i.path === "/contactos")!;
    expect((["ADMIN", "SALES", "WAREHOUSE"] as const).every((r) => isVisibleFor(chat, r))).toBe(true);
    expect(isVisibleFor(contact, "ADMIN")).toBe(true);
    expect(isVisibleFor(contact, "SALES")).toBe(false);
  });

  it("las conversaciones privadas y el perfil tienen título en la barra", () => {
    expect(findRoute("/chat/3")?.label).toBe("Chat del equipo");
    expect(findRoute("/perfil")?.label).toBe("Mi perfil");
  });
});
