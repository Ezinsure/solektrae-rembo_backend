import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  descr: string;

  @IsOptional()
  @IsBoolean()
  isOther?: boolean;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  descr?: string;

  @IsOptional()
  @IsBoolean()
  isOther?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
