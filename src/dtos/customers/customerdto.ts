import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { CustomerStatus } from "../../entities/Customer";
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  names: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsOptional()
  height?: string;

  @IsString()
  @IsOptional()
  hovName?: string;

  @IsString()
  @IsOptional()
  hovNumber?: string;

  @IsString()
  @IsOptional()
  fatherName?: string;

  @IsString()
  @IsOptional()
  motherName?: string;

  @IsString()
  @IsOptional()
  spouseName?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  cell?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  village?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() names?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() height?: string;
  @IsOptional() @IsString() hovName?: string;
  @IsOptional() @IsString() hovNumber?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() sector?: string;
  @IsOptional() @IsString() cell?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() spouseName?: string;
}
export class UpdateCustomerStatusDto {
  @IsEnum(CustomerStatus)
  status: CustomerStatus;
}

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
