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

app.use(express.static(path.join(__dirname, "public")));

// Healthcheck simple (útil para validar que está arriba)
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "consultor_cartera" });
});

app.get("/api/cozmo/buscar", (req, res) => {
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

(async () => {
  try {
    await cargarIndiceCozmo();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Servidor listo en http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar:", error.message);
    process.exit(1);
  }
})();
