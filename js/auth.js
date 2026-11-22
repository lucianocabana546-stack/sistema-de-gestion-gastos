(() => {
  const STORAGE_USUARIOS_KEY = 'usuarios_sgg';
  const STORAGE_SESION_KEY = 'sesion_activa_sgg';
  const STORAGE_TEMA_KEY = 'tema_sgg';

  if (localStorage.getItem(STORAGE_SESION_KEY)) {
    window.location.replace('dashboard.html');
    return;
  }

  if (localStorage.getItem(STORAGE_TEMA_KEY) === 'dark') {
    document.body.classList.add('dark-mode');
  }

  document.getElementById('btn-tema').addEventListener('click', () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_TEMA_KEY, esOscuro ? 'dark' : 'light');
  });

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
    alert('Para restablecer tu contraseña en el entorno local, creá una nueva cuenta o revisá los usuarios registrados.');
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

  document.getElementById('form-registro').addEventListener('submit', (e) => {
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
      errEl.textContent = 'Todos los campos son obligatorios.';
      errEl.hidden = false;
      return;
    }

    if (calcularEdad(nacimiento) < 18) {
      errEl.textContent = 'Tenés que ser mayor de 18 años para registrarte.';
      errEl.hidden = false;
      document.getElementById('reg-nacimiento').focus();
      return;
    }

    const passValida = Object.values(reglas).every((r) => r.test(pass));
    if (!passValida) {
      errEl.textContent = 'La contraseña no cumple con todos los requisitos de seguridad.';
      errEl.hidden = false;
      return;
    }

    if (pass !== passConfirm) {
      errEl.textContent = 'Las contraseñas no coinciden.';
      errEl.hidden = false;
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem(STORAGE_USUARIOS_KEY)) || [];
    if (usuarios.some((u) => u.email === email)) {
      errEl.textContent = 'Ese correo electrónico ya está registrado.';
      errEl.hidden = false;
      return;
    }

    usuarios.push({ nombre, apellido, nacimiento, email, pass });
    localStorage.setItem(STORAGE_USUARIOS_KEY, JSON.stringify(usuarios));
    localStorage.setItem(STORAGE_SESION_KEY, JSON.stringify({ nombre, apellido, email }));
    window.location.replace('dashboard.html');
  });

  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const errEl = document.getElementById('auth-error');
    errEl.hidden = true;

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;

    const usuarios = JSON.parse(localStorage.getItem(STORAGE_USUARIOS_KEY)) || [];
    const usuario = usuarios.find((u) => u.email === email && u.pass === pass);

    if (!usuario) {
      errEl.textContent = 'Correo electrónico o contraseña incorrectos.';
      errEl.hidden = false;
      return;
    }

    localStorage.setItem(
      STORAGE_SESION_KEY,
      JSON.stringify({ nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email })
    );
    window.location.replace('dashboard.html');
  });
})();