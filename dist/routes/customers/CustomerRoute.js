"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../../controllers/customer.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const validateDto_1 = require("../../middleware/validateDto");
const customerdto_1 = require("../../dtos/customers/customerdto");
const customerdto_2 = require("../../dtos/customers/customerdto");
const User_1 = require("../../entities/User");
const CustomeRoutes = (0, express_1.Router)();
CustomeRoutes.post("/", (0, validateDto_1.validateDto)(customerdto_1.CreateCustomerDto), customer_controller_1.createCustomer);
CustomeRoutes.get("/all", authMiddleware_1.authenticate, customer_controller_1.getCustomers);
CustomeRoutes.get("/one/:id", authMiddleware_1.authenticate, customer_controller_1.getCustomerById);
CustomeRoutes.patch("/:id", authMiddleware_1.authenticate, (0, validateDto_1.validateDto)(customerdto_2.UpdateCustomerDto), customer_controller_1.updateCustomer);
CustomeRoutes.patch("/:id/status", authMiddleware_1.authenticate, (0, validateDto_1.validateDto)(customerdto_1.UpdateCustomerStatusDto), customer_controller_1.updateCustomerStatus);
CustomeRoutes.delete("/:id", authMiddleware_1.authenticate, (0, roleMiddleware_1.authorize)(User_1.UserRole.ADMIN, User_1.UserRole.HR, User_1.UserRole.DEV), (0, roleMiddleware_1.authorize)(User_1.UserRole.ADMIN, User_1.UserRole.DEV), customer_controller_1.deleteCustomer);
exports.default = CustomeRoutes;
//# sourceMappingURL=CustomerRoute.js.map