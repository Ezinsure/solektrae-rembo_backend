import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandle";
import { customerService } from "../services/customerService";
import { auditContext, requireCompanyId } from "../utils/auditContext";
import {
  customerExportSchema,
  customerFormSchema,
  customerQuerySchema,
  customerStatusSchema,
  slugParam,
  uuidParam,
} from "../dtos/customers/customerdto";

// Public: customer applies
export const submitPublicCustomer = asyncHandler(async (req, res: Response) => {
  const dto = customerFormSchema.parse(req.body);
  const result = await customerService.submitPublic(
    slugParam.parse(req.params.companySlug),
    dto,
  );
  res
    .status(201)
    .json({ success: true, message: "Application submitted", data: result });
});

export const getCustomers = asyncHandler(async (req, res: Response) => {
  const query = customerQuerySchema.parse(req.query);
  const result = await customerService.findAll(requireCompanyId(req), query);
  res.status(200).json({ success: true, ...result });
});

export const exportCustomers = asyncHandler(async (req, res: Response) => {
  const filters = customerExportSchema.parse(req.query);
  const { csv, total, truncated } = await customerService.exportCsv(
    requireCompanyId(req),
    filters,
  );
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="customers-${date}.csv"`,
  );
  res.setHeader("X-Total-Count", String(total));
  res.setHeader("X-Truncated", String(truncated));
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Disposition, X-Total-Count, X-Truncated",
  );
  res.status(200).send(csv);
});

export const getCustomerById = asyncHandler(async (req, res: Response) => {
  const customer = await customerService.findById(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
  );
  res.status(200).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res: Response) => {
  const dto = customerFormSchema.parse(req.body);
  const customer = await customerService.update(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
    dto,
    auditContext(req),
  );
  res
    .status(200)
    .json({ success: true, message: "Customer updated", data: customer });
});

export const updateCustomerStatus = asyncHandler(async (req, res: Response) => {
  const { status } = customerStatusSchema.parse(req.body);
  const customer = await customerService.updateStatus(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
    status,
    auditContext(req),
  );
  res
    .status(200)
    .json({ success: true, message: "Status updated", data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res: Response) => {
  await customerService.softDelete(
    requireCompanyId(req),
    uuidParam.parse(req.params.id),
    auditContext(req),
  );
  res.status(204).send();
});

export const getCustomerStats = asyncHandler(async (req, res: Response) => {
  const filters = customerExportSchema.parse(req.query);
  const stats = await customerService.stats(requireCompanyId(req), filters);
  res.status(200).json({ success: true, data: stats });
});
