"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminResetPassword = exports.toggleUserActive = exports.restoreUser = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const userService_1 = require("../services/userService");
const asyncHandle_1 = require("../utils/asyncHandle");
const class_transformer_1 = require("class-transformer");
const userdto_1 = require("../dtos/users/userdto");
const class_validator_1 = require("class-validator");
const auditContext_1 = require("../utils/auditContext");
exports.createUser = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.create(req.body, (0, auditContext_1.auditContext)(req));
    res.status(201).json({ success: true, data: user });
});
exports.getUsers = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const query = (0, class_transformer_1.plainToInstance)(userdto_1.UserQueryDto, req.query);
    const errors = await (0, class_validator_1.validate)(query);
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid query parameters",
            errors,
        });
    }
    const result = await userService_1.userService.findAll(query);
    res.status(200).json({
        success: true,
        ...result,
    });
});
exports.getUserById = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.findById(req.params.id);
    res.status(200).json({ success: true, data: user });
});
exports.updateUser = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.update(req.params.id, req.body, (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, data: user });
});
exports.deleteUser = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await userService_1.userService.softDelete(req.params.id, (0, auditContext_1.auditContext)(req));
    res.status(204).send();
});
exports.restoreUser = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.restore(req.params.id, (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, data: user });
});
exports.toggleUserActive = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await userService_1.userService.setActive(req.params.id, req.body.isActive, (0, auditContext_1.auditContext)(req));
    res.status(200).json({ success: true, data: user });
});
exports.adminResetPassword = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    await userService_1.userService.adminResetPassword(req.params.id, req.body, (0, auditContext_1.auditContext)(req));
    res
        .status(200)
        .json({ success: true, message: "Password reset successfully" });
});
//# sourceMappingURL=user.controller.js.map