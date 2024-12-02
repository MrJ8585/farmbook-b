const sql = require("mssql");
require("dotenv").config();

const connectionString = process.env.SQL_CONNECTION_STRING;

// Exportar la conexión
let pool;

const getDbConnection = async () => {
	if (!pool) {
		try {
			pool = await sql.connect(connectionString);
			console.log("Conexión a SQL Server establecida");
		} catch (err) {
			console.error("Error al conectar a SQL Server", err);
			throw err;
		}
	}
	return pool;
};

module.exports = { getDbConnection, sql };
