import { EntityManager } from "typeorm";
import { AppDataSource } from "../config/database";
import { Role } from "../entities/Roles";
import { CompanyMember } from "../entities/CompanyMember";
import { User, UserRole } from "../entities/User";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { ApiError } from "../utils/apiError";
import { AuditContext } from "../utils/auditContext";
import { diff } from "../utils/diff";
import { activityLogService } from "./activityLog";
import { SYSTEM_ROLES } from "../constants/roles";

const ROLE_LABELS: any = {
  name: "Name",
  description: "Description",
  baseRole: "Access level",
};

class RoleService {
  private repo = AppDataSource.getRepository(Role);
  private members = AppDataSource.getRepository(CompanyMember);

  async list(companyId: string) {
    const roles = await this.repo.find({
      where: { companyId },
      order: { isSystem: "DESC", name: "ASC" },
    });
    const counts = await this.userCounts(companyId);
    return roles.map((r) => this.toResponse(r, counts[r.id] ?? 0));
  }

  async getOne(companyId: string, id: string) {
    const role = await this.findOrFail(companyId, id);
    const counts = await this.userCounts(companyId, id);
    return this.toResponse(role, counts[id] ?? 0);
  }

  async create(companyId: string, dto: any, ctx: AuditContext) {
    await this.assertNameFree(companyId, dto.name);

    return AppDataSource.transaction(async (manager) => {
      const role = manager.create(Role, {
        companyId,
        name: dto.name,
        description: dto.description ?? null,
        baseRole: dto.baseRole,
        isSystem: false,
        createdById: ctx.actorId,
        updatedById: ctx.actorId,
      });
      await manager.save(role);

      await activityLogService.log(
        ctx,
        {
          action: LogAction.CREATE,
          entity: LogEntity.ROLE,
          entityId: role.id,
          summary: `Created role "${role.name}"`,
        },
        manager,
      );

      return this.toResponse(role, 0);
    });
  }

  async update(companyId: string, id: string, dto: any, ctx: AuditContext) {
    const role = await this.findOrFail(companyId, id);

    if (role.isSystem) {
      const renaming = dto.name !== undefined && dto.name !== role.name;
      const changingBase =
        dto.baseRole !== undefined && dto.baseRole !== role.baseRole;
      if (renaming || changingBase) {
        throw new ApiError(
          400,
          "Built-in roles can only have their description changed",
        );
      }
    }

    if (dto.name && dto.name.toLowerCase() !== role.name.toLowerCase()) {
      await this.assertNameFree(companyId, dto.name, role.id);
    }

    const before: any = { ...role };

    return AppDataSource.transaction(async (manager) => {
      manager.merge(Role, role, { ...dto, updatedById: ctx.actorId });
      await manager.save(role);

      // Access level changed → update everyone who has this role
      if (dto.baseRole && dto.baseRole !== before.baseRole) {
        if (before.baseRole === UserRole.ADMIN) {
          await this.assertAdminRemains(manager, companyId, {
            excludeRoleId: role.id,
          });
        }
        await manager.update(
          CompanyMember,
          { roleId: role.id },
          { role: role.baseRole },
        );
      }

      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.ROLE,
          entityId: role.id,
          summary: `Updated role "${role.name}"`,
          changes: diff(before, role, {
            labels: ROLE_LABELS,
            only: Object.keys(ROLE_LABELS),
          }),
        },
        manager,
      );

      const counts = await this.userCounts(companyId, role.id);
      return this.toResponse(role, counts[role.id] ?? 0);
    });
  }

  async remove(companyId: string, id: string, ctx: AuditContext) {
    const role = await this.findOrFail(companyId, id);
    if (role.isSystem)
      throw new ApiError(400, "Built-in roles can't be deleted");

    const users = (await this.userCounts(companyId, id))[id] ?? 0;
    if (users > 0) {
      throw new ApiError(
        409,
        `This role is assigned to ${users} user${users === 1 ? "" : "s"}. Move them to another role first.`,
      );
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.delete(Role, { id, companyId });
      await activityLogService.log(
        ctx,
        {
          action: LogAction.DELETE,
          entity: LogEntity.ROLE,
          entityId: id,
          summary: `Deleted role "${role.name}"`,
        },
        manager,
      );
    });
  }

  // Give a user (in the current company) a role
  async assignToUser(
    companyId: string,
    userId: string,
    roleId: string,
    ctx: AuditContext,
  ) {
    if (userId === ctx.actorId)
      throw new ApiError(400, "You can't change your own role");

    const role = await this.findOrFail(companyId, roleId);
    if (role.baseRole === UserRole.DEV)
      throw new ApiError(403, "The Developer role can't be assigned here");

    const member = await this.members.findOne({ where: { companyId, userId } });
    if (!member) throw new ApiError(404, "This user is not in your account");
    if (member.roleId === role.id)
      return { roleId: role.id, roleName: role.name };

    const previous = member.roleId
      ? await this.repo.findOneBy({ id: member.roleId })
      : null;

    await AppDataSource.transaction(async (manager) => {
      if (member.role === UserRole.ADMIN && role.baseRole !== UserRole.ADMIN) {
        await this.assertAdminRemains(manager, companyId, {
          excludeUserId: userId,
        });
      }
      await manager.update(
        CompanyMember,
        { id: member.id },
        { roleId: role.id, role: role.baseRole },
      );

      await activityLogService.log(
        ctx,
        {
          action: LogAction.UPDATE,
          entity: LogEntity.USER,
          entityId: userId,
          summary: `Changed role to "${role.name}"`,
          changes: [
            {
              field: "Role",
              from: previous?.name ?? member.role,
              to: role.name,
            },
          ],
        },
        manager,
      );
    });
    return { roleId: role.id, roleName: role.name };
  }

  // Called when a new company is created
  async seedSystemRoles(
    companyId: string,
    manager: EntityManager,
    actorId: string | null,
  ) {
    const roles = SYSTEM_ROLES.map((r) =>
      manager.create(Role, {
        ...r,
        companyId,
        isSystem: true,
        createdById: actorId,
        updatedById: actorId,
      }),
    );
    await manager.save(roles);
    return Object.fromEntries(roles.map((r) => [r.baseRole, r])) as Record<
      string,
      Role
    >;
  }

  private async findOrFail(companyId: string, id: string) {
    const role = await this.repo.findOneBy({ id, companyId }); 
    if (!role) throw new ApiError(404, "Role not found");
    return role;
  }

  private async assertNameFree(
    companyId: string,
    name: string,
    exceptId?: string,
  ) {
    const qb = this.repo
      .createQueryBuilder("r")
      .where("r.companyId = :companyId", { companyId })
      .andWhere("LOWER(r.name) = LOWER(:name)", { name });
    if (exceptId) qb.andWhere("r.id != :exceptId", { exceptId });
    if (await qb.getExists())
      throw new ApiError(409, "A role with this name already exists");
  }

  // { roleId: number of users } — ignores soft-deleted users
  private async userCounts(companyId: string, roleId?: string) {
    const qb = this.members
      .createQueryBuilder("m")
      .innerJoin(User, "u", "u.id = m.userId AND u.deletedAt IS NULL")
      .select("m.roleId", "roleId")
      .addSelect("COUNT(*)", "count")
      .where("m.companyId = :companyId", { companyId })
      .andWhere("m.roleId IS NOT NULL")
      .groupBy("m.roleId");
    if (roleId) qb.andWhere("m.roleId = :roleId", { roleId });

    const rows = await qb.getRawMany();
    return Object.fromEntries(
      rows.map((r: any) => [r.roleId, Number(r.count)]),
    ) as Record<string, number>;
  }

  private async assertAdminRemains(
    manager: EntityManager,
    companyId: string,
    opts: { excludeUserId?: string; excludeRoleId?: string },
  ) {
    const qb = manager
      .getRepository(CompanyMember)
      .createQueryBuilder("m")
      .innerJoin(
        User,
        "u",
        "u.id = m.userId AND u.deletedAt IS NULL AND u.isActive = true",
      )
      .where("m.companyId = :companyId", { companyId })
      .andWhere("m.role = :admin", { admin: UserRole.ADMIN })
      .andWhere("m.isActive = true");
    if (opts.excludeUserId)
      qb.andWhere("m.userId != :uid", { uid: opts.excludeUserId });
    if (opts.excludeRoleId)
      qb.andWhere("(m.roleId IS NULL OR m.roleId != :rid)", {
        rid: opts.excludeRoleId,
      });

    if ((await qb.getCount()) === 0) {
      throw new ApiError(
        400,
        "This account must keep at least one active admin",
      );
    }
  }

  private toResponse = (r: Role, users: number) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    baseRole: r.baseRole,
    isSystem: r.isSystem,
    users,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}

export const roleService = new RoleService();
