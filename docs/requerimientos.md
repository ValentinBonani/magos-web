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
- **Marca:** tiene logo y colores definidos. **Pendiente:** el dueño va a pasar los archivos.
- **Dominio:** todavía no comprado. Probablemente `magosdelsur.com.ar` o similar.
- **Ubicación del local:** Quilmes Centro, Provincia de Buenos Aires, Argentina.
- **Tamaño del catálogo:** ~100 juegos distintos por ahora.

### Stock
- **El stock es único y compartido entre el local físico y la web.** Una venta en el
  mostrador tiene que descontar stock de la web y viceversa.
  - Implica que el panel admin necesita una forma rápida de registrar ventas del local
    (o ajustes de stock). A confirmar con la pregunta 20.

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
- **Menú principal:** Juegos de mesa · Magic · Pokémon · Nosotros · Contacto.
- **Categorías:** cada sección de productos tiene categorías, que se crean y editan desde
  el panel. Propuesta inicial:
  - Juegos de mesa: Estrategia, Familiares, Party, Cartas, Infantiles, Cooperativos
    (a confirmar).
  - Magic y Pokémon: Sobres, Mazos (propuesta).
- **Nosotros** y **Contacto**: páginas institucionales (contenido a definir).

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
- **Reserva de stock — transferencia:** el pedido pendiente **reserva** el stock. Si en
  **48 hs** el admin no confirmó el pago, el pedido vence automáticamente y el stock se
  libera.
  - **Excepción:** si el cliente ya subió el comprobante, el pedido **no vence**; queda
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
el cliente paga). Propuesta (a confirmar):
1. **Reserva corta por transferencia:** el stock se reserva ~2 hs al crear el pedido;
   si en ese plazo sube el comprobante, queda reservado hasta la revisión del admin; si
   no, se libera. (Reemplazaría las 48 hs.)
2. **Captcha invisible** en el checkout (Cloudflare Turnstile).
3. **Límites:** máximo 1–2 pedidos pendientes simultáneos por email / teléfono / IP, y
   máximo de unidades por producto por pedido (ej. 3).
4. **Panel:** cancelar pedido y liberar stock al instante; bloquear email/teléfono.
5. Mercado Pago: reservar el stock solo mientras dura el pago (~15–30 min).
- **Comprobante de transferencia:** el cliente lo **sube en la web**, en la página de su
  pedido. Para que pueda volver aunque cierre la web:
  - Email de confirmación con el número de pedido, los datos bancarios y un **link
    único al pedido** para subir el comprobante.
  - Página "Mi pedido" para buscarlo con número de pedido + email.
  - Email de recordatorio a las ~24 hs si todavía no subió el comprobante.
  - Alternativa: botón de WhatsApp en la página del pedido.
- **Sin cuotas sin interés** en el lanzamiento.
- **Sin cupones de descuento** en el lanzamiento.

### Envíos y retiro
- **Retiro en el local:** se muestra dirección, horarios y teléfono de contacto.
- **Envíos por correo a todo el país:** sí. **Empresa y forma de cobro a definir en una
  etapa próxima** (fijo / por zonas / calculado / gratis desde monto).
- **Sin envío propio** (moto/cadete): todo va por la empresa de correo que se elija.

### Funcionalidades a futuro (no para el lanzamiento)
- Preventa y aviso de "avisame cuando haya stock" para productos agotados.
- **Cuotas sin interés** (el dueño tiene que averiguar costos/condiciones en Mercado Pago).
- Cupones de descuento.
- Cuentas de cliente (historial de pedidos, etc.).

## Preguntas pendientes

**Catálogo y páginas**
6d. Lista definitiva de categorías (se puede ajustar después desde el panel).
6e. Contenido de Nosotros (texto, fotos del local) y Contacto (dirección, horarios,
    mapa, teléfono/WhatsApp, ¿formulario de contacto?).

**Retiro en el local / efectivo (abiertas tras la ronda 7)**
14d. Pedidos pagados (Mercado Pago o transferencia) con retiro en el local: ¿email
     "tu pedido está listo para retirar" cuando el admin lo prepara?
14f. Confirmar la propuesta de protección contra pedidos falsos (plazo de reserva por
     transferencia y límites).

**Envíos**
15b. Empresa de correo y forma de cobrar el envío (etapa próxima).

**Panel de administración**
17. Usuarios del panel y permisos.
18. Qué más gestionar (pedidos y estados, clientes, ventas, alertas de stock bajo).
19. ¿Actualización masiva de precios / importar desde Excel?
20. ¿Registrar ventas del local desde el panel? (ver sección Stock)

**Notificaciones y comunicación**
21. Emails al cliente y avisos de venta al dueño (email/WhatsApp).
22. Botón de WhatsApp, links a redes.

**Extras**
23. ¿Eventos / club / lista de deseos / newsletter?
24. ¿Reseñas de clientes?
25. ¿Facturación electrónica (ARCA) integrada?

**Prioridades**
26. Fecha objetivo y alcance mínimo para lanzar.
