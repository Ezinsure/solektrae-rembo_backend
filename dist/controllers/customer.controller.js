"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerStats = exports.deleteCustomer = exports.updateCustomerStatus = exports.updateCustomer = exports.getCustomerById = exports.exportCustomers = exports.getCustomers = exports.submitPublicCustomer = void 0;
const asyncHandle_1 = require("../utils/asyncHandle");
const customerService_1 = require("../services/customerService");
const auditContext_1 = require("../utils/auditContext");
const customerdto_1 = require("../dtos/customers/customerdto");
// Public: customer applies
exports.submitPublicCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const dto = customerdto_1.customerFormSchema.parse(req.body);
    const result = await customerService_1.customerService.submitPublic(customerdto_1.slugParam.parse(req.params.companySlug), dto);
    res
        .status(201)
        .json({ success: true, message: "Application submitted", data: result });
});
exports.getCustomers = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const query = customerdto_1.customerQuerySchema.parse(req.query);
    const result = await customerService_1.customerService.findAll((0, auditContext_1.requireCompanyId)(req), query);
    res.status(200).json({ success: true, ...result });
});
exports.exportCustomers = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const filters = customerdto_1.customerExportSchema.parse(req.query);
    const { csv, total, truncated } = await customerService_1.customerService.exportCsv((0, auditContext_1.requireCompanyId)(req), filters);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${date}.csv"`);
    res.setHeader("X-Total-Count", String(total));
    res.setHeader("X-Truncated", String(truncated));
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Total-Count, X-Truncated");
    res.status(200).send(csv);
});
exports.getCustomerById = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const customer = await customerService_1.customerService.findById((0, auditContext_1.requireCompanyId)(req), customerdto_1.uuidParam.parse(req.params.id));
    res.status(200).json({ success: true, data: customer });
});
exports.updateCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const dto = customerdto_1.customerFormSchema.parse(req.body);
    const customer = await customerService_1.customerService.update((0, auditContext_1.requireCompanyId)(req), customerdto_1.uuidParam.parse(req.params.id), dto, (0, auditContext_1.auditContext)(req));
    res
        .status(200)
        .json({ success: true, message: "Customer updated", data: customer });
});
exports.updateCustomerStatus = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const { status, note } = customerdto_1.customerStatusSchema.parse(req.body);
    const customer = await customerService_1.customerService.updateStatus((0, auditContext_1.requireCompanyId)(req), customerdto_1.uuidParam.parse(req.params.id), status, note, (0, auditContext_1.auditContext)(req));
    res
        .status(200)
        .json({ success: true, message: "Status updated", data: customer });
});
exports.deleteCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await customerService_1.customerService.softDelete((0, auditContext_1.requireCompanyId)(req), customerdto_1.uuidParam.parse(req.params.id), (0, auditContext_1.auditContext)(req));
    res.status(204).send();
});
exports.getCustomerStats = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const filters = customerdto_1.customerExportSchema.parse(req.query);
    const stats = await customerService_1.customerService.stats((0, auditContext_1.requireCompanyId)(req), filters);
    res.status(200).json({ success: true, data: stats });
});
//# sourceMappingURL=customer.controller.js.map