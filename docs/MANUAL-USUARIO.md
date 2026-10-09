# Manual de usuario · Mi Tierrita SIG (guía rápida)

> Versión completa por rol, con más capturas: `entregables/Compartidos/Manual_de_usuario_MiTierrita.pdf` en la carpeta
> del proyecto. Cuentas de demostración: `admin`, `secretaria` y `bodega` · contraseña `MiTierrita2026`.

## 1. La página pública

Quien abre el sitio sin sesión ve la página de la tienda: portada, ¿Qué es?, tres frentes, catálogo, quiénes somos,
contacto y pie con boletín. El formulario de **Contacto** llega al instante a la campana del administrador
(máximo 5 mensajes por hora desde la misma conexión). **Ingresar al sistema** lleva al inicio de sesión.

![Página pública](capturas/00-pagina-inicio.png)

![Contacto](capturas/25-pagina-contacto.png)

## 2. Ingresar

Escriba su usuario y contraseña y pulse **Entrar al sistema**. Después de 10 intentos en 15 minutos hay que esperar.
**Volver al sitio de Mi Tierrita** regresa a la página pública.

![Ingreso](capturas/01-inicio-sesion.png)

## 3. La pantalla principal

- **Menú lateral:** *Operación · ERP*, *Análisis y decisión*, *Comunicación* (chat y contactos del sitio) y
  *Administración*. Solo aparece lo que su rol puede usar; los números son pendientes.
- **Barra superior:** **Buscar… Ctrl K**, el estado de conexión, tema claro/oscuro, la **campana** y sus iniciales
  (abren **Mi perfil**).
- Cada rol tiene su inicio: el administrador lee los **tres frentes**; la secretaria, sus ventas del día; bodega,
  **qué hacer hoy**.

![Tablero](capturas/02-tablero.png)

| Secretaria | Bodega |
|---|---|
| ![](capturas/28-tablero-secretaria.png) | ![](capturas/27-tablero-bodega.png) |

### Indicador de conexión

| Indicador | Significado |
|---|---|
| ● En vivo | Todo funciona; los mensajes y los cambios de los demás llegan al instante |
| ● Sincronizando… | Está trayendo datos |
| ● Reconectando… | Se perdió la conexión; reintenta sola. Al volver aparece «Conexión restablecida» y la pantalla se recarga |

## 4. Buscar

**Ctrl + K** (o `/`) y escriba dos letras: productos con existencia, clientes con saldo, ventas por factura,
proveedores y personas. Flechas para moverse, **Enter** para abrir; una persona abre el chat privado.

![Búsqueda](capturas/16-busqueda.png)

## 5. Chat del equipo

- **#general** para todos y **mensajes privados** (botón **+ Privado**, o clic en la persona en el panel *Equipo*).
- **Enter** envía, **Shift + Enter** hace salto de línea. Verá «… está escribiendo», quién está en línea y la última
  conexión de los demás; en los privados, **Enviado** y luego **✓✓ Leído**.
- Si lee mensajes antiguos y llegan nuevos, aparece **↓ N mensajes nuevos**. La pestaña muestra «(n)» con lo pendiente.

![Chat general](capturas/10-chat-general.png)

![Chat privado](capturas/10b-chat-privado.png)

## 6. Notificaciones

| Aviso | Lo recibe |
|---|---|
| Venta registrada · abono · escenario nuevo · contacto del sitio | Administrador |
| Producto con 5 unidades o menos · entrada de mercancía | Administrador y bodega |
| Venta anulada | Administrador y secretaria |

Pulse un aviso para ir al módulo; **Marcar todas como leídas** limpia el contador. Quien hace la acción no recibe su
propio aviso.

![Notificaciones](capturas/15-notificaciones.png)

## 7. Operación diaria

- **Secretaria · Ventas:** busque el producto, ajuste cantidades, elija el cliente (a crédito verá cupo, saldo y
  disponible) y **Confirmar venta**. La salida es FEFO: primero el lote que vence primero.
- **Secretaria · Clientes:** **Registrar abono**; el saldo cambia en todas las pantallas abiertas.
- **Bodega · Lotes:** rojo = vencido (retirar), dorado = vence pronto (sacar al frente).
- **Bodega · Proveedores:** **Registrar compra** crea el lote con su vencimiento y avisa al administrador.

![Punto de venta](capturas/06-punto-de-venta.png)

![Lotes](capturas/05-lotes.png)

## 8. Administración y decisión

- **Evaluación financiera:** panel de decisión con el veredicto, estudio del proyecto, supuestos, escenarios y flujo.
- **Reportes:** **Excel (CSV)** o **PDF** («Guardar como PDF» en la impresión).
- **Contactos del sitio:** responda por correo y pulse **Marcar atendido**.
- **Usuarios y roles · Auditoría:** alta de usuarios y bitácora de cada escritura.

![Evaluación financiera](capturas/08-evaluacion-financiera.png)

![Contactos](capturas/19-contactos.png)

## 9. Perfil y tema

Sus iniciales abren **Mi perfil**: nombre y apellido, cambio de contraseña (mínimo 8 caracteres) y apariencia
(claro, oscuro o según el sistema).

![Perfil](capturas/17-perfil.png)

![Oscuro](capturas/11-oscuro.png)

## 10. En el celular

El menú se abre con el botón de la esquina; en el chat se ve primero la lista y luego el hilo con ← para volver.

| Página pública | Tablero | Venta | Chat |
|---|---|---|---|
| ![](capturas/12-movil-inicio.png) | ![](capturas/13-movil-tablero.png) | ![](capturas/14-movil-venta.png) | ![](capturas/18-movil-chat.png) |

## 11. Si algo falla

| Situación | Qué hacer |
|---|---|
| «Acceso restringido» | Esa pantalla es de otro rol; vuelva al tablero |
| «Esta página no está sembrada» (404) | La dirección no existe; **Volver al tablero** |
| «Algo salió mal en esta pantalla» | **Reintentar**; los datos están a salvo en el servidor |
| «Reconectando…» | Espere; el chat sigue enviando por el respaldo y todo se actualiza al volver |
| Olvidé la contraseña | El administrador asigna una nueva; luego cámbiela en Mi perfil |
