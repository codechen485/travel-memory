import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 生成文案入参 */
export class GenerateCopywritingDto {
  @IsNumber()
  @IsNotEmpty({ message: '旅程ID不能为空' })
  journeyId: number;

  @IsOptional()
  @IsNumber()
  photoId?: number;

  @IsOptional()
  @IsString({ message: '照片URL必须是字符串' })
  @MaxLength(500, { message: '照片URL不能超过500个字符' })
  photoUrl?: string;

  @IsOptional()
  @IsString({ message: '心情必须是字符串' })
  @MaxLength(20, { message: '心情不能超过20个字符' })
  mood?: string;
}

/** 保存文案入参 */
export class CreateCopywritingDto {
  @IsNumber()
  @IsNotEmpty({ message: '旅程ID不能为空' })
  journeyId: number;

  @IsOptional()
  @IsNumber()
  photoId?: number | null;

  @IsString({ message: '场景标签必须是字符串' })
  @IsNotEmpty({ message: '场景标签不能为空' })
  @MaxLength(50, { message: '场景标签不能超过50个字符' })
  sceneTag: string;

  @IsOptional()
  @IsString({ message: '心情必须是字符串' })
  @MaxLength(20, { message: '心情不能超过20个字符' })
  mood?: string;

  @IsString({ message: '短句版文案必须是字符串' })
  @IsNotEmpty({ message: '短句版文案不能为空' })
  shortVersion: string;

  @IsString({ message: '叙事版文案必须是字符串' })
  @IsNotEmpty({ message: '叙事版文案不能为空' })
  narrativeVersion: string;

  @IsString({ message: '诗意版文案必须是字符串' })
  @IsNotEmpty({ message: '诗意版文案不能为空' })
  poeticVersion: string;

  @IsString({ message: '最终版本文案必须是字符串' })
  @IsNotEmpty({ message: '最终版本文案不能为空' })
  finalVersion: string;

  @IsOptional()
  @IsIn([true, false], { message: '公开状态必须是布尔值' })
  isPublic?: boolean;
}

/** 更新文案入参（全字段可选） */
export class UpdateCopywritingDto {
  @IsOptional()
  @IsString({ message: '最终版本文案必须是字符串' })
  @IsNotEmpty({ message: '最终版本文案不能为空' })
  finalVersion?: string;

  @IsOptional()
  @IsIn([true, false], { message: '公开状态必须是布尔值' })
  isPublic?: boolean;

  @IsOptional()
  @IsString({ message: '场景标签必须是字符串' })
  @MaxLength(50, { message: '场景标签不能超过50个字符' })
  sceneTag?: string;

  @IsOptional()
  @IsString({ message: '心情必须是字符串' })
  @MaxLength(20, { message: '心情不能超过20个字符' })
  mood?: string;
}

/** 查询参数（GET /my 筛选，来自 URL query 需手动转型） */
export class CopywritingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  journeyId?: number;

  @IsOptional()
  @IsString({ message: '心情必须是字符串' })
  @MaxLength(20, { message: '心情不能超过20个字符' })
  mood?: string;
}

/** 查询参数（GET /public 灵感漂流分页） */
export class PublicQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '页码不能小于1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '每页条数不能小于1' })
  @Max(50, { message: '每页最多50条' })
  pageSize?: number;
}
