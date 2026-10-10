import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandle"
import { roleService } from "../services/roleService";
import { auditContext, requireCompanyId } from "../utils/auditContext";
import { assignRoleSchema, createRoleSchema, updateRoleSchema, uuidParam } from "../dtos/roles/rolesDto";

export const getRoles = asyncHandler(async (req, res: Response) => {
  const roles = await roleService.list(requireCompanyId(req));
  res.status(200).json({ success: true, data: roles });
});

export const getRole = asyncHandler(async (req, res: Response) => {
  const role = await roleService.getOne(requireCompanyId(req), uuidParam.parse(req.params.id));
  res.status(200).json({ success: true, data: role });
});

export const createRole = asyncHandler(async (req, res: Response) => {
  const dto = createRoleSchema.parse(req.body);
  const role = await roleService.create(requireCompanyId(req), dto, auditContext(req));
  res.status(201).json({ success: true, message: "Role created", data: role });
});

export const updateRole = asyncHandler(async (req, res: Response) => {
  const dto = updateRoleSchema.parse(req.body);
  const role = await roleService.update(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
    dto,
    auditContext(req),
  );
  res.status(200).json({ success: true, message: "Role updated", data: role });
});

export const deleteRole = asyncHandler(async (req, res: Response) => {
  await roleService.remove(requireCompanyId(req), uuidParam.parse(req.params.id), auditContext(req));
  res.status(200).json({ success: true, message: "Role deleted" });
});

export const assignUserRole = asyncHandler(async (req, res: Response) => {
  const { roleId } = assignRoleSchema.parse(req.body);
  const result = await roleService.assignToUser(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
    roleId,
    auditContext(req),
  );
  res.status(200).json({ success: true, message: "Role updated", data: result });
});