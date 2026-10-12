"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userRoutes_1 = __importDefault(require("./user/userRoutes"));
const SetUpRoutes_1 = __importDefault(require("./setup/SetUpRoutes"));
const ServiceRoutes_1 = __importDefault(require("./services/ServiceRoutes"));
const CustomerRoute_1 = __importDefault(require("./customers/CustomerRoute"));
const AuthRoutes_1 = __importDefault(require("./auth/AuthRoutes"));
const activityLogRouter_1 = __importDefault(require("./logs/activityLogRouter"));
const CompanyRoutes_1 = __importDefault(require("./company/CompanyRoutes"));
const rolesRoutes_1 = __importDefault(require("./roles/rolesRoutes"));
const publicRoutes_1 = __importDefault(require("./publicRoutes"));
const dashRoutes_1 = __importDefault(require("./dashRoutes"));
const routes = (0, express_1.Router)();
routes.use("/public", publicRoutes_1.default);
routes.use("/admin", SetUpRoutes_1.default);
routes.use("/auth", AuthRoutes_1.default);
routes.use("/dashboard", dashRoutes_1.default);
routes.use("/users", userRoutes_1.default);
routes.use("/services", ServiceRoutes_1.default);
routes.use("/customers", CustomerRoute_1.default);
routes.use("/logs", activityLogRouter_1.default);
routes.use("/companies", CompanyRoutes_1.default);
routes.use("/roles", rolesRoutes_1.default);
exports.default = routes;
//# sourceMappingURL=page.js.map