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

### Funcionalidades a futuro (no para el lanzamiento)
- Preventa y aviso de "avisame cuando haya stock" para productos agotados.

## Preguntas pendientes

**Catálogo y páginas**
6d. Lista definitiva de categorías (se puede ajustar después desde el panel).
6e. Contenido de Nosotros (texto, fotos del local) y Contacto (dirección, horarios,
    mapa, teléfono/WhatsApp, ¿formulario de contacto?).

**Compra y pagos**
10. Medios de cobro (Mercado Pago, transferencia con descuento, efectivo al retirar).
11. ¿Cuotas sin interés?
12. ¿Compra como invitado o cuenta obligatoria?
13. ¿Cupones de descuento?

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
