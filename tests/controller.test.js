const { getDbConnection } = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { BlobServiceClient } = require("@azure/storage-blob");

jest.mock("../db"); // Mock de la conexión a la base de datos
jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("@azure/storage-blob");

describe("Controlador - API", () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Limpiar mocks antes de cada prueba
    });

    test("Registro de usuario exitoso", async () => {
        const req = {
            body: {
                correo: "test@example.com",
                contrasena: "password123",
                nombre: "Juan",
                apellido: "Pérez",
                edad: 30,
                tipoCliente: "Agricultor",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const mockPool = {
            request: jest.fn().mockReturnThis(),
            input: jest.fn().mockReturnThis(),
            query: jest.fn().mockImplementation((query) => {
                if (query.includes("SELECT TipoClienteID")) {
                    return { recordset: [{ TipoClienteID: 1 }] };
                }
                if (query.includes("INSERT INTO Usuario")) {
                    return { recordset: [{ UsuarioID: 123 }] };
                }
            }),
        };

        getDbConnection.mockResolvedValue(mockPool);
        bcrypt.hash.mockResolvedValue("hashedPassword");

        const { postRegister } = require("../controller"); // Asegúrate de que la función esté exportada correctamente
        await postRegister(req, res);

        expect(getDbConnection).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: "Usuario registrado exitosamente",
        });
    });

    test("Login exitoso", async () => {
        const req = {
            body: {
                correo: "test@example.com",
                contrasena: "password123",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const mockPool = {
            request: jest.fn().mockReturnThis(),
            input: jest.fn().mockReturnThis(),
            query: jest.fn().mockResolvedValue({
                recordset: [
                    {
                        UsuarioID: 123,
                        Contrasena: "hashedPassword",
                    },
                ],
            }),
        };

        getDbConnection.mockResolvedValue(mockPool);
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue("fake-token");

        const { postLogin } = require("../controller"); // Asegúrate de que la función esté exportada correctamente
        await postLogin(req, res);

        expect(getDbConnection).toHaveBeenCalled();
        expect(bcrypt.compare).toHaveBeenCalledWith(
            "password123",
            "hashedPassword"
        );
        expect(jwt.sign).toHaveBeenCalledWith(
            { userId: 123 },
            "your_secret_key",
            { expiresIn: "1h" }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ token: "fake-token" });
    });

    test("Login fallido por contraseña incorrecta", async () => {
        const req = {
            body: {
                correo: "test@example.com",
                contrasena: "incorrectPassword",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const mockPool = {
            request: jest.fn().mockReturnThis(),
            input: jest.fn().mockReturnThis(),
            query: jest.fn().mockResolvedValue({
                recordset: [
                    {
                        UsuarioID: 123,
                        Contrasena: "hashedPassword",
                    },
                ],
            }),
        };

        getDbConnection.mockResolvedValue(mockPool);
        bcrypt.compare.mockResolvedValue(false);

        const { postLogin } = require("../controller"); // Asegúrate de que la función esté exportada correctamente
        await postLogin(req, res);

        expect(getDbConnection).toHaveBeenCalled();
        expect(bcrypt.compare).toHaveBeenCalledWith(
            "incorrectPassword",
            "hashedPassword"
        );
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: "Credenciales incorrectas",
        });
    });

    test("Error al obtener granja por ID", async () => {
        const req = { params: { id: 1 } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        const mockPool = {
            request: jest.fn().mockReturnThis(),
            input: jest.fn().mockReturnThis(),
            query: jest.fn().mockResolvedValue({ recordset: [] }),
        };

        getDbConnection.mockResolvedValue(mockPool);

        const { getFarmById } = require("../controller"); // Asegúrate de que la función esté exportada correctamente
        await getFarmById(req, res);

        expect(getDbConnection).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Granja no encontrada",
        });
    });
});