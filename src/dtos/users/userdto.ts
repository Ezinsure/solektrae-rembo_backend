import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { User, UserRole } from "../../entities/User";
import { Type } from "class-transformer";
import { CompanyMember } from "../../entities/CompanyMember";

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

  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.HR, UserRole.STAFF, UserRole.USER])
  role?: UserRole;
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
  @IsUUID()
  roleId?: string;

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
  @IsUUID()
  roleId?: string;

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

type AuditUser = { id: string; names: string } | null;

export class UserResponseDto {
  id: string;
  names: string;
  email: string;
  role: UserRole;           
  roleId: string | null;    
  roleName: string | null;  
  phoneNumber: string;
  profileImage: string | null;
  isActive: boolean;   
  mustChangePassword: boolean;
  createdAt: Date;
  createdBy: AuditUser;
  updatedAt: Date;
  updatedBy: AuditUser;
  deletedAt: Date | null;
  deletedBy: AuditUser;

  // member is optional: without it (e.g. GET /auth/me) you get the plain profile
  static fromEntity(user: User, member?: CompanyMember | null): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.names = user.names;
    dto.email = user.email;
    dto.role = member?.role ?? user.role;
    dto.roleId = member?.roleId ?? null;
    dto.roleName = member?.assignedRole?.name ?? null;
    dto.phoneNumber = user.phoneNumber;
    dto.profileImage = user.profileImage;
    dto.isActive = member ? member.isActive && user.isActive : user.isActive;
    dto.mustChangePassword = user.mustChangePassword;
    dto.createdAt = user.createdAt;
    dto.createdBy = UserResponseDto.toAuditUser(user.createdBy);
    dto.updatedAt = user.updatedAt;
    dto.updatedBy = UserResponseDto.toAuditUser(user.updatedBy);
    dto.deletedAt = user.deletedAt ?? null;
    dto.deletedBy = UserResponseDto.toAuditUser(user.deletedBy);
    return dto;
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map((u) => UserResponseDto.fromEntity(u));
  }

  private static toAuditUser(related?: User | null): AuditUser {
    return related ? { id: related.id, names: related.names } : null;
  }
}