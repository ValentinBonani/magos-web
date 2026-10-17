@AGENTS.md

# Magos del Sur — tienda online

Tienda online de juegos de mesa para el local "Magos del Sur" (Quilmes, Buenos Aires),
con panel de administración de juegos, stock y precios.

- El usuario habla en español (rioplatense); responder en español.
- Requerimientos y preguntas pendientes: `docs/requerimientos.md`. Mantenerlo
  actualizado cada vez que se defina algo nuevo.
- Forma de trabajo: primero definir todos los requerimientos, después armar un plan e
  implementar por etapas.
- Plan por etapas: `docs/plan.md`. Actualizar el estado de cada etapa al avanzar.
- Estado actual: ver `docs/plan.md`.
- Base de datos: esquema en `src/db/schema.ts`. Cambios: editar el esquema, luego
  `npm run db:generate -- --name <nombre>` y `npm run db:migrate`. Toda tabla nueva
  lleva `.enableRLS()`.
- Panel en `/admin` (`src/app/admin`). Toda página y Server Action del panel llama a
  `requireAdmin()` (`src/lib/auth.ts`).
- Scripts (correr con `node --env-file=.env.local scripts/<script>.mjs`):
  `setup.mjs` (buckets; categorías iniciales solo si no hay ninguna),
  `make-admin.mjs <email>`, `setup-cron.mjs [url]` (tarea pg_cron de pedidos).
- Pedidos: toda modificación de stock por pedidos pasa por `src/lib/orders.ts`. El
  stock de `products` es el disponible (lo reservado ya está descontado).
- Datos provisorios del local (WhatsApp, banco, etc.) en `src/lib/site.ts`.
- Web publicada: https://magos-web.vercel.app
- Node.js en `C:\Program Files\nodejs` (la terminal puede necesitar recargar el PATH).
- Secretos en `.env.local` (no se sube a git). No leer ni imprimir su contenido;
  para verificarlo, chequear solo formato/longitud.
- Dependencias: fijar versiones exactas con al menos 2 semanas de antigüedad.
- Repo: https://github.com/ValentinBonani/magos-web (rama `main`).
- GitHub CLI instalado en `C:\Program Files\GitHub CLI\gh.exe`.
