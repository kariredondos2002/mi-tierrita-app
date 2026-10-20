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
(`src/services/<recurso>.ts`), tipos de la API en `src/types/api.ts`, estado global en `src/stores/` (`session`, `theme`, `toasts`, `ui`, `ai`). Los hooks de mutación comparten `useApiMutation` (`hooks/shared.ts`).

## Reglas de oro

1. **Toda pantalla contempla sus tres estados**: cargando, vacío (con llamada a la acción) y con datos.
   Usar `QueryState` / `Loading` / `EmptyState` / `ErrorState` de `@/components/ui`.
2. **Ningún color suelto**: solo variables de `src/styles/theme.css`, sistema de diseño «Verde pastel» (v4.6, 2026-10, el
   mismo del prototipo en Figma). Verde oscuro `--forest` #1D6B3E (acciones; texto `--on-forest`), `--sprout` #2F9E5B,
   suave `--sprout-soft` #E6F4EA, menta `--lime` #9FD3B2 (sobre fondos oscuros), `--harvest` #F3C969, `--bad` #D4554F,
   `--warn` #B45309; fondo `--ground` #F4F7F5, tarjetas `--surface` #FFF con borde `--line` #E1E9E4 y radio `--radius`
   14px; texto `--ink` #1C2420, `--ink-2`, `--muted`; menú claro con `--nav-bg` y `--nav-on`; semánticos `--good`, `--warn`,
   `--bad` con sus `-soft`, `-line`, `-tag-bg`, `-tag-fg`; gráficos `--chart-1` a `--chart-6`. Tipografía única **Urbanist**
   (autoalojada con `@fontsource-variable/urbanist`): `--font-body`, `--font-heading` y `--font-script` apuntan a ella;
   los titulares van en peso 700, sin mayúsculas forzadas. Tema oscuro con `data-theme="dark"` (#0F1512, #1B2420,
   #222D27). Los SVG de iconos usan `currentColor`.
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
10. **Pulido visual (v4.3)**: toda la identidad vive en `theme.css`. Espacio con `--space-1..8`, texto con `--text-xs..xl`, elevación con `--elev-1..4` (`--shadow*` apuntan a ellas), foco con `--focus-ring`, movimiento con `--ease`, `--t-fast`, `--t-base`; texto y velos sobre fotografía con `--on-photo`, `--on-photo-2`, `--on-photo-line`, `--photo-veil*`, `--glass*`. Estados de todo control: normal, hover, foco (`--focus-ring`), activo, deshabilitado, carga (`loading`), error (`invalid`) y éxito (`valid`). No escribir `rgba()` ni hex sueltos en componentes: crear el token en `theme.css` (claro y oscuro).

## Kit disponible (`@/components/ui`)

`Button` (variant primary|secondary|ghost|danger|accent, size sm|md|lg, block, loading) · `Field`, `Input`,
`Select`, `FieldRow`, `Checkbox` · `Card` (title, subtitle, actions, flush) · `StatCard` (label, value,
hint, tone neutral|good|warn|bad) y `StatGrid` · `Badge` (tone) · `DataTable<T>` (columns[{key, header,
align, render, width}], rows, rowKey, onRowClick, footer) · `Loading`, `EmptyState`, `ErrorState`,
`QueryState` · `Pagination` (page, onPage) · `Modal` (open, title, description, onClose, footer, wide) ·
`Tabs` (segmentado gris #E7E8E0 con pestaña activa blanca) y `Chips` (píldoras; activa carbón) ·
`Callout` (veredicto: tone good|warn|bad con ícono circular, title Urbanist, aside a la derecha) · `Toasts` (botones: se cierran con teclado; los errores usan role=alert) · `Carousel` (slides[{id,image,title,text,tag,to,cta}], label, interval: zoom lento, autoavance con pausa, puntos con progreso, teclado y deslizamiento; sin movimiento si el sistema pide reducirlo) · `PhotoBackdrop` (images[], fondo fotográfico con zoom y fundido para portadas; el contenedor debe ser `position: relative; isolation: isolate; overflow: hidden`) · `useReducedMotion`. `Input` acepta `invalid` (error) y `valid` (éxito). `Modal` acepta `wide` y `xl`, atrapa el foco y lo devuelve al cerrar.
`StatCard` acepta además `icon` (trazos SVG 22×22), `delta` (variación en fracción) y `spark` (serie corta).
`DataTable`: texto a la izquierda por defecto, `align: "right"` para cifras, `mobile: false` oculta la columna en celular.
Gráficos en `@/components/charts`, dibujados al ancho real del contenedor (`useWidth`) para que el texto no se escale:
`HBarChart` (HTML; `stacked` para tarjetas angostas), `VBarChart` ({label, value, alt}[], format), `TrendChart`
(área suavizada con lectura al pasar el cursor), `DonutChart` (participación con leyenda), `LineChart` (points,
formatX, formatY, marker, highlightX), `TornadoChart` (data[{label, low, high}], base, format). Encabezado de página:
`PageHeader` (portada con foto del módulo según la ruta —`photo` la cambia—, antetítulo, h1 Urbanist, subtítulo y acciones; fotos en `public/img`, `photoUrl(nombre)`) y `BrandMark` de `@/components/layout/AppShell`.
Botones: `primary` 40px verde oscuro (en la portada se vuelve menta), `secondary` blanco con borde, `accent` dorado cosecha.
`EmptyState` muestra una ilustración (unDraw, `src/assets/ill`); `art={false}` la oculta y `art={url}` la cambia.

## Línea visual «Verde pastel»

- Sin 3D: la autora pidió retirarlo. La identidad la dan las portadas fotográficas (Unsplash, créditos en
  `public/img/CREDITOS.txt`), los titulares Urbanist y las ilustraciones planas recoloreadas
  (`#3F8F3A` y `#1D1E20` en lugar del morado original de unDraw).
- Fotos nuevas: WebP ≤ 2000 px de ancho y calidad ~74; anotarlas en `CREDITOS.txt` y en `PHOTOS_BY_ROUTE` de AppShell.

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

## Chat v4.5 y tema (2026-10)

- Chat: `useConversation` mezcla mensajes **sin duplicar** (id y `clientId`), envía de forma optimista (reloj → ✓ → ✓✓ → ✓✓ azul) y
  reintenta sin duplicar. Piezas en `components/chat`: `MessageList` (acciones: citar, hilo, responder en privado, fijar),
  `Composer` (adjuntos 6 MB, nota de voz con MediaRecorder, @menciones), `ThreadPanel`, `PinnedBar`, `ChatSearch`,
  `ReceiptsModal` (quién recibió, vio o sigue pendiente; solo el autor), `Ticks`, `AttachmentView`. Los no leídos salen de
  `GET /chat/unread` (`useUnreadSummary`), no de contadores locales. Estilos nuevos: `ChatPlus.module.css`.
- Tema: `stores/theme.ts` (claro, oscuro o «sistema», que sigue al dispositivo en vivo); `index.html` lo aplica antes de pintar.
  Un componente nuevo solo usa variables de `theme.css`; el texto sobre `--forest` va con `--on-forest` (nunca `#fff`).
- Página pública: viene del repositorio de Matos (`screens/Landing`, medios en `public/media`); el formulario envía `message`,
  `topic`, `phone`/`email` y el campo trampa `website`.

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
- chat: `useConversations`, `usePeople`, `useUnreadSummary`, `useUnreadMessages`, `usePinned(scope)`, `useConversation(target)`, `useUnreadInTitle(n)`
- notifications: `useNotifications`, `useMarkNotificationsRead` · search: `useGlobalSearch(q)` · contact: `useSendContact`, `useContactMessages`, `useMarkContactHandled` · users: `useUpdateProfile`
- reports (v4.2): `useExportReport` ({report, format, filtros}), `useExportHistory(query)` · financial: `useExportScenario` · users: `useMyActivity`
- financial: `useScenarios()`, `useScenario(id)`, `useCreateScenario`, `useCompareScenarios(ids)`, `useAmortization(id)`, `useSensitivity(id, variable, range?)`, `useBivariate(id, varX, varY)`, `useTornado(id)`

Las consultas son `useQuery` de TanStack (data, isPending, isError, error, refetch); las mutaciones son
`useMutation` (mutate, mutateAsync, isPending, error: ApiError | null, reset).

## Reportes y perfil (v4.2)

- Los PDF y Excel los genera la API (`/reports/*/export`, `/financial/scenarios/:id/export`). Desde v4.3 el navegador
  los pide con `fetchFile` de `@/lib/download` (token incluido, nombre desde Content-Disposition) y `ExportButtons` abre
  `ExportPreviewDialog`: vista previa del PDF en un iframe, «Guardar como…» (`saveBlobAs`: selector del sistema con
  `showSaveFilePicker` en Chromium y contexto seguro; si no existe cae a descarga) y «Descargar». Excel no tiene vista
  previa en el navegador: se muestra su ficha. La generación se audita una sola vez. Nunca `window.print()` ni CSV armado en el cliente.
- `PageHeader` rota 2–3 fotos por módulo con `PhotoBackdrop` (`PHOTOS_BY_ROUTE` en AppShell); el Inicio de cada rol trae
  `HomeCarousel` (accesos visuales a los módulos del rol) y la página pública tiene la galería «Así se ve Mi Tierrita».
- Toda descarga queda auditada como `EXPORT`; los hooks de exportación invalidan el historial, la auditoría y la
  actividad propia. El inicio de sesión no muestra cuentas de demostración.
- `ProfileScreen` tiene pestañas (datos, seguridad, actividad, rol, preferencias); textos de actividad y permisos en `@/lib/activity`.

## Tita (v4.5)

- Asistente con IA opcional: pantalla `screens/Tita`, componentes en `components/ai`, hooks en `hooks/ai` (`useAiStatus`, `useAiChat`, `useAiDraft`, `useBriefing`, `useReadInvoice`, `useTitaConversation`, `useTitaVoice`) y estado en `stores/ai.ts`. Habla con `/ai/*` de la API; sin `ANTHROPIC_API_KEY` la API responde 660 y la app oculta la IA.
- Tita propone y la persona confirma: nunca ejecuta una escritura por su cuenta; el borrador se confirma con el flujo normal y la API marca la auditoría con `ai_suggested`. Respeta el rol activo (no ofrecer herramientas que el rol no puede usar).
