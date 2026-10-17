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
- **Opcionales:** precio de oferta, jugadores mínimos, jugadores máximos, edad mínima,
  editorial.
- No hacen falta por ahora: duración, idioma, dificultad.

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
  - Propuesta: se aplican sobre el total de productos (no sobre el envío). A confirmar.
- **Reserva de stock:** los pedidos pendientes (transferencia/efectivo) **reservan** el
  stock. Si en **48 hs** el admin no confirmó el pago, el pedido vence automáticamente y
  el stock se libera.
- **Comprobante de transferencia:** el cliente lo **sube en la web**, en la página de su
  pedido. Para que pueda volver aunque cierre la web (propuesta, a confirmar):
  - Email de confirmación con el número de pedido, los datos bancarios y un **link
    único al pedido** para subir el comprobante.
  - Página "Mi pedido" para buscarlo con número de pedido + email.
  - Email de recordatorio a las ~24 hs si todavía no subió el comprobante.
  - Alternativa: botón de WhatsApp en la página del pedido.
- **Sin cuotas sin interés** en el lanzamiento.
- **Sin cupones de descuento** en el lanzamiento.

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

**Compra y pagos (abiertas tras la ronda 5)**
10f. Confirmar propuesta para volver al pedido (email con link único, "Mi pedido",
     recordatorio a las 24 hs).
10g. Si el cliente ya subió el comprobante pero el admin no lo revisó a tiempo, ¿el
     pedido igual vence a las 48 hs? (Propuesta: no vence; queda esperando revisión.)
10h. ¿Los descuentos por medio de pago se suman al precio de oferta, o no aplican a
     productos en oferta?

**Envíos**
14. ¿Retiro en el local?
15. Envíos por correo: empresa, costo fijo/calculado/gratis desde monto.
16. ¿Envío propio en la zona?

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
