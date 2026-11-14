# Datos de prueba · App

La app usa los datos de ejemplo que siembra la API (`pnpm db:seed`); la clave de las cuentas demo está en la sección
[Datos de ejemplo](https://github.com/kariredondos2002/mi-tierrita-api#datos-de-ejemplo) del README de la API.

| Usuario | Rol | Inicio | Qué probar |
|---|---|---|---|
| `demo.admin` | Administrador | Panel de administración | Indicadores con contadores, lotes y FEFO, anular una venta, Finanzas (proyectos de 70 % y 100 % con crédito), Reportes con PDF, Excel y QR, Nómina, Usuarios, Auditoría |
| `demo.caja` | Secretaria | Caja y cartera | Punto de venta de contado y a crédito, abonos, pedidos de clientes, reporte de ventas; Finanzas aparece con candado |
| `demo.bodega` | Bodega | Bodega y vencimientos | Lotes por vencer y vencidos, compra con lote, recibir un pedido, conteo de inventario |

## Pruebas manuales sugeridas (dos navegadores)

1. Entra con `demo.admin` en un navegador y con `demo.caja` en otro (o en una ventana privada).
2. Escribe en el canal general: el otro navegador recibe el mensaje al instante y los chulitos pasan a «visto».
3. Registra una venta a crédito con `demo.caja` por encima del cupo del cliente: el sistema la rechaza.
4. Con `demo.admin`, anula esa venta o una anterior: el stock vuelve al lote de origen.
5. Abre Reportes → Ventas → PDF y verifica el folio con el código QR en `/verificar/<folio>`.

Todos los datos de ejemplo son ficticios.
