const Comprobantes = (() => {
  const IMGBB_API_KEY = '37088f51365d5b97590c2489de2d9844';

  const ENDPOINT = 'https://api.imgbb.com/1/upload';
  const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_MB = 5;
  const TIMEOUT_MS = 20000;

  function validar(archivo) {
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new Error('El comprobante debe ser una imagen JPG, PNG, WEBP o GIF.');
    }
    if (archivo.size > MAX_MB * 1024 * 1024) {
      throw new Error(`La imagen supera el máximo de ${MAX_MB} MB.`);
    }
    if (!IMGBB_API_KEY || IMGBB_API_KEY.startsWith('PEGA')) {
      throw new Error('Falta configurar la API key de ImgBB en js/comprobantes.js.');
    }
  }

  // Devuelve la URL pública de la imagen o lanza un Error.
  async function subir(archivo) {
    validar(archivo);

    const formData = new FormData();
    formData.append('image', archivo);

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
      const respuesta = await fetch(`${ENDPOINT}?key=${encodeURIComponent(IMGBB_API_KEY)}`, {
        method: 'POST',
        body: formData,
        signal: controlador.signal
      });

      if (!respuesta.ok) {
        throw new Error(`La API rechazó la imagen (HTTP ${respuesta.status}).`);
      }

      const json = await respuesta.json();
      if (!json.success || !json.data || !json.data.url) {
        throw new Error('La API respondió algo inesperado.');
      }
      return json.data.url;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('La subida tardó demasiado y se canceló.');
      }
      if (err instanceof TypeError) {
        throw new Error('No hay conexión con el servicio de imágenes.');
      }
      throw err;
    } finally {
      clearTimeout(temporizador);
    }
  }

  return { subir };
})();