# Requerimientos — Magos del Sur (tienda online)

Documento vivo. Se va completando a medida que se definen los requerimientos.
Última actualización: 2026-10-16

## Resumen

Tienda online para vender juegos de mesa del local "Magos del Sur", con un panel de
administración para cargar juegos, stock y precios.

Referencia de diseño/funcionalidad: https://fungames.ar (hecha con Odoo; tiene Inicio,
Tienda, Eventos, Contacto, novedades, carrito, lista de deseos, cuentas de usuario,
envíos a todo el país con envío gratis local / desde cierto monto, promos de cuotas,
WhatsApp y redes, newsletter).

## Stack técnico (propuesto)

| Parte | Elección |
|---|---|
| Web + panel admin | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | PostgreSQL en Supabase (también auth del admin y storage de imágenes) |
| ORM | Drizzle |
| Pagos | Mercado Pago |
| Hosting | Vercel (deploy automático desde GitHub) |
| Emails transaccionales | Resend |

Repo: https://github.com/ValentinBonani/magos-web

## Requerimientos definidos

### Negocio
- **Nombre:** Magos del Sur.
- **Marca:** tiene logo y colores definidos.
  - **Logo recibido:** `assets/logo.jpg` (sombrero de mago + "MAGOS del sur", negro y
    violeta). El archivo está en **CMYK** (para imprenta): para la web hay que generar
    versiones RGB (PNG/SVG).
  - Versión web: `public/logo.png` (RGB, fondo transparente), generada desde el JPG.
  - **Colores (elegidos por el dueño: la versión fiel a imprenta, más apagada):**
    violeta **#835CA3** (C55 M68 Y0 K0), violeta claro **#A88CC0** (C33 M41 Y0 K4),
    negro **#1D1D1B**. Definidos en `src/app/globals.css`.
- **Dominio:** `magosdelsur.com.ar` (comprado en nic.ar, DNS en Vercel).
- **Email del local:** `contacto@magosdelsur.com.ar` (Google Workspace). Es el remitente
  de los emails de la tienda, recibe las respuestas de los clientes y los avisos de
  pedidos, y se muestra en Contacto y en el pie.
- **Ubicación del local:** Quilmes Centro, Provincia de Buenos Aires, Argentina.
- **Tamaño del catálogo:** ~100 juegos distintos por ahora.

### Stock
- **El stock es único y compartido entre el local físico y la web.** Una venta en el
  mostrador tiene que descontar stock de la web y viceversa.
  - Las ventas del local se registran desde el panel (ver Panel de administración).

### Ficha de producto
- **Obligatorios:** nombre, fotos (una o más), descripción, categoría, precio.
- **Opcionales:** jugadores mínimos, jugadores máximos, edad mínima, editorial.
- No hacen falta por ahora: duración, idioma, dificultad.
- **Sin precio de oferta:** hay un solo precio por producto; para ofertas se baja el
  precio desde el panel.

### Tipos de producto
- Juegos de mesa (lo principal).
- **Magic: The Gathering** y **Pokémon**: sobres/packs y mazos armados. Los mazos son
  siempre de Magic o Pokémon (no hay sección de mazos aparte).
- **Sin variantes:** si un juego tiene otra versión (ej. otro idioma), se carga como un
  producto aparte y la diferencia se aclara en el título o la descripción.

### Estructura del sitio
- **Menú principal:** Juegos de mesa · Magic · Pokémon · Eventos · Nosotros · Contacto.
- **Categorías:** cada sección de productos tiene categorías, que se crean y editan desde
  el panel. Propuesta inicial:
  - Juegos de mesa: Estrategia, Familiares, Party, Cartas, Infantiles, Cooperativos
    (a confirmar).
  - Magic y Pokémon: Sobres, Mazos (propuesta).
- **Nosotros** y **Contacto**: páginas institucionales (contenido a definir).

### Eventos
- Sección para anunciar los eventos del local (torneos, noches de juego,
  presentaciones). Se cargan y editan desde el panel.
- **Datos:** título, descripción, fecha y hora (obligatorios); imagen (opcional).
- **Sin inscripción desde la web:** si hace falta, se maneja por mensajería.
- **Orden:** arriba los próximos eventos; más abajo una sección de eventos pasados.

### Listado, búsqueda y filtros
- **Orden por defecto:** lo último que se cargó aparece primero.
- **Agotados:** se muestran igual, pero siempre **después** de todos los productos con
  stock, con una distinción visible: un banner "Agotado" sobre la imagen.
- **Filtros:** editorial, categoría, edad y jugadores.
  - **Jugadores:** "¿Para cuántos jugadores?" → se ingresa un número N y se muestran los
    juegos con mínimo ≤ N ≤ máximo.
  - **Edad:** "para X años o más" → juegos cuya edad mínima es ≤ X.
- **Buscador por nombre** en la cabecera, con **sugerencias en vivo** (autocompletado)
  a partir de los 3 caracteres escritos.

### Compra y pagos
- **Compra como invitado** (sin cuenta): el cliente deja nombre, email, teléfono y
  dirección (la dirección solo si hay envío).
- **Medios de pago (3):**
  - **Mercado Pago:** pago al instante; el pedido queda pagado automáticamente.
  - **Transferencia bancaria:** el pedido queda **pendiente** hasta que el cliente pase
    el comprobante y el admin lo confirme.
  - **Efectivo:** el pedido queda **pendiente** hasta que se retira y paga en el local.
- **Efectivo solo con retiro en el local** (no contra entrega).
- **Descuentos por medio de pago**, configurables desde el panel:
  - Transferencia: **10%** (valor inicial).
  - Efectivo: **15%** (valor inicial).
  - Se aplican solo sobre el total de productos, **no sobre el envío**.
- **Reserva de stock — transferencia:** el pedido pendiente **reserva** el stock por
  **2 hs**. Si en ese plazo el cliente no subió el comprobante, el pedido vence
  automáticamente y el stock se libera.
  - Si el cliente subió el comprobante, el pedido **no vence**; queda reservado
    esperando la revisión del admin.
- **Reserva de stock — efectivo (retiro en el local):** el pedido **NO reserva** stock
  al crearse.
  - El cliente recibe un email avisando que tiene que **contactarse por WhatsApp** para
    confirmar; si no lo hace, el producto no queda reservado y se puede vender antes.
  - Cuando el cliente se contacta y el admin **confirma el pedido** desde el panel, el
    stock se reserva y el pedido **ya no vence**.
  - Si el cliente nunca confirma, el pedido se **cancela solo a las 48 hs**.
  - Si al confirmar ya no hay stock (ej. se vendió en el mostrador), el panel avisa al
    admin y el pedido se cancela, con email al cliente.
  - El WhatsApp es el mismo número que el teléfono de contacto del local.

### Protección contra pedidos falsos (bloqueo de stock)
Riesgo detectado por el dueño: alguien malintencionado podría hacer pedidos falsos para
dejar todos los productos reservados (sin stock). Los pedidos en efectivo no reservan,
así que el riesgo está en **transferencia** (y, unos minutos, en Mercado Pago mientras
el cliente paga). Medidas:
1. **Reserva corta por transferencia:** 2 hs sin comprobante (ver Compra y pagos).
2. **Captcha invisible** en el checkout (Cloudflare Turnstile).
3. **1 solo pedido pendiente a la vez** por email / teléfono / IP.
4. **Máximo 6 unidades en total por carrito** (sumando todos los productos, ej. 3 + 2
   + 1). Al llegar a 6 no deja agregar más.
5. **Panel:** cancelar pedido y liberar stock al instante; bloquear email/teléfono.
6. **Mercado Pago:** reservar el stock solo mientras dura el pago (~15–30 min).

### Panel de administración
- **Usuarios:** admins valentin.bonani@gmail.com y sofia@magos.com (2026-10-17). Todos
  con acceso completo, sin roles ni permisos distintos. Se agregan creando el usuario en
  Supabase y corriendo `scripts/make-admin.mjs <email>`.
- **Productos:** alta/edición/baja con fotos, stock, precio y demás campos de la ficha.
  Categorías editables.
- **Pedidos:** ver comprobantes, confirmar pagos, confirmar pedidos en efectivo, marcar
  como preparado/enviado/entregado, cancelar (libera stock), bloquear email/teléfono.
- **Configuración:** porcentajes de descuento por medio de pago.
- **Importar/exportar el catálogo en Excel** para editar productos y precios en masa
  (las fotos se cargan desde el panel, no por Excel).
- **Registro de ventas del local (mostrador):** se carga qué se vendió, medio de pago y
  monto; descuenta stock y queda en el historial junto con las ventas online. El local
  todavía no abrió y **no tiene otro sistema de ventas: esta web va a ser su único
  registro de ventas**, así que tiene que ser rápido de usar en el mostrador.
  - Medios de pago en el mostrador: **efectivo, transferencia y tarjeta** (posnet a
    definir, probablemente del Banco Provincia).
  - **Mismos descuentos que online:** 15% efectivo, 10% transferencia, tarjeta sin
    descuento.
- **Notificación de pedidos nuevos al admin:** por **email** y visibles en el panel.
  (Sin WhatsApp automático.)
- **Para el final del desarrollo (no prioritarias):**
  - Alerta de stock bajo (1 unidad o menos).
  - Estadísticas (ventas del día/mes, más vendidos).
  - Listado de clientes.

### Notificaciones al cliente (definidas hasta ahora)
- Confirmación de pedido (con número, link único y, si es transferencia, datos
  bancarios).
- Recordatorio de comprobante de transferencia (a la hora de hecho el pedido).
- Efectivo: aviso de que tiene que contactarse por WhatsApp para reservar.
- Cancelación de pedido (vencido o sin stock).
- **"Tu pedido está listo para retirar"** para pedidos pagados con retiro en el local,
  cuando el admin lo marca como preparado.
- **Comprobante de transferencia:** el cliente lo **sube en la web**, en la página de su
  pedido. Para que pueda volver aunque cierre la web:
  - Email de confirmación con el número de pedido, los datos bancarios y un **link
    único al pedido** para subir el comprobante.
  - Página "Mi pedido" para buscarlo con número de pedido + email.
  - Email de recordatorio **a la hora** si todavía no subió el comprobante (la reserva
    dura 2 hs). Los pedidos en efectivo no llevan recordatorio.
  - Alternativa: botón de WhatsApp en la página del pedido.
- **Datos bancarios (PROVISORIOS):** alias `valentin.bonani`, titular Valentin Bonani,
  Banco Galicia. Están en `src/lib/site.ts`.
- **Sin cuotas sin interés** en el lanzamiento.
- **Mercado Pago (Etapa 4):** Checkout Pro, sin descuento. Reserva de stock de 30 min
  mientras el cliente paga (el link de pago vence a la vez). Solo medios que acreditan al
  instante (tarjetas y dinero en cuenta; sin Rapipago/Pago Fácil). Si el pago llega
  tarde y ya no hay stock, se devuelve automáticamente.
  - **Titular de los cobros:** cuenta de Mercado Pago a nombre de la hermana del dueño
    (a crear). Las pruebas se hacen con una aplicación en la cuenta personal del dueño.
  - **Cuotas con interés a cargo del comprador:** sí, hasta 12 (definido 2026-10-18).
    No activar "cuotas sin interés" en la cuenta de Mercado Pago (las paga el vendedor).
- **Sin cupones de descuento** en el lanzamiento.

### Envíos y retiro
- **Retiro en el local:** se muestra dirección, horarios y teléfono de contacto.
- **Envíos por correo a todo el país:** sí. **Empresa y forma de cobro a definir en una
  etapa próxima** (fijo / por zonas / calculado / gratis desde monto).
- **Sin envío propio** (moto/cadete): todo va por la empresa de correo que se elija.

### Comunicación y redes
- **Botón flotante de WhatsApp** en toda la web. El dueño puede querer sacarlo después
  → que se pueda activar/desactivar desde el panel.
- **Redes:** solo Instagram (usuario a definir). Link en la cabecera o el pie.

### Funcionalidades a futuro (no para el lanzamiento)
- Lector de código de barras en el mostrador (campo "código de barras" en el producto).
- Lista de deseos (requiere cuentas de cliente).
- Newsletter.

### Fuera de alcance (por ahora)
- Reseñas/valoraciones de clientes.
- Facturación electrónica (ARCA): el dueño factura a mano al final del día.
- Preventa y aviso de "avisame cuando haya stock" para productos agotados.
- **Cuotas sin interés** (el dueño tiene que averiguar costos/condiciones en Mercado Pago).
- Cupones de descuento.
- Cuentas de cliente (historial de pedidos, etc.).

## Preguntas pendientes

**Catálogo y páginas**
6d. Lista definitiva de categorías (se puede ajustar después desde el panel).
6e. Contenido de Nosotros (texto, fotos del local) y Contacto (dirección, horarios,
    mapa, teléfono/WhatsApp, ¿formulario de contacto?).

**Envíos**
15b. Empresa de correo y forma de cobrar el envío (etapa próxima).

**Comunicación**
22b. Usuario de Instagram y número de WhatsApp/teléfono (junto con logo y colores).

## Prioridades y alcance

- **Sin fecha objetivo** por ahora.
- **Primera versión (lanzamiento):**
  - Catálogo con buscador y filtros.
  - Carrito y checkout como invitado con los 3 medios de pago.
  - Retiro en el local.
  - Panel con productos, pedidos y ventas del mostrador.
- **Después del lanzamiento:** envíos (cuando se elija la empresa), eventos, Excel,
  alertas de stock, estadísticas, listado de clientes y lo que figura "a futuro".
- Plan de implementación por etapas: `docs/plan.md`.

## Material que tiene que pasar el dueño
- Logo y colores de la marca.
- Lista de categorías de juegos de mesa (6d).
- Textos/fotos para Nosotros; dirección, horarios y teléfono/WhatsApp para Contacto
  y retiro (6e).
- Datos reales (hoy hay provisorios en `src/lib/site.ts`): WhatsApp, Instagram,
  dirección, horarios y datos bancarios.
