import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { User, UserRole } from "../../entities/User";
import { Type } from "class-transformer";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  names: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  profileImage?: string;
}

// update user dto
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  names?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

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

export class UserResponseDto {
  id: string;
  names: string;
  email: string;
  role: UserRole;
  phoneNumber: string;
  profileImage: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.names = user.names;
    dto.email = user.email;
    dto.role = user.role;
    dto.phoneNumber = user.phoneNumber;
    dto.profileImage = user.profileImage;
    dto.isActive = user.isActive;
    dto.mustChangePassword = user.mustChangePassword;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map(UserResponseDto.fromEntity);
  }
}
