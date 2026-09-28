"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const userdto_1 = require("../dtos/users/userdto");
const password_1 = require("../utils/password");
const apiError_1 = require("../utils/apiError");
class UserService {
    repo = database_1.AppDataSource.getRepository(User_1.User);
    async findAll(query) {
        const qb = this.repo.createQueryBuilder("user");
        if (query.search) {
            qb.andWhere("(user.names ILIKE :search OR user.email ILIKE :search)", {
                search: `%${query.search}%`,
            });
        }
        if (query.role) {
            qb.andWhere("user.role = :role", { role: query.role });
        }
        if (query.isActive !== undefined) {
            qb.andWhere("user.isActive = :isActive", { isActive: query.isActive });
        }
        qb.orderBy("user.createdAt", "DESC")
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [users, total] = await qb.getManyAndCount();
        return {
            data: userdto_1.UserResponseDto.fromEntities(users),
            total,
            page: query.page,
            limit: query.limit,
        };
    }
    async findById(id) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        return userdto_1.UserResponseDto.fromEntity(user);
    }
    // Used internally by auth.service — needs the password hash, so it
    // deliberately returns the raw entity, not the response DTO.
    async findEntityByEmailWithPassword(email) {
        return this.repo
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.email = :email", { email })
            .getOne();
    }
    async findEntityById(id) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        return user;
    }
    async create(dto) {
        const existing = await this.repo.findOne({
            where: { email: dto.email },
            withDeleted: true,
        });
        if (existing) {
            throw new apiError_1.ApiError(409, "A user with this email already exists");
        }
        const user = this.repo.create({
            names: dto.names,
            email: dto.email,
            password: await (0, password_1.hashPassword)(dto.password),
            role: dto.role,
            phoneNumber: dto.phoneNumber,
            profileImage: dto.profileImage ?? null,
            mustChangePassword: true,
        });
        const saved = await this.repo.save(user);
        return userdto_1.UserResponseDto.fromEntity(saved);
    }
    async update(id, dto) {
        const user = await this.findEntityById(id);
        if (dto.email && dto.email !== user.email) {
            const existing = await this.repo.findOne({
                where: { email: dto.email },
                withDeleted: true,
            });
            if (existing) {
                throw new apiError_1.ApiError(409, "A user with this email already exists");
            }
        }
        // Guard: don't let the last remaining admin be demoted.
        if (dto.role &&
            dto.role !== User_1.UserRole.ADMIN &&
            user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        // Guard: don't let the last remaining admin be deactivated.
        if (dto.isActive === false && user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        const saved = await this.repo.save(user);
        return userdto_1.UserResponseDto.fromEntity(saved);
    }
    //   async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    //   const user = await this.findEntityById(id);
    //   if (dto.email && dto.email !== user.email) {
    //     const existing = await this.repo.findOne({
    //       where: { email: dto.email },
    //       withDeleted: true,
    //     });
    //     if (existing && existing.id !== user.id) {
    //       throw new ApiError(409, "A user with this email already exists");
    //     }
    //   }
    //   if (dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN) {
    //     await this.assertNotLastActiveAdmin(user.id);
    //   }
    //   if (dto.isActive === false && user.role === UserRole.ADMIN) {
    //     await this.assertNotLastActiveAdmin(user.id);
    //   }
    //   if (dto.names !== undefined) user.names = dto.names;
    //   if (dto.email !== undefined) user.email = dto.email;
    //   if (dto.role !== undefined) user.role = dto.role;
    //   if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    //   if (dto.profileImage !== undefined) user.profileImage = dto.profileImage;
    //   if (dto.isActive !== undefined) user.isActive = dto.isActive;
    //   const saved = await this.repo.save(user);
    //   return UserResponseDto.fromEntity(saved);
    // }
    async softDelete(id) {
        const user = await this.findEntityById(id);
        if (user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        await this.repo.softDelete(id);
    }
    async restore(id) {
        const user = await this.repo.findOne({ where: { id }, withDeleted: true });
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        await this.repo.restore(id);
        return this.findById(id);
    }
    async changeOwnPassword(userId, dto) {
        const user = await this.repo
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.id = :id", { id: userId })
            .getOne();
        if (!user)
            throw new apiError_1.ApiError(404, "User not found");
        const matches = await (0, password_1.comparePassword)(dto.currentPassword, user.password);
        if (!matches)
            throw new apiError_1.ApiError(401, "Current password is incorrect");
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = false;
        await this.repo.save(user);
    }
    async adminResetPassword(id, dto) {
        const user = await this.findEntityById(id);
        user.password = await (0, password_1.hashPassword)(dto.newPassword);
        user.mustChangePassword = true;
        await this.repo.save(user);
    }
    async setActive(id, isActive) {
        const user = await this.findEntityById(id);
        if (!isActive && user.role === User_1.UserRole.ADMIN) {
            await this.assertNotLastActiveAdmin(user.id);
        }
        user.isActive = isActive;
        const saved = await this.repo.save(user);
        return userdto_1.UserResponseDto.fromEntity(saved);
    }
    // Prevents a scenario where every admin gets deactivated/demoted/deleted
    // and nobody left has permission to fix it. Excludes the user currently
    // being acted on from the count, so it correctly blocks only when they'd
    // be the LAST one left.
    async assertNotLastActiveAdmin(excludingUserId) {
        const remainingAdmins = await this.repo.count({
            where: { role: User_1.UserRole.ADMIN, isActive: true },
        });
        const targetIsCountedAdmin = await this.repo.findOne({
            where: { id: excludingUserId, role: User_1.UserRole.ADMIN, isActive: true },
        });
        const countExcludingTarget = targetIsCountedAdmin
            ? remainingAdmins - 1
            : remainingAdmins;
        if (countExcludingTarget < 1) {
            throw new apiError_1.ApiError(409, "Cannot proceed: this is the last active admin account. Promote another user to admin first.");
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=userService.js.map