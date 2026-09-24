import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


// Deliberately does NOT include a `role` field — the bootstrap endpoint
// always creates an ADMIN, regardless of what's sent. Letting the caller
// choose the role here would defeat the point of the guard (the whole
// premise is "there's no admin yet to authorize this").
export class BootstrapAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  names: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @IsString()
  @MaxLength(20)
  phoneNumber: string;
}