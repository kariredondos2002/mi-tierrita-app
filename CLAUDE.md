# Mi Tierrita App — guía para sesiones de trabajo

SPA de Mi Tierrita SIG (React 19 + TypeScript + Vite, TanStack Query, Zustand, React Router 7, Axios,
CSS modules con variables de tema). Consume la API de `../mi-tierrita-api` (`VITE_API_URL`, por defecto
`http://localhost:4300/api/v1`). El diseño canónico son los documentos 02 (arquitectura), 07 (diseño) y 09
(infraestructura) del TCC y las capturas de `~/Desktop/TCC Ingenieria Economica/2 Capturas de las vistas`.

## Comandos

`pnpm dev` (puerto 5173) · `pnpm typecheck` · `pnpm test` (Vitest) · `pnpm build` · `pnpm preview`.

## Cadena de datos en un solo sentido

`pantalla → hook de la entidad → servicio HTTP → API`. Una pantalla nunca importa un servicio ni el cliente
HTTP; solo usa hooks. Un hook por operación (`src/hooks/<entidad>/useX.ts`), un servicio por recurso
(`src/services/<recurso>.ts`), tipos de la API en `src/types/api.ts`, estado global en `src/stores/`.

## Reglas de oro

1. **Toda pantalla contempla sus tres estados**: cargando, vacío (con llamada a la acción) y con datos.
   Usar `QueryState` / `Loading` / `EmptyState` / `ErrorState` de `@/components/ui`.
2. **Ningún color suelto**: solo variables de `src/styles/theme.css`, el sistema de diseño «Tierra viva» (v2,
   2026-2), publicado también como variables en Figma (página 01 · Sistema de diseño). Marca `--forest` #1D4A37,
   `--leaf` #2C6A4E, `--sprout` #9FD4B4, `--harvest` #E3A33B, `--clay` #C0612B, `--sky` #3A7CA5; fondo del menú
   `--app-bg` #0D261C; panel `--ground` #F5F4EF; tarjetas `--surface` #FFF con borde `--line` #E6E4DB, radio
   `--radius` 14px y `--shadow-card`; texto `--ink` #13201A, `--ink-2` #47534C, `--muted` #7A857E; semánticos
   `--good` #14805E, `--warn` #B26A00, `--bad` #C23B2E con sus `-soft`, `-line`, `-tag-bg`, `-tag-fg`; serie de
   gráficos `--chart-1` a `--chart-6`. Tipografía (autoalojada con @fontsource): `--font-body` Plus Jakarta Sans
   13,5px para interfaz y cifras; `--font-heading` Fraunces solo para h1, marca y titulares. Tema oscuro con
   `data-theme="dark"` (botón luna/sol de la barra superior). Los SVG de iconos usan `currentColor`.
3. **Estilos encapsulados**: cada pantalla/componente tiene su `X.module.css`; nada de CSS global nuevo.
4. **El frontend no calcula**: totales, saldos e indicadores se muestran tal como los devuelve la API.
   Lo único que suma el cliente es una vista previa del carrito, marcada como estimada.
5. **Acciones según el rol**: los controles que el rol no puede usar **no se muestran** (no solo se
   deshabilitan). El rol activo está en `useSessionStore((s) => s.user)`; la matriz de roles por endpoint
   es la del documento 06 (ver `src/router/navigation.ts` y el README de la API).
6. **Errores**: las mutaciones devuelven `ApiError { code, message, details }`; `fieldErrors(err)` da el
   mapa campo → mensaje de un 400 para pintarlo en cada `Field`. Los hooks con `notifyError: false`
   esperan que el formulario muestre el error; los demás notifican solos con un toast.
7. **Formularios**: validación mínima en cliente (obligatorios, número), el backend es la fuente de verdad.
   Después de una mutación exitosa el hook invalida las cachés; no hace falta refetch manual.
8. **Un archivo por componente/pantalla** con función flecha exportada; sin clases; `camelCase` en
   TypeScript; textos de la interfaz en español.
9. Formato de números y fechas siempre con `@/lib/format` (`money`, `moneyCompact`, `int`, `pct`,
   `num2`, `years`, `times`, `dateOnly`, `dateTime`).

## Kit disponible (`@/components/ui`)

`Button` (variant primary|secondary|ghost|danger|accent, size sm|md|lg, block, loading) · `Field`, `Input`,
`Select`, `FieldRow`, `Checkbox` · `Card` (title, subtitle, actions, flush) · `StatCard` (label, value,
hint, tone neutral|good|warn|bad) y `StatGrid` · `Badge` (tone) · `DataTable<T>` (columns[{key, header,
align, render, width}], rows, rowKey, onRowClick, footer) · `Loading`, `EmptyState`, `ErrorState`,
`QueryState` · `Pagination` (page, onPage) · `Modal` (open, title, description, onClose, footer, wide) ·
`Tabs` (segmentado gris #E7E8E0 con pestaña activa blanca) y `Chips` (píldoras; activa verde bosque) ·
`Callout` (veredicto: tone good|warn|bad con ícono circular, title serif 26px, aside a la derecha) · `Toasts`.
`StatCard` acepta además `icon` (trazos SVG 22×22), `delta` (variación en fracción) y `spark` (serie corta).
`DataTable`: texto a la izquierda por defecto, `align: "right"` para cifras, `mobile: false` oculta la columna en celular.
Gráficos en `@/components/charts`, dibujados al ancho real del contenedor (`useWidth`) para que el texto no se escale:
`HBarChart` (HTML; `stacked` para tarjetas angostas), `VBarChart` ({label, value, alt}[], format), `TrendChart`
(área suavizada con lectura al pasar el cursor), `DonutChart` (participación con leyenda), `LineChart` (points,
formatX, formatY, marker, highlightX), `TornadoChart` (data[{label, low, high}], base, format). Encabezado de página:
`PageHeader` (eyebrow opcional + h1 Fraunces 26px + subtítulo + acciones) y `BrandMark` de `@/components/layout/AppShell`.
Botones: `primary` 40px verde bosque, `secondary` blanco con borde, `accent` dorado cosecha.

## Experiencia 3D (`@/components/immersive`)

- `Stage` es el contenedor de toda escena: cabecera, interruptor 3D/Lista, botones de cámara, capa de etiquetas y
  pausa fuera de pantalla. **Toda escena necesita su `list` equivalente** (misma información y acciones).
- Las escenas viven en `immersive/scenes/*Scene.tsx`, se importan con `lazy()` y usan el kit (`StageCanvas`,
  `SceneCamera`, `Hoverable`, `Label`/`StageHtml`, `Flow`, `Ground`, `SelectionDisc`). Nunca importar `three` ni `kit`
  desde código que no sea perezoso.
- Los datos llegan ya calculados por la API; la escena solo los dibuja. Colores 3D en `immersive/palette.ts`.
- **Realismo**: solo escaneos reales (Poly Haven, CC0) en `public/assets/3d` — modelos con `Model`/`ModelInstances`
  de `scenes/assets.tsx` (vienen a escala 1/1,6: pasar `scale={1.6}` para 1:1), materiales con `Pbr name=…` de
  `scenes/materials.tsx` (mapa nombre → escaneo) y cielos HDR con `env` de `StageCanvas` (`morning`, `studio`,
  `warehouse`). Nada de figuras abstractas ni colores planos inventados. Optimizar modelos nuevos con
  `gltf-transform optimize in.gltf out.glb --compress meshopt --texture-compress webp --texture-size 512` y anotarlos en
  `public/assets/3d/CREDITOS.md`. `localStorage["mi-tierrita-calidad"] = "high" | "low"` fuerza la calidad.
- Respetar `reducedMotion` y `tier` de `useImmersive()`; animaciones con `m.*` de `motion/react` (hay `LazyMotion` estricto).

## Hooks disponibles (`@/hooks/<entidad>`)

- session: `useSignin`, `useSignout`, `useMe`
- users: `useUsers(query)`, `useUser(id)`, `useCreateUser`, `useChangePassword`
- categories: `useCategories(query?)`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`
- products: `useProducts(query)`, `useProduct(id)`, `useCreateProduct`, `useUpdateProduct`, `useDeactivateProduct`
- batches: `useProductBatches(productId, query?)`, `useRegisterBatch` ({productId, quantity, expiresAt, unitCost?, supplierId?}), `useExpiringBatches(query)`
- suppliers: `useSuppliers(query?)`, `useCreateSupplier`, `useUpdateSupplier`, `useRegisterPurchase` ({supplierId, productId, quantity, unitCost, expiresAt})
- customers: `useCustomers(query)`, `useCustomer(id)`, `useCustomerBalance(id)`, `useCreateCustomer`, `useUpdateCustomer`, `useRegisterPayment` ({id, amount})
- sales: `useSales(query)`, `useSale(id)`, `useRegisterSale`, `useVoidSale`
- audits: `useAudits(query)`
- reports: `useSalesReport({from, to, groupBy})`, `useInventoryReport(days)`, `useReceivablesReport(overdueDays)`
- financial: `useScenarios()`, `useScenario(id)`, `useCreateScenario`, `useCompareScenarios(ids)`, `useAmortization(id)`, `useSensitivity(id, variable, range?)`, `useBivariate(id, varX, varY)`, `useTornado(id)`

Las consultas son `useQuery` de TanStack (data, isPending, isError, error, refetch); las mutaciones son
`useMutation` (mutate, mutateAsync, isPending, error: ApiError | null, reset).
