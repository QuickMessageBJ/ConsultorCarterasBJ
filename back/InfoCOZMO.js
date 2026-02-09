const ExcelJS = require("exceljs");
const path = require("path");

const EXCEL_PATH = path.join(__dirname, "CARTERA COZMO 08022026.xlsx");

// telefono -> [registro1, registro2, ...]
let indexTelefono = new Map();

function limpiarTelefono(valor) {
  if (valor === null || valor === undefined) return "";
  let txt = String(valor).trim();
  txt = txt.replace(/\D/g, "");
  if (txt.length > 10) txt = txt.slice(-10);
  return txt;
}

function valorTexto(valor) {
  if (valor === null || valor === undefined) return "";

  if (typeof valor === "object") {
    if (Object.prototype.hasOwnProperty.call(valor, "result")) {
      return valorTexto(valor.result);
    }
    if (Object.prototype.hasOwnProperty.call(valor, "text")) {
      return String(valor.text).trim();
    }
    if (Array.isArray(valor.richText)) {
      return valor.richText.map(x => x.text || "").join("").trim();
    }
  }

  return String(valor).trim();
}

async function cargarIndiceCozmo() {
  const nuevoIndice = new Map();

  // LECTURA STREAMING (clave para evitar OOM en Render)
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(EXCEL_PATH, {
    entries: "emit",
    worksheets: "emit",
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "ignore"
  });

  let primeraHojaProcesada = false;
  let totalRegistros = 0;

  for await (const worksheetReader of workbookReader) {
    if (primeraHojaProcesada) break; // solo primera hoja

    for await (const chunk of worksheetReader) {
      const rows = Array.isArray(chunk) ? chunk : [chunk];

      for (const row of rows) {
        const values = row?.values || [];
        const rowNum = row?.number || 0;

        // Saltar encabezado
        if (rowNum === 1) continue;

        const telefono = limpiarTelefono(values[6]); // F - Mobile Number
        if (!telefono || telefono.length !== 10) continue;

        const item = {
          excelRow: rowNum,
          fullName: valorTexto(values[2]),             // B  - Full Name
          emailAddress: valorTexto(values[7]),         // G  - Email Address
          outstandingBalance: valorTexto(values[10]),  // J  - Outstanding Balance
          daysPastDue: valorTexto(values[11]),         // K  - Days past due
          ca: valorTexto(values[27]),                  // AA - CA
          subcredito: valorTexto(values[28])           // AB - SUBCREDITO
        };

        if (!nuevoIndice.has(telefono)) {
          nuevoIndice.set(telefono, []);
        }

        nuevoIndice.get(telefono).push(item);
        totalRegistros++;
      }
    }

    primeraHojaProcesada = true;
  }

  indexTelefono = nuevoIndice;

  console.log("✅ COZMO indexado (streaming)");
  console.log("Teléfonos únicos:", indexTelefono.size);
  console.log("Registros indexados:", totalRegistros);
}

function buscarPorTelefono(telefono) {
  const tel = limpiarTelefono(telefono);
  if (tel.length !== 10) return [];
  return indexTelefono.get(tel) || [];
}

module.exports = {
  cargarIndiceCozmo,
  buscarPorTelefono,
  limpiarTelefono
};
