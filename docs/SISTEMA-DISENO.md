# Sistema de diseño · App

Todo color, radio, sombra y duración sale de variables en [src/styles/theme.css](../src/styles/theme.css). El modo
oscuro solo redefine esas variables (`html[data-theme="dark"]`); ninguna pantalla conoce el tema.

## Identidad

| Elemento | Decisión |
|---|---|
| Paleta | Verde pastel de la marca; acento `--sprout` con `--sprout-soft`; encabezado sobre el degradado `--hero-from` → `--hero-to` |
| Semánticos | `--good`, `--warn` y `--bad`, cada uno con `-soft`, `-line`, `-tag-bg` y `-tag-fg` |
| Tipografía | Urbanist en todo (titulares y cifras grandes en peso 400–500 con tracking negativo); Geist Mono solo para códigos |
| Contraste | AA calculado para cada par de tokens |

## Componentes (`@/components/ui`)

| Componente | Uso |
|---|---|
| `Button` | Variantes primary, secondary, ghost, danger y accent; en píldora |
| `Card`, `StatCard`, `StatGrid` | Tarjetas sin borde, radio 22 px y sombra suave; indicadores con tono |
| `DataTable` | Tablas que bajo 640 px se apilan como tarjetas rotuladas |
| `Tabs`, `Chips`, `ViewSwitch` | Pestañas, filtros y cambio Tarjetas / Lista / Tabla |
| `Modal`, `Callout`, `Toasts` | Diálogos, veredictos y avisos |
| `QueryState`, `Loading`, `EmptyState`, `ErrorState` | Los tres estados de cada pantalla |
| `DocumentViewer`, `QrCode`, `UserAvatar`, `MiniCalendar` | Vista previa de archivos, QR de folios, avatares y calendario |

Gráficos SVG propios en `@/components/charts` (barras, dona, línea, tornado, barras apiladas, calendario de calor,
ranking) con valor al pasar el cursor, teclado y detalle descargable en Excel.

## Navegación

Barra superior en píldora con íconos y rótulos cortos; los módulos secundarios van en «Más»; en pantallas angostas,
menú desplegable. Sin menú lateral.

## Movimiento

Mínimo y funcional dentro de la app: solo transiciones cortas de estado (`--dur`). La página pública conserva sus
animaciones (elementos con `data-motion`) y respeta «reducir movimiento».
