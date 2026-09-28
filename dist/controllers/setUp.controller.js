"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapAdmin = void 0;
const setupService_1 = require("../services/setupService");
const asyncHandle_1 = require("../utils/asyncHandle");
exports.bootstrapAdmin = (0, asyncHandle_1.asyncHandler)(async (req, res) => {
    const user = await setupService_1.setupService.bootstrapAdmin(req.body);
    res.status(201).json({
        success: true,
        message: "Admin account created. You can now log in.",
        data: user,
    });
});
//# sourceMappingURL=setUp.controller.js.map