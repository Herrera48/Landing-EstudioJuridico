/*
 * Datos de contacto centralizados.
 * Modificá solo este archivo para actualizar teléfonos, emails, enlaces o
 * los contactos personales de cada socio. El HTML trae los mismos valores
 * como respaldo por si JavaScript no carga.
 */
window.ESTUDIO = {
  nombre: "Estudio Jurídico Bonzani Rinaldi & Asociados",

  telefono: null,
  // Número en formato internacional, sin "+" ni espacios (para wa.me).
  whatsapp: null,
  email: null,

  direccion: {
    linea1: "Arturo M. Bas 54, PB, oficina 6",
    linea2: "Córdoba Capital · Córdoba · Argentina"
  },
  horario: { dias: "Lunes a viernes", horas: "9:00 a 18:00 h · Con cita previa" },

  google: {
    // Puntuación verificada en la ficha. No se muestra la cantidad de reseñas.
    puntuacion: "5,0",
    ficha: "https://share.google/bdxVpSeGXEgWI7CLY",
    // Enlace directo para escribir una reseña (g.page/r/.../review).
    // Dejar en null hasta tener uno verificado: mientras tanto se usa la ficha.
    escribirResena: null,
    endpoint: "/api/google-reviews"
  },

  /*
   * Contactos personales de los socios.
   * Completar SOLO con datos reales confirmados por cada profesional.
   * Mientras estén en null, los botones quedan visibles y desactivados.
   * LinkedIn debe contener la URL https del perfil confirmado.
   */
  socios: {
    bonzani: { nombre: "Dr. Germán D. Bonzani", whatsapp: null, email: null, linkedin: null },
    rinaldi: { nombre: "Dr. Diego D. Rinaldi Bueno", whatsapp: null, email: null, linkedin: null }
  }
};
