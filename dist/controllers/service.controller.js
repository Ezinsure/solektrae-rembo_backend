"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicServices = exports.deleteService = exports.reorderServices = exports.updateService = exports.createService = exports.getService = exports.getServices = exports.getServiceFields = void 0;
const asyncHandle_1 = require("../utils/asyncHandle");
const serviceServices_1 = require("../services/serviceServices");
const auditContext_1 = require("../utils/auditContext");
const servicedto_1 = require("../dtos/services/servicedto");
exports.getServiceFields = (0, asyncHandle_1.asyncHandler)(async (_req, res) => {
    res.status(200).json({ success: true, data: serviceServices_1.serviceService.fieldCatalog() });
});
exports.getServices = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const query = servicedto_1.serviceListQuerySchema.parse(req.query);
    const services = await serviceServices_1.serviceService.list((0, auditContext_1.requireCompanyId)(req), {
        includeInactive: query.includeInactive === "true",
        search: query.search,
    });
    res.status(200).json({ success: true, data: services });
});
exports.getService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const service = await serviceServices_1.serviceService.getOne((0, auditContext_1.requireCompanyId)(req), servicedto_1.uuidParam.parse(req.params.id));
    res.status(200).json({ success: true, data: service });
});
exports.createService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const dto = servicedto_1.createServiceSchema.parse(req.body);
    const service = await serviceServices_1.serviceService.create((0, auditContext_1.requireCompanyId)(req), dto, (0, auditContext_1.auditContext)(req));
    res.status(201).json({ success: true, message: "Service created", data: service });
});
exports.updateService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const dto = servicedto_1.updateServiceSchema.parse(req.body);
    const service = await serviceServices_1.serviceService.update((0, auditContext_1.requireCompanyId)(req), servicedto_1.uuidParam.parse(req.params.id), dto, (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, message: "Service updated", data: service });
});
exports.reorderServices = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const { ids } = servicedto_1.reorderServicesSchema.parse(req.body);
    const services = await serviceServices_1.serviceService.reorder((0, auditContext_1.requireCompanyId)(req), ids, (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, message: "Order saved", data: services });
});
exports.deleteService = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await serviceServices_1.serviceService.remove((0, auditContext_1.requireCompanyId)(req), servicedto_1.uuidParam.parse(req.params.id), (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, message: "Service deleted" });
});
// Public (no login): services for the customer form
exports.getPublicServices = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const data = await serviceServices_1.serviceService.listPublic(servicedto_1.slugParam.parse(req.params.companySlug));
    res.status(200).json({ success: true, data });
});
//# sourceMappingURL=service.controller.js.map