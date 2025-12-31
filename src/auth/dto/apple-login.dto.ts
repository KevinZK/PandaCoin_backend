import { IsString, IsOptional, IsEmail } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string; // Apple 返回的 JWT identity token

  @IsString()
  appleUserId: string; // Apple 用户唯一标识 (sub)

  @IsOptional()
  @IsEmail()
  email?: string; // 仅首次登录时可能包含

  @IsOptional()
  @IsString()
  fullName?: string; // 仅首次登录时可能包含
}
