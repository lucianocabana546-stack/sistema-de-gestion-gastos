(() => {
  const STORAGE_GASTOS_KEY = 'gastos_sgg';
  const STORAGE_SESION_KEY = 'sesion_activa_sgg';
  const STORAGE_TEMA_KEY = 'tema_sgg';

  const sesionRaw = localStorage.getItem(STORAGE_SESION_KEY) || sessionStorage.getItem(STORAGE_SESION_KEY);
  if (!sesionRaw) {
    window.location.replace('index.html');
    return;
  }

  let usuarioActivo;
  try {
    const parsed = JSON.parse(sesionRaw);
    usuarioActivo = typeof parsed === 'string' ? parsed : parsed.email;
  } catch {
    usuarioActivo = sesionRaw;
  }

  if (!usuarioActivo) {
    window.location.replace('index.html');
    return;
  }

  const formGasto = document.getElementById('form-gasto');
  const inputId = document.getElementById('gasto-id');
  const inputMonto = document.getElementById('monto');
  const inputFecha = document.getElementById('fecha');
  const selectCategoria = document.getElementById('categoria');
  const inputDescripcion = document.getElementById('descripcion');
  const mensajeError = document.getElementById('mensaje-error');
  const btnGuardar = document.getElementById('btn-guardar-gasto');
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
  const listaGastos = document.getElementById('lista-gastos');
  const estadoVacio = document.getElementById('estado-vacio');
  const totalGastadoEl = document.getElementById('total-gastado');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const detalleConsulta = document.getElementById('detalle-consulta');
  const modalBaja = document.getElementById('modal-confirmar-baja');
  const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
  const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');

  const tabIngresar = document.getElementById('tab-ingresar');
  const tabVer = document.getElementById('tab-ver');
  const tabConsultar = document.getElementById('tab-consultar');
  const panelIngresar = document.getElementById('panel-ingresar');
  const panelVer = document.getElementById('panel-ver');
  const panelConsultar = document.getElementById('panel-consultar');

  let idPendienteBaja = null;

  document.getElementById('usuario-activo-label').textContent = usuarioActivo;
  aplicarTemaGuardado();
  renderizarTodo();

  function cambiarPestana(pestanaActiva) {
    [
      [tabIngresar, panelIngresar],
      [tabVer, panelVer],
      [tabConsultar, panelConsultar]
    ].forEach(([tab, panel]) => {
      const esActiva = tab === pestanaActiva;
      tab.classList.toggle('active', esActiva);
      tab.setAttribute('aria-selected', String(esActiva));
      panel.hidden = !esActiva;
    });
  }

  tabIngresar.addEventListener('click', () => cambiarPestana(tabIngresar));
  tabVer.addEventListener('click', () => {
    renderizarTodo();
    cambiarPestana(tabVer);
  });
  tabConsultar.addEventListener('click', () => {
    renderizarTodo();
    cambiarPestana(tabConsultar);
  });

  function aplicarTemaGuardado() {
    const tema = localStorage.getItem(STORAGE_TEMA_KEY) || 'light';
    if (tema === 'dark') document.body.classList.add('dark-mode');
  }

  document.getElementById('btn-tema').addEventListener('click', () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_TEMA_KEY, esOscuro ? 'dark' : 'light');
  });

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_SESION_KEY);
    sessionStorage.removeItem(STORAGE_SESION_KEY);
    window.location.replace('index.html');
  });

  function obtenerTodosLosGastos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_GASTOS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function guardarTodosLosGastos(gastos) {
    localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(gastos));
  }

  function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
  }

  function ocultarError() {
    mensajeError.textContent = '';
    mensajeError.hidden = true;
  }

  formGasto.addEventListener('submit', (e) => {
    e.preventDefault();
    ocultarError();

    const monto = parseFloat(inputMonto.value);
    const fecha = inputFecha.value;
    const categoria = selectCategoria.value;
    const descripcion = inputDescripcion.value.trim();

    if (Number.isNaN(monto) || monto <= 0) {
      mostrarError('El monto debe ser un número mayor a cero (no se permiten valores negativos ni 0).');
      inputMonto.focus();
      return;
    }
    if (!fecha) {
      mostrarError('Debe seleccionar una fecha válida.');
      inputFecha.focus();
      return;
    }
    if (!categoria) {
      mostrarError('Debe seleccionar una categoría de la lista.');
      selectCategoria.focus();
      return;
    }
    if (!descripcion) {
      mostrarError('Debe ingresar una descripción para el gasto.');
      inputDescripcion.focus();
      return;
    }

    const gastos = obtenerTodosLosGastos();
    const idEdicion = inputId.value;

    if (idEdicion) {
      const indice = gastos.findIndex((g) => g.id === idEdicion && g.email_usuario === usuarioActivo);
      if (indice !== -1) {
        gastos[indice] = { ...gastos[indice], monto, fecha, categoria, descripcion };
      }
    } else {
      gastos.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `gasto_${Date.now()}`,
        email_usuario: usuarioActivo,
        monto,
        fecha,
        categoria,
        descripcion,
        estado_activo: true
      });
    }

    guardarTodosLosGastos(gastos);
    resetearFormulario();
    renderizarTodo();
    cambiarPestana(tabVer);
  });

  function cargarEnFormularioParaEditar(id) {
    const gastos = obtenerTodosLosGastos();
    const gasto = gastos.find((g) => g.id === id && g.email_usuario === usuarioActivo && g.estado_activo === true);
    if (!gasto) return;

    ocultarError();
    inputId.value = gasto.id;
    inputMonto.value = gasto.monto;
    inputFecha.value = gasto.fecha;
    selectCategoria.value = gasto.categoria;
    inputDescripcion.value = gasto.descripcion;

    btnGuardar.textContent = 'ACTUALIZAR GASTO';
    btnCancelarEdicion.hidden = false;
    cambiarPestana(tabIngresar);
    inputMonto.focus();
  }

  function resetearFormulario() {
    formGasto.reset();
    inputId.value = '';
    btnGuardar.textContent = 'GUARDAR GASTO';
    btnCancelarEdicion.hidden = true;
    ocultarError();
  }

  btnCancelarEdicion.addEventListener('click', resetearFormulario);
  filtroCategoria.addEventListener('change', renderizarTodo);

  function solicitarBajaLogica(id) {
    idPendienteBaja = id;
    if (typeof modalBaja.showModal === 'function') {
      modalBaja.showModal();
    } else if (window.confirm('¿Estás seguro de que querés eliminar este gasto?')) {
      ejecutarBajaLogica(id);
    }
  }

  function ejecutarBajaLogica(id) {
    const gastos = obtenerTodosLosGastos();
    const actualizado = gastos.map((gasto) => {
      if (gasto.id === id && gasto.email_usuario === usuarioActivo) {
        return { ...gasto, estado_activo: false };
      }
      return gasto;
    });
    guardarTodosLosGastos(actualizado);
    if (inputId.value === id) resetearFormulario();
    renderizarTodo();
  }

  btnConfirmarEliminar.addEventListener('click', () => {
    if (idPendienteBaja) {
      ejecutarBajaLogica(idPendienteBaja);
      idPendienteBaja = null;
    }
    modalBaja.close();
  });

  btnCancelarEliminar.addEventListener('click', () => {
    idPendienteBaja = null;
    modalBaja.close();
  });

  function renderizarTodo() {
    const todos = obtenerTodosLosGastos();
    const activosUsuario = todos.filter(
      (g) => g.email_usuario === usuarioActivo && g.estado_activo === true
    );

    const totalGlobal = activosUsuario.reduce((acum, item) => acum + Number(item.monto), 0);
    totalGastadoEl.textContent = `$${totalGlobal.toFixed(2)}`;

    const catSeleccionada = filtroCategoria.value;
    const filtrados = catSeleccionada === 'TODAS'
      ? activosUsuario
      : activosUsuario.filter((g) => g.categoria === catSeleccionada);
    const subtotalFiltro = filtrados.reduce((acum, item) => acum + Number(item.monto), 0);

    detalleConsulta.textContent = catSeleccionada === 'TODAS'
      ? `Mostrando ${filtrados.length} gasto(s) activo(s) en total.`
      : `Subtotal en "${catSeleccionada}": $${subtotalFiltro.toFixed(2)} (${filtrados.length} movimiento(s)).`;

    listaGastos.innerHTML = '';
    estadoVacio.hidden = activosUsuario.length > 0;

    for (const gasto of activosUsuario) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${gasto.fecha}</td>
        <td>${gasto.categoria}</td>
        <td>${escaparHTML(gasto.descripcion)}</td>
        <td>$${Number(gasto.monto).toFixed(2)}</td>
        <td class="acciones-celda">
          <button type="button" class="btn-editar" data-id="${gasto.id}" aria-label="Editar gasto ${escaparHTML(gasto.descripcion)}">Editar</button>
          <button type="button" class="btn-eliminar" data-id="${gasto.id}" aria-label="Eliminar gasto ${escaparHTML(gasto.descripcion)}">Eliminar</button>
        </td>
      `;
      listaGastos.appendChild(tr);
    }

    listaGastos.querySelectorAll('.btn-editar').forEach((btn) => {
      btn.addEventListener('click', () => cargarEnFormularioParaEditar(btn.dataset.id));
    });

    listaGastos.querySelectorAll('.btn-eliminar').forEach((btn) => {
      btn.addEventListener('click', () => solicitarBajaLogica(btn.dataset.id));
    });
  }

  function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
})();