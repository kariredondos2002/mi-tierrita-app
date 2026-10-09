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
2. **Ningún color suelto**: solo variables de `src/styles/theme.css`, sistema de diseño «Campo abierto» (v4, 2026-2,
   línea editorial agrotecnológica). Carbón `--forest` #1D1E20 (acciones; texto `--on-forest`), negro `--app-bg`
   #121315 (menú y pie), oliva `--leaf`/`--olive` #2F3A13, acento `--lime` #14F77B (solo sobre fondos oscuros o como
   franja; nunca texto lima sobre blanco), `--harvest` #E3A33B; fondo `--ground` #F4F5F7, tarjetas `--surface` #FFF
   con borde `--line` #E3E6EC y radio `--radius` 10px; texto `--ink` #1D1E20, `--ink-2`, `--muted`; semánticos
   `--good`, `--warn`, `--bad` con sus `-soft`, `-line`, `-tag-bg`, `-tag-fg`; gráficos `--chart-1` a `--chart-6`.
   Tipografía (autoalojada con @fontsource): `--font-body` Inter para interfaz y cifras; `--font-heading` Bebas Neue
   (siempre `font-weight: 400`, es mayúscula y condensada) para h1, marca y titulares; `--font-script` Lobster solo
   para antetítulos y frases cortas. Tema oscuro con `data-theme="dark"`. Los SVG de iconos usan `currentColor`.
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
`Tabs` (segmentado gris #E7E8E0 con pestaña activa blanca) y `Chips` (píldoras; activa carbón) ·
`Callout` (veredicto: tone good|warn|bad con ícono circular, title Bebas, aside a la derecha) · `Toasts`.
`StatCard` acepta además `icon` (trazos SVG 22×22), `delta` (variación en fracción) y `spark` (serie corta).
`DataTable`: texto a la izquierda por defecto, `align: "right"` para cifras, `mobile: false` oculta la columna en celular.
Gráficos en `@/components/charts`, dibujados al ancho real del contenedor (`useWidth`) para que el texto no se escale:
`HBarChart` (HTML; `stacked` para tarjetas angostas), `VBarChart` ({label, value, alt}[], format), `TrendChart`
(área suavizada con lectura al pasar el cursor), `DonutChart` (participación con leyenda), `LineChart` (points,
formatX, formatY, marker, highlightX), `TornadoChart` (data[{label, low, high}], base, format). Encabezado de página:
`PageHeader` (portada con foto del módulo según la ruta —`photo` la cambia—, eyebrow manuscrito, h1 Bebas, subtítulo y acciones; fotos en `public/img`, `photoUrl(nombre)`) y `BrandMark` de `@/components/layout/AppShell`.
Botones: `primary` 40px carbón (en la portada se vuelve verde lima), `secondary` blanco con borde, `accent` dorado cosecha.
`EmptyState` muestra una ilustración (unDraw, `src/assets/ill`); `art={false}` la oculta y `art={url}` la cambia.

## Línea visual «Campo abierto»

- Sin 3D: la autora pidió retirarlo. La identidad la dan las portadas fotográficas (Unsplash, créditos en
  `public/img/CREDITOS.txt`), los titulares Bebas, el acento Lobster y las ilustraciones planas recoloreadas
  (`#3F8F3A` y `#1D1E20` en lugar del morado original de unDraw).
- Fotos nuevas: WebP ≤ 2000 px de ancho y calidad ~74; anotarlas en `CREDITOS.txt` y en `PHOTO_BY_ROUTE` de AppShell.

## Tiempo real y página pública (v4.1)

- **Socket.io**: un solo socket por pestaña lo abre `RealtimeBridge` (montado en `AppShell`) y vive en el almacén
  `useRealtimeStore` (`@/realtime/socket`). Para escuchar un evento: `useSocketEvent("evento", handler)`; nunca
  `io()` en una pantalla. Contrato de eventos: README de la API, «Eventos Socket.io».
- `datos:cambio` invalida las consultas del recurso según `AFFECTED_KEYS` (`RealtimeBridge.tsx`); un recurso nuevo
  se agrega ahí y en `LIVE_RESOURCES` de la API.
- Chat: `useConversation({ kind: "general" } | { kind: "private", userId })` en `hooks/chat`; componentes en
  `components/chat`. Notificaciones: `useNotifications` (la campana las recibe por socket y por caché).
- Página pública: `screens/Landing` en `/` sin sesión y en `/sitio` siempre; sus colores son fijos (no cambia con
  el tema oscuro) y usa el mismo `BrandMark` y `photoUrl`.
- `ErrorBoundary` envuelve el contenido del `AppShell`; `GlobalSearch` responde a Ctrl + K y `/`.

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
- chat: `useConversations`, `usePeople`, `useUnreadMessages`, `useConversation(target)`, `useUnreadInTitle(n)`
- notifications: `useNotifications`, `useMarkNotificationsRead` · search: `useGlobalSearch(q)` · contact: `useSendContact`, `useContactMessages`, `useMarkContactHandled` · users: `useUpdateProfile`
- reports (v4.2): `useExportReport` ({report, format, filtros}), `useExportHistory(query)` · financial: `useExportScenario` · users: `useMyActivity`
- financial: `useScenarios()`, `useScenario(id)`, `useCreateScenario`, `useCompareScenarios(ids)`, `useAmortization(id)`, `useSensitivity(id, variable, range?)`, `useBivariate(id, varX, varY)`, `useTornado(id)`

Las consultas son `useQuery` de TanStack (data, isPending, isError, error, refetch); las mutaciones son
`useMutation` (mutate, mutateAsync, isPending, error: ApiError | null, reset).

## Reportes y perfil (v4.2)

- Los PDF y Excel los genera la API (`/reports/*/export`, `/financial/scenarios/:id/export`); el navegador solo
  descarga con `downloadFile` de `@/lib/download` (token incluido, nombre desde Content-Disposition). Nunca
  `window.print()` ni CSV armado en el cliente. Botones: `ExportButtons` de `@/components/exports`.
- Toda descarga queda auditada como `EXPORT`; los hooks de exportación invalidan el historial, la auditoría y la
  actividad propia. El inicio de sesión no muestra cuentas de demostración.
- `ProfileScreen` tiene pestañas (datos, seguridad, actividad, rol, preferencias); textos de actividad y permisos en `@/lib/activity`.
