# Cotizador sincronizado con Google Sheets

Este proyecto quedo preparado para:

- Leer precios en tiempo real desde tu hoja de Google Sheets.
- Publicarse en Vercel.
- Incrustarse en WordPress con un script (`embed.js`).

## Estructura clave

- `api/cotizador.js`: API serverless para Vercel que lee CSV de Google Sheets y actualiza precios del cotizador.
- `assets/js/cotizador-app.js`: frontend del cotizador (calculo + WhatsApp + carga dinamica).
- `widget.html`: version embebible del cotizador.
- `embed.js`: script para insertar `widget.html` en sitios externos (ej. WordPress).

## 1) Configurar Google Sheets (sin editar la hoja)

Este proyecto ya esta configurado para tu hoja actual:

- Spreadsheet ID: `1V2ZOCPoH_Lr1fseByBZduQyD7lPS2USSQPofcFGSO2o`
- Hoja (gid): `248278893` (`Cotizador Original`)
- Fila de encabezado: `14`
- Columna de producto: `D`
- Columna de precio: `H`

Solo necesitas compartirla para lectura publica:

1. Abrir la planilla.
2. `Compartir`.
3. `Acceso general` -> `Cualquier persona con el enlace`.
4. Permiso: `Lector`.

URL de prueba CSV:

- `https://docs.google.com/spreadsheets/d/1V2ZOCPoH_Lr1fseByBZduQyD7lPS2USSQPofcFGSO2o/export?format=csv&gid=248278893`

Si esa URL abre/descarga CSV sin login, la API va a funcionar.

## 2) Deploy en Vercel

1. Subir este repo a GitHub.
2. Importar el repo en Vercel.
3. Variables de entorno recomendadas:
   - `GOOGLE_SHEET_ID=1V2ZOCPoH_Lr1fseByBZduQyD7lPS2USSQPofcFGSO2o`
   - `GOOGLE_SHEET_GID=248278893`
   - `GOOGLE_SHEET_HEADER_ROW=14`
   - `GOOGLE_SHEET_PRODUCT_COLUMN=D`
   - `GOOGLE_SHEET_PRICE_COLUMN=H`
4. Deploy.

La API queda en:

- `https://TU-DOMINIO.vercel.app/api/cotizador`

## 3) Incrustar en WordPress

Snippet recomendado (bloque HTML personalizado):

```html
<div id="cotizador-embed"></div>
<script
  src="https://TU-DOMINIO.vercel.app/embed.js"
  data-container="#cotizador-embed"
  data-height="820px"
  data-phone="542215755696">
</script>
```

Opciones de `embed.js`:

- `data-container`: selector CSS donde insertar el iframe.
- `data-height`: alto minimo del iframe.
- `data-phone`: telefono para el boton WhatsApp dentro del widget.
- `data-url`: URL personalizada del widget (por defecto `/widget.html`).
- `data-api`: URL API personalizada (opcional).

## 4) Flujo de actualizacion

- Cada carga del cotizador llama a `/api/cotizador`.
- `/api/cotizador` lee la hoja y actualiza precios de los productos del cotizador.
- Si la API falla, se usa `assets/js/cotizadores-fallback.json` como respaldo.
