# Bonzani Rinaldi — revisión visual

Landing de una sola página en HTML, CSS y JavaScript. Carpeta local de trabajo `landing-v2`, basada en la rama `claude/zen-fermi-xcv968`. La primera versión está conservada en la carpeta hermana `landing`. El sitio continúa en revisión, sin despliegue público.

## Cambios de esta revisión

- Portada centrada con los dos apellidos en idéntico estilo, sin leyendas adicionales. Dirección, consulta y Google con más presencia.
- Foto elegida entre las cuatro suministradas por el usuario: `Palacio-de-Justicia-e1769450184506.jpg`, copiada sin alteración como `assets/img/palacio-justicia.jpg`. No se atribuye una licencia externa no verificada. Las imágenes anteriores ya no se usan en la portada.
- Se conserva el monograma BR y el encabezado; nueva tipografía más simple fuera de las áreas y contacto.
- Áreas de práctica rediseñadas como cuatro tarjetas iguales, con iconos, títulos en dos líneas y acción al pie; dos columnas en tablet y una en celular. Contacto conserva la composición, con teléfono/email eliminados y sin la leyenda anterior.
- Carrusel de clientes con título limpio y sin botón de pausa. Movimiento continuo con pausa al pasar el mouse o enfocar; con movimiento reducido se presenta la lista fija. Los nombres vienen de la web anterior; faltan los logos autorizados.
- Socios al mismo nivel: retratos pendientes representados por siluetas neutras; nombre, Socio, Abogado · UNC, LinkedIn, WhatsApp y Email. Sin frases, especialidades ni botones de consulta por profesional.
- Los tres botones personales se ven desactivados hasta cargar datos confirmados en `config.js`. No abren contactos inventados.
- Testimonios inspirados en la referencia Mogliani: título superpuesto, barra de puntuación, botón azul y tarjetas suaves con atribución de Google. Se mantienen dos extractos verificados como respaldo, sin cantidad de opiniones.

## Reseñas automáticas

Ver `REVIEWS.md`. La conexión está implementada pero **todavía no está activada**: falta autorizar la cuenta del Perfil de Empresa y configurar sus credenciales. Con Google Business Profile se solicitan las seis opiniones con actualizaciones más recientes y el promedio. Alternativa opcional: Places API entrega hasta cinco opiniones por relevancia y puede tener costo.

`reviews.js` actualiza el contenido al cargar y cada cinco minutos visibles. `api/google-reviews.js` mantiene las credenciales en el servidor. Si no se puede conectar se conserva el contenido existente; no se muestra un aviso de sincronización falso. La ficha sola o su enlace compartido no da acceso automático a las reseñas.

## Datos editables

`config.js`: contacto general, dirección, horarios, enlaces Google y datos personales de cada socio. Los valores HTML sirven de respaldo sin JavaScript; actualizar también estos respaldos y el JSON-LD si cambian datos del negocio.

## Formulario

Un modal para el botón principal, encabezado, contacto y áreas de práctica. Al consultar por un área queda seleccionada; al abrir una consulta general se selecciona Otra consulta. Los canales generales anteriores se retiraron porque el usuario confirmó que eran incorrectos: config.js contiene telefono, whatsapp y email en null, sin respaldos de esos datos ni metadatos. El modal sigue disponible como vista previa y sus botones de envío están desactivados hasta configurar canales válidos. El botón flotante muestra ese modal; no abre el número anterior.

## Vista previa y despliegue

Abrir `http://127.0.0.1:4174` mientras corre el servidor local de la carpeta superior. Ese servidor ejecuta también el endpoint de reseñas, que devuelve 503 cuando faltan credenciales.

En Vercel: raíz de proyecto esta carpeta, preset Other, sin build. Las funciones de `api/` se ejecutan en el servidor. `vercel.json` incluido. Revisar el plan elegido: Hobby está limitado a uso personal no comercial, según https://vercel.com/docs/plans/hobby . No se eligió ni activó un servicio de pago.

## Verificación

- Navegador: escritorio de 1440 px y celular de 375 px. Se comprobó imagen, título idéntico, socios alineados, tarjetas y ausencia de desborde horizontal; menú y modal; selección de área y validación sin enviar consultas reales.
- Pruebas del endpoint y renderizado de Google, con fetch simulado: `node --test tests/google-reviews.test.cjs`.
- JavaScript y diff comprobados. No se hizo ninguna consulta real a APIs de reseñas ni se enviaron mensajes.

## Fuentes y pendientes

Datos del estudio y extractos: https://estudiobonzanirinaldi.online/ y https://share.google/bdxVpSeGXEgWI7CLY , comprobados en la primera revisión. El texto del nombre comercial en metadatos/JSON-LD conserva la denominación de la ficha; el título visible de portada es únicamente Bonzani Rinaldi.

Pendientes: fotografías reales de socios, sus contactos personales y perfiles LinkedIn, logos de clientes, confirmación final de áreas y datos del negocio, conexión de reseñas con la cuenta administradora y elección de hosting.

Recursos: Newsreader e Instrument Sans (SIL OFL, licencias en assets/fonts); Lucide (ISC). La portada actual fue proporcionada por el usuario.

## Ajuste de portada, testimonios y movimiento

La foto de 1280 × 678 px se conserva sin reconstrucción generativa: se presenta como textura secundaria con una capa azul uniforme y monograma BR tenue. Para mejorar el detalle real hace falta un original de mayor resolución; la capa no recupera detalle perdido. El encabezado es claro, Google Reviews usa el símbolo de color y no muestra el conteo. WhatsApp tiene halo, sombra y hover, con destino pendiente.

motion.js y motion.css sustituyen el revelado anterior: entrada de 30 px con escala .985 y duración 780–860 ms, botones y contenido escalonados, reaparición después de salir del área visible, observación de reseñas añadidas y respeto de movimiento reducido. Sin JavaScript el contenido queda visible. Verificado en navegador a 1440 y 375 px; no hay desbordamiento horizontal ni enlaces a los canales retirados.

## Jerarquía de portada y nuevas áreas

El nombre usa Newsreader 500 con el mismo tamaño, color y peso en ambos apellidos, hasta 116.8 px en escritorio y dos líneas en celular. La dirección y el CTA mantienen presencia y el bloque Google es secundario. Las tarjetas de áreas son botones completos, con foco visible, elevación al hover y selección de motivo conservada. Se comprobó en 1440, 900 y 375 px, sin desbordes, y la consulta laboral abre con Derecho laboral seleccionado.
