import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateDiaryDto {
  @IsOptional()
  @IsDateString({}, { message: '日期格式不正确，应为 yyyy-MM-dd' })
  date?: string;

  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @IsNotEmpty({ message: '标题不能为空' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(50, { message: '标题不能超过50个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: '正文必须是字符串' })
  content?: string;

  @IsOptional()
  @IsString({ message: '心情必须是字符串' })
  @MaxLength(20, { message: '心情不能超过20个字符' })
  mood?: string;

  @IsOptional()
  @IsString({ message: '位置名称必须是字符串' })
  @MaxLength(200, { message: '位置名称不能超过200个字符' })
  locationName?: string;
}
