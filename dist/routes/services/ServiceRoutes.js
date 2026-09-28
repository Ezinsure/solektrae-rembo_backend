"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = require("../../controllers/service.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const validateDto_1 = require("../../middleware/validateDto");
const servicedto_1 = require("../../dtos/services/servicedto");
const ServiceRoutes = (0, express_1.Router)();
ServiceRoutes.get("/", 
//  authenticate,
service_controller_1.getServices);
ServiceRoutes.get("/:id", service_controller_1.getServiceById);
ServiceRoutes.post("/", authMiddleware_1.authenticate, (0, validateDto_1.validateDto)(servicedto_1.CreateServiceDto), service_controller_1.createService);
ServiceRoutes.patch("/:id", authMiddleware_1.authenticate, 
//   authorize(UserRole.ADMIN),
(0, validateDto_1.validateDto)(servicedto_1.UpdateServiceDto), service_controller_1.updateService);
// ServiceRoutes.delete(
//   "/:id",
//   authenticate,
//    authorize(UserRole.ADMIN),
//   deleteService,
// );
exports.default = ServiceRoutes;
//# sourceMappingURL=ServiceRoutes.js.map