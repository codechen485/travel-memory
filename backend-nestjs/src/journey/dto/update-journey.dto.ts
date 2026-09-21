import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateJourneyDto {
  @IsOptional()
  @IsString({ message: '旅程标题必须是字符串' })
  @IsNotEmpty({ message: '旅程标题不能为空' })
  @MinLength(2, { message: '旅程标题至少2个字符' })
  @MaxLength(100, { message: '旅程标题不能超过100个字符' })
  title?: string;

  @IsOptional()
  @IsArray({ message: '目的地必须是字符串数组' })
  @ArrayMinSize(1, { message: '请至少添加一个目的地' })
  @ArrayMaxSize(10, { message: '目的地最多10个' })
  @IsString({ each: true, message: '目的地必须是字符串' })
  destinations?: string[];

  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确，应为 yyyy-MM-dd' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确，应为 yyyy-MM-dd' })
  endDate?: string;

  @IsOptional()
  @IsString({ message: '封面图地址必须是字符串' })
  @MaxLength(500, { message: '封面图地址不能超过500个字符' })
  coverImage?: string | null;

  @IsOptional()
  @IsArray({ message: '标签必须是字符串数组' })
  @ArrayMaxSize(10, { message: '标签最多10个' })
  @IsString({ each: true, message: '标签必须是字符串' })
  tags?: string[];

  @IsOptional()
  @IsBoolean({ message: '是否公开必须是布尔值' })
  isPublic?: boolean;

  @IsOptional()
  @IsIn(['ongoing', 'archived'], { message: '旅程状态只能是 ongoing 或 archived' })
  status?: 'ongoing' | 'archived';
}
