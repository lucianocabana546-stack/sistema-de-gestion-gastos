const Nube = (() => {
  const SUPABASE_URL = 'https://wfdruymdxonapsaesmag.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_veQFvn1vZRhCBMp5xxQ5Jg_iQz28bQA';
  const BUCKET = 'backups';

  let clienteSupabase = null;

  function cliente() {
    if (clienteSupabase) return clienteSupabase;
    if (typeof supabase === 'undefined') {
      throw new Error('No se cargó la librería de Supabase. Revisá el <script> de supabase-js.');
    }
    if (SUPABASE_URL.startsWith('PEGA') || SUPABASE_KEY.startsWith('PEGA')) {
      throw new Error('Falta configurar SUPABASE_URL y SUPABASE_KEY en js/sync.js.');
    }
    clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return clienteSupabase;
  }


  function registrar({ email, password, nombre, apellido, nacimiento }) {
    return cliente().auth.signUp({
      email,
      password,
      options: { data: { nombre, apellido, nacimiento } }
    });
  }

  function iniciarSesion(email, password) {
    return cliente().auth.signInWithPassword({ email, password });
  }

  async function cerrarSesion() {
    try {
      await cliente().auth.signOut();
    } catch (err) {
      console.error('No se pudo cerrar la sesión en el servidor:', err);
    }
  }

  async function usuarioActual() {
    const { data } = await cliente().auth.getSession();
    return data.session ? data.session.user : null;
  }


  function rutaRespaldo(idUsuario) {
    return `${idUsuario}/sgg.sqlite`;
  }

  async function subirRespaldo(idUsuario, bytes) {
    const archivo = new Blob([bytes], { type: 'application/octet-stream' });
    const { error } = await cliente()
      .storage.from(BUCKET)
      .upload(rutaRespaldo(idUsuario), archivo, { upsert: true, contentType: 'application/octet-stream' });
    if (error) throw new Error(error.message);
  }

  async function descargarRespaldo(idUsuario) {
    const { data, error } = await cliente().storage.from(BUCKET).download(rutaRespaldo(idUsuario));
    if (error) {
      if (/not found/i.test(error.message || '')) return null;
      throw new Error(error.message);
    }
    return new Uint8Array(await data.arrayBuffer());
  }

  return { registrar, iniciarSesion, cerrarSesion, usuarioActual, subirRespaldo, descargarRespaldo };
})();