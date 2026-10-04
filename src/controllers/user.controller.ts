import { Response } from "express";
import { userService } from "../services/userService";
import { asyncHandler } from "../utils/asyncHandle";
import { plainToInstance } from "class-transformer";
import { UserQueryDto } from "../dtos/users/userdto";
import { validate } from "class-validator";

export const createUser = asyncHandler(async (req, res: Response) => {
  const user = await userService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data: user });
});

export const getUsers = asyncHandler(async (req, res: Response) => {
  const query = plainToInstance(UserQueryDto, req.query);
  const errors = await validate(query);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors,
    });
  }
  const result = await userService.findAll(query);
  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getUserById = asyncHandler(async (req, res: Response) => {
  const user = await userService.findById(req.params.id as any);
  res.status(200).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req, res: Response) => {
  const user = await userService.update(
    req.params.id as any,
    req.body,
    req.user.id,
  );
  res.status(200).json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req, res: Response) => {
  await userService.softDelete(req.params.id as any, req.user.id);
  res.status(204).send();
});

export const restoreUser = asyncHandler(async (req, res: Response) => {
  const user = await userService.restore(req.params.id as any, req.user.id);
  res.status(200).json({ success: true, data: user });
});

export const toggleUserActive = asyncHandler(async (req, res: Response) => {
  const user = await userService.setActive(
    req.params.id as any,
    req.body.isActive,
  );
  res.status(200).json({ success: true, data: user });
});

export const adminResetPassword = asyncHandler(async (req, res: Response) => {
  await userService.adminResetPassword(
    req.params.id as any,
    req.body,
    req.user.id,
  );
  res
    .status(200)
    .json({ success: true, message: "Password reset successfully" });
});
