"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const token_1 = require("../utils/token");
const apiError_1 = require("../utils/apiError");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return next(new apiError_1.ApiError(401, "Missing or invalid authorization header"));
    }
    const token = header.slice(7).trim();
    try {
        req.user = (0, token_1.verifyAccessToken)(token);
        return next();
    }
    catch (e) {
        if (e instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new apiError_1.ApiError(401, "Access token expired", { code: "TOKEN_EXPIRED" }));
        }
        next(new apiError_1.ApiError(401, "Invalid  access token"));
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authMiddleware.js.map