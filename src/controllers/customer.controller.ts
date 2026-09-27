import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandle";
import { customerService } from "../services/customerService";
import { plainToInstance } from "class-transformer";
import { CustomerQueryDto } from "../dtos/customers/customerdto";
import { validate } from "class-validator";

export const createCustomer = asyncHandler(async (req, res: Response) => {
  const customer = await customerService.create(req.body);
  res.status(201).json({ success: true, data: customer });
});

export const getCustomers = asyncHandler(async (req, res: Response) => {
  const query = plainToInstance(CustomerQueryDto, req.query);
  const errors = await validate(query);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors,
    });
  }
  const result = await customerService.findAll(query);
  res.status(200).json({ success: true, ...result });
});

export const getCustomerById = asyncHandler(async (req, res: Response) => {
  const customer = await customerService.findById(req.params.id as any);
  res.status(200).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res: Response) => {
  const customer = await customerService.update(req.params.id as any, req.body);
  res.status(200).json({ success: true, data: customer });
});

export const updateCustomerStatus = asyncHandler(async (req, res: Response) => {
  console.log("req.user:", req.user);
  const customer = await customerService.updateStatus(
    req.params.id as string,
    req.body.status,
    req.user.id,
  );

  res.status(200).json({
    success: true,
    data: customer,
  });
});

export const deleteCustomer = asyncHandler(async (req, res: Response) => {
  await customerService.softDelete(req.params.id as any);
  res.status(204).send();
});
