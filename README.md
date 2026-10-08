# Mi Tierrita App

Aplicación de una sola página (SPA) de **Mi Tierrita SIG**: la interfaz que usan el Administrador, la
Secretaria y Bodega para inventario, lotes y vencimientos, punto de venta, clientes y cartera, proveedores,
evaluación financiera de la ampliación, reportes y usuarios. Consume la API de
[mi-tierrita-api](../mi-tierrita-api) y no contiene reglas de negocio propias: toda regla vive en el servidor.

Implementa los documentos 02 (arquitectura del frontend), 07 (diseño del frontend) y 09 (infraestructura del
frontend) de la documentación técnica del TCC.

## Stack

| Componente | Tecnología |
|---|---|
| Interfaz | React 19 + TypeScript |
| Empaquetador | Vite 7 |
| Estado de servidor | TanStack Query (caché y revalidación) |
| Estado global de cliente | Zustand (sesión, tema, notificaciones) |
| Enrutamiento | React Router 7 |
| Cliente HTTP | Axios con interceptores (token, 401 → cierre de sesión) |
| Estilos | CSS modules por componente + sistema de diseño «Tierra viva» (variables de tema claro y oscuro) |
| Tipografía | Plus Jakarta Sans (interfaz y cifras) y Fraunces (titulares), autoalojadas con @fontsource |
| Gráficos | SVG propios dibujados al ancho real: tendencia, barras, dona, línea, tornado |
| 3D | three.js + React Three Fiber + drei (escenas cargadas bajo demanda) |
| Movimiento | Motion (`LazyMotion`): transiciones de pantalla, aparición al desplazarse, microanimaciones |
| Pruebas | Vitest (`pnpm test`) |

## Puesta en marcha (local)

```bash
pnpm install
cp .env.example .env      # VITE_API_URL=http://localhost:4300/api/v1
pnpm dev                  # http://localhost:5173
```

La API debe estar corriendo (`pnpm dev` en `../mi-tierrita-api`) con al menos un usuario creado con
`pnpm create-admin`.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga en caliente |
| `pnpm typecheck` | `tsc` sin emitir |
| `pnpm build` | Compila a `dist/` (archivos estáticos) |
| `pnpm preview` | Sirve el build localmente |
| `docker build -t mi-tierrita-app .` | Imagen con Nginx sirviendo el build |

## Configuración por entorno

Solo una variable, en tiempo de build (documento 09): `VITE_API_URL`, la URL base de la API. Cambiarla
implica un build nuevo. Ningún secreto del servidor se compila dentro de la SPA.

## Arquitectura

```
pantalla → hook de la entidad → servicio HTTP → API
```

```
src/
  screens/        una carpeta por pantalla (Home, Inventory, Batches, Sales, Customers, Suppliers,
                  Finance, Reports, Users, Audits, Signin, Restricted)
  hooks/<entidad>/ un hook por operación (useProducts, useCreateProduct, ...) sobre TanStack Query
  services/       un archivo por recurso; único lugar que arma peticiones HTTP
  stores/         estado global de cliente: sesión y rol, tema, notificaciones
  components/     ui (kit reutilizable), charts (SVG), layout (barra lateral, barra superior)
  router/         mapa de pantallas por rol, guardas de sesión y de rol, rutas
  lib/            cliente HTTP, traducción de códigos de error, formato de números y fechas
  types/          tipos de la API
  styles/         variables de tema y estilos base
```

### Reglas que se cumplen en todo el código

1. **Cadena de datos en un solo sentido.** Ninguna pantalla importa un servicio ni el cliente HTTP.
2. **Toda pantalla contempla sus tres estados**: cargando, vacío con llamada a la acción y con datos.
3. **Control de acceso.** Cada ruta declara sus roles en [navigation.ts](src/router/navigation.ts); la
   guarda muestra *Acceso restringido* sin pedir datos al backend, y el menú lateral solo lista los módulos
   del rol activo. Los controles que el rol no puede usar no se muestran.
4. **Un 401 cierra la sesión** local y redirige a *Iniciar sesión*.
5. **El frontend no calcula.** Totales, saldos e indicadores financieros se muestran tal como los devuelve
   la API. El punto de venta solo muestra un subtotal marcado como estimado.
6. **Errores por código.** Los códigos de dominio de la API se traducen en
   [errors.ts](src/lib/errors.ts); un 400 pinta el mensaje junto a cada campo.
7. **Ningún color suelto.** Todo sale de [theme.css](src/styles/theme.css), con tema claro y oscuro.

## Mapa de pantallas por rol

| Pantalla | Ruta | Administrador | Secretaria | Bodega |
|---|---|---|---|---|
| Iniciar sesión | `/iniciar-sesion` | todos sin sesión | | |
| Tablero gerencial (inicio por rol) | `/` | ✓ | ✓ | ✓ |
| Inventario | `/inventario` | edición | consulta | edición |
| Lotes y vencimientos | `/lotes` | ✓ | | ✓ |
| Ventas (punto de venta e historial) | `/ventas`, `/ventas/:tab` | ✓ | ✓ | |
| Clientes y cartera | `/clientes` | ✓ | ✓ | |
| Proveedores | `/proveedores` | ✓ | | ✓ |
| Evaluación financiera (panel de decisión, estudio del proyecto, supuestos, escenarios, flujo) | `/finanzas`, `/finanzas/:tab` | ✓ | candado | |
| Reportes gerenciales | `/reportes` | ✓ | solo ventas | |
| Usuarios y roles | `/usuarios` | ✓ | | |
| Auditoría | `/auditoria` | ✓ | | |
| Acceso restringido | cualquier ruta sin permiso | ✓ | ✓ | ✓ |

## Diseño (v2 · «Tierra viva»)

Rediseño visual completo de 2026-2 sin cambiar la API ni las reglas de negocio:

- **Tablero gerencial (SIG + BI + DSS):** indicadores con variación frente al mismo corte del mes anterior y
  minigráfica, tendencia de ventas de 13 semanas, productos más vendidos, capital en bodega por línea (dona),
  cartera por cliente con uso del cupo, pendientes y la decisión abierta de la ampliación.
- **Evaluación financiera:** nueva pestaña *Estudio del proyecto* que articula innovación, mercado, técnico y
  financiero (TCC de Ingeniería Económica) con los supuestos del escenario y los datos reales del SIG.
- **Inicio de sesión** con panel de marca y cuentas de demostración (se ocultan con `VITE_SHOW_DEMO_ACCOUNTS=false`).
- Menú agrupado por enfoque: *Operación · ERP*, *Análisis y decisión*, *Administración*; tema claro/oscuro;
  punto de venta con carrito y total fijos a la derecha; tablas responsivas.
- El mismo sistema está en Figma (sistema de diseño, prototipo de escritorio y móvil, manual de usuario).

## Experiencia inmersiva (v3)

El 3D comunica el sistema, no lo decora. Cada escena usa los datos reales de la API y tiene una vista en **Lista**
equivalente (teclado y lector de pantalla):

| Escena | Dónde | Qué representa | Interacción |
|---|---|---|---|
| Mapa vivo del negocio | Tablero del administrador | Proveedores → bodega → mostrador → clientes → caja → ampliación, con el SIG al centro; partículas = flujos de mercancía, dinero e información; balizas = puntos críticos | Clic: el objeto se ilumina, la cámara vuela y aparece el detalle · doble clic abre el módulo · recorrido guiado con progreso y logro |
| Estante FEFO | Lotes y vencimientos | Filas del frente (vencidos, ≤ 7 días…) al fondo; altura = lo que queda del lote | Clic en una caja · «Simular una venta» muestra qué lote sale primero |
| Torres de escenarios | Panel de decisión | Altura = cuántas veces la ampliación paga su cuota; plano de vidrio = 1,0 ×; cristal = crea valor | Clic en una torre elige el escenario |
| Escena de bienvenida | Inicio de sesión | El núcleo del SIG con ERP, BI y DSS sobre el terreno | Paralaje con el puntero |

- **Misiones de revisión** (tablero): recorrer el mapa, revisar lotes, simular una venta FEFO, revisar la cartera y
  comparar escenarios. El progreso es por usuario y por navegador (no se envía a la API).
- **Accesibilidad:** vista en Lista, barra de puntos navegable con flechas, Esc para volver, anuncios `aria-live`,
  «reducir movimiento» del sistema (sin vuelos de cámara ni partículas en movimiento), contraste AA en el escenario nocturno.
- **Rendimiento:** escenas y pantallas en fragmentos aparte (carga inicial ≈ 174 kB gzip), la escena deja de dibujar
  fuera de pantalla, resolución adaptable si caen los cuadros, menos partículas y sin sombras en celulares, sin
  WebGL se muestra la Lista. La rueda del mouse solo acerca con Ctrl/⌘ (no secuestra el desplazamiento).

## Cuentas de demostración

Con la base sembrada (`pnpm db:seed` en la API) existen `admin` (Administrador), `secretaria` (Secretaria) y
`bodega` (Bodega), todas con la contraseña `MiTierrita2026`. Los datos son simulados.

## Despliegue en Seenode (sitio estático)

| Campo | Valor |
|---|---|
| Tipo de servicio | Static site, conectado al repositorio `mi-tierrita-app` |
| Build command | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Publish directory | `dist` |
| Client-side routing | Activado (reescribe `/*` a `/index.html`) |
| Variable de entorno | `VITE_API_URL=https://<url-de-la-api>/api/v1` |

Guía completa (base de datos, API y orden de pasos) en `docs/DESPLIEGUE.md` del repositorio de la API.

## Producción

`pnpm build` genera archivos estáticos que cualquier hosting o CDN sirve por HTTPS. El
[Dockerfile](Dockerfile) empaqueta el build en Nginx con `try_files` para que las rutas de la SPA carguen
al refrescar. CI ([ci.yml](.github/workflows/ci.yml)) hace typecheck, build y construye la imagen.
