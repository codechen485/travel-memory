import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import type { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: number;
    username: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('api/diaries')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() createDiaryDto: CreateDiaryDto) {
    const data = await this.diaryService.create(req.user.id, createDiaryDto);
    return ApiResponse.success('日记创建成功', data);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.diaryService.findOne(req.user.id, id);
    return ApiResponse.success('获取日记详情成功', data);
  }

  @Put(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDiaryDto: UpdateDiaryDto,
  ) {
    const data = await this.diaryService.update(req.user.id, id, updateDiaryDto);
    return ApiResponse.success('日记更新成功', data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.diaryService.remove(req.user.id, id);
    return ApiResponse.success('日记删除成功', null);
  }
}
