import type { Response } from "express";
import { ApiError } from "../utils/apiError";
import { auditContext, requireCompanyId } from "../utils/auditContext";
import { companyService } from "../services/companyService";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../dtos/company/companyDto";
import { asyncHandler } from "../utils/asyncHandle";

const parse = <T>(
  schema: { safeParse: (d: unknown) => any },
  body: unknown,
): T => {
  const r = schema.safeParse(body);
  if (!r.success)
    throw new ApiError(400, r.error.issues[0]?.message ?? "Invalid data");
  return r.data as T;
};

export const getCurrentCompany = asyncHandler(async (req, res: Response) => {
  const company = await companyService.getProfile(requireCompanyId(req));
  res.status(200).json({ success: true, data: company });
});

export const updateCurrentCompany = asyncHandler(async (req, res: Response) => {
  const dto = parse<any>(updateCompanySchema, req.body);
  const company = await companyService.updateProfile(
    requireCompanyId(req),
    dto,
    auditContext(req),
  );
  res.status(200).json({ success: true, data: company });
});

export const listMyCompanies = asyncHandler(async (req, res: Response) => {
  const ctx = auditContext(req);
  const data = await companyService.listForUser(ctx.actorId!, ctx.companyId);
  res.status(200).json({ success: true, data });
});

export const createCompany = asyncHandler(async (req, res: Response) => {
  const dto = parse<any>(createCompanySchema, req.body);
  const company = await companyService.create(dto, auditContext(req));
  res.status(201).json({ success: true, data: company });
});

export const uploadLogo = asyncHandler(async (req, res: Response) => {
  const data = await companyService.setLogo(
    requireCompanyId(req),
    req.file,
    auditContext(req),
  );
  res.status(200).json({ success: true, message: "Logo updated", data });
});

export const removeLogo = asyncHandler(async (req, res: Response) => {
  const data = await companyService.removeLogo(
    requireCompanyId(req),
    auditContext(req),
  );
  res.status(200).json({ success: true, message: "Logo removed", data });
});
