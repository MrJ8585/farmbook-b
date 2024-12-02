const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	server: process.env.DB_SERVER,
	database: process.env.DB_NAME,
	options: {
		encrypt: process.env.DB_ENCRYPT === "true",
		trustServerCertificate:
			process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
		loginTimeout: parseInt(process.env.DB_LOGIN_TIMEOUT, 10) || 30000,
	},
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000,
	},
};

// Exportar la conexión
let pool;

const getDbConnection = async () => {
	if (!pool) {
		try {
			pool = await sql.connect(dbConfig);
			console.log("Conexión a SQL Server establecida");
		} catch (err) {
			console.error("Error al conectar a SQL Server", err);
			throw err;
		}
	}
	return pool;
};

module.exports = { getDbConnection, sql };
