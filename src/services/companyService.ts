import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Company } from "../entities/Company";
import { CompanyMember } from "../entities/CompanyMember";
import { UserRole } from "../entities/User";
import { LogAction, LogEntity } from "../entities/ActivityLog";
import { ApiError } from "../utils/apiError";
import { diff } from "../utils/diff";
import type { AuditContext } from "../utils/auditContext";
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
} from "../dtos/company/companyDto";
import { activityLogService } from "./activityLog";
import { deleteImage, imagePath, uploadImage } from "./imageService";
import { roleService } from "./roleService";

const COMPANY_LABELS = {
  name: "Name",
  email: "Email",
  phoneNumber: "Phone",
  about: "About",
  logoUrl: "Logo",
};
const COMPANY_TRACKED = [
  "name",
  "email",
  "phoneNumber",
  "about",
  "logoUrl",
] as const;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "company";

export class CompanyService {
  private repo: Repository<Company> = AppDataSource.getRepository(Company);
  private members: Repository<CompanyMember> =
    AppDataSource.getRepository(CompanyMember);

  async getProfile(companyId: string): Promise<Company> {
    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) throw new ApiError(404, "Company not found");
    return company;
  }

  async updateProfile(
    companyId: string,
    dto: UpdateCompanyDto,
    ctx: AuditContext,
  ): Promise<Company> {
    const company = await this.getProfile(companyId);
    const before = { ...company };

    if (dto.name !== undefined) company.name = dto.name;
    if (dto.email !== undefined) company.email = dto.email;
    if (dto.phoneNumber !== undefined) company.phoneNumber = dto.phoneNumber;
    if (dto.about !== undefined) company.about = dto.about;

    const changes = diff(before, company, {
      only: [...COMPANY_TRACKED],
      labels: COMPANY_LABELS,
    });
    if (changes.length === 0) return company;

    company.updatedById = ctx.actorId;
    await this.repo.save(company);

    await activityLogService.log(ctx, {
      action: LogAction.UPDATE,
      entity: LogEntity.COMPANY,
      entityId: company.id,
      summary: `Updated company profile of ${company.name}`,
      changes,
    });

    return company;
  }

  async listForUser(userId: string, currentCompanyId: string | null) {
    const memberships = await this.members.find({
      where: { userId, isActive: true, company: { isActive: true } },
      relations: { company: true },
      order: {
        lastUsedAt: { direction: "DESC", nulls: "LAST" },
        createdAt: "ASC",
      },
    });

    const ids = memberships.map((m) => m.companyId);
    const counts = ids.length
      ? await this.members
          .createQueryBuilder("m")
          .select("m.companyId", "companyId")
          .addSelect("COUNT(*)::int", "count")
          .where("m.companyId IN (:...ids) AND m.isActive = true", { ids })
          .groupBy("m.companyId")
          .getRawMany<{ companyId: string; count: number }>()
      : [];
    const countOf = (id: string) =>
      counts.find((c) => c.companyId === id)?.count ?? 0;

    return memberships.map((m) => ({
      id: m.company!.id,
      name: m.company!.name,
      slug: m.company!.slug,
      logoUrl: m.company!.logoUrl,
      role: m.role,
      members: countOf(m.companyId),
      isCurrent: m.companyId === currentCompanyId,
    }));
  }

async create(dto: any, ctx: AuditContext) {
  const actorId = ctx.actorId;
  if (!actorId) throw new ApiError(401, "Please sign in again");

  return AppDataSource.transaction(async (manager) => {
    const companyRepo = manager.getRepository(Company);
    const slug = await this.uniqueSlug(dto.name, companyRepo);

    const company = companyRepo.create({
      name: dto.name,
      slug,
      email: dto.email ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      createdById: actorId,
      updatedById: actorId,
    });
    await companyRepo.save(company);

    const roles = await roleService.seedSystemRoles(company.id, manager, actorId);

    await manager.save(
      manager.create(CompanyMember, {
        companyId: company.id,
        userId: actorId,
        role: UserRole.ADMIN,
        roleId: roles[UserRole.ADMIN].id,
      }),
    );

    await activityLogService.log(ctx, {
      action: LogAction.CREATE,
      entity: LogEntity.COMPANY,
      entityId: company.id,
      summary: `Created account "${company.name}"`,
    }, manager);

    return { id: company.id, name: company.name, slug: company.slug, logoUrl: company.logoUrl };
  });
}

  /* ── Used by auth ── */
  async getActiveMembership(
    userId: string,
    companyId: string,
  ): Promise<CompanyMember> {
    const membership = await this.members.findOne({
      where: { userId, companyId, isActive: true },
      relations: { company: true },
    });
    if (!membership || !membership.company?.isActive) {
      throw new ApiError(403, "You don't have access to this company");
    }
    return membership;
  }

  /** The company to open at login: the last one used, else the oldest membership. */
  async getDefaultMembership(userId: string): Promise<CompanyMember | null> {
    return this.members.findOne({
      where: { userId, isActive: true, company: { isActive: true } },
      relations: { company: true },
      order: {
        lastUsedAt: { direction: "DESC", nulls: "LAST" },
        createdAt: "ASC",
      },
    });
  }

  async markUsed(membershipId: string): Promise<void> {
    await this.members.update({ id: membershipId }, { lastUsedAt: new Date() });
  }

  private async uniqueSlug(
    base: string,
    repo: Repository<Company>,
  ): Promise<string> {
    let slug = base;
    for (let i = 2; (await repo.count({ where: { slug } })) > 0; i++)
      slug = `${base}-${i}`.slice(0, 80);
    return slug;
  }

async setLogo(companyId: string, file: any, ctx: AuditContext) {
  const company = await this.repo.findOneBy({ id: companyId });
  if (!company) throw new ApiError(404, "Company not found");

  const result = await uploadImage(file.buffer, imagePath("companies", companyId, "logo"));
  const before = company.logoUrl;

  company.logoUrl = result.secure_url; 
  company.updatedById = ctx.actorId;
  await this.repo.save(company);

  await activityLogService.log(ctx, {
    action: LogAction.UPDATE,
    entity: LogEntity.COMPANY,
    entityId: companyId,
    summary: "Updated the company logo",
    changes: [{ field: "Logo", from: before, to: company.logoUrl }],
  });

  return { logoUrl: company.logoUrl };
}

async removeLogo(companyId: string, ctx: AuditContext) {
  const company = await this.repo.findOneBy({ id: companyId });
  if (!company) throw new ApiError(404, "Company not found");
  if (!company.logoUrl) return { logoUrl: null };

  await deleteImage(imagePath("companies", companyId, "logo"));
  const before = company.logoUrl;
  company.logoUrl = null;
  company.updatedById = ctx.actorId;
  await this.repo.save(company);

  await activityLogService.log(ctx, {
    action: LogAction.UPDATE,
    entity: LogEntity.COMPANY,
    entityId: companyId,
    summary: "Removed the company logo",
    changes: [{ field: "Logo", from: before, to: null }],
  });

  return { logoUrl: null };
}
}
export const companyService = new CompanyService();
