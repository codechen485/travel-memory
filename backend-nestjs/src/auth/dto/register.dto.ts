import { IsNotEmpty, IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度必须在3-50之间' })
  @MaxLength(50, { message: '用户名长度必须在3-50之间' })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度必须在6-100之间' })
  @MaxLength(100, { message: '密码长度必须在6-100之间' })
  password: string;
}
