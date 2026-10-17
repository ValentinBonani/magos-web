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

### Etapa 2 — Tienda pública · ⬜ pendiente
- Layout general: cabecera con menú y buscador, pie, botón de WhatsApp.
- Inicio, listados por sección (Juegos de mesa, Magic, Pokémon) y ficha de producto.
- Orden por último cargado; agotados al final con banner "Agotado".
- Filtros: categoría, editorial, "¿para cuántos jugadores?", edad.
- Buscador con sugerencias desde 3 caracteres.

### Etapa 3 — Carrito, checkout y pedidos · ⬜ pendiente
- Carrito con límite de 6 unidades.
- Checkout como invitado, retiro en el local.
- Pago por transferencia (reserva 2 hs, subida de comprobante, link único, "Mi pedido")
  y efectivo (sin reserva hasta confirmar por WhatsApp, vence a las 48 hs).
- Descuentos por medio de pago (configurables).
- Tareas automáticas: vencimientos y recordatorio de comprobante.
- Emails al cliente y al admin (Resend).
- Panel de pedidos: ver comprobantes, confirmar, preparar, entregar, cancelar.
- **El dueño crea cuenta:** Resend.

### Etapa 4 — Mercado Pago · ⬜ pendiente
- Checkout de Mercado Pago con reserva de stock mientras dura el pago.
- Confirmación automática del pedido al acreditarse el pago.
- **El dueño necesita:** cuenta de Mercado Pago del negocio (credenciales).

### Etapa 5 — Mostrador y protección · ⬜ pendiente
- Registro de ventas del local (rápido de usar), descontando stock.
- Captcha invisible (Cloudflare Turnstile), 1 pedido pendiente por email/teléfono/IP,
  bloqueo de emails/teléfonos.
- Configuración: descuentos, activar/desactivar WhatsApp.

### Etapa 6 — Marca y lanzamiento · ⬜ pendiente
- Aplicar logo y colores; páginas Nosotros y Contacto.
- Carga del catálogo real.
- Dominio propio (`magosdelsur.com.ar` o similar) y revisión final.

## Después del lanzamiento
- Envíos a todo el país (cuando se elija la empresa de correo).
- Eventos (próximos arriba, pasados abajo).
- Importar/exportar catálogo en Excel. (Si conviene para la carga inicial de los ~100
  productos, se puede adelantar a la etapa 6.)
- Alertas de stock bajo, estadísticas, listado de clientes.
- Ideas a futuro: cuotas, cupones, cuentas de cliente, lista de deseos, newsletter,
  preventa / aviso de stock, lector de código de barras.
