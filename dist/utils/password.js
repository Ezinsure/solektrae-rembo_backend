"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 12;
const hashPassword = (plain) => bcrypt_1.default.hash(plain, SALT_ROUNDS);
exports.hashPassword = hashPassword;
const comparePassword = (plain, hash) => bcrypt_1.default.compare(plain, hash);
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.js.map