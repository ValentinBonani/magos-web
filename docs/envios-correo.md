# Envíos con Correo Argentino — API MiCorreo

Resumen de la documentación oficial "Correo Argentino - API MiCorreo" (versión del
2026-05-18, PDF que pasó el dueño; no se sube al repo). Ver requerimientos de envíos en
`docs/requerimientos.md`.

## Acceso
- Base test: `https://apitest.correoargentino.com.ar/micorreo/v1`
- Base producción: `https://api.correoargentino.com.ar/micorreo/v1`
- Credenciales (usuario/contraseña) **las da Correo Argentino, una por ambiente**.
- `POST /token` con HTTP Basic → JWT (`token`, `expires`). Resto: `Authorization: Bearer`.
- `customerId`: id de la cuenta MiCorreo del local (`POST /users/validate` con email y
  contraseña de MiCorreo, o `POST /register` para crearla con CUIT).

## Endpoints útiles
- `POST /rates/packages`: cotiza un pedido con varios productos (los "apila").
  Body: `customerId`, `postalCodeOrigin`, `postalCodeDestination`, `deliveredType`
  ("D" domicilio, "S" sucursal, null = ambos), `dimensions[]` con `quantity`, `weight`
  (g, 1–50000), `height`/`width`/`length` (cm, máx 200; suma de lados máx 300).
  Respuesta: `rates[]` con `deliveredType`, `productType` ("CP" Clásico, "EP" Expreso),
  `productName`, `price`, `deliveryTimeMin/Max` (días), y `validTo`.
  La cotización toma como origen la sucursal de la cuenta MiCorreo.
- `POST /rates`: igual pero un solo paquete.
- `GET /agencies?customerId&provinceCode`: sucursales de una provincia (código, nombre,
  dirección, horarios, `services.pickupAvailability`). Para elegir sucursal de destino.
- `POST /shipping/import`: carga el envío en MiCorreo (destinatario, dirección o
  sucursal `agency`, `productType`, peso, medidas, `declaredValue`, `extOrderId`).
  Después se imprime la etiqueta y se despacha desde MiCorreo.
- `GET /shipping/tracking` (body `shippingId`): eventos del seguimiento.

## Códigos de provincia
A Salta · B Buenos Aires · C CABA · D San Luis · E Entre Ríos · F La Rioja ·
G Santiago del Estero · H Chaco · J San Juan · K Catamarca · L La Pampa · M Mendoza ·
N Misiones · P Formosa · Q Neuquén · R Río Negro · S Santa Fe · T Tucumán · U Chubut ·
V Tierra del Fuego · W Corrientes · X Córdoba · Y Jujuy · Z Santa Cruz
