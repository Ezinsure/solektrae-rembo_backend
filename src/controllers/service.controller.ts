import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandle";
import { serviceService } from "../services/serviceServices";
import { auditContext, requireCompanyId } from "../utils/auditContext";
import {
  createServiceSchema, reorderServicesSchema, serviceListQuerySchema,
  slugParam, updateServiceSchema, uuidParam,
} from "../dtos/services/servicedto";

export const getServiceFields = asyncHandler(async (_req, res: Response) => {
  res.status(200).json({ success: true, data: serviceService.fieldCatalog() });
});

export const getServices = asyncHandler(async (req, res: Response) => {
  const query = serviceListQuerySchema.parse(req.query);
  const services = await serviceService.list(requireCompanyId(req), {
    includeInactive: query.includeInactive === "true",
    search: query.search,
  });
  res.status(200).json({ success: true, data: services });
});

export const getService = asyncHandler(async (req, res: Response) => {
  const service = await serviceService.getOne(requireCompanyId(req), uuidParam.parse(req.params.id));
  res.status(200).json({ success: true, data: service });
});

export const createService = asyncHandler(async (req, res: Response) => {
  const dto = createServiceSchema.parse(req.body);
  const service = await serviceService.create(requireCompanyId(req), dto, auditContext(req));
  res.status(201).json({ success: true, message: "Service created", data: service });
});

export const updateService = asyncHandler(async (req, res: Response) => {
  const dto = updateServiceSchema.parse(req.body);
  const service = await serviceService.update(
    requireCompanyId(req), uuidParam.parse(req.params.id), dto, auditContext(req),
  );
  res.status(200).json({ success: true, message: "Service updated", data: service });
});

export const reorderServices = asyncHandler(async (req, res: Response) => {
  const { ids } = reorderServicesSchema.parse(req.body);
  const services = await serviceService.reorder(requireCompanyId(req), ids, auditContext(req));
  res.status(200).json({ success: true, message: "Order saved", data: services });
});

export const deleteService = asyncHandler(async (req, res: Response) => {
  await serviceService.remove(requireCompanyId(req), uuidParam.parse(req.params.id), auditContext(req));
  res.status(200).json({ success: true, message: "Service deleted" });
});

// Public (no login): services for the customer form
export const getPublicServices = asyncHandler(async (req, res: Response) => {
  const data = await serviceService.listPublic(slugParam.parse(req.params.companySlug));
  res.status(200).json({ success: true, data });
});