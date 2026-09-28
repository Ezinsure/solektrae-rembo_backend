"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomerStatus = exports.updateCustomer = exports.getCustomerById = exports.getCustomers = exports.createCustomer = void 0;
const asyncHandle_1 = require("../utils/asyncHandle");
const customerService_1 = require("../services/customerService");
const class_transformer_1 = require("class-transformer");
const customerdto_1 = require("../dtos/customers/customerdto");
const class_validator_1 = require("class-validator");
exports.createCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const customer = await customerService_1.customerService.create(req.body);
    res.status(201).json({ success: true, data: customer });
});
exports.getCustomers = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const query = (0, class_transformer_1.plainToInstance)(customerdto_1.CustomerQueryDto, req.query);
    const errors = await (0, class_validator_1.validate)(query);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid query parameters",
            errors,
        });
    }
    const result = await customerService_1.customerService.findAll(query);
    res.status(200).json({ success: true, ...result });
});
exports.getCustomerById = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const customer = await customerService_1.customerService.findById(req.params.id);
    res.status(200).json({ success: true, data: customer });
});
exports.updateCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const customer = await customerService_1.customerService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data: customer });
});
exports.updateCustomerStatus = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const customer = await customerService_1.customerService.updateStatus(req.params.id, req.body.status, req.user.id);
    res.status(200).json({
        success: true,
        data: customer,
    });
});
exports.deleteCustomer = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await customerService_1.customerService.softDelete(req.params.id);
    res.status(204).send();
});
//# sourceMappingURL=customer.controller.js.map