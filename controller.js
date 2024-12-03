const express = require("express");
const bcrypt = require("bcrypt");
const { getDbConnection } = require("./db");
const jwt = require("jsonwebtoken");
const app = express();
const { BlobServiceClient } = require("@azure/storage-blob");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
require("dotenv").config();

app.use(express.json());
const router = express.Router();

const connectionString = process.env.BLOB_CONNECTION_STRING;
// Crear el cliente de Blob Storage usando el Connection String
const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

const containerName = "farmbook85-container";

//? Registro de usuario
router.post("/register", async (req, res) => {
  const { correo, contrasena, nombre, apellido, edad, tipoCliente } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const pool = await getDbConnection();
    const tipoClienteID = await pool
      .request()
      .query(
        `SELECT TipoClienteID FROM TipoCliente WHERE TipoCliente = '${tipoCliente}'`
      );

    if (tipoClienteID.recordset.length === 0) {
      return res.status(400).json({ message: "Tipo de cliente no válido" });
    }

    // Insertar usuario
    const result = await pool
      .request()
      .input("correo", correo)
      .input("contrasena", hashedPassword)
      .input("nombre", nombre)
      .input("apellido", apellido)
      .input("edad", edad)
      .input("tipoClienteID", tipoClienteID.recordset[0].TipoClienteID).query(`
                INSERT INTO Usuario (Correo, Contrasena, Nombre, Apellido, Edad, TipoClienteID) 
				OUTPUT INSERTED.UsuarioID
                VALUES (@correo, @contrasena, @nombre, @apellido, @edad, @tipoClienteID);
            `);
    const usuarioID = result.recordset[0].UsuarioID;
    // Crear granja vacía solo si es agricultor
    if (tipoCliente === "Agricultor") {
      await pool
        .request()
        .input("nombre", `${nombre} Granja`)
        .input("ubicacion", "Sin especificar")
        .input("UsuarioID", usuarioID).query(`
                    INSERT INTO Granja (Nombre, Ubicacion, UsuarioID) 
                    VALUES (@nombre, @ubicacion, @usuarioID);
                `);
    }

    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

//? Login
router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const pool = await getDbConnection();
    const user = await pool
      .request()
      .input("correo", correo)
      .query(`SELECT * FROM Usuario WHERE Correo = @correo`);

    if (user.recordset.length === 0) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const validPassword = await bcrypt.compare(
      contrasena,
      user.recordset[0].Contrasena
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { userId: user.recordset[0].UsuarioID },
      "your_secret_key",
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

//? Ver granjas
router.get("/farms", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const farms = await pool.request().query(`SELECT 
    g.*,
    -- Subconsulta para productos
    (
        SELECT 
            p.Nombre AS name,
            p.Descripcion AS Descripcion ,
            p.Imagen AS image
        FROM Productos p
        WHERE p.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS productos,
    -- Subconsulta para prácticas sustentables
    (
        SELECT 
            ps.PracticaID AS id,
            ps.Nombre AS nombre,
            ps.Descripcion AS descripcion,
            ps.Icon AS icon
        FROM Granja_Practicas gp
        INNER JOIN PracticasSustentables ps ON ps.PracticaID = gp.PracticaID
        WHERE gp.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS practicas_sustentables,
    -- Subconsulta para badges
    (
        SELECT 
            b.BadgeID AS id,
            b.Nombre AS nombre,
            b.Descripcion AS descripcion,
            b.Imagen AS imagen
        FROM Badge_Granja bg
        INNER JOIN Badge b ON b.BadgeID = bg.BadgeID
        WHERE bg.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS badges
FROM 
    Granja g
ORDER BY 
    g.Rating DESC
`);
    res.status(200).json(farms.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las granjas" });
  }
});

//? Ver granja por ID
router.get("/farm/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getDbConnection();
    const farm = await pool.request().input("id", id).query(`SELECT 
    g.*,
    -- Subconsulta para productos
    (
        SELECT 
            p.Nombre AS name,
            p.Descripcion AS Descripcion ,
            p.Imagen AS image
        FROM Productos p
        WHERE p.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS productos,
    -- Subconsulta para prácticas sustentables
    (
        SELECT 
            ps.PracticaID AS id,
            ps.Nombre AS nombre,
            ps.Descripcion AS descripcion,
            ps.Icon AS icon
        FROM Granja_Practicas gp
        INNER JOIN PracticasSustentables ps ON ps.PracticaID = gp.PracticaID
        WHERE gp.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS practicas_sustentables,
    -- Subconsulta para badges
    (
        SELECT 
            b.BadgeID AS id,
            b.Nombre AS nombre,
            b.Descripcion AS descripcion,
            b.Imagen AS imagen
        FROM Badge_Granja bg
        INNER JOIN Badge b ON b.BadgeID = bg.BadgeID
        WHERE bg.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS badges
FROM 
    Granja g
WHERE
			g.GranjaID = @id
ORDER BY 
    g.Rating DESC
`);

    if (farm.recordset.length === 0) {
      return res.status(404).json({ message: "Granja no encontrada" });
    }

    res.status(200).json(farm.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener la granja" });
  }
});

//? Ver mi granja
router.get("/myfarm/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getDbConnection();
    const farm = await pool.request().input("usuarioID", userId).query(`SELECT 
    g.*,
    -- Subconsulta para productos
    (
        SELECT 
            p.Nombre AS name,
            p.Descripcion AS Descripcion ,
            p.Imagen AS image
        FROM Productos p
        WHERE p.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS productos,
    -- Subconsulta para prácticas sustentables
    (
        SELECT 
            ps.PracticaID AS id,
            ps.Nombre AS nombre,
            ps.Descripcion AS descripcion,
            ps.Icon AS icon
        FROM Granja_Practicas gp
        INNER JOIN PracticasSustentables ps ON ps.PracticaID = gp.PracticaID
        WHERE gp.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS practicas_sustentables,
    -- Subconsulta para badges
    (
        SELECT 
            b.BadgeID AS id,
            b.Nombre AS nombre,
            b.Descripcion AS descripcion,
            b.Imagen AS imagen
        FROM Badge_Granja bg
        INNER JOIN Badge b ON b.BadgeID = bg.BadgeID
        WHERE bg.GranjaID = g.GranjaID
        FOR JSON PATH
    ) AS badges
FROM 
    Granja g
	WHERE UsuarioID = @usuarioID`);
    if (farm.recordset.length === 0) {
      return res.status(404).json({
        message: "No se encontró una granja asociada a este usuario",
      });
    }

    res.status(200).json(farm.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener la información de la granja",
    });
  }
});

//? Actualizar info granja
router.put("/farm/:id/info", async (req, res) => {
  const { id } = req.params;
  const { nombre, ubicacion, descripcion } = req.body;

  try {
    const pool = await getDbConnection();
    await pool
      .request()
      .input("id", id)
      .input("nombre", nombre)
      .input("ubicacion", ubicacion)
      .input("descripcion", descripcion).query(`
                UPDATE Granja 
                SET Nombre = @nombre, Ubicacion = @ubicacion, Descripcion = @descripcion
                WHERE GranjaID = @id;
            `);

    res.status(200).json({
      message: "Información de la granja actualizada exitosamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al actualizar la información de la granja",
    });
  }
});

//? Actualizar imagen de la granja
router.put("/farm/:id/image", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No se proporcionó una imagen" });
  }

  try {
    // Subir imagen al blob storage
    const blobName = `${Date.now()}-${file.originalname}`;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    const imageUrl = blockBlobClient.url;
    const pool = await getDbConnection();
    // Actualizar el campo Imagen en la base de datos
    await pool.request().input("id", id).input("imagen", imageUrl).query(`
                UPDATE Granja 
                SET Imagen = @imagen
                WHERE GranjaID = @id;
            `);

    res.status(200).json({
      message: "Imagen actualizada exitosamente",
      imageUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al subir la imagen" });
  }
});

module.exports = router;
