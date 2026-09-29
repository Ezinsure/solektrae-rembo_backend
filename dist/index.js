"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
require("reflect-metadata");
const database_1 = require("./config/database");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const page_1 = __importDefault(require("./routes/page"));
const errorHandle_1 = require("./middleware/errorHandle");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 9000;
app.use((0, helmet_1.default)());
const allowedOrigins = process.env.FRONTEND_URL?.split(",") || [];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// ROUTES
app.use("/v1/erembo", page_1.default);
// Global Error Handler
app.use(errorHandle_1.errorHandler);
// Database Connection
const startServer = async () => {
    try {
        await database_1.AppDataSource.initialize();
        console.log("Database connected successfully");
        app.listen(PORT, () => {
            console.log(`Server is running on : http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map