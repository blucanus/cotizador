const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SHEET_ID = "1V2ZOCPoH_Lr1fseByBZduQyD7lPS2USSQPofcFGSO2o";
const DEFAULT_SHEET_GID = "248278893";

const DEFAULT_HEADER_ROW = 14;
const DEFAULT_PRODUCT_COLUMN = "D";
const DEFAULT_PRICE_COLUMN = "H";

const TEMPLATE_FILE = path.join(process.cwd(), "assets", "js", "cotizadores-fallback.json");

const PRICE_MATCH_RULES = [
  { templateContains: "solera 70", sheetContains: "solera 70 x 2 60" },
  { templateContains: "montante 70", sheetContains: "montante 70 x 2 60" },
  { templateContains: "tornillos t1", sheetContains: "t1 mecha x 1000", factor: 0.1 },
  { templateContains: "tornillos t2", sheetContains: "t2 aguja x 1000", factor: 0.1 },
  { templateContains: "cinta de papel", sheetContains: "cinta papel microperforada 150" },
  { templateContains: "masilla x 28", sheetContains: "masilla x 28 kg" },
  { templateContains: "fijaciones", sheetContains: "fijaciones n 8 x 100" },
  { templateContains: "placa std 12 5", sheetContains: "placa std 12 5 1 20 x 2 40" },

  { templateContains: "solera 35", sheetContains: "solera 35 x 2 60" },
  { templateContains: "montante 35", sheetContains: "montante 35 x 2 60" },
  { templateContains: "placa std 9 5", sheetContains: "placa std 9 5 1 20 x 2 40" },

  { templateContains: "larguero", sheetContains: "larguero bco 3 66" },
  { templateContains: "perimetral", sheetContains: "perimetral bco 3 00" },
  { templateContains: "travesa 1 22", sheetContains: "travesa bco 1 22" },
  { templateContains: "travesa 0 61", sheetContains: "travesa bco 0 61" },
  { templateContains: "placa cosmos", sheetContains: "placa horpac cosmos 0 61 x 1 22" },

  { templateContains: "perfil omega", sheetContains: "omega x 2 60" }
];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  let sanitized = raw.replace(/[^0-9,.-]/g, "");
  if (!sanitized) {
    return null;
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  if (lastComma > lastDot) {
    sanitized = sanitized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    sanitized = sanitized.replace(/,/g, "");
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function columnLetterToIndex(columnLetter) {
  const letters = String(columnLetter || "").trim().toUpperCase();
  if (!/^[A-Z]+$/.test(letters)) {
    throw new Error(`Columna invalida: ${columnLetter}`);
  }

  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }

  return index - 1;
}

function resolveCsvUrl() {
  if (process.env.GOOGLE_SHEET_CSV_URL) {
    return process.env.GOOGLE_SHEET_CSV_URL;
  }

  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const gid = process.env.GOOGLE_SHEET_GID || DEFAULT_SHEET_GID;
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function loadTemplateCotizadores() {
  const raw = fs.readFileSync(TEMPLATE_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const cotizadores = Array.isArray(parsed) ? parsed : parsed.cotizadores;

  if (!Array.isArray(cotizadores) || cotizadores.length === 0) {
    throw new Error("No se pudo cargar el template de cotizadores.");
  }

  return cotizadores;
}

function extractCatalogFromSheet(rows, config) {
  const headerRowIndex = config.headerRow - 1;
  if (headerRowIndex < 0 || headerRowIndex >= rows.length) {
    throw new Error(`La fila de encabezados (${config.headerRow}) no existe en la hoja.`);
  }

  const productIndex = columnLetterToIndex(config.productColumn);
  const priceIndex = columnLetterToIndex(config.priceColumn);

  const catalog = [];

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const product = String(row[productIndex] || "").trim();
    const priceRaw = row[priceIndex];
    const price = parseNumber(priceRaw);

    if (!product || price === null || price <= 0) {
      continue;
    }

    catalog.push({
      rowNumber: i + 1,
      product,
      normalizedProduct: normalizeText(product),
      price
    });
  }

  if (!catalog.length) {
    throw new Error(
      `No se detectaron productos con precio usando producto=${config.productColumn}, precio=${config.priceColumn}.`
    );
  }

  return catalog;
}

function pickPriceFromCatalog(templateProductName, catalog) {
  const normalizedTemplate = normalizeText(templateProductName);
  const explicitRule = PRICE_MATCH_RULES.find((rule) => {
    const ruleTokens = normalizeText(rule.templateContains)
      .split(" ")
      .filter(Boolean);
    return ruleTokens.every((token) => normalizedTemplate.includes(token));
  });

  if (explicitRule) {
    const needle = normalizeText(explicitRule.sheetContains);
    const candidate = catalog.find((item) => item.normalizedProduct.includes(needle));
    if (candidate) {
      return {
        price: candidate.price * (explicitRule.factor || 1),
        matchedProduct: candidate.product,
        rowNumber: candidate.rowNumber,
        factor: explicitRule.factor || 1
      };
    }
  }

  const exact = catalog.find((item) => item.normalizedProduct === normalizedTemplate);
  if (exact) {
    return {
      price: exact.price,
      matchedProduct: exact.product,
      rowNumber: exact.rowNumber,
      factor: 1
    };
  }

  const contains = catalog.find(
    (item) =>
      item.normalizedProduct.includes(normalizedTemplate) ||
      normalizedTemplate.includes(item.normalizedProduct)
  );

  if (contains) {
    return {
      price: contains.price,
      matchedProduct: contains.product,
      rowNumber: contains.rowNumber,
      factor: 1
    };
  }

  const tokens = normalizedTemplate
    .split(" ")
    .filter((token) => token.length >= 3 || /[0-9]/.test(token));
  const numericTokens = tokens.filter((token) => /[0-9]/.test(token));
  const minimumScore = Math.max(2, Math.ceil(tokens.length * 0.6));

  let best = null;

  for (const candidate of catalog) {
    if (!numericTokens.every((token) => candidate.normalizedProduct.includes(token))) {
      continue;
    }

    const score = tokens.reduce(
      (total, token) => total + (candidate.normalizedProduct.includes(token) ? 1 : 0),
      0
    );
    if (score < minimumScore) {
      continue;
    }

    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }

  if (best) {
    return {
      price: best.candidate.price,
      matchedProduct: best.candidate.product,
      rowNumber: best.candidate.rowNumber,
      factor: 1
    };
  }

  return null;
}

function buildCotizadoresWithLivePrices(templateCotizadores, catalog) {
  const missing = [];
  const matches = [];

  const cotizadores = templateCotizadores.map((cotizador) => ({
    ...cotizador,
    productos: cotizador.productos.map((producto) => {
      const picked = pickPriceFromCatalog(producto.producto, catalog);
      if (!picked) {
        missing.push(producto.producto);
        return { ...producto };
      }

      matches.push({
        template: producto.producto,
        source: picked.matchedProduct,
        row: picked.rowNumber,
        factor: picked.factor,
        price: picked.price
      });

      return {
        ...producto,
        precio: Number(picked.price.toFixed(2))
      };
    })
  }));

  return {
    cotizadores,
    missing: Array.from(new Set(missing)),
    matches
  };
}

function readSheetConfig() {
  const headerRow = Number.parseInt(process.env.GOOGLE_SHEET_HEADER_ROW || String(DEFAULT_HEADER_ROW), 10);
  const productColumn = process.env.GOOGLE_SHEET_PRODUCT_COLUMN || DEFAULT_PRODUCT_COLUMN;
  const priceColumn = process.env.GOOGLE_SHEET_PRICE_COLUMN || DEFAULT_PRICE_COLUMN;

  if (!Number.isInteger(headerRow) || headerRow <= 0) {
    throw new Error("GOOGLE_SHEET_HEADER_ROW debe ser un entero mayor a 0.");
  }

  return {
    headerRow,
    productColumn,
    priceColumn
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const sheetConfig = readSheetConfig();
    const csvUrl = resolveCsvUrl();

    const response = await fetch(csvUrl, {
      headers: {
        "User-Agent": "cotizador-vercel/1.0"
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Google Sheets devolvio 401/403. Verifica acceso publico de lectura.");
      }
      throw new Error(`Google Sheets devolvio status ${response.status}.`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const catalog = extractCatalogFromSheet(rows, sheetConfig);
    const templateCotizadores = loadTemplateCotizadores();
    const merged = buildCotizadoresWithLivePrices(templateCotizadores, catalog);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    res.status(200).json({
      source: "google-sheets",
      generatedAt: new Date().toISOString(),
      sheetConfig,
      catalogCount: catalog.length,
      matchedCount: merged.matches.length,
      missingCount: merged.missing.length,
      missingProducts: merged.missing,
      cotizadores: merged.cotizadores
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo cargar la lista del cotizador",
      details: error.message,
      hint: "Revisa permisos de la hoja y configuracion de columnas/fila."
    });
  }
};
