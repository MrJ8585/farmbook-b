const express = requier("express");

const app = express();

app.get("/", (req, res) => {
	res.send("Hello from Express!");
});
