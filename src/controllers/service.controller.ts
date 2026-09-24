import { Response } from "express";
import { UserRole } from "../entities/User";
import { asyncHandler } from "../utils/asyncHandle";
import { serviceService } from "../services/serviceServices";

export const createService = asyncHandler(async (req, res: Response) => {
  const service = await serviceService.create(req.body);
  res.status(201).json({ success: true, data: service });
});

export const getServices = asyncHandler(async (req, res: Response) => {
  // Only an authenticated ADMIN gets to see inactive/retired services.
  // Everyone else (including anonymous customers filling the registration
  // form) only ever sees the active list, regardless of what they pass in
  // the query string.
  const wantsInactive = req.query.includeInactive === "true";
  const isAdmin = req.user?.role === UserRole.ADMIN;
  const services = await serviceService.findAll(wantsInactive && isAdmin);
  res.status(200).json({ success: true, data: services });
});

export const getServiceById = asyncHandler(async (req, res: Response) => {
  const service = await serviceService.findById(req.params.id as any);
  res.status(200).json({ success: true, data: service });
});

export const updateService = asyncHandler(async (req, res: Response) => {
  const service = await serviceService.update(req.params.id as any, req.body);
  res.status(200).json({ success: true, data: service });
});

export const deleteService = asyncHandler(async (req, res: Response) => {
  await serviceService.softDelete(req.params.id as any);
  res.status(204).send();
});
