import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CopywritingService } from './copywriting.service';
import {
  CopywritingQueryDto,
  CreateCopywritingDto,
  GenerateCopywritingDto,
  PublicQueryDto,
  UpdateCopywritingDto,
} from './dto/create-copywriting.dto';
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
@Controller('api/copywritings')
export class CopywritingController {
  constructor(private readonly copywritingService: CopywritingService) {}

  @Post('generate')
  async generate(@Request() req: AuthenticatedRequest, @Body() dto: GenerateCopywritingDto) {
    const data = await this.copywritingService.generate(req.user.id, dto);
    return ApiResponse.success('文案生成成功', data);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param('id', ParseIntPipe) id: number) {
    const data = await this.copywritingService.like(id);
    return ApiResponse.success('点赞成功', data);
  }

  @Post(':id/collect')
  @HttpCode(HttpStatus.OK)
  async collect(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.copywritingService.collect(req.user.id, id);
    return ApiResponse.success('收藏成功', null);
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCopywritingDto) {
    const data = await this.copywritingService.create(req.user.id, dto);
    return ApiResponse.success('文案保存成功', data);
  }

  @Get('my')
  async findMy(@Request() req: AuthenticatedRequest, @Query() query: CopywritingQueryDto) {
    const data = await this.copywritingService.findMy(req.user.id, {
      journeyId: query.journeyId,
      mood: query.mood,
    });
    return ApiResponse.success('获取文案列表成功', data);
  }

  @Get('public')
  async findPublic(@Query() query: PublicQueryDto) {
    const data = await this.copywritingService.findPublic({
      page: query.page,
      pageSize: query.pageSize,
    });
    return ApiResponse.success('获取公开文案成功', data);
  }

  @Get('collected')
  async findCollected(@Request() req: AuthenticatedRequest) {
    const data = await this.copywritingService.findCollected(req.user.id);
    return ApiResponse.success('获取收藏列表成功', data);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.copywritingService.findOne(req.user.id, id);
    return ApiResponse.success('获取文案详情成功', data);
  }

  @Put(':id')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCopywritingDto,
  ) {
    const data = await this.copywritingService.update(req.user.id, id, dto);
    return ApiResponse.success('文案更新成功', data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.copywritingService.remove(req.user.id, id);
    return ApiResponse.success('文案删除成功', null);
  }
}
