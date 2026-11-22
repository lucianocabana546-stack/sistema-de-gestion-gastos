(() => {
  const STORAGE_SESION_KEY = 'sesion_activa_sgg';
  const STORAGE_TEMA_KEY = 'tema_sgg';

  /* ---------- Sesión (el login se reemplaza por Supabase más adelante) ---------- */
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

  /* ---------- Elementos ---------- */
  const formGasto = document.getElementById('form-gasto');
  const inputId = document.getElementById('gasto-id');
  const selectTipo = document.getElementById('tipo');
  const inputMonto = document.getElementById('monto');
  const inputFecha = document.getElementById('fecha');
  const selectCategoria = document.getElementById('categoria');
  const inputDescripcion = document.getElementById('descripcion');
  const mensajeError = document.getElementById('mensaje-error');
  const btnGuardar = document.getElementById('btn-guardar-gasto');
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
  const listaGastos = document.getElementById('lista-gastos');
  const estadoVacio = document.getElementById('estado-vacio');
  const balanceEl = document.getElementById('balance-total');
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
  const tabReportes = document.getElementById('tab-reportes');
  const panelReportes = document.getElementById('panel-reportes');

  let idPendienteBaja = null;
  let baseLista = false;

  document.getElementById('usuario-activo-label').textContent = usuarioActivo;
  aplicarTemaGuardado();
  iniciarBaseDeDatos();

  async function iniciarBaseDeDatos() {
    try {
      await DB.init(usuarioActivo);
      baseLista = true;
      renderizarTodo();
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo abrir la base de datos: ' + err.message);
    }
  }

  /* ---------- Pestañas ---------- */
  function cambiarPestana(pestanaActiva) {
    [
      [tabIngresar, panelIngresar],
      [tabVer, panelVer],
      [tabConsultar, panelConsultar],
      [tabReportes, panelReportes]
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
  tabReportes.addEventListener('click', () => {
    if (!baseLista) return;
    cambiarPestana(tabReportes);
    Reportes.renderizar();
  });

  /* ---------- Tema y sesión ---------- */
  function aplicarTemaGuardado() {
    if (localStorage.getItem(STORAGE_TEMA_KEY) === 'dark') document.body.classList.add('dark-mode');
  }

  document.getElementById('btn-tema').addEventListener('click', () => {
    const esOscuro = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_TEMA_KEY, esOscuro ? 'dark' : 'light');
  });

  document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    DB.cerrar();
    localStorage.removeItem(STORAGE_SESION_KEY);
    sessionStorage.removeItem(STORAGE_SESION_KEY);
    window.location.replace('index.html');
  });

  /* ---------- Mensajes ---------- */
  function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
  }

  function ocultarError() {
    mensajeError.textContent = '';
    mensajeError.hidden = true;
  }

  /* ---------- Guardar / actualizar ---------- */
  formGasto.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    if (!baseLista) {
      mostrarError('La base de datos todavía no está lista. Esperá un momento y reintentá.');
      return;
    }

    const tipo = selectTipo.value;
    const monto = parseFloat(inputMonto.value);
    const fecha = inputFecha.value;
    const categoria = selectCategoria.value;
    const descripcion = inputDescripcion.value.trim();

    if (tipo !== 'ingreso' && tipo !== 'egreso') {
      mostrarError('Seleccioná si el movimiento es un ingreso o un egreso.');
      selectTipo.focus();
      return;
    }
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
      mostrarError('Debe ingresar una descripción para el movimiento.');
      inputDescripcion.focus();
      return;
    }

    const datos = { tipo_movimiento: tipo, monto, fecha, categoria, descripcion, url_comprobante: null };

    try {
      if (inputId.value) {
        const id = Number(inputId.value);
        const actual = DB.obtenerPorId(id);
        datos.url_comprobante = actual ? actual.url_comprobante : null;
        await DB.actualizarMovimiento(id, datos);
      } else {
        await DB.insertarMovimiento(datos);
      }
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo guardar el movimiento: ' + err.message);
      return;
    }

    resetearFormulario();
    renderizarTodo();
    cambiarPestana(tabVer);
  });

  function cargarEnFormularioParaEditar(id) {
    const mov = DB.obtenerPorId(Number(id));
    if (!mov) return;

    ocultarError();
    inputId.value = mov.id;
    selectTipo.value = mov.tipo_movimiento;
    inputMonto.value = mov.monto;
    inputFecha.value = mov.fecha;
    selectCategoria.value = mov.categoria;
    inputDescripcion.value = mov.descripcion;

    btnGuardar.textContent = 'ACTUALIZAR MOVIMIENTO';
    btnCancelarEdicion.hidden = false;
    cambiarPestana(tabIngresar);
    inputMonto.focus();
  }

  function resetearFormulario() {
    formGasto.reset();
    inputId.value = '';
    btnGuardar.textContent = 'GUARDAR MOVIMIENTO';
    btnCancelarEdicion.hidden = true;
    ocultarError();
  }

  btnCancelarEdicion.addEventListener('click', resetearFormulario);
  filtroCategoria.addEventListener('change', renderizarTodo);

  /* ---------- Borrado lógico (UPDATE activo = 0) ---------- */
  function solicitarBajaLogica(id) {
    idPendienteBaja = Number(id);
    if (typeof modalBaja.showModal === 'function') {
      modalBaja.showModal();
    } else if (window.confirm('¿Estás seguro de que querés eliminar este movimiento?')) {
      ejecutarBajaLogica(idPendienteBaja);
    }
  }

  async function ejecutarBajaLogica(id) {
    try {
      await DB.bajaLogica(id);
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el movimiento: ' + err.message);
      return;
    }
    if (Number(inputId.value) === id) resetearFormulario();
    renderizarTodo();
  }

  btnConfirmarEliminar.addEventListener('click', async () => {
    if (idPendienteBaja !== null) {
      await ejecutarBajaLogica(idPendienteBaja);
      idPendienteBaja = null;
    }
    modalBaja.close();
  });

  btnCancelarEliminar.addEventListener('click', () => {
    idPendienteBaja = null;
    modalBaja.close();
  });

  /* ---------- Render ---------- */
  function formatoMoneda(n) {
    const valor = Number(n);
    return `${valor < 0 ? '-' : ''}$${Math.abs(valor).toFixed(2)}`;
  }

  function renderizarTodo() {
    if (!baseLista) return;

    // Balance general (SQL: SUM + CASE sobre registros activos)
    balanceEl.textContent = formatoMoneda(DB.balance());

    // Resumen filtrado por categoría (SQL con parámetros)
    const categoria = filtroCategoria.value;
    const resumen = DB.query(
      `SELECT COUNT(*) AS cantidad,
              COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
              COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos
         FROM movimientos
        WHERE activo = 1 AND (? = 'TODAS' OR categoria = ?)`,
      [categoria, categoria]
    )[0];

    const alcance = categoria === 'TODAS' ? 'Todas las categorías' : `Categoría "${categoria}"`;
    detalleConsulta.textContent =
      `${alcance}: ${resumen.cantidad} movimiento(s). ` +
      `Ingresos ${formatoMoneda(resumen.ingresos)} / Egresos ${formatoMoneda(resumen.egresos)}.`;

    // Tabla de movimientos activos
    const movimientos = DB.listarActivos();
    listaGastos.innerHTML = '';
    estadoVacio.hidden = movimientos.length > 0;

    for (const m of movimientos) {
      const esIngreso = m.tipo_movimiento === 'ingreso';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escaparHTML(m.fecha)}</td>
        <td class="${esIngreso ? 'tipo-ingreso' : 'tipo-egreso'}">${esIngreso ? 'Ingreso' : 'Egreso'}</td>
        <td>${escaparHTML(m.categoria)}</td>
        <td>${escaparHTML(m.descripcion)}</td>
        <td class="${esIngreso ? 'tipo-ingreso' : 'tipo-egreso'}">${esIngreso ? '+' : '-'}${formatoMoneda(m.monto)}</td>
        <td class="acciones-celda">
          <button type="button" class="btn-editar" data-id="${m.id}" aria-label="Editar ${escaparHTML(m.descripcion)}">Editar</button>
          <button type="button" class="btn-eliminar" data-id="${m.id}" aria-label="Eliminar ${escaparHTML(m.descripcion)}">Eliminar</button>
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