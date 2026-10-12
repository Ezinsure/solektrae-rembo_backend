"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = require("../../controllers/service.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const User_1 = require("../../entities/User");
const ServiceRoutes = (0, express_1.Router)();
const MANAGE = [User_1.UserRole.ADMIN, User_1.UserRole.DEV, User_1.UserRole.HR];
ServiceRoutes.use(authMiddleware_1.authenticate);
ServiceRoutes.get("/fields", service_controller_1.getServiceFields);
ServiceRoutes.get("/", service_controller_1.getServices);
ServiceRoutes.patch("/reorder", (0, roleMiddleware_1.authorize)(...MANAGE), service_controller_1.reorderServices);
ServiceRoutes.get("/:id", service_controller_1.getService);
ServiceRoutes.post("/", (0, roleMiddleware_1.authorize)(...MANAGE), service_controller_1.createService);
ServiceRoutes.patch("/:id", (0, roleMiddleware_1.authorize)(...MANAGE), service_controller_1.updateService);
ServiceRoutes.delete("/:id", (0, roleMiddleware_1.authorize)(...MANAGE), service_controller_1.deleteService);
exports.default = ServiceRoutes;
//# sourceMappingURL=ServiceRoutes.js.map