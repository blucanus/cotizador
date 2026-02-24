(function () {
  const searchParams = new URLSearchParams(window.location.search);
  const runtimeConfig = window.COTIZADOR_CONFIG || {};

  const config = {
    apiUrl: searchParams.get("api") || runtimeConfig.apiUrl || "/api/cotizador",
    fallbackUrl:
      runtimeConfig.fallbackUrl || "/assets/js/cotizadores-fallback.json",
    whatsappPhone:
      searchParams.get("phone") || runtimeConfig.whatsappPhone || "542215755696"
  };

  const state = {
    cotizadores: [],
    cotizadorActual: 0,
    ultimoResultado: null
  };

  const elements = {
    buttons: document.getElementById("cotizadorButtons"),
    metros: document.getElementById("metros"),
    calcular: document.getElementById("calcular"),
    resultado: document.getElementById("resultado"),
    whatsapp: document.getElementById("whatsappButton"),
    status: document.getElementById("cotizadorStatus")
  };

  if (!elements.buttons || !elements.metros || !elements.calcular || !elements.resultado || !elements.whatsapp) {
    return;
  }

  const moneyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    return moneyFormatter.format(value);
  }

  function computeCantidadFinal(producto, metros) {
    const cantM2 = toNumber(producto.cant_m2);
    const cantidadNecesaria = cantM2 * metros;
    const redondeo = String(producto.redondeo || "ceil").toLowerCase();

    if (redondeo !== "ceil") {
      return Math.max(0, Math.round(cantidadNecesaria));
    }

    const areaUnidad = toNumber(producto.areaUnidad);
    if (areaUnidad > 0) {
      return Math.max(0, Math.ceil(cantidadNecesaria / areaUnidad));
    }

    const unidadesPorPaquete = toNumber(producto.unidadesPorPaquete);
    if (unidadesPorPaquete > 0) {
      return Math.max(0, Math.ceil(cantidadNecesaria / unidadesPorPaquete));
    }

    const metrosLinealesPorUnidad = toNumber(producto.metrosLinealesPorUnidad);
    if (metrosLinealesPorUnidad > 0) {
      return Math.max(0, Math.ceil(cantidadNecesaria / metrosLinealesPorUnidad));
    }

    return Math.max(0, Math.ceil(cantidadNecesaria));
  }

  function setStatus(message, type) {
    if (!elements.status) {
      return;
    }

    if (!message) {
      elements.status.textContent = "";
      elements.status.className = "cotizador-status";
      elements.status.style.display = "none";
      return;
    }

    elements.status.style.display = "block";
    elements.status.textContent = message;
    elements.status.className = `cotizador-status ${type || ""}`.trim();
  }

  function clearResultado() {
    elements.resultado.innerHTML = "";
    elements.whatsapp.style.display = "none";
    state.ultimoResultado = null;
  }

  function seleccionarCotizador(index) {
    state.cotizadorActual = index;
    Array.from(elements.buttons.querySelectorAll("button")).forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
    });
    clearResultado();
  }

  function renderButtons() {
    elements.buttons.innerHTML = "";

    state.cotizadores.forEach((cotizador, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = cotizador.nombre;
      button.addEventListener("click", function () {
        seleccionarCotizador(index);
      });
      elements.buttons.appendChild(button);
    });

    if (state.cotizadores.length > 0) {
      seleccionarCotizador(0);
    }
  }

  function renderResultado(detalle, total) {
    const rows = detalle
      .map(function (item) {
        return `
          <tr>
            <td>${item.producto}</td>
            <td>${item.cantidad} ${item.unidad}</td>
            <td>${formatMoney(item.total)}</td>
          </tr>
        `;
      })
      .join("");

    elements.resultado.innerHTML = `
      <table>
        <tr>
          <th>Producto</th>
          <th>Cantidad necesaria</th>
          <th>Total</th>
        </tr>
        ${rows}
        <tr>
          <td colspan="2"><strong>Total de la cotizacion</strong></td>
          <td><strong>${formatMoney(total)}</strong></td>
        </tr>
      </table>
    `;
  }

  function actualizarWhatsApp(resultado) {
    elements.whatsapp.style.display = "block";
    elements.whatsapp.onclick = function () {
      const detalle = resultado.detalle
        .map(function (item) {
          return `- ${item.producto}: ${item.cantidad} ${item.unidad}`;
        })
        .join("\n");

      const mensaje = [
        `Realice esta cotizacion para ${resultado.metros} m2 usando ${resultado.cotizador}:`,
        "",
        detalle,
        "",
        `Total estimado: ${formatMoney(resultado.total)}`
      ].join("\n");

      const url = `https://wa.me/${config.whatsappPhone}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, "_blank", "noopener");
    };
  }

  function calcularCotizacion() {
    const metros = Number(String(elements.metros.value).replace(",", "."));
    if (!Number.isFinite(metros) || metros <= 0) {
      window.alert("Ingresa una cantidad valida de metros cuadrados.");
      return;
    }

    const cotizador = state.cotizadores[state.cotizadorActual];
    if (!cotizador) {
      return;
    }

    let totalCotizacion = 0;
    const detalle = cotizador.productos.map(function (producto) {
      const cantidad = computeCantidadFinal(producto, metros);
      const precio = toNumber(producto.precio);
      const total = cantidad * precio;
      totalCotizacion += total;

      return {
        producto: producto.producto,
        unidad: producto.unidadMedida || "unidades",
        cantidad,
        total
      };
    });

    const resultado = {
      metros,
      cotizador: cotizador.nombre,
      detalle,
      total: totalCotizacion
    };

    state.ultimoResultado = resultado;
    renderResultado(detalle, totalCotizacion);
    actualizarWhatsApp(resultado);
  }

  function normalizePayload(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.cotizadores)) {
      return payload.cotizadores;
    }

    return [];
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} en ${url}`);
    }
    return response.json();
  }

  async function loadCotizadores() {
    const payload = await fetchJson(config.apiUrl);
    if (payload && payload.error) {
      throw new Error("api-error");
    }

    if (payload && Number(payload.missingCount) > 0) {
      throw new Error("missing-products");
    }

    const cotizadores = normalizePayload(payload);
    if (!cotizadores.length) {
      throw new Error("empty-data");
    }

    return cotizadores;
  }

  async function init() {
    setStatus("", "");

    try {
      state.cotizadores = await loadCotizadores();
      renderButtons();
      elements.calcular.addEventListener("click", calcularCotizacion);
      setStatus("", "");
    } catch (error) {
      setStatus("Ha ocurrido un error.", "error");
      elements.calcular.disabled = true;
    }
  }

  init();
})();
