"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupService = exports.SetupService = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const userdto_1 = require("../dtos/users/userdto");
const password_1 = require("../utils/password");
const apiError_1 = require("../utils/apiError");
class SetupService {
    repo = database_1.AppDataSource.getRepository(User_1.User);
    async bootstrapAdmin(dto) {
        // The entire security model of this endpoint rests on this one check.
        // `withDeleted: true` matters: if every user were somehow soft-deleted,
        // a normal count() would return 0 and this would wrongly treat the
        // system as "empty," reopening bootstrap on a system that has actually
        // already been initialized.
        const existingUserCount = await this.repo.count({ withDeleted: true });
        if (existingUserCount > 0) {
            throw new apiError_1.ApiError(403, "System already initialized. Ask an existing admin to create your account.");
        }
        const admin = this.repo.create({
            names: dto.names,
            email: dto.email,
            password: await (0, password_1.hashPassword)(dto.password),
            role: User_1.UserRole.ADMIN,
            phoneNumber: dto.phoneNumber,
            isActive: true,
            mustChangePassword: true,
        });
        const saved = await this.repo.save(admin);
        return userdto_1.UserResponseDto.fromEntity(saved);
    }
}
exports.SetupService = SetupService;
exports.setupService = new SetupService();
//# sourceMappingURL=setupService.js.map