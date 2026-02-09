const express = require("express");
const path = require("path");
const {
  cargarIndiceCozmo,
  buscarPorTelefono,
  limpiarTelefono
} = require("./back/InfoCOZMO");

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

let indiceListo = false;
let errorCarga = null;

app.use(express.static(path.join(__dirname, "public")));

// Health para Render
app.get("/health", (req, res) => {
  if (errorCarga) {
    return res.status(500).json({
      ok: false,
      status: "error_carga_excel",
      error: errorCarga
    });
  }

  return res.status(200).json({
    ok: true,
    status: indiceListo ? "ready" : "loading"
  });
});

app.get("/api/cozmo/buscar", (req, res) => {
  if (errorCarga) {
    return res.status(500).json({
      ok: false,
      mensaje: "Error cargando el Excel en servidor.",
      error: errorCarga
    });
  }

  if (!indiceListo) {
    return res.status(503).json({
      ok: false,
      mensaje: "El sistema aún está cargando datos. Intenta en unos segundos."
    });
  }

  const telefono = limpiarTelefono(req.query.telefono || "");

  if (!/^\d{10}$/.test(telefono)) {
    return res.status(400).json({
      ok: false,
      mensaje: "El teléfono debe tener 10 dígitos."
    });
  }

  const resultados = buscarPorTelefono(telefono);

  if (!resultados.length) {
    return res.status(404).json({
      ok: false,
      mensaje: "No se encontró ese teléfono en COZMO."
    });
  }

  return res.json({
    ok: true,
    telefono,
    total: resultados.length,
    resultados
  });
});

// 1) Primero abre puerto (Render lo detecta)
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor escuchando en ${HOST}:${PORT}`);

  // 2) Después carga Excel (en segundo plano dentro del mismo proceso)
  (async () => {
    try {
      console.log("⏳ Cargando índice COZMO...");
      await cargarIndiceCozmo();
      indiceListo = true;
      console.log("✅ Índice COZMO listo para consultas.");
    } catch (err) {
      errorCarga = err?.message || String(err);
      console.error("❌ Error cargando índice:", errorCarga);
    }
  })();
});
