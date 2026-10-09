import { lazy, useEffect, useMemo, useState } from "react";
import { Stage } from "@/components/immersive/Stage";
import { InfoPanel, Legend, LiveRegion, MetricList } from "@/components/immersive/Overlay";
import { useImmersive } from "@/components/immersive/useImmersive";
import { STAGE } from "@/components/immersive/palette";
import { unlockAchievement } from "@/components/immersive/missions";
import type { ShelfRow } from "@/components/immersive/scenes/FefoShelfScene";
import { dateOnly, int, money } from "@/lib/format";
import type { ProductBatch } from "@/types/api";
import styles from "./FefoShelf.module.css";

const FefoShelfScene = lazy(() => import("@/components/immersive/scenes/FefoShelfScene"));

const MAX_PER_ROW = 10;

/** Ventanas de vencimiento: cada una es una fila del estante, del frente (urgente) al fondo. */
const BANDS = [
  { key: "vencidos", label: "Vencidos · retirar", color: STAGE.badSolid, test: (b: ProductBatch) => b.expired },
  { key: "7", label: "≤ 7 días · urgente", color: STAGE.clay, test: (b: ProductBatch) => !b.expired && b.daysToExpire <= 7 },
  { key: "15", label: "8 a 15 días", color: STAGE.harvest, test: (b: ProductBatch) => !b.expired && b.daysToExpire > 7 && b.daysToExpire <= 15 },
  { key: "30", label: "16 a 30 días", color: STAGE.sprout, test: (b: ProductBatch) => !b.expired && b.daysToExpire > 15 && b.daysToExpire <= 30 },
  { key: "mas", label: "Más de 30 días", color: STAGE.sky, test: (b: ProductBatch) => !b.expired && b.daysToExpire > 30 },
];

/** Agrupa los lotes en filas del estante (ya vienen ordenados por vencimiento desde la API). */
export const toShelfRows = (items: ProductBatch[]): ShelfRow[] =>
  BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    color: band.color,
    boxes: items
      .filter(band.test)
      .sort((a, b) => a.daysToExpire - b.daysToExpire)
      .slice(0, MAX_PER_ROW)
      .map((b) => ({ id: b.id, product: b.productName, days: b.daysToExpire, expired: b.expired, remaining: b.quantityRemaining, quantity: b.quantity })),
  })).filter((r) => r.boxes.length > 0);

/**
 * Estante FEFO: la regla «primero en vencer, primero en salir» hecha espacio. Las filas del frente vencen antes;
 * «Simular una venta» muestra qué lote descontaría el sistema (no registra nada).
 */
export const FefoShelf = ({ items, days }: { items: ProductBatch[]; days: number }) => {
  const { tier, reducedMotion, narrow } = useImmersive();
  const [selected, setSelected] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const rows = useMemo(() => toShelfRows(items), [items]);
  const byId = useMemo(() => new Map(items.map((b) => [b.id, b])), [items]);
  const batch = selected !== null ? byId.get(selected) : undefined;
  // la venta descuenta el lote vigente que vence primero; los vencidos se saltan
  const nextOut = useMemo(() => [...items].filter((b) => !b.expired && b.quantityRemaining > 0).sort((a, b) => a.daysToExpire - b.daysToExpire)[0], [items]);

  useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), reducedMotion ? 1500 : 2600);
    return () => window.clearTimeout(t);
  }, [leaving, reducedMotion]);

  const simulate = () => {
    if (!nextOut) return;
    setSelected(null);
    setLeaving(nextOut.id);
    unlockAchievement("fefo-simulado");
    setMessage(`Una venta de ${nextOut.productName} descuenta primero el lote #${nextOut.id}: vence en ${nextOut.daysToExpire} días. Los lotes vencidos nunca se venden.`);
  };

  const simulateButton = (
    <button type="button" className={styles.simBtn} onClick={simulate} disabled={!nextOut || leaving !== null}>
      <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M6 4.5 v11 l9 -5.5 z" />
      </svg>
      Simular una venta
    </button>
  );

  return (
    <Stage
      size="md"
      label="Estante FEFO en 3D"
      eyebrow="ERP · Lotes y vencimientos"
      title="Estante FEFO"
      subtitle={`Lotes que vencen en ${days} días y los ya vencidos. Cada caja es un lote: lo que vence primero está a la izquierda, junto a la salida al mostrador, y su etiqueta dice cuánto queda.`}
      actions={simulateButton}
      hint="Arrastre para girar · Ctrl + rueda para acercar · clic en una caja para ver el lote · Esc vuelve"
      scene={<FefoShelfScene rows={rows} selected={selected} onSelect={setSelected} leaving={leaving} tier={tier} reducedMotion={reducedMotion} narrow={narrow} />}
      overlay={
        <>
          <div className={styles.legend}>
            <Legend items={BANDS.filter((b) => rows.some((r) => r.key === b.key)).map((b) => ({ color: b.color, label: b.label }))} />
          </div>
          {leaving !== null ? (
            <p className={styles.toast} role="status">
              {message}
            </p>
          ) : null}
          <InfoPanel
            open={batch !== undefined}
            panelKey={String(batch?.id ?? "none")}
            eyebrow={batch ? `Lote #${batch.id}` : undefined}
            title={batch?.productName ?? ""}
            tone={batch?.expired ? "bad" : batch && batch.daysToExpire <= 7 ? "warn" : "good"}
            reducedMotion={reducedMotion}
            onClose={() => setSelected(null)}
          >
            {batch ? (
              <>
                <p>
                  {batch.expired
                    ? "Lote vencido: retírelo del estante. El sistema nunca lo descuenta en una venta."
                    : nextOut?.id === batch.id
                      ? "Este es el próximo lote que sale: la siguiente venta del producto lo descuenta primero."
                      : batch.daysToExpire <= 7
                        ? "Vence esta semana: póngalo al frente del estante."
                        : "Lote vigente."}
                </p>
                <MetricList
                  reducedMotion={reducedMotion}
                  items={[
                    { label: "Vence", value: dateOnly(batch.expiresAt) },
                    { label: "Restan", value: batch.expired ? "Vencido" : `${int(batch.daysToExpire)} días` },
                    { label: "Cantidad", value: `${int(batch.quantityRemaining)} de ${int(batch.quantity)}` },
                    { label: "Costo unitario", value: money(batch.unitCost) },
                    { label: "Proveedor", value: batch.supplierName ?? "—" },
                  ]}
                />
              </>
            ) : null}
          </InfoPanel>
          <LiveRegion text={batch ? `Lote ${batch.id}, ${batch.productName}, ${batch.expired ? "vencido" : `vence en ${batch.daysToExpire} días`}.` : leaving !== null ? message : ""} />
        </>
      }
      list={
        <div className={styles.list}>
          {leaving !== null ? (
            <p className={styles.toastStatic} role="status">
              {message}
            </p>
          ) : null}
          {rows.map((r) => (
            <section key={r.key} className={styles.row}>
              <h3>
                <span style={{ background: r.color }} aria-hidden="true" />
                {r.label} · {r.boxes.length === 1 ? "1 lote" : `${r.boxes.length} lotes`}
              </h3>
              <ul>
                {r.boxes.map((b) => (
                  <li key={b.id} className={nextOut?.id === b.id ? styles.next : ""}>
                    <strong>{b.product}</strong> · #{b.id} · {b.expired ? "vencido" : `${b.days} días`} · {int(b.remaining)}/{int(b.quantity)}
                    {nextOut?.id === b.id ? <em> · sale primero</em> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      }
    />
  );
};
