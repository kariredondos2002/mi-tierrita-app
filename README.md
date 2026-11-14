# UNIVERSIDAD DE CARTAGENA
## Ingeniería de Software · Sistemas de Información Gerencial (AL17705) · Ingeniería Económica (FC17701)
### Trabajo Colaborativo Contextualizado · 2026-2

---

# Mi Tierrita SIG · App
## Sistema de Información Gerencial y de apoyo a la decisión para Agropecuaria Mi Tierrita

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React%20Router-7-CA4245?logo=reactrouter&logoColor=white)
![Responsivo](https://img.shields.io/badge/Responsivo-escritorio%20y%20celular-blueviolet)
![Tema](https://img.shields.io/badge/Tema-claro%20y%20oscuro-2F9E5B)
![Licencia](https://img.shields.io/badge/Licencia-Académica-lightgrey)

Aplicación web de **Mi Tierrita SIG**. Se conecta al servidor [`mi-tierrita-api`](https://github.com/kariredondos2002/mi-tierrita-api)
por REST y recibe los avisos en tiempo real (chat, alarmas, vencimientos) por Server-Sent Events.

**Demostración:** [mi-tierrita-app-keoc.vercel.app](https://mi-tierrita-app-keoc.vercel.app) (Vercel, datos de ejemplo).

**Enlaces:** [presentación (Figma Slides)](https://www.figma.com/deck/0bH9C8DbFsVHskGEeIQPIW/PRESENTACI%C3%93N-Mi-Tierrita-SIG?node-id=0-20) · [repositorio del servidor](https://github.com/kariredondos2002/mi-tierrita-api) · [manual de usuario](docs/manual-de-usuario.md) · [auditoría del sistema](docs/auditoria/README.md) · [registro de cambios](CHANGELOG.md)

![Inicio del administrador](docs/capturas/03-inicio-administrador.jpg)

---

## Arranque rápido

Requisitos: Node.js 22, pnpm y el servidor corriendo en `http://localhost:4300/api/v1`
([`mi-tierrita-api`](https://github.com/kariredondos2002/mi-tierrita-api)).

```bash
pnpm install
cp .env.example .env      # VITE_API_URL=http://localhost:4300/api/v1
pnpm dev                  # http://localhost:5173
```

Cuentas para entrar: las de los datos de ejemplo del servidor (`pnpm db:seed`, usuarios `demo.admin`, `demo.caja` y
`demo.bodega`). Para Tita (la asistente) el servidor necesita `ANTHROPIC_API_KEY`.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/manual-de-usuario.md](docs/manual-de-usuario.md) | Manual de usuario por rol |
| [docs/auditoria/README.md](docs/auditoria/README.md) | Auditoría integral: informe, hallazgos, mapa, redundancias, pruebas, pendientes y evaluación final |
| [docs/capturas/](docs/capturas) | Capturas de las pantallas (ver [Capturas](#capturas)) |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |
| `/ayuda/tita` (dentro de la app) | Manual de Tita, general y por rol |

---

## Tabla de Contenidos

0. [Arranque rápido](#arranque-rápido) · [Documentación](#documentación)
1. [Descripción](#descripción)
2. [Marco Teórico](#marco-teórico)
3. [Funcionalidades](#funcionalidades)
4. [Mapa de pantallas por rol](#mapa-de-pantallas-por-rol)
5. [Arquitectura y Diseño](#arquitectura-y-diseño)
6. [Sistema de Diseño (UX/UI)](#sistema-de-diseño-uxui)
7. [Tecnologías](#tecnologías)
8. [Instalación y Ejecución](#instalación-y-ejecución)
9. [Flujo de Uso por Rol](#flujo-de-uso-por-rol)
10. [Tita, la asistente](#tita-la-asistente)
11. [Finanzas: el simulador financiero](#finanzas-el-simulador-financiero)
12. [Reportes](#reportes)
13. [Página pública y líneas de producto](#página-pública-y-líneas-de-producto)
14. [Notificaciones: campana, alarmas y Web Push](#notificaciones-campana-alarmas-y-web-push)
15. [Pruebas](#pruebas)
16. [Despliegue](#despliegue)
17. [Solución de Problemas](#solución-de-problemas)
18. [Capturas](#capturas)
19. [Fases del Desarrollo](#fases-del-desarrollo)
20. [Autores](#autores)
21. [Notas Académicas](#notas-académicas)
22. [Licencias](#licencias)

---

## Descripción

Aplicación de una sola página (SPA) de **Mi Tierrita SIG**, el sistema de una agropecuaria en Sahagún, Córdoba. La usan
la administración, la caja (Secretaria) y la bodega para inventario, lotes y vencimientos, punto de venta, clientes y
cartera, proveedores, el simulador financiero de la ampliación, reportes, chat del equipo y usuarios. Incluye la página
pública de la tienda (cuyas líneas de producto salen de la misma API que el inventario) y a **Tita**, la asistente con IA. Consume la API de [mi-tierrita-api](../mi-tierrita-api) y no
contiene reglas de negocio propias: toda regla vive en el servidor.

Implementa los documentos 02 (arquitectura del frontend), 07 (diseño del frontend) y 09 (infraestructura del
frontend) del Trabajo Colaborativo Contextualizado. La auditoría integral del sistema está en
[docs/auditoria](docs/auditoria/README.md).

---

## Marco Teórico

### Aplicación de una sola página (SPA)

El navegador descarga la aplicación una vez y luego solo intercambia **datos** con el servidor. React Router cambia de
pantalla sin recargar, así la navegación es inmediata y la conexión de avisos en vivo sigue abierta mientras la persona
se mueve por el sistema.

### Cadena de datos en un solo sentido

```
pantalla → hook de la entidad → servicio HTTP → API
```

Ninguna pantalla habla directo con el servidor: usa un hook de TanStack Query, que guarda en caché, revalida y, después
de cada cambio, invalida lo necesario. Un solo archivo por recurso arma las peticiones HTTP.

### El frontend no calcula

Totales, saldos, indicadores y cifras financieras salen del servidor, que es la única fuente de verdad: la pantalla, el
informe PDF, el Excel y Tita muestran siempre lo mismo. Lo único que suma el cliente es la vista previa del carrito,
marcada como «estimada».

### Avisos en tiempo real

Una sola conexión por pestaña a `GET /chat/stream` (Server-Sent Events) trae mensajes, acuses, presencia, alarmas y
avisos de vencimiento. El aviso no trae datos: la app los vuelve a pedir por REST. Si la conexión se cae, consulta cada
6 s y reconecta sola.

### Control de acceso por rol

Cada ruta declara sus roles; los controles que un rol no puede usar **no se muestran** (no solo se deshabilitan) y la
barra superior solo lista los módulos del rol activo. El servidor vuelve a verificar cada permiso.

---

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| Página pública | Presentación de la tienda, catálogo de líneas, «El sistema por dentro», Tita, proyecto y formulario de contacto |
| Inicio | Responde «¿está todo bien hoy?»: indicadores, pendientes y sugerencias del día por rol |
| Inventario y lotes | Productos por línea, stock físico y vendible, lotes por vencer y vencidos, estante en orden de salida (FEFO) |
| Punto de venta | Carrito con búsqueda, contado o crédito, cupo del cliente y total que confirma el servidor |
| Clientes y cartera | Saldos, abonos, cartera vencida, comentarios e historial por cliente |
| Proveedores y pedidos | Compras con lote, lectura de factura por foto, pedidos a proveedores y de clientes |
| Conteos de inventario | Hoja de conteo con Enter entre productos y vista previa del ajuste |
| Calendario | Lotes, cobros, pedidos, nómina, conteos, alarmas y cierres de mes en vista mensual o agenda |
| Finanzas | Simulador financiero en cadena (mercado → riesgos) y proyectos guardados |
| Reportes | Ventas, inventario, cartera e informe del proyecto con portada, folio, QR, PDF y Excel |
| Nómina | Periodos, empleados y liquidación simplificada (solo administrador) |
| Biblioteca | Documentos y enlaces del negocio por rol |
| Chat del equipo | Canal general, privados, hilos, acuses, fijados, adjuntos, notas de voz y búsqueda |
| Alarmas | Alarmas personales con repetición, calendario del teléfono (.ics) y avisos del navegador |
| Tita | Conversación con consultas y acciones que la persona confirma, voz, adjuntos e historial |
| Usuarios, auditoría y perfil | Cuentas y roles, registro de todo lo que se hace, perfil con foto, seguridad y actividad |

---

## Mapa de pantallas por rol

| Pantalla | Ruta | Administrador | Secretaria (caja) | Bodega |
|---|---|---|---|---|
| Página pública (líneas de producto leídas de `GET /categories/public`) | `/sitio` (y `/` sin sesión) | todos | | |
| Iniciar sesión | `/iniciar-sesion` | todos sin sesión | | |
| Inicio | `/` | ✓ | ✓ | ✓ |
| Inventario | `/inventario` | edición | consulta | edición |
| Lotes y vencimientos | `/lotes` | ✓ | | ✓ |
| Ventas (punto de venta e historial) | `/ventas`, `/ventas/:tab` | ✓ | ✓ | |
| Clientes y cartera | `/clientes` | ✓ | ✓ | |
| Proveedores | `/proveedores` | ✓ | | consulta y compras |
| Finanzas (simulador financiero: Mercado, Competencia, Costos, Inversión, Financiación, Flujo de caja, Riesgos e informe, Escenarios) | `/finanzas`, `/finanzas/:tab` | ✓ | con candado | |
| Reportes (Ventas R-01, Inventario R-02, Cartera R-03 e Informe del proyecto S-01) | `/reportes` | ✓ | solo ventas | |
| Tita | `/tita` | ✓ | ✓ | ✓ |
| Chat del equipo | `/chat` | ✓ | ✓ | ✓ |
| Contactos del sitio | `/contactos` | ✓ | | |
| Alarmas | `/alarmas` | ✓ | ✓ | ✓ |
| Usuarios y roles | `/usuarios` | ✓ | | |
| Auditoría | `/auditoria` | ✓ | | |
| Mi perfil | `/perfil`, `/perfil/:tab` | ✓ | ✓ | ✓ |
| Acceso restringido | cualquier ruta sin permiso | ✓ | ✓ | ✓ |

---

## Arquitectura y Diseño

```
pantalla → hook de la entidad → servicio HTTP → API
```

```
src/
  screens/        una carpeta por pantalla (Home, Inventory, Batches, Sales, Customers, Suppliers, Finance,
                  Reports, Chat, Contacts, Users, Audits, Profile, Tita, Signin, Landing, Restricted)
  hooks/<entidad>/ un hook por operación (useProducts, useCreateProduct, ...) sobre TanStack Query
  services/       un archivo por recurso; único lugar que arma peticiones HTTP
  stores/         estado global de cliente: sesión y rol, notificaciones, conversación con Tita
  components/     ui (kit reutilizable), charts (SVG), layout (barra superior, encabezados), ai (Tita)
  router/         mapa de pantallas por rol, guardas de sesión y de rol, rutas
  lib/            cliente HTTP, errores, formato, impresión a PDF, Excel, lectura de adjuntos
  types/          tipos de la API
  styles/         variables de tema y estilos base
```

### Reglas que se cumplen en todo el código

1. **Cadena de datos en un solo sentido.** Ninguna pantalla importa un servicio ni el cliente HTTP.
2. **Toda pantalla contempla sus tres estados**: cargando, vacío con llamada a la acción y con datos.
3. **Control de acceso.** Cada ruta declara sus roles en [navigation.ts](src/router/navigation.ts); la
   guarda muestra *Acceso restringido* sin pedir datos al backend, y la barra superior solo lista los módulos
   del rol activo (Finanzas aparece con candado para la caja). Los controles que el rol no puede usar no se muestran.
4. **Un 401 cierra la sesión** local y redirige a *Iniciar sesión*.
5. **El frontend no calcula.** Totales, saldos e indicadores se muestran tal como los devuelve la API. El punto de
   venta solo muestra un total marcado como estimado.
6. **Errores por código.** Los códigos de dominio de la API se traducen en
   [errors.ts](src/lib/errors.ts); un 400 pinta el mensaje junto a cada campo.
7. **Ningún color suelto.** Todo sale de [theme.css](src/styles/theme.css): un solo tema claro en verde pastel,
   movimiento mínimo dentro de la app (la página pública conserva sus animaciones).
8. **Fechas locales.** "Hoy" es la fecha del equipo, no UTC; la API cuenta en hora de Colombia.

---

## Sistema de Diseño (UX/UI)

| Elemento | Decisión |
|---|---|
| Paleta | Verde pastel de la marca; todos los colores salen de variables en [theme.css](src/styles/theme.css) |
| Tipografía | Urbanist en todo; Geist Mono solo para códigos (SKU, factura, lote) |
| Navegación | Barra superior en píldora con íconos; módulos secundarios en «Más»; menú desplegable en pantallas angostas |
| Tarjetas | Sin borde, radio de 22 px y sombra suave |
| Botones, pestañas y filtros | En píldora |
| Estados | Toda pantalla contempla cargando, vacío (con llamada a la acción) y con datos |
| Tema | Claro por defecto y oscuro opcional (Mi perfil → Apariencia) |
| Movimiento | Mínimo y funcional dentro de la app; la página pública conserva sus animaciones y respeta «reducir movimiento» |
| Gráficos | SVG propios con valores al pasar el cursor, teclado y detalle descargable en Excel |

---

## Tecnologías

| Componente | Tecnología |
|---|---|
| Interfaz | React 19 + TypeScript |
| Empaquetador | Vite 7 |
| Estado de servidor | TanStack Query (caché y revalidación) |
| Estado global de cliente | Zustand (sesión, notificaciones leídas, conversación con Tita) |
| Enrutamiento | React Router 7 |
| Cliente HTTP | Axios con interceptores (token, 401 → cierre de sesión) |
| Estilos | CSS modules por componente + variables de tema; tipografía Urbanist |
| Gráficos, PDF y Excel | SVG propios, impresión del navegador y un escritor de .xlsx propio (sin dependencias) |
| Voz | Reconocimiento y síntesis de voz del navegador (Web Speech API) |

---

## Instalación y Ejecución

### Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 22 |
| pnpm | 10 |
| Servidor | [`mi-tierrita-api`](https://github.com/kariredondos2002/mi-tierrita-api) corriendo y con datos (`pnpm db:seed`) |

### Pasos

```bash
pnpm install
cp .env.example .env      # VITE_API_URL=http://localhost:4300/api/v1
pnpm dev                  # http://localhost:5173
```

La API debe estar corriendo (`pnpm dev` en `../mi-tierrita-api`) con al menos un usuario creado con
`pnpm create-admin`. Tita aparece solo si la API tiene `ANTHROPIC_API_KEY`; sin ella la app funciona igual y oculta
todo lo de IA.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga en caliente |
| `pnpm typecheck` | `tsc` sin emitir |
| `pnpm build` | Compila a `dist/` (archivos estáticos) |
| `pnpm preview` | Sirve el build localmente |
| `docker build -t mi-tierrita-app .` | Imagen con Nginx sirviendo el build |

### Variables de entorno

Solo una variable, en tiempo de build (documento 09): `VITE_API_URL`, la URL base de la API. Cambiarla
implica un build nuevo. Ningún secreto se compila dentro de la SPA: la clave de IA vive solo en el servidor.

---

## Flujo de Uso por Rol

### Administrador

Entra al Inicio y revisa si todo está bien: ventas del mes, valor del inventario, cartera vencida y las sugerencias del
día. Desde ahí controla lotes, aprueba ajustes de conteo, anula ventas, liquida la nómina, evalúa la ampliación en
Finanzas, genera reportes con folio y administra usuarios y auditoría.

### Secretaria (caja)

Abre «Caja y cartera»: registra ventas de contado o a crédito en el punto de venta, recibe abonos, atiende pedidos de
clientes y genera el reporte de ventas. Ve el inventario solo en consulta.

### Bodega

Abre su Inicio con lo que vence y lo que falta: registra compras con su lote, recibe pedidos de proveedores, hace los
conteos de inventario y mantiene el estante en orden de salida (FEFO).

Todos los roles tienen chat del equipo, Tita, alarmas, calendario, biblioteca y Mi perfil.

---

## Tita, la asistente

Tita responde con los datos reales del sistema y hace lo que la cuenta de cada persona puede hacer, siempre con
confirmación:

- **Dónde:** página `/tita` y panel rápido desde la barra (botón "Tita" o Ctrl+J / ⌘J); comparten la conversación,
  que vive solo en memoria y se borra al cerrar sesión.
- **Consultar:** ventas, existencias vendibles, lotes, saldos, reportes y proyectos del simulador financiero, según el rol.
- **Actuar:** crear y editar clientes, productos, categorías y proveedores; registrar ventas, abonos, compras y lotes;
  anular ventas; crear escenarios; atender contactos; escribirle al equipo; abrir reportes. Cada acción llega como
  tarjeta y solo se ejecuta al pulsar Confirmar, contra el mismo endpoint de la API (mismas validaciones y permisos) y
  queda en la auditoría con la marca "IA". No crea usuarios ni maneja contraseñas.
- **Adjuntos:** fotos (facturas, pedidos), PDF, Excel (.xlsx), CSV y .txt, hasta 4 por pregunta.
- **Voz en vivo:** escucha, responde en voz alta y vuelve a escuchar (Chrome, Edge o Safari).
- **Además:** "Sugerencias de hoy" en el Inicio (qué reponer, qué rotar antes de que venza, a quién cobrar),
  borradores de mensajes de cobro y respuestas, lectura de reportes, explicación de escenarios y entrada de mercancía
  por foto de factura en Proveedores.

Novedades de la Fase A (octubre de 2026): respuesta en dos pasos (202 + consulta cada 1,5 s) con avisos de error claros y
«Intentar de nuevo»; historial de conversaciones («Historial» y «Nueva conversación»); preguntas sugeridas según la pantalla;
autocompletado al escribir (Tab); orbe 3D en CSS con «reducir movimiento» y lanzador flotante en toda pantalla; mención
**@Tita** en el chat del equipo y en los comentarios de un registro; manual de Tita en `/ayuda/tita` (general y por rol).

---

## Finanzas: el simulador financiero

Desde el 29/10/2026 Finanzas es el simulador financiero por unidades del brief, solo para Administrador. Ocho pestañas en
el orden de la cadena del negocio: **Mercado** (¿cuánta gente me va a comprar?), **Competencia** (¿cuánto de ese mercado
me toca?), **Costos** (¿cuánto me cuesta vender eso?), **Inversión** (¿cuánta plata necesito al inicio?, con las tablas de
depreciación de activos fijos y de amortización de diferidos por separado), **Financiación** (¿de dónde sale la plata?),
**Flujo de caja** (¿al final me deja ganancia?: VPN y TIR), **Riesgos e informe** (tornado y escenarios pesimista, base y
optimista) y **Escenarios** (proyectos guardados: «Guardar proyecto», «Guardar como», lista propia o de todos, comparar de
dos a cuatro, exportar y eliminar). Cada pestaña abre con su pregunta y la línea «Viene de … · Alimenta a …»; las entradas
secundarias van en un bloque plegable «Avanzado». Cada cambio se recalcula en la API (`POST /financial/simulator/calculate`),
que es la única fuente de las cifras: la pantalla, el informe, el Inicio y Tita muestran las mismas. «Exportar escenario» es
un atajo a Reportes → Informe del proyecto. Las decisiones del modelo están en `DECISIONES-FASE-B.md` de la carpeta del
proyecto.

---

## Reportes

Cuatro entradas en `/reportes`: **Ventas** (R-01, Administrador y Secretaria), **Inventario** (R-02), **Cartera** (R-03) e
**Informe del proyecto** (S-01, solo Administrador): el informe del simulador para un escenario guardado o para el ejemplo
de la ampliación (`?r=proyecto&proyecto=<id|ejemplo>`), con mercado y competencia, costos e inversión, financiación y
amortización del crédito, flujo de caja e indicadores, y riesgos y escenarios. Todos comparten la plantilla: vista previa,
portada con folio y QR verificable, pie «Página X de Y», historial de quién generó cada archivo y Excel (el informe, con 15
hojas).

---

## Página pública y líneas de producto

Las seis líneas de la tienda (Alimentos balanceados, Medicina veterinaria, Semillas y fertilizantes, Aves de corral,
Productos agroquímicos, Ferretería agrícola) viven en la tabla de categorías de la API, con código `01`…`06`, descripción y
subfamilias. La página pública las lee sin sesión con `GET /categories/public` (`usePublicLines`); mientras la API responde,
o si no responde, pinta el respaldo `LINES_FALLBACK` de `content.ts`. Renombrar o desactivar una línea en Inventario →
Categorías → «Editar» cambia la página pública; una categoría nueva queda interna (sin código) y no sale en la página.

---

## Notificaciones: campana, alarmas y Web Push

La campana de la barra superior reúne tres fuentes: los pendientes del Inicio de cada rol (calculados con la misma
caché), los **avisos de vencimiento** que devuelve `GET /notifications/due` (`useDueNotices`: lotes vencidos o por
vencer para administración y bodega; cartera vencida o a 5 días de vencer para administración y secretaría) y las
**alarmas que sonaron hoy** (`useAlarmFires`). Las **alarmas personalizadas** (`/alarmas`, cualquier rol, brief 2026
punto 12) se crean con título, hora de Colombia, repetición (una vez, diaria, lunes a viernes o días elegidos) y área
del sistema; Tita también las prepara con confirmación. Cuando el planificador de la API dispara una, el evento `alarm`
llega por el mismo stream del chat (`useChatRealtime`): aviso breve en pantalla o, con la pestaña en segundo plano y
permiso concedido, notificación del navegador que al pulsarla abre el área de la alarma. Cada alarma se puede agregar
al calendario del teléfono («Agregar al calendario (.ics)» y «Descargar todas (.ics)», `useDownloadAlarmIcs`). El
interruptor «Avisos en este dispositivo» (`PushSwitch`, en Alarmas y en Mi perfil) registra el service worker
`public/sw.js` y la suscripción Web Push en la API (`usePushSubscription`), así las alarmas y el resumen de
vencimientos de las 07:00 llegan aunque la pestaña esté cerrada; requiere que la API tenga par VAPID.

---

## Pruebas

- **Manual de usuario** por rol: [docs/manual-de-usuario.md](docs/manual-de-usuario.md). El manual de Tita está dentro de la
  app, en `/ayuda/tita` (general y por rol).
- **Registro de cambios**: [CHANGELOG.md](CHANGELOG.md).
- **Pruebas**: `pnpm test` (`node:test` con `tsx`, sin navegador) cubre las funciones puras de la app: clasificación de
  errores de Tita, sugerencias por pantalla, presencia de la ficha, apariencia, modos de vista, la rejilla del calendario, el
  informe del proyecto, la histéresis de la barra superior y las líneas de la página pública.

```bash
pnpm test        # node:test con tsx, sin navegador
pnpm typecheck   # tsc sin emitir
pnpm build       # compila y verifica tipos
```

---

## Despliegue

`pnpm build` genera archivos estáticos que cualquier hosting o CDN sirve por HTTPS. El
[Dockerfile](Dockerfile) empaqueta el build en Nginx con `try_files` para que las rutas de la SPA carguen
al refrescar. CI ([ci.yml](.github/workflows/ci.yml)) hace typecheck, build y construye la imagen.

La demostración pública corre en Vercel ([vercel.json](vercel.json) reescribe todas las rutas a `index.html`) con
`VITE_API_URL` apuntando a la API en producción.

---

## Solución de Problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| La app muestra «No se pudo conectar» | La API no está corriendo o `VITE_API_URL` apunta a otra dirección | Arranca `pnpm dev` en la API y revisa `.env` |
| Error de CORS en la consola | El dominio de la app no está en `CORS_ORIGINS` de la API | Agrégalo en la API y reiníciala |
| No aparece Tita | La API no tiene `ANTHROPIC_API_KEY` | Configúrala en la API; sin ella la app oculta a Tita a propósito |
| Las alarmas no llegan con la pestaña cerrada | Falta el par VAPID en la API o el permiso del navegador | Configura `VAPID_*` en la API y activa «Avisos en este dispositivo» |
| Al refrescar una ruta sale 404 en producción | El hosting no reescribe a `index.html` | Usa `vercel.json` o el `try_files` del [nginx.conf](nginx.conf) |
| Un módulo dice «Acceso restringido» | El rol de la cuenta no lo tiene | Entra con una cuenta del rol correcto (ver [Mapa de pantallas por rol](#mapa-de-pantallas-por-rol)) |

---

## Capturas

Pantallas de la aplicación con los datos de ejemplo del servidor.

| | |
|---|---|
| ![Página pública](docs/capturas/01-pagina-publica.jpg) | ![Iniciar sesión](docs/capturas/02-iniciar-sesion.jpg) |
| Página pública | Iniciar sesión |
| ![Inicio del administrador](docs/capturas/03-inicio-administrador.jpg) | ![Inicio de la secretaria](docs/capturas/04-inicio-secretaria.jpg) |
| Inicio del administrador | Inicio de la secretaria (caja y cartera) |
| ![Inicio de bodega](docs/capturas/05-inicio-bodega.jpg) | ![Inventario](docs/capturas/06-inventario.jpg) |
| Inicio de bodega | Inventario |
| ![Lotes y vencimientos](docs/capturas/07-lotes-y-vencimientos.jpg) | ![Punto de venta](docs/capturas/08-punto-de-venta.jpg) |
| Lotes y vencimientos (FEFO) | Punto de venta |
| ![Clientes y cartera](docs/capturas/09-clientes-y-cartera.jpg) | ![Pedidos](docs/capturas/10-pedidos.jpg) |
| Clientes y cartera | Pedidos |
| ![Conteos de inventario](docs/capturas/11-conteos.jpg) | ![Calendario](docs/capturas/17-calendario.jpg) |
| Conteos de inventario | Calendario |
| ![Finanzas: flujo de caja](docs/capturas/12-finanzas-flujo-de-caja.jpg) | ![Finanzas: riesgos](docs/capturas/13-finanzas-riesgos.jpg) |
| Finanzas · flujo de caja (VPN y TIR) | Finanzas · riesgos e informe |
| ![Reportes](docs/capturas/14-reportes.jpg) | ![Verificación por QR](docs/capturas/15-verificacion-qr.jpg) |
| Reportes | Verificación pública del folio |
| ![Chat del equipo](docs/capturas/16-chat.jpg) | ![Nómina](docs/capturas/18-nomina.jpg) |
| Chat del equipo | Nómina |
| ![Modo oscuro](docs/capturas/19-modo-oscuro.jpg) | ![Versión móvil](docs/capturas/20-movil-inicio.jpg) |
| Modo oscuro | Versión móvil |

---

## Fases del Desarrollo

| Fase | Alcance | Estado |
|---|---|---|
| Documentación técnica | Arquitectura, diseño e infraestructura del frontend (documentos 02, 07 y 09) | Completado |
| Núcleo ERP | Inicio por rol, inventario, lotes, punto de venta, clientes, proveedores, reportes, usuarios y auditoría | Completado |
| Comunicación y Tita | Chat del equipo, contactos, Tita con acciones confirmadas, alarmas y Web Push | Completado |
| Fase A | Pedidos, conteos, nómina, biblioteca, calendario, comentarios, historial, foto de perfil y búsqueda global | Completado |
| Fase B | Simulador financiero en cadena, proyectos guardados e informe del proyecto | Completado |
| Cierre | Página pública con líneas leídas de la API, reportes con diagramas y PDF descargable, documentación | Completado |

El detalle de cada cambio está en [CHANGELOG.md](CHANGELOG.md).

---

## Autores

| Nombre | Programa | Trabajo |
|---|---|---|
| Karina Redondo Sáez | Ingeniería de Software | Sistemas de Información Gerencial · Ingeniería Económica |
| Alexa Patricia Ricardo Lozano | Ingeniería de Software | Sistemas de Información Gerencial · Ingeniería Económica |
| Edgar Alexander Matos Rivera | Ingeniería de Software | Ingeniería Económica |

Universidad de Cartagena · Facultad de Ingeniería · CT Cereté
Sistemas de Información Gerencial (AL17705) · Docente: Esp. Luis Antonio Sarruf Durango
Ingeniería Económica (FC17701) · Docente: Esp. Estrella del Carmen Camacho Alvis

---

## Notas Académicas

- Proyecto desarrollado con fines académicos como Trabajo Colaborativo Contextualizado del semestre 2026-2.
- Los usuarios, clientes, ventas y cifras de demostración son ficticios; las cifras financieras son de ejemplo con
  supuestos académicos que la gerencia debe confirmar.
- La facturación electrónica de la DIAN y la nómina electrónica quedan fuera del alcance.

---

## Licencias

### Código del proyecto

© 2026 Karina Redondo Sáez, Alexa Patricia Ricardo Lozano y Edgar Alexander Matos Rivera. **Todos los derechos
reservados.** Mi Tierrita SIG es un Trabajo Colaborativo Contextualizado del programa de Ingeniería de Software de la
Universidad de Cartagena. El código se puede consultar en este repositorio, pero no se concede permiso para usarlo,
copiarlo, modificarlo ni distribuirlo sin autorización escrita de los autores (por eso `package.json` declara
`"license": "UNLICENSED"`). El texto completo está en [LICENSE](LICENSE).

Las ilustraciones propias del sistema —Tita (la plantita), el abanico de vidrio, las pantallas ilustrativas de la página
pública y los íconos de la navegación— forman parte del proyecto y tienen la misma reserva.

### Dependencias

Todas las dependencias de producción de la app (39 paquetes, incluidas las transitivas) usan la licencia **MIT**:

| Paquete | Licencia |
|---|---|
| react, react-dom | MIT |
| react-router-dom | MIT |
| @tanstack/react-query | MIT |
| zustand | MIT |
| axios | MIT |

El detalle actualizado se obtiene con `pnpm licenses list --prod`.

### Tipografías

[Urbanist](https://fonts.google.com/specimen/Urbanist) y [Geist Mono](https://fonts.google.com/specimen/Geist+Mono), servidas
desde Google Fonts, bajo la **SIL Open Font License 1.1**.

### Fotografías y logos

- **Fotos de la página pública** (catálogo y banda de cierre): de [Unsplash](https://unsplash.com), bajo la
  [licencia de Unsplash](https://unsplash.com/license), que permite usarlas y modificarlas sin pedir permiso. Cada foto,
  su autor y su enlace están en [public/media/LEEME.txt](public/media/LEEME.txt).
- **Logo de la Universidad de Cartagena**: marca de la universidad. Se muestra solo para identificar el programa académico
  del proyecto; no queda cubierto por la licencia de este repositorio.
