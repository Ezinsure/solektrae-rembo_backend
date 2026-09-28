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
const routes = (0, express_1.Router)();
routes.use("/admin", SetUpRoutes_1.default);
routes.use("/auth", AuthRoutes_1.default);
routes.use("/users", userRoutes_1.default);
routes.use("/services", ServiceRoutes_1.default);
routes.use("/customers", CustomerRoute_1.default);
exports.default = routes;
//# sourceMappingURL=page.js.map