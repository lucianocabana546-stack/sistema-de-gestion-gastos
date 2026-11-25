# Sistema de Gestión de Gastos (SGG)

Aplicación web para registrar ingresos y egresos, ver el balance, adjuntar comprobantes y consultar reportes gráficos. Los datos viven en una base SQLite dentro del navegador (sql.js + OPFS) y se respaldan en la nube con Supabase, así que se puede usar desde cualquier dispositivo.

Autor: Luciano Cabaña

Entrega
	
App funcionando	https://lucianocabana546-stack.github.io/sistema-de-gestion-gastos/
Pull Request	https://github.com/lucianocabana546-stack/sistema-de-gestion-gastos/pull/2
Rama de desarrollo	feature/refactor-sqlite-cabaña
Documento técnico	DOCUMENTO_TECNICO.md (ERS, casos de uso y matriz de pruebas)

La app se publica desde la rama de desarrollo hasta que el Pull Request sea aprobado y fusionado con main. Se recomienda Chrome o Edge.

Cómo probarla
Abrir la app y tocar Regístrate aquí. Sirve cualquier correo (no pide confirmación por mail). La contraseña necesita 8 o más caracteres, mayúscula, minúscula, número y símbolo, y hay que ser mayor de 18 años.
Cargar un ingreso y un egreso en Ingresar movimiento. El comprobante es opcional.
Revisar Consultar balance y Ver reportes (dona de egresos por categoría y barras de ingresos contra egresos).
Eliminar un movimiento: pasa a estado inactivo (activo = 0), no se borra.
Abrir una ventana de incógnito, iniciar sesión con la misma cuenta y comprobar que la base se restaura sola desde la nube.
Verificación de la base de datos (caja blanca)

Con el dashboard abierto, en la consola del navegador (F12 → Console):

js
DB.query('SELECT * FROM movimientos');                                      // incluye los dados de baja
DB.query('SELECT activo, COUNT(*) AS cantidad FROM movimientos GROUP BY activo');
DB.query("SELECT categoria, SUM(monto) AS total FROM movimientos WHERE activo = 1 AND tipo_movimiento = 'egreso' GROUP BY categoria");
DB.query('DELETE FROM movimientos');                                        // debe fallar: borrado fisico prohibido

El archivo .sqlite se puede ver en DevTools → Application → Storage → Origin private file system.

Qué incluye
SQLite + OPFS (js/db.js): esquema, consultas y persistencia del binario, un archivo por usuario. Sin localStorage para registros.
Ingresos y egresos con tipo_movimiento, balance calculado por SQL y borrado lógico (un trigger bloquea el DELETE).
Comprobantes por API REST (js/comprobantes.js): fetch + FormData a ImgBB, se guarda solo la URL. Si falla, avisa y permite guardar con NULL.
Reportes (js/reportes.js): Chart.js alimentado por consultas GROUP BY / SUM.
Login y respaldo en la nube (js/auth.js, js/sync.js): Supabase Auth y Storage, con políticas RLS por usuario y restauración automática en un dispositivo nuevo (offline-first).
Estructura
index.html          Login y registro
dashboard.html      Panel principal
css/style.css
js/
  db.js             SQLite + OPFS
  gastos.js         Interfaz de movimientos
  comprobantes.js   Subida de imágenes (API REST)
  reportes.js       Gráficos Chart.js
  auth.js           Registro e inicio de sesión
  sync.js           Supabase Auth + Storage
DOCUMENTO_TECNICO.md
Tecnologías

HTML, CSS y JavaScript · sql.js (SQLite en WebAssembly) · OPFS · Chart.js · Supabase (Auth y Storage) · ImgBB (API REST).