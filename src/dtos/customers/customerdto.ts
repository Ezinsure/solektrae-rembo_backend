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

// Only rule is "not empty" — no format/uniqueness checks, per spec.
// `service` is now plain free text the customer typed themselves, not a
// reference to anything — no lookup, no validation beyond non-empty.
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
  @IsNotEmpty()
  height: string;

  @IsString()
  @IsNotEmpty()
  hovName: string;

  @IsString()
  @IsNotEmpty()
  hovNumber: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  sector: string;

  @IsString()
  @IsNotEmpty()
  cell: string;

  @IsString()
  @IsNotEmpty()
  village: string;
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