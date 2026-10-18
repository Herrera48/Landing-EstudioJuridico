# Landing · Estudio Jurídico Bonzani Rinaldi & Asociados (v2)

Página única estática (HTML + CSS + JavaScript, sin frameworks ni dependencias). Se puede publicar tal cual en cualquier hosting estático.

**Estado: borrador para revisar. No está publicado.**

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura, contenido y SEO básico (meta, Open Graph, JSON-LD `LegalService`). |
| `styles.css` | Diseño: colores, tipografía, layout, botones, movimiento. |
| `app.js` | Menú, encabezado, sección activa, aparición al scroll, carrusel, formulario/modal. |
| `config.js` | **Datos de contacto centralizados** (teléfono, WhatsApp, email, Google, contactos de los socios). |
| `favicon.svg` | Monograma BR. |
| `assets/fonts/` | Newsreader e Instrument Sans (woff2, solo latín, autoalojadas) + licencias OFL. |

## Cómo actualizar datos

- **Contacto general**: editar `config.js`. El HTML trae los mismos valores como respaldo si JavaScript no carga; si cambia un dato, conviene actualizarlo también en `index.html` (buscar el valor viejo) y en el JSON-LD del `<head>`.
- **Contacto personal de los socios**: completar `socios.bonzani` / `socios.rinaldi` en `config.js` con `whatsapp` (formato `549351...`, sin `+`) y/o `email`. Al haber datos, el perfil muestra los botones de WhatsApp y Email personales. Mientras estén en `null`, se muestra “Consultar por …”, que abre el formulario indicando el profesional y avisa que la consulta la recibe el contacto general.
- **Reseña en Google**: si se consigue el enlace directo para escribir reseñas (`https://g.page/r/.../review`, desde el Perfil de Empresa), ponerlo en `google.escribirResena`. Mientras tanto el botón abre la ficha.
- **Clientes**: lista `<ul class="marquee-list">` en `index.html`. Para un logo autorizado, reemplazar el texto del `<li>` por `<img src="assets/clientes/archivo.svg" alt="Nombre" height="40">`.

## Formulario: cómo funciona

“Agendar cita”, “Quiero asesoramiento”, cada área de práctica y los botones de los socios abren el mismo modal. Al abrirlo desde un área, esa área queda seleccionada.

La página **no envía nada**: valida los datos y arma el mensaje. “Preparar mensaje en WhatsApp” abre WhatsApp con el texto escrito hacia el número del estudio; “Preparar email” abre el programa de correo. La persona revisa y envía. El modal lo explica y, después, aclara que el mensaje todavía no fue enviado y que el estudio confirmará día y horario. No hay reservas ni confirmaciones simuladas.

Accesibilidad del modal: `<dialog>` nativo, cierre con Escape, botón Cerrar o clic fuera; foco contenido con Tab/Shift+Tab; el foco vuelve al botón que lo abrió. Errores junto a cada campo (`aria-invalid` + `aria-describedby`). En celular se muestra como hoja inferior.

## Movimiento

Aparición progresiva de secciones (opacidad + 18 px), entrada escalonada de áreas, socios y reseñas, encabezado que pasa de transparente a sólido, subrayado de la sección activa, carrusel continuo de clientes (se pausa al pasar el mouse, al enfocar o con el botón Pausar).

- Con `prefers-reduced-motion` no hay desplazamientos ni carrusel animado (la lista queda estática).
- Si JavaScript no carga, todo el contenido queda visible (hay un respaldo a los 3 s).

## Fuentes y datos verificados

Datos tomados del proyecto v1 (que a su vez los tomó de la web actual https://estudiobonzanirinaldi.online/ y de la ficha de Google https://share.google/bdxVpSeGXEgWI7CLY): dirección, teléfono, WhatsApp, email, horario, nombres y descripción de los socios, nombres de clientes, puntuación 5,0 y las dos reseñas. No se agregaron datos nuevos ni cantidad de reseñas.

Recursos de terceros:

- Tipografías: [Newsreader](https://github.com/productiontype/Newsreader) e [Instrument Sans](https://github.com/Instrument/instrument-sans), SIL Open Font License 1.1 (vía Fontsource).
- Iconos: [Lucide](https://lucide.dev) (ISC). Logos de WhatsApp y Google: [Simple Icons](https://simpleicons.org) (CC0), usados solo para identificar esos servicios.

## Pendientes

1. **Foto de portada de Córdoba.** No se pudo descargar ni verificar una imagen en esta sesión (el entorno no tenía acceso a Wikimedia Commons, Unsplash, Pexels ni Flickr). La portada funciona sin foto (fondo azul profundo con el monograma). Para agregarla:
   - Elegir en Wikimedia Commons una foto de Córdoba, Argentina, horizontal y de buena resolución, con licencia CC0, dominio público, CC BY o CC BY-SA, y anotar autor, licencia y URL.
   - Ojo: Argentina no tiene “libertad de panorama”; para fotos de edificios modernos conviene preferir monumentos históricos (Catedral, Cabildo, Manzana Jesuítica, Paseo del Buen Pastor, Capuchinos) o vistas urbanas/paisaje.
   - Exportar a `assets/img/` en 1920 px y 960 px de ancho (WebP calidad ~78 + JPG de respaldo, idealmente < 300 KB).
   - Seguir las instrucciones del comentario dentro de `.hero-media` en `index.html`, agregar la clase `hero--foto` y completar el crédito (`.hero-credit` y footer). El punto focal para recorte móvil se ajusta con `style="--hero-focus: 60% 50%"` en la sección.
2. WhatsApp y email personales de cada socio (`config.js`).
3. Logotipos autorizados de los clientes.
4. Confirmación definitiva de las áreas de práctica con los socios.
5. Retratos de los socios (hoy hay placas con iniciales; no se inventaron retratos, matrículas ni antecedentes).
6. Enlace directo verificado para escribir reseñas en Google (opcional).

## Vista previa local

```
python -m http.server 8000
```

y abrir http://localhost:8000.
