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
- Sobres/packs de cartas de **Magic: The Gathering** y **Pokémon**.
- **Mazos.**
- Probablemente cada tipo tenga su propia sección en la web.
- **Sin variantes:** si un juego tiene otra versión (ej. otro idioma), se carga como un
  producto aparte y la diferencia se aclara en el título o la descripción.

### Listado, búsqueda y filtros
- **Orden por defecto:** lo último que se cargó aparece primero.
- **Filtros:** editorial, categoría, cantidad de jugadores (mínimo/máximo) y edad.
- Búsqueda por texto: a confirmar (ver preguntas abiertas).

### Funcionalidades a futuro (no para el lanzamiento)
- Preventa y aviso de "avisame cuando haya stock" para productos agotados.

## Preguntas pendientes

**Catálogo (abiertas tras la ronda 2)**
6b. Confirmar estructura propuesta de dos niveles:
    - Secciones (menú principal): Juegos de mesa · Magic · Pokémon · Mazos.
    - Categorías dentro de Juegos de mesa (ejemplo): Estrategia, Familiares, Party,
      Cartas, Infantiles, Cooperativos. Cargables/editables desde el panel.
    ¿Qué categorías concretas usar?
6c. ¿"Mazos" son mazos armados de Magic/Pokémon, o mazos de cartas comunes (póker, etc.)?
7b. Filtro de jugadores: ¿sirve "¿para cuántos jugadores?" (ingresás un número y muestra
    los juegos donde entra)? ¿Edad como "hasta X años"?
7c. ¿Buscador por nombre en la cabecera?
7d. ¿Los productos agotados se muestran (como "Sin stock") o se ocultan?

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
