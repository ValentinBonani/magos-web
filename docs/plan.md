# Plan de implementación — Magos del Sur

Basado en `docs/requerimientos.md`. Cada etapa termina con algo funcionando y publicado
en Vercel para probar. Se marca el estado de cada etapa a medida que avanza.

## Primera versión (lanzamiento)

### Etapa 0 — Base del proyecto · ✅ lista
- ✅ Proyecto Next.js 16 + TypeScript + Tailwind + shadcn/ui.
- ✅ Proyecto en Supabase (región us-east-1, igual que Vercel) y Drizzle conectado
  (`src/db/`, `drizzle.config.ts`, scripts `db:generate` / `db:migrate` / `db:studio`).
- ✅ Publicado en Vercel: https://magos-web.vercel.app (deploy automático desde `main`).
- ✅ Colores de marca y logo web; página provisoria "Próximamente".
- ✅ Variables de entorno cargadas en Vercel.

### Etapa 1 — Productos y panel básico · ✅ lista (probada por el dueño)
- ✅ Modelo de datos (`src/db/schema.ts`, migración `drizzle/0000_inicial.sql`):
  categorías por sección, productos, fotos. RLS activado en todas las tablas.
- ✅ Bucket `product-images` y categorías iniciales (`scripts/setup.mjs`).
- ✅ Login del admin (Supabase Auth; admin = `app_metadata.role = "admin"`, se asigna
  con `scripts/make-admin.mjs`).
- ✅ Panel: listado con búsqueda y filtro, alta/edición/borrado de productos,
  categorías, subida de fotos (achicadas en el navegador y re-procesadas con sharp).
- ✅ Prueba del dueño con su cuenta de admin.
- Más adelante, si hay tiempo: mejorar el diseño del panel.
- Pendiente menor: fotos subidas en un formulario que no se guardó quedan huérfanas
  en el storage (limpieza automática más adelante).

### Etapa 2 — Tienda pública · ✅ lista (probada por el dueño)
- ✅ Layout (`src/app/(tienda)/layout.tsx`): cabecera con menú y buscador, pie, botón
  de WhatsApp. Datos del local en `src/lib/site.ts` (**provisorios**).
- ✅ Inicio, listados por sección (`/[seccion]`), ficha (`/producto/[slug]`), búsqueda
  (`/buscar`). Consultas en `src/lib/catalog.ts`.
- ✅ Orden: con stock primero, después agotados (banner "Agotado"); último cargado primero.
- ✅ Filtros: categoría en todas las secciones; jugadores, edad y editorial solo en
  Juegos de mesa. Los productos sin el dato no aparecen al filtrar por ese dato.
- ✅ Buscador con sugerencias desde 3 caracteres, sin distinguir acentos (`unaccent`).
- ✅ Contacto con datos del local; Nosotros y Eventos con texto provisorio.
- Mientras no haya carrito, la ficha tiene "Consultar por WhatsApp".
- ✅ Tarjetas uniformes (cuadrado fijo, foto entera sobre blanco) y fuente Geist.
- Más adelante, si hay tiempo: pulir el diseño de la tienda.

### Etapa 3 — Carrito, checkout y pedidos · ✅ lista (probada por el dueño con emails)
- ✅ Esquema: `orders`, `order_items`, `settings` (migración `0002_pedidos`). Bucket
  privado `receipts` para comprobantes.
- ✅ Lógica en `src/lib/orders.ts`: el stock de `products` es el disponible; reservar lo
  descuenta (UPDATE ... WHERE stock >= cantidad, en transacción) y cancelar lo devuelve.
  Reglas y textos en `src/lib/order-rules.ts`.
- ✅ Carrito en localStorage (`src/components/store/cart/`), máximo 6 unidades.
- ✅ Checkout como invitado, retiro en el local, transferencia y efectivo con descuento.
- ✅ Página del pedido `/pedido/[token]` (subida de comprobante) y `/mi-pedido`.
- ✅ Emails (`src/lib/order-emails.ts`, vía API de Resend).
- ✅ Tareas automáticas: pg_cron en Supabase llama a `/api/cron/orders` cada 5 min
  (`scripts/setup-cron.mjs`). Vencimientos y recordatorio a la hora.
- ✅ Panel: pedidos (lista, detalle, acciones, comprobante) y configuración de descuentos.
- ✅ Prueba automática de la lógica (29 casos, incluida concurrencia) contra la base.
- ✅ `RESEND_API_KEY` y `CRON_SECRET` en `.env.local` (email de prueba enviado OK).
- ✅ `RESEND_API_KEY` y `CRON_SECRET` en Vercel (cron responde 200).
- ✅ Prueba del dueño con emails (2026-10-18): funciona todo.

### Etapa 4 — Mercado Pago · 🟡 código listo, sin publicar
- ✅ Checkout Pro por API REST (`src/lib/mercadopago.ts`): preferencia con vencimiento
  igual a la reserva (30 min), solo medios instantáneos (sin ticket/atm), hasta 12
  cuotas con interés a cargo del comprador.
- ✅ Estado `pendiente_mp` + columnas `mp_*` (migración `0003_mercadopago`, **sin
  aplicar todavía**).
- ✅ Webhook `/api/mercadopago/webhook` con verificación de firma (igual que el SDK
  oficial; comparada en 7 casos). La vuelta del cliente (`/pedido/[token]?payment_id=`)
  también verifica el pago contra la API.
- ✅ `processMercadoPagoPayment` (idempotente): aprobado → pagado; en revisión → no
  vence; pago tardío → re-reserva o devolución automática (si falla, email al admin).
- ✅ Vencimiento a los 30 min en la tarea automática.
- ⬜ Aplicar migración y publicar (después de la prueba de la Etapa 3 del dueño).
- ⬜ Credenciales de prueba (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) en `.env.local` y
  Vercel; configurar el webhook en la aplicación de Mercado Pago.
- ⬜ Prueba con cuentas de prueba de Mercado Pago. La aplicación de prueba se crea
  desde la cuenta personal del dueño (2026-10-21).
- ⬜ **Antes del lanzamiento:** crear la aplicación en la cuenta de Mercado Pago a nombre
  de la hermana del dueño (titular de los cobros), cambiar `MP_ACCESS_TOKEN` y
  `MP_WEBHOOK_SECRET` por los de esa cuenta (producción) y reconfigurar el webhook.

### Etapa 5 — Mostrador y protección · ⬜ pendiente
- Registro de ventas del local (rápido de usar), descontando stock.
- Captcha invisible (Cloudflare Turnstile), 1 pedido pendiente por email/teléfono/IP,
  bloqueo de emails/teléfonos.
- Configuración: descuentos, activar/desactivar WhatsApp.

### Etapa 6 — Marca y lanzamiento · ⬜ pendiente
- Aplicar logo y colores; páginas Nosotros y Contacto.
- Carga del catálogo real.
- ✅ Dominio propio `magosdelsur.com.ar` (2026-10-21): comprado en nic.ar y delegado a
  Vercel DNS. Resend verificado; emails desde `contacto@magosdelsur.com.ar` (casilla en
  Google Workspace, también recibe los avisos de pedidos).
- Revisión final.

## Después del lanzamiento
- Envíos a todo el país (cuando se elija la empresa de correo).
- Eventos (próximos arriba, pasados abajo).
- Importar/exportar catálogo en Excel. (Si conviene para la carga inicial de los ~100
  productos, se puede adelantar a la etapa 6.)
- Alertas de stock bajo, estadísticas, listado de clientes.
- Ideas a futuro: cuotas, cupones, cuentas de cliente, lista de deseos, newsletter,
  preventa / aviso de stock, lector de código de barras.
