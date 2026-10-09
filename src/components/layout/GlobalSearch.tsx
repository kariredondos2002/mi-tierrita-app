import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearch } from "@/hooks/search";
import { money, int } from "@/lib/format";
import { ROLE_LABELS, useSessionStore } from "@/stores/session";
import styles from "./Topbar.module.css";

type Option = { key: string; group: string; label: string; detail: string; to: string };

/**
 * Búsqueda global (Ctrl + K o /), como el buscador de SoftUnity: productos, clientes,
 * proveedores, ventas y personas que el rol puede abrir. Flechas para moverse, Enter para abrir.
 */
export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const me = useSessionStore((s) => s.user?.id);
  const result = useGlobalSearch(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 220);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.closest("input, textarea, select, [contenteditable=true]") !== null);
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else {
      setText("");
      setActive(0);
    }
  }, [open]);

  const options = useMemo<Option[]>(() => {
    const r = result.data;
    if (!r || debounced.length < 2) return [];
    return [
      ...r.products.map((p) => ({ key: `p${p.id}`, group: "Productos", label: p.name, detail: `${p.sku} · ${int(p.stock)} u.`, to: `/inventario?buscar=${encodeURIComponent(p.name)}` })),
      ...r.customers.map((c) => ({ key: `c${c.id}`, group: "Clientes", label: c.name, detail: c.balance > 0 ? `Saldo ${money(c.balance)}` : "Al día", to: `/clientes?cliente=${c.id}` })),
      ...r.suppliers.map((s) => ({ key: `s${s.id}`, group: "Proveedores", label: s.name, detail: "Proveedor", to: `/proveedores` })),
      ...r.sales.map((s) => ({ key: `v${s.id}`, group: "Ventas", label: s.invoiceNumber, detail: `${s.customerName ?? "Mostrador"} · ${money(s.total)}`, to: `/ventas/historial?venta=${s.id}` })),
      ...r.people.map((p) => ({ key: `u${p.id}`, group: "Personas", label: p.name, detail: `${ROLE_LABELS[p.role]} · ${p.id === me ? "usted" : "escribirle"}`, to: p.id === me ? "/perfil" : `/chat/${p.id}` })),
    ];
  }, [result.data, debounced, me]);

  useEffect(() => setActive(0), [options.length]);

  const go = (o: Option | undefined) => {
    if (!o) return;
    setOpen(false);
    navigate(o.to);
  };

  return (
    <>
      <button type="button" className={styles.searchBtn} onClick={() => setOpen(true)} aria-label="Buscar en todo el sistema (Ctrl + K)">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span>Buscar…</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open ? (
        <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Búsqueda global">
            <div className={styles.inputRow}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                ref={input}
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls="global-search-results"
                aria-activedescendant={options[active] ? `gs-${options[active].key}` : undefined}
                value={text}
                placeholder="Producto, cliente, factura, proveedor o persona…"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, options.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") go(options[active]);
                }}
              />
            </div>
            <div className={styles.results} id="global-search-results" role="listbox">
              {debounced.length < 2 ? <div className={styles.hint}>Escriba al menos 2 letras. Busca en productos, clientes, proveedores, ventas y personas según su rol.</div> : null}
              {debounced.length >= 2 && !result.isFetching && options.length === 0 ? <div className={styles.hint}>Sin resultados para «{debounced}».</div> : null}
              {options.map((o, i) => (
                <div key={o.key}>
                  {i === 0 || options[i - 1]?.group !== o.group ? <div className={styles.group}>{o.group}</div> : null}
                  <div
                    id={`gs-${o.key}`}
                    role="option"
                    aria-selected={i === active}
                    className={[styles.option, i === active ? styles.optionActive : ""].join(" ")}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(o)}
                  >
                    <span>{o.label}</span>
                    <small>{o.detail}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.foot}>
              <span>↑ ↓ moverse</span>
              <span>Enter abrir</span>
              <span>Esc cerrar</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
