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
import { JourneyService } from './journey.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { ApiResponse } from '../common/dto/api-response.dto';
import type { Request as ExpressRequest } from 'express';

/** 携带 JWT 用户信息的请求对象 */
interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: number;
    username: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('api/journeys')
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() createJourneyDto: CreateJourneyDto) {
    const data = await this.journeyService.create(req.user.id, createJourneyDto);
    return ApiResponse.success('旅程创建成功', data);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const data = await this.journeyService.findAll(req.user.id);
    return ApiResponse.success('获取旅程列表成功', data);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.journeyService.findOne(req.user.id, id);
    return ApiResponse.success('获取旅程详情成功', data);
  }

  @Put(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJourneyDto: UpdateJourneyDto,
  ) {
    const data = await this.journeyService.update(req.user.id, id, updateJourneyDto);
    return ApiResponse.success('旅程更新成功', data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.journeyService.remove(req.user.id, id);
    return ApiResponse.success('旅程删除成功', null);
  }

  @Post(':id/archive')
  async archive(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.journeyService.archive(req.user.id, id);
    return ApiResponse.success('旅程封存成功', data);
  }
}
