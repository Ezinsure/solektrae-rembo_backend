"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDto = validateDto;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const apiError_1 = require("../utils/apiError");
function validateDto(DtoClass) {
    return async (req, res, next) => {
        const instance = (0, class_transformer_1.plainToInstance)(DtoClass, req.body);
        const errors = await (0, class_validator_1.validate)(instance, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
            const details = errors.map((e) => ({
                field: e.property,
                constraints: e.constraints,
            }));
            return next(new apiError_1.ApiError(400, "Validation failed", details));
        }
        req.body = instance;
        next();
    };
}
//# sourceMappingURL=validateDto.js.map