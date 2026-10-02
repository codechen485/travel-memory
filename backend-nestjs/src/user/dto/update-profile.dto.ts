import { IsOptional, IsString, MaxLength } from 'class-validator';

/** 更新个人资料入参（全字段可选，空字符串视为清空） */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(50, { message: '昵称不能超过50个字符' })
  nickname?: string;

  @IsOptional()
  @IsString({ message: '简介必须是字符串' })
  @MaxLength(200, { message: '简介不能超过200个字符' })
  bio?: string;

  @IsOptional()
  @IsString({ message: '头像URL必须是字符串' })
  @MaxLength(500, { message: '头像URL不能超过500个字符' })
  avatar?: string;
}
