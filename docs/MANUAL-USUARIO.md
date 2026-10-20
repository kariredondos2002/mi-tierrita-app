# Manual de usuario · Mi Tierrita SIG (guía rápida)

> Guía rápida de la versión **v4.5** (capturas del 20/10/2026, con datos de demostración simulados). La versión completa
> por rol está en Figma (página 04, manuales por rol en escritorio y móvil). Las cuentas las entrega el administrador;
> la pantalla de ingreso no muestra atajos de demostración.

## 1. La página pública

Quien abre el sitio sin sesión ve la página de la tienda. Su barra tiene **Catálogo**, **El sistema**, **Tita**,
**Visítenos**, **Proyecto** y **Contacto**, y el botón **Ingresar al sistema** lleva al inicio de sesión. En **Contacto**
escriba su nombre, un **teléfono o WhatsApp** o un correo (basta uno), el tema y el mensaje: llega al instante a la
campana del administrador (máximo 5 mensajes por hora desde la misma conexión).

![Página pública](capturas/00-pagina-inicio.png?v=20261020)

![Catálogo](capturas/00b-pagina-catalogo.png?v=20261020)

![Contacto](capturas/25-pagina-contacto.png?v=20261020)

## 2. Ingresar

Escriba su usuario y contraseña y pulse **Entrar al sistema**. Después de 10 intentos en 15 minutos hay que esperar.
**Volver al sitio de Mi Tierrita** regresa a la página pública.

![Ingreso](capturas/01-inicio-sesion.png?v=20261020)

## 3. La pantalla principal

- **Menú lateral:** *Operación · ERP*, *Análisis y decisión*, *Comunicación* (**Tita**, chat del equipo y contactos del
  sitio) y *Administración*. Solo aparece lo que su rol puede usar; los números son pendientes.
- **Barra superior:** **Buscar… Ctrl K**, el estado de conexión, el botón de tema, la **campana** y sus iniciales
  (abren **Mi perfil**).
- Cada rol tiene su inicio, con un carrusel de accesos a sus módulos: el administrador ve ventas del mes, ticket
  promedio, inventario a costo, cartera vencida, la tendencia de 13 semanas, los productos más vendidos y el capital
  en bodega; la secretaria, lo vendido hoy (contado y crédito), clientes con saldo y sus pendientes; bodega, **qué hacer
  hoy** y los lotes próximos a vencer.

![Tablero](capturas/02-tablero.png?v=20261020)

| Secretaria | Bodega |
|---|---|
| ![](capturas/28-tablero-secretaria.png?v=20261020) | ![](capturas/27-tablero-bodega.png?v=20261020) |

### Indicador de conexión

| Indicador | Significado |
|---|---|
| ● En vivo | Todo funciona; los mensajes y los cambios de los demás llegan al instante |
| ● Sincronizando… | Está trayendo datos |
| ● Conectando… | Está abriendo la conexión en tiempo real |
| ● Reconectando… | Se perdió la conexión; reintenta sola. Al volver aparece «Conexión restablecida» y la pantalla se recarga |
| ● Sin tiempo real | No se pudo abrir el socket; la aplicación sigue funcionando por consulta normal |

## 4. Buscar

**Ctrl + K** (o `/`) y escriba dos letras: productos con existencia, clientes con saldo, ventas por factura,
proveedores y personas. Flechas para moverse, **Enter** para abrir; una persona abre el chat privado.

![Búsqueda](capturas/16-busqueda.png?v=20261020)

## 5. Chat del equipo

- **#general** para todos y **mensajes privados** (botón **+ Privado**, o clic en la persona en el panel *Equipo*).
- **Enter** envía, **Shift + Enter** hace salto de línea; **@** menciona a una persona y le llega un aviso. Verá
  «… está escribiendo», quién está en línea y la última conexión de los demás.
- **Chulitos** en sus mensajes: reloj (enviando) → ✓ enviado → ✓✓ entregado → ✓✓ azul visto. Pulse los chulitos para
  ver **quién lo recibió, quién lo vio y quién sigue pendiente** (solo el autor ve ese detalle).
- Sobre cada mensaje: **citar**, abrir el **hilo**, **responder en privado** sin publicar en el grupo y **fijar**
  (en #general solo fija el administrador; en un privado, cualquiera de los dos).
- Adjunte archivos de hasta 6 MB con el clip o grabe una **nota de voz** con el micrófono. La lupa busca solo entre los
  mensajes que usted puede ver.
- Si lee mensajes antiguos y llegan nuevos, aparece **↓ N mensajes nuevos**. La pestaña muestra «(n)» con lo pendiente.

![Chat general](capturas/10-chat-general.png?v=20261020)

![Chat privado](capturas/10b-chat-privado.png?v=20261020)

![Detalle de recibos](capturas/10c-chat-recibos.png?v=20261020)

## 5b. Tita, la asistente

**Tita** (menú *Comunicación*) responde con los datos del sistema que **su cuenta** puede ver: un resumen del día,
preguntas sobre ventas, lotes o cartera, y **borradores** de venta, abono o compra (y lectura de una factura de
compra, para administrador y bodega). Tita **propone y usted confirma**: nada se guarda hasta que lo confirma en la
pantalla de cada módulo, y la auditoría lo marca como sugerido por IA. Si el servidor no tiene configurada la IA,
Tita avisa «no está disponible» y el resto del sistema funciona igual.

## 6. Notificaciones

| Aviso | Lo recibe |
|---|---|
| Venta registrada · abono · escenario nuevo · contacto del sitio | Administrador |
| Producto con 5 unidades o menos · entrada de mercancía | Administrador y bodega |
| Venta anulada | Administrador y secretaria |

Pulse un aviso para ir al módulo; **Marcar todas como leídas** limpia el contador. Quien hace la acción no recibe su
propio aviso.

![Notificaciones](capturas/15-notificaciones.png?v=20261020)

## 7. Operación diaria

- **Secretaria · Ventas:** busque el producto, ajuste cantidades, elija el cliente (a crédito verá cupo, saldo y
  disponible) y **Confirmar venta**. La salida es FEFO: primero el lote que vence primero.
- **Secretaria · Clientes:** **Registrar abono**; el saldo cambia en todas las pantallas abiertas.
- **Bodega · Lotes:** rojo = vencido (retirar), dorado = vence pronto (sacar al frente).
- **Bodega · Proveedores:** **Registrar compra** crea el lote con su vencimiento y avisa al administrador.

![Punto de venta](capturas/06-punto-de-venta.png?v=20261020)

![Lotes](capturas/05-lotes.png?v=20261020)

## 8. Administración y decisión

- **Evaluación financiera:** panel de decisión con el veredicto, estudio del proyecto, supuestos, escenarios y flujo.
- **Reportes:** elija el reporte, ajuste los filtros y pulse **PDF** (resumen ejecutivo, indicadores, gráficos con
  unidad, detalle y hallazgos) o **Excel** (hojas con totales por fórmula). Se abre una **vista previa** con
  **Guardar como…**, **Descargar** y **Cerrar**. El documento dice quién lo generó y a qué hora; «N/D» significa dato no
  disponible y «N/A» no aplica. Abajo, **Historial de reportes generados**
  muestra cada descarga; la secretaria ve solo las suyas. En **Evaluación financiera** los mismos botones descargan
  el escenario elegido (VPN, TIR, flujo y tornado).
- **Contactos del sitio:** responda por correo y pulse **Marcar atendido**.
- **Usuarios y roles · Auditoría:** alta de usuarios y bitácora. El filtro **Acción** separa altas, cambios,
  borrados, **reportes generados** e **inicios de sesión**; la columna de detalle dice qué reporte y con qué filtros.

![Reportes](capturas/09-reportes.png?v=20261020)

![Reporte de ventas en PDF](capturas/22-reporte-ventas-pdf.png?v=20261020)

![Auditoría de reportes](capturas/20-auditoria-reportes.png?v=20261020)

![Evaluación financiera](capturas/08-evaluacion-financiera.png?v=20261020)

![Contactos](capturas/19-contactos.png?v=20261020)

## 9. Perfil y tema

Sus iniciales abren **Mi perfil**. A la izquierda, su tarjeta: nombre, rol, correo, teléfono, último ingreso y lo
que ha hecho en 30 días. A la derecha, cinco pestañas:

| Pestaña | Qué hace |
|---|---|
| Datos personales | Nombre, apellido, correo (único en el equipo) y teléfono. Usuario y rol solo los cambia el administrador |
| Seguridad | Cambio de contraseña con requisitos a la vista y **Cerrar sesión en todos los dispositivos** |
| Mi actividad | Ventas, abonos, lotes y reportes de los últimos 30 días y la lista de sus últimas acciones |
| Mi rol | Lo que puede hacer y a qué no tiene acceso |
| Preferencias | Claro, oscuro o **según el sistema** (sigue al dispositivo en vivo); se guarda en este navegador |

![Perfil](capturas/17-perfil.png?v=20261020)

![Mi actividad](capturas/17b-perfil-actividad.png?v=20261020)

![Seguridad](capturas/17c-perfil-seguridad.png?v=20261020)

![Preferencias](capturas/23-preferencias-tema.png?v=20261020)

![Oscuro](capturas/11-oscuro.png?v=20261020)

## 10. En el celular

El menú se abre con el botón de la esquina; en el chat se ve primero la lista y luego el hilo con ← para volver.

| Página pública | Tablero | Venta | Chat |
|---|---|---|---|
| ![](capturas/12-movil-inicio.png?v=20261020) | ![](capturas/13-movil-tablero.png?v=20261020) | ![](capturas/14-movil-venta.png?v=20261020) | ![](capturas/18-movil-chat.png?v=20261020) |

## 11. Si algo falla

| Situación | Qué hacer |
|---|---|
| «Acceso restringido» | Esa pantalla es de otro rol; vuelva al tablero |
| «Esta página no está sembrada» (404) | La dirección no existe; **Volver al tablero** |
| «Algo salió mal en esta pantalla» | **Reintentar**; los datos están a salvo en el servidor |
| «Reconectando…» | Espere; el chat sigue enviando por el respaldo y todo se actualiza al volver |
| Olvidé la contraseña | El administrador asigna una nueva; luego cámbiela en Mi perfil |
