# Reseñas reales de Google Maps

La vista previa contiene una **captura estática de dos comentarios ya comprobados en la ficha del estudio**. Los enlaces abren la ficha real. No es todavía una conexión automática: faltan las credenciales del servidor. No se inventó una tercera reseña.

## Conexión preparada

`reviews.js` consulta `/api/google-reviews` al cargar y vuelve a consultar cada cinco minutos mientras la pestaña está visible. Al volver a la pestaña, revalida si pasaron cinco minutos desde el último intento. El resultado reemplaza las tarjetas y el promedio; no se filtran opiniones por puntuación ni se cambia su orden.

La función `api/google-reviews.js` prioriza **Google Business Profile API**, que permite pedir reseñas ordenadas por actualización reciente. Como alternativa, admite **Places API (New)**, cuyo resultado está ordenado por relevancia. Credenciales y tokens se usan en el servidor y nunca se incluyen en el HTML, `config.js` o la respuesta. El endpoint sirve exclusivamente la ficha configurada y no acepta un lugar arbitrario como parámetro.

No se usa scraping, almacenamiento local, base de datos ni caché persistente del contenido de Google. Las respuestas HTTP y solicitudes usan `no-store`. Si la API no está disponible, la página conserva las tarjetas que ya tenía; no finge una sincronización. El atributo `data-reviews-status` permite comprobar el estado sin mostrar avisos técnicos a visitantes.

## Activar reseñas recientes con Google Business Profile (preferido)

Este modo requiere acceso aprobado a las APIs de Business Profile y autorización OAuth de una cuenta propietaria o administradora de la ficha verificada. La autorización debe permitir `https://www.googleapis.com/auth/business.manage`. El código **no conecta automáticamente la cuenta ni inicia una autorización**; tampoco crea credenciales o concede permisos.

Una vez obtenida esa autorización, configurar en el servidor de Vercel:

- `GOOGLE_BUSINESS_LOCATION_NAME`: recurso real con formato `accounts/ID_CUENTA/locations/ID_UBICACION`.
- `GOOGLE_CLIENT_ID`: identificador OAuth del proyecto aprobado.
- `GOOGLE_CLIENT_SECRET`: secreto OAuth, solamente en el servidor.
- `GOOGLE_REFRESH_TOKEN`: token de actualización emitido durante la autorización de la cuenta.
- `GOOGLE_MAPS_URL` (opcional): enlace verificado a la ficha. El valor predeterminado es el enlace que facilitó el usuario: `https://share.google/bdxVpSeGXEgWI7CLY`.

La función renueva el token de acceso y pide seis opiniones con `orderBy=updateTime desc`. No selecciona sólo las positivas. Al publicar una opinión y hacerla visible Google, podrá entrar entre las seis más recientemente actualizadas en la siguiente consulta. La moderación de Google y su tiempo de propagación pueden demorar esa aparición; no se promete una actualización instantánea. Una edición de una reseña anterior también puede volver a colocarla entre las primeras.

Business Profile no devuelve enlaces públicos individuales al comentario ni al perfil del autor. No se fabrican a partir de los identificadores privados: cada tarjeta abre la ficha real. Se conservan nombre, foto cuando existe, estrellas, comentario y fechas. La cantidad total no se muestra ni se devuelve al navegador.

Cuando la configuración de Business Profile está completa, tiene prioridad sobre Places. Si está incompleta o falla OAuth, la ruta informa un error y conserva las tarjetas; no cambia silenciosamente a una selección por relevancia. Si sólo se configuró Places, se usa el modo descrito debajo.

## Alternativa: activar Places en Vercel

1. Obtener el Place ID real y verificar que corresponda al estudio en Arturo M. Bas 54, Córdoba. El enlace corto de Google no reemplaza al Place ID.
2. Habilitar Places API (New) en un proyecto propio de Google Cloud con facturación y restricciones adecuadas para una clave de servidor.
3. Configurar estas variables de entorno en el proyecto de Vercel:
   - `GOOGLE_PLACES_API_KEY`: clave privada del servidor.
   - `GOOGLE_PLACE_ID`: identificador de la ficha, sin el prefijo `places/`.
4. Volver a desplegar para que la función reciba las variables.

**La alternativa Places puede tener costo.** Pedir `reviews` utiliza la categoría de facturación de Place Details Enterprise + Atmosphere. Cada visita y cada revalidación visible pueden producir una solicitud. El código no habilita facturación, crea cuentas ni modifica cuotas. Hay que revisar precios y configurar cuotas y alertas antes de activarlo públicamente.

El servidor estático local de la vista previa sólo entrega HTML y archivos: no ejecuta funciones de Vercel. Para comprobar la conexión se necesita una ejecución de Vercel con las variables configuradas (o un servidor local compatible con esas funciones). Un `404` o `503` en la vista previa no modifica las reseñas de respaldo.

## Qué se actualiza y límites

Con Business Profile se muestran las seis opiniones más recientemente actualizadas que devuelve Google. Con Places se reciben **hasta cinco reseñas seleccionadas por relevancia**: no necesariamente todas ni las más nuevas. En ese modo alternativo una nueva opinión **puede no aparecer** entre las tarjetas, aunque se actualice el promedio. La nota debajo de las tarjetas corresponde al orden devuelto (`ordering: "newest"` o `"relevance"`).

Cada tarjeta conserva el autor, su foto y el enlace a su perfil cuando Google los proporciona, las estrellas reales y el enlace individual o a la ficha según disponibilidad. Se usa el texto original cuando existe. La atribución de Google Maps, los proveedores devueltos y la aclaración de orden se muestran junto a las tarjetas. No se muestra la cantidad total de opiniones ni se preselecciona una puntuación al abrir el formulario de Google.

Antes de publicar con la integración activa, el sitio debe tener términos de uso y privacidad adecuados a las condiciones de Google Maps Platform. La atribución debe mantenerse visible y legible.

## Contrato HTML y estilos

- Cargar `reviews.js` con `defer` después de `config.js` y `app.js`.
- El contenedor `#google-reviews-list` incluye inicialmente las tarjetas estáticas. El script reemplaza sus hijos cuando recibe una respuesta válida.
- Los valores de promedio usan `[data-contact-text="rating"]`.
- Se actualizan las estrellas de `.hero-rating .rating-stars` y `.rating-badge .rating-stars`, incluyendo fracciones.
- Los enlaces `[data-contact="google"]` pasan a las reseñas de la ficha y `[data-contact="review"]` al formulario de reseña cuando Google entrega ese enlace.
- Cada tarjeta generada tiene `.review-card`, `.review-card-heading`, `.review-author`, `.review-avatar`, `.review-author-name`, `.review-google-mark`, `.review-stars`, `.review-text`, `.review-date` y `.review-source`.
- Se añade `#google-reviews-attributions.google-reviews-attributions` inmediatamente después del listado: contiene `.google-maps-attribution`, `.google-reviews-note` y, cuando corresponda, `.google-reviews-provider`.
- Puede configurarse otro endpoint propio mediante `window.ESTUDIO.google.endpoint`. La ruta predeterminada es `/api/google-reviews`.

## Comprobación sin red

```powershell
node --test tests/google-reviews.test.cjs
```

Las pruebas sustituyen `fetch`; no hacen solicitudes reales ni consumen cuota de Google.

## Documentación oficial consultada

- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details): solicitud, máscara de campos y categoría de facturación.
- [Place y Review](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places): límite de cinco opiniones ordenadas por relevancia.
- [Enlaces de Google Maps](https://developers.google.com/maps/documentation/places/web-service/maps-links): perfil, opiniones y formulario para escribir una reseña.
- [Políticas y atribuciones](https://developers.google.com/maps/documentation/places/web-service/policies): atribución, acceso al original, términos y restricciones de almacenamiento.
- [Uso y facturación](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing): activación de facturación y cobro por uso.
- [Business Profile: listado de reseñas](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list): `pageSize`, `orderBy=updateTime desc` y ubicación verificada.
- [Business Profile: datos de la reseña](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews): autor, puntuación y fechas.
- [Requisitos de Business Profile](https://developers.google.com/my-business/content/prereqs): solicitud de acceso al proyecto y APIs.
- [OAuth del servidor](https://developers.google.com/identity/protocols/oauth2/web-server): renovación de tokens de acceso.
