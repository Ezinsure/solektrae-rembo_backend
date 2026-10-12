"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../../controllers/customer.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const User_1 = require("../../entities/User");
const CustomeRoutes = (0, express_1.Router)();
CustomeRoutes.use(authMiddleware_1.authenticate);
CustomeRoutes.get("/all", authMiddleware_1.authenticate, customer_controller_1.getCustomers);
CustomeRoutes.get("/stats", customer_controller_1.getCustomerStats);
CustomeRoutes.get("/export", customer_controller_1.exportCustomers);
CustomeRoutes.get("/one/:id", customer_controller_1.getCustomerById);
CustomeRoutes.patch("/:id", customer_controller_1.updateCustomer);
CustomeRoutes.patch("/:id/status", customer_controller_1.updateCustomerStatus);
CustomeRoutes.delete("/:id", (0, roleMiddleware_1.authorize)(User_1.UserRole.ADMIN, User_1.UserRole.DEV), customer_controller_1.deleteCustomer);
exports.default = CustomeRoutes;
//# sourceMappingURL=CustomerRoute.js.map