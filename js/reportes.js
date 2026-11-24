const Reportes = (() => {
  const PALETA = ['#6d28d9', '#a78bfa', '#4c1d95', '#c4b5fd', '#7c3aed', '#ddd6fe', '#5b21b6', '#8b5cf6'];
  const COLOR_INGRESO = '#15803d';
  const COLOR_EGRESO = '#b91c1c';

  let graficoDona = null;
  let graficoBarras = null;

  function variableCSS(nombre, porDefecto) {
    const valor = getComputedStyle(document.body).getPropertyValue(nombre).trim();
    return valor || porDefecto;
  }

  function dinero(n) {
    return `$${Number(n).toFixed(2)}`;
  }

  // Colores tomados de elementos reales de la página: así los gráficos se leen
  // con el modo noche del sitio y también con el modo oscuro forzado del navegador.
  function coloresDePagina() {
    const titulo = document.querySelector('#panel-reportes .kpi-titulo');
    const caja = document.querySelector('#panel-reportes .consulta-box');
    const estiloTitulo = getComputedStyle(titulo);
    const estiloCaja = getComputedStyle(caja);
    return {
      texto: estiloTitulo.color,
      linea: estiloCaja.borderTopColor,
      fondo: estiloCaja.backgroundColor
    };
  }

  function renderizarDona(colorBorde) {
    // SELECT categoria, SUM(monto) ... WHERE egreso AND activo = 1 GROUP BY categoria
    const filas = DB.egresosPorCategoria();
    const canvas = document.getElementById('grafico-dona');
    const contenedor = canvas.parentElement;
    const aviso = document.getElementById('dona-vacio');

    if (graficoDona) {
      graficoDona.destroy();
      graficoDona = null;
    }

    contenedor.hidden = filas.length === 0;
    aviso.hidden = filas.length > 0;
    if (filas.length === 0) return;

    const total = filas.reduce((acum, f) => acum + f.total, 0);

    graficoDona = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: filas.map((f) => f.categoria),
        datasets: [{
          data: filas.map((f) => f.total),
          backgroundColor: filas.map((_, i) => PALETA[i % PALETA.length]),
          borderColor: colorBorde,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const porcentaje = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${dinero(ctx.parsed)} (${porcentaje}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderizarBarras() {
    // SELECT tipo_movimiento, SUM(monto) ... WHERE activo = 1 GROUP BY tipo_movimiento
    const totales = { ingreso: 0, egreso: 0 };
    DB.totalesPorTipo().forEach((f) => {
      totales[f.tipo_movimiento] = f.total;
    });

    if (graficoBarras) {
      graficoBarras.destroy();
      graficoBarras = null;
    }

    graficoBarras = new Chart(document.getElementById('grafico-barras'), {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Egresos'],
        datasets: [{
          label: 'Total acumulado',
          data: [totales.ingreso, totales.egreso],
          backgroundColor: [COLOR_INGRESO, COLOR_EGRESO],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => `$${v}` } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${dinero(ctx.parsed.y)}` } }
        }
      }
    });
  }

  function renderizar() {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js no está cargado. Revisá el <script> de Chart.js en dashboard.html.');
      return;
    }
    const colores = coloresDePagina();
    Chart.defaults.color = colores.texto;
    Chart.defaults.borderColor = colores.linea;
    renderizarDona(colores.fondo);
    renderizarBarras();
  }

  return { renderizar };
})();
