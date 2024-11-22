const express = require("express");
const app = express();
const PORT = process.env.PORT || 80;

app.get("/", (req, res) => {
	res.send("¡Hola, este es un placeholder de Express.js!");
});

app.listen(PORT, () => {
	console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
