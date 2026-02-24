(function () {
  function getCurrentScript() {
    if (document.currentScript) {
      return document.currentScript;
    }

    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  }

  const script = getCurrentScript();
  if (!script) {
    return;
  }

  const scriptUrl = new URL(script.src, window.location.href);
  const iframeUrl = new URL(script.dataset.url || "/widget.html", scriptUrl.origin);

  if (script.dataset.phone) {
    iframeUrl.searchParams.set("phone", script.dataset.phone);
  }

  if (script.dataset.api) {
    iframeUrl.searchParams.set("api", script.dataset.api);
  }

  const containerSelector = script.dataset.container;
  let container = null;

  if (containerSelector) {
    container = document.querySelector(containerSelector);
  }

  if (!container) {
    container = document.createElement("div");
    script.parentNode.insertBefore(container, script);
  }

  const iframe = document.createElement("iframe");
  iframe.src = iframeUrl.toString();
  iframe.title = script.dataset.title || "Cotizador";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.minHeight = script.dataset.height || "760px";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  container.appendChild(iframe);
})();
