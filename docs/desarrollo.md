# Desarrollo · App

## Entorno local

Requisitos: Node.js 22, pnpm 10 y la API corriendo ([mi-tierrita-api](https://github.com/kariredondos2002/mi-tierrita-api)).

```bash
pnpm install
cp .env.example .env      # VITE_API_URL=http://localhost:4300/api/v1
pnpm dev                  # http://localhost:5173
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga en caliente (puerto 5173) |
| `pnpm typecheck` | `tsc` sin emitir |
| `pnpm build` | Compila a `dist/` |
| `pnpm preview` | Sirve el build localmente |
| `pnpm test` | Pruebas de funciones puras con `node:test` y `tsx` |

## Reglas del código

1. **Cadena de datos en un solo sentido:** `pantalla → hook de la entidad → servicio HTTP → API`. Una pantalla nunca
   importa un servicio ni el cliente HTTP.
2. **Tres estados por pantalla:** cargando, vacío con llamada a la acción y con datos (`QueryState`, `Loading`,
   `EmptyState`, `ErrorState`).
3. **Ningún color suelto:** solo variables de `src/styles/theme.css`.
4. **Estilos encapsulados:** cada pantalla o componente tiene su `X.module.css`.
5. **El frontend no calcula:** totales, saldos e indicadores se muestran como los devuelve la API; el carrito muestra un
   total marcado como estimado.
6. **Acciones según el rol:** lo que el rol no puede usar no se muestra.
7. **Errores por código:** se traducen en `src/lib/errors.ts`; un 400 pinta el mensaje junto a cada campo.
8. **Un archivo por componente** con función flecha exportada; textos de la interfaz en español.
9. **Formato** de números y fechas siempre con `@/lib/format`.

## Ramas y commits

| Rama | Uso |
|---|---|
| `main` | Versión estable; es la que se publica |
| `wip/AAAA-MM-DD` | Trabajo en curso guardado sin terminar; no se fusiona a `main` sin revisar |

Los mensajes de commit van en español y dicen qué cambia y para qué.

## Definición de «terminado»

- `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- La pantalla funciona con los tres roles que la usan y en un ancho de celular.
- El README (mapa de pantallas), el manual de usuario y el CHANGELOG están al día.
