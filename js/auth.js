(() => {
  const STORAGE_TEMA_KEY = 'tema_sgg';

  if (localStorage.getItem(STORAGE_TEMA_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  document.getElementById('btn-tema').addEventListener('click', () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_TEMA_KEY, esOscuro ? 'dark' : 'light');
  });

  // Si ya hay una sesión de Supabase activa, ir directo al dashboard.
  Nube.usuarioActual()
    .then((usuario) => {
      if (usuario) window.location.replace('dashboard.html');
    })
    .catch((err) => console.warn(err.message));

  const vistaLogin = document.getElementById('vista-login');
  const vistaRegistro = document.getElementById('vista-registro');
  const heroTitle = document.getElementById('hero-title');

  document.getElementById('ir-registro').addEventListener('click', () => {
    vistaLogin.hidden = true;
    heroTitle.hidden = true;
    vistaRegistro.hidden = false;
  });

  document.getElementById('ir-login').addEventListener('click', () => {
    vistaRegistro.hidden = true;
    vistaLogin.hidden = false;
    heroTitle.hidden = false;
  });

  document.getElementById('ir-recuperar').addEventListener('click', () => {
    alert('La recuperación de contraseña no está habilitada en esta versión del sistema.');
  });

  document.querySelectorAll('.toggle-pass').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  const regPassInput = document.getElementById('reg-pass');
  const reglas = {
    len: { el: document.getElementById('rule-len'), test: (v) => v.length >= 8 },
    upper: { el: document.getElementById('rule-upper'), test: (v) => /[A-Z]/.test(v) },
    lower: { el: document.getElementById('rule-lower'), test: (v) => /[a-z]/.test(v) },
    num: { el: document.getElementById('rule-num'), test: (v) => /\d/.test(v) },
    sym: { el: document.getElementById('rule-sym'), test: (v) => /[^A-Za-z0-9]/.test(v) }
  };

  regPassInput.addEventListener('input', () => {
    const val = regPassInput.value;
    Object.values(reglas).forEach((regla) => {
      const cumple = regla.test(val);
      regla.el.classList.toggle('valid', cumple);
      regla.el.querySelector('.rule-icon').textContent = cumple ? '✔' : 'ⓧ';
    });
  });

  function calcularEdad(fechaStr) {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    const mesActual = hoy.getMonth() + 1;
    const diaActual = hoy.getDate();
    if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
      edad--;
    }
    return edad;
  }

  function traducirError(err) {
    const msg = (err && err.message) || '';
    if (/invalid login credentials/i.test(msg)) return 'Correo electrónico o contraseña incorrectos.';
    if (/email not confirmed/i.test(msg)) return 'Tenés que confirmar tu correo antes de iniciar sesión.';
    if (/already registered/i.test(msg)) return 'Ese correo electrónico ya está registrado.';
    if (/failed to fetch|network/i.test(msg)) return 'No hay conexión con el servidor. Revisá tu internet.';
    return msg || 'Ocurrió un error inesperado.';
  }

  function mostrar(errEl, texto) {
    errEl.textContent = texto;
    errEl.hidden = false;
  }

  document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('reg-error');
    errEl.hidden = true;

    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const nacimiento = document.getElementById('reg-nacimiento').value;
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = regPassInput.value;
    const passConfirm = document.getElementById('reg-pass-confirm').value;

    if (!nombre || !apellido || !nacimiento || !email) {
      mostrar(errEl, 'Todos los campos son obligatorios.');
      return;
    }
    if (calcularEdad(nacimiento) < 18) {
      mostrar(errEl, 'Tenés que ser mayor de 18 años para registrarte.');
      document.getElementById('reg-nacimiento').focus();
      return;
    }
    if (!Object.values(reglas).every((r) => r.test(pass))) {
      mostrar(errEl, 'La contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }
    if (pass !== passConfirm) {
      mostrar(errEl, 'Las contraseñas no coinciden.');
      return;
    }

    const boton = document.getElementById('btn-registrar');
    boton.disabled = true;
    try {
      const { data, error } = await Nube.registrar({ email, password: pass, nombre, apellido, nacimiento });
      if (error) {
        mostrar(errEl, traducirError(error));
        return;
      }
      if (data.session) {
        window.location.replace('dashboard.html');
      } else {
        mostrar(errEl, 'Cuenta creada. Confirmá tu correo electrónico y después iniciá sesión.');
      }
    } catch (err) {
      mostrar(errEl, traducirError(err));
    } finally {
      boton.disabled = false;
    }
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('auth-error');
    errEl.hidden = true;

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;

    if (!email || !pass) {
      mostrar(errEl, 'Ingresá tu correo electrónico y tu contraseña.');
      return;
    }

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const { error } = await Nube.iniciarSesion(email, pass);
      if (error) {
        mostrar(errEl, traducirError(error));
        return;
      }
      window.location.replace('dashboard.html');
    } catch (err) {
      mostrar(errEl, traducirError(err));
    } finally {
      boton.disabled = false;
    }
  });
})();