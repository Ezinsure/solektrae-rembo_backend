"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateService = exports.getServiceById = exports.getServices = exports.createService = void 0;
const User_1 = require("../entities/User");
const asyncHandle_1 = require("../utils/asyncHandle");
const serviceServices_1 = require("../services/serviceServices");
exports.createService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const service = await serviceServices_1.serviceService.create(req.body);
    res.status(201).json({ success: true, data: service });
});
exports.getServices = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    // Only an authenticated ADMIN gets to see inactive/retired services.
    // Everyone else (including anonymous customers filling the registration
    // form) only ever sees the active list, regardless of what they pass in
    // the query string.
    const wantsInactive = req.query.includeInactive === "true";
    const isAdmin = req.user?.role === User_1.UserRole.ADMIN;
    const services = await serviceServices_1.serviceService.findAll(wantsInactive && isAdmin);
    res.status(200).json({ success: true, data: services });
});
exports.getServiceById = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const service = await serviceServices_1.serviceService.findById(req.params.id);
    res.status(200).json({ success: true, data: service });
});
exports.updateService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const service = await serviceServices_1.serviceService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data: service });
});
// export const deleteService = asyncHandler(async (req, res: Response) => {
//   await serviceService.softDelete(req.params.id as any);
//   res.status(204).send();
// });
//# sourceMappingURL=service.controller.js.map