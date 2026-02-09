const ExcelJS = require("exceljs");
const path = require("path");

const EXCEL_PATH = path.join(__dirname, "CARTERA COZMO 08022026.xlsx");

// telefono -> [registro1, registro2, ...]
let indexTelefono = new Map();

function limpiarTelefono(valor) {
  if (valor === null || valor === undefined) return "";
  let txt = String(valor).trim();

  // solo dígitos
  txt = txt.replace(/\D/g, "");

  // si viene con prefijo (ej 52...), toma los últimos 10
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("No se encontró hoja en el Excel de COZMO.");

  const nuevoIndice = new Map();

  // fila 1 headers
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);

    const telefono = limpiarTelefono(row.getCell(6).value); // F - Mobile Number
    if (!telefono || telefono.length !== 10) continue;

    const item = {
      excelRow: i,                                         // para identificar cada registro
      fullName: valorTexto(row.getCell(2).value),          // B
      emailAddress: valorTexto(row.getCell(7).value),      // G
      outstandingBalance: valorTexto(row.getCell(10).value),// J
      daysPastDue: valorTexto(row.getCell(11).value),      // K
      ca: valorTexto(row.getCell(27).value),               // AA
      subcredito: valorTexto(row.getCell(28).value),       // AB
    };

    if (!nuevoIndice.has(telefono)) {
      nuevoIndice.set(telefono, []);
    }

    // IMPORTANTE: push para guardar TODOS los repetidos
    nuevoIndice.get(telefono).push(item);
  }

  indexTelefono = nuevoIndice;

  console.log("✅ COZMO indexado");
  console.log("Teléfonos únicos:", indexTelefono.size);
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
