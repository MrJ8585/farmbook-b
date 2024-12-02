const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan");

const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// const PORT = process.env.PORT || 443;
const PORT = 4000;

app.use(cors());

app.use(morgan("dev"));

const apiKey = process.env.SUPABASE_API_KEY;
const project = process.env.SUPABASE_DB_URL;
const supabase = createClient(project, apiKey);

app.get("/", (req, res) => {
  res.send("¡Hola, este es un placeholder de Express.js!");
});

app.post("/allfarms", async (req, res) => {
  try {
    const { data: granjas, error: error } = await supabase
      .from("granja")
      .select(
        `
	  *,
	  productos(name, desc, image),
	  granja_practicas (
		practicassustentables (id, nombre, descripcion, icon)
	  ),
	  badge_granja (
		badge (
		  id,
		  nombre,
		  descripcion,
		  imagen
		)
	  )
	`
      )
      .order("rating", { ascending: false });

    if (error) throw error;

    if (granjas.length === 0) {
      return res.json([]);
    }

    const { page, search, filters } = req.body;

    var dummy = [];

    if (search != "") {
      dummy = granjas.filter((item) =>
        item.nombre.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      dummy = granjas;
    }

    var filtered = [];

    if (filters.length > 0) {
      filtered = dummy.filter((farm) =>
        farm.granja_practicas.some((practice) =>
          filters.some((practiceSubstring) =>
            practice.practicassustentables.nombre
              .toLowerCase()
              .includes(practiceSubstring.toLowerCase())
          )
        )
      );
    } else {
      filtered = dummy;
    }

    const granjas_res = filtered.slice(
      5 * parseInt(page) - 5,
      5 * parseInt(page)
    );

    res.json(granjas_res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/farminfo/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: granjas, error: error } = await supabase
      .from("granja")
      .select(
        `
	  *,
	  productos(name, desc, image),
	  granja_practicas (
		practicassustentables (id, nombre, descripcion, icon)
	  ),
	  badge_granja (
		badge (
		  id,
		  nombre,
		  descripcion,
		  imagen
		)
	  )
	`
      )
      .eq("id", id);

    if (error) throw error;

    if (granjas.length == 0) {
      res.json([]);
      return;
    }

    res.json(granjas);
  } catch (err) {
    console.log(err);
  }
});

app.get("/profile/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data: data, error: error } = await supabase
      .from("usuario")
      .select(
        `*, granja(*,
	  productos(name, desc, image),
	  granja_practicas (
		practicassustentables (id, nombre, descripcion, icon)
	  ),
	  badge_granja (
		badge (
		  id,
		  nombre,
		  descripcion,
		  imagen
		)
	  ))`
      )
      .eq("id", id);

    if (error) throw error;

    if (data.length == 0) {
      res.json([]);
    }
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
