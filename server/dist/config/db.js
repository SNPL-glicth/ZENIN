"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.getConnection = getConnection;
exports.closeConnection = closeConnection;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file from project root
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1434'),
    database: process.env.DB_DATABASE || 'zenin_db',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
};
let pool = null;
async function getConnection() {
    if (!pool) {
        pool = await mssql_1.default.connect(config);
        console.log('[DB] Connected to zenin_db');
    }
    return pool;
}
async function closeConnection() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('[DB] Connection closed');
    }
}
//# sourceMappingURL=db.js.map