"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const apiError_1 = require("../utils/apiError");
// Must run *after* authenticate — it relies on req.user already being set.
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return next(new apiError_1.ApiError(401, "Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role)) {
        return next(new apiError_1.ApiError(403, "You do not have permission to perform this action"));
    }
    next();
};
exports.authorize = authorize;
//# sourceMappingURL=roleMiddleware.js.map