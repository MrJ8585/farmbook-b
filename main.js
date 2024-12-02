const express = require("express");
const dotenv = require("dotenv");
const router = require("./controller"); // Importa el enrutador exportado en controller.js

dotenv.config();

const app = express();

app.use(express.json()); // Middleware para manejar JSON

// Usar el enrutador para todas las rutas definidas en controller.js
app.use("/api", router); // Prefijo /api para las rutas (puedes cambiarlo si lo prefieres)

// Manejo de errores genérico
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		error: "Algo salió mal, por favor intente más tarde.",
	});
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
