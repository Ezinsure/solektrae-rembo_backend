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
  @IsOptional() @IsString() @IsNotEmpty() names?: string;
  @IsOptional() @IsString() @IsNotEmpty() email?: string;
  @IsOptional() @IsString() @IsNotEmpty() phoneNumber?: string;
  @IsOptional() @IsString() @IsNotEmpty() service?: string;
  @IsOptional() @IsString() @IsNotEmpty() height?: string;
  @IsOptional() @IsString() @IsNotEmpty() hovName?: string;
  @IsOptional() @IsString() @IsNotEmpty() hovNumber?: string;
  @IsOptional() @IsString() @IsNotEmpty() district?: string;
  @IsOptional() @IsString() @IsNotEmpty() sector?: string;
  @IsOptional() @IsString() @IsNotEmpty() cell?: string;
  @IsOptional() @IsString() @IsNotEmpty() village?: string;
  @IsOptional() @IsString() @IsNotEmpty() street?: string;
  @IsOptional() @IsString() @IsNotEmpty() motherName?: string;
  @IsOptional() @IsString() @IsNotEmpty() fatherName?: string;
  @IsOptional() @IsString() @IsNotEmpty() spouseName?: string;
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
