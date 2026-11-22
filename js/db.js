const DB = (() => {
  const SQLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
      monto REAL NOT NULL CHECK (monto > 0),
      fecha TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      url_comprobante TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TRIGGER IF NOT EXISTS trg_no_delete_movimientos
    BEFORE DELETE ON movimientos
    BEGIN
      SELECT RAISE(ABORT, 'Borrado fisico prohibido: usar baja logica (activo = 0)');
    END;
  `;

  let SQL = null;            // módulo sql.js inicializado
  let db = null;             // base de datos abierta en memoria
  let nombreArchivo = null;  // archivo .sqlite dentro de OPFS
  let colaEscritura = Promise.resolve();

  /* ---------- OPFS ---------- */

  function nombreSeguro(claveUsuario) {
    const limpio = String(claveUsuario).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `sgg_${limpio}.sqlite`;
  }

  async function leerArchivoOPFS() {
    const raiz = await navigator.storage.getDirectory();
    try {
      const handle = await raiz.getFileHandle(nombreArchivo);
      const archivo = await handle.getFile();
      if (archivo.size === 0) return null;
      return new Uint8Array(await archivo.arrayBuffer());
    } catch (err) {
      if (err.name === 'NotFoundError') return null;
      throw err;
    }
  }

  async function escribirArchivoOPFS(bytes) {
    const raiz = await navigator.storage.getDirectory();
    const handle = await raiz.getFileHandle(nombreArchivo, { create: true });
    const escritura = await handle.createWritable();
    await escritura.write(bytes);
    await escritura.close();
  }

  // Serializa las escrituras para que no se pisen entre sí.
  function persistir() {
    const tarea = colaEscritura
      .catch(() => {})
      .then(() => escribirArchivoOPFS(db.export()));
    colaEscritura = tarea;
    return tarea;
  }

  /* ---------- Ciclo de vida ---------- */

  // claveUsuario: email o id del usuario. Cada usuario tiene su propio .sqlite.
  async function init(claveUsuario) {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      throw new Error('Este navegador no soporta OPFS. Probá con Chrome o Edge.');
    }
    if (typeof initSqlJs !== 'function') {
      throw new Error('sql.js no está cargado. Revisá el <script> de sql-wasm.js.');
    }
    if (!SQL) {
      SQL = await initSqlJs({ locateFile: (archivo) => SQLJS_BASE + archivo });
    }
    if (db) db.close();

    nombreArchivo = nombreSeguro(claveUsuario);
    const bytes = await leerArchivoOPFS();
    db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    db.exec(SCHEMA);
    await persistir();
    return { archivo: nombreArchivo, baseNueva: !bytes };
  }

  function cerrar() {
    if (db) db.close();
    db = null;
    nombreArchivo = null;
  }

  // Para la sincronización con el BaaS (Supabase / Firebase Storage).
  function exportarBytes() {
    return db.export();
  }

  async function reemplazarConBytes(bytes) {
    if (db) db.close();
    db = new SQL.Database(bytes);
    db.exec(SCHEMA);
    await persistir();
  }

  /* ---------- Consultas genéricas ---------- */

  // SELECT -> array de objetos
  function consultar(sql, params = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const filas = [];
      while (stmt.step()) filas.push(stmt.getAsObject());
      return filas;
    } finally {
      stmt.free();
    }
  }

  // INSERT / UPDATE -> ejecuta y guarda el .sqlite en OPFS
  async function ejecutar(sql, params = []) {
    db.run(sql, params);
    await persistir();
  }

  /* ---------- Operaciones del negocio ---------- */

  function insertarMovimiento(m) {
    return ejecutar(
      `INSERT INTO movimientos
         (tipo_movimiento, monto, fecha, categoria, descripcion, url_comprobante)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [m.tipo_movimiento, m.monto, m.fecha, m.categoria, m.descripcion, m.url_comprobante ?? null]
    );
  }

  function actualizarMovimiento(id, m) {
    return ejecutar(
      `UPDATE movimientos
          SET tipo_movimiento = ?, monto = ?, fecha = ?, categoria = ?,
              descripcion = ?, url_comprobante = ?
        WHERE id = ? AND activo = 1`,
      [m.tipo_movimiento, m.monto, m.fecha, m.categoria, m.descripcion, m.url_comprobante ?? null, id]
    );
  }

  // Borrado lógico: nunca se usa DELETE.
  function bajaLogica(id) {
    return ejecutar('UPDATE movimientos SET activo = 0 WHERE id = ?', [id]);
  }

  function obtenerPorId(id) {
    return consultar('SELECT * FROM movimientos WHERE id = ? AND activo = 1', [id])[0] || null;
  }

  function listarActivos() {
    return consultar(
      'SELECT * FROM movimientos WHERE activo = 1 ORDER BY fecha DESC, id DESC'
    );
  }

  // Balance = ingresos - egresos (solo registros activos)
  function balance() {
    const fila = consultar(
      `SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END), 0) AS balance
         FROM movimientos
        WHERE activo = 1`
    )[0];
    return fila.balance;
  }

  // Para el gráfico de barras: [{ tipo_movimiento, total }]
  function totalesPorTipo() {
    return consultar(
      `SELECT tipo_movimiento, SUM(monto) AS total
         FROM movimientos
        WHERE activo = 1
        GROUP BY tipo_movimiento`
    );
  }

  // Para el gráfico de dona: [{ categoria, total }]
  function egresosPorCategoria() {
    return consultar(
      `SELECT categoria, SUM(monto) AS total
         FROM movimientos
        WHERE activo = 1 AND tipo_movimiento = 'egreso'
        GROUP BY categoria
        ORDER BY total DESC`
    );
  }

  return {
    init,
    cerrar,
    exportarBytes,
    reemplazarConBytes,
    query: consultar,
    run: ejecutar,
    insertarMovimiento,
    actualizarMovimiento,
    bajaLogica,
    obtenerPorId,
    listarActivos,
    balance,
    totalesPorTipo,
    egresosPorCategoria
  };
})();