# Datos de prueba · App

## Cuentas de la demostración publicada

Para entrar a la demostración en [mi-tierrita-app-keoc.vercel.app](https://mi-tierrita-app-keoc.vercel.app) (y a los
enlaces y códigos QR de los reportes del documento) se usan estas cuentas, una por rol:

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `vgOMpwhSJzEFxETI` |
| Secretaria (ventas) | `ventas` | `Ku_vZ3QBm7gqrRge` |
| Bodega | `almacen` | `KbBVHzrk37pX3GmS` |

Son cuentas de demostración con datos ficticios; no corresponden a personas ni a ventas reales de la tienda.

## Cuentas de una instalación local

En una base propia, `pnpm db:seed` de la API crea otras cuentas de ejemplo (`demo.*`); su clave está en la sección
[Datos de ejemplo](https://github.com/kariredondos2002/mi-tierrita-api#datos-de-ejemplo) del README de la API. Estas
cuentas **no** sirven en la demostración publicada.

| Usuario | Rol | Inicio | Qué probar |
|---|---|---|---|
| `demo.admin` | Administrador | Panel de administración | Indicadores con contadores, lotes y FEFO, anular una venta, Finanzas (proyectos de 70 % y 100 % con crédito), Reportes con PDF, Excel y QR, Nómina, Usuarios, Auditoría |
| `demo.caja` | Secretaria | Caja y cartera | Punto de venta de contado y a crédito, abonos, pedidos de clientes, reporte de ventas; Finanzas aparece con candado |
| `demo.bodega` | Bodega | Bodega y vencimientos | Lotes por vencer y vencidos, compra con lote, recibir un pedido, conteo de inventario |

## Pruebas manuales sugeridas (dos navegadores)

1. Entra con `admin` en un navegador y con `ventas` en otro (o en una ventana privada).
2. Escribe en el canal general: el otro navegador recibe el mensaje al instante y los chulitos pasan a «visto».
3. Registra una venta a crédito con `ventas` por encima del cupo del cliente: el sistema la rechaza.
4. Con `admin`, anula esa venta o una anterior: el stock vuelve al lote de origen.
5. Abre Reportes → Ventas → PDF y verifica el folio con el código QR en `/verificar/<folio>`.

Todos los datos de ejemplo son ficticios.
