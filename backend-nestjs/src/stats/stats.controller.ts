import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatsService } from './stats.service';
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
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getMyStats(@Request() req: AuthenticatedRequest) {
    const data = await this.statsService.getMyStats(req.user.id);
    return ApiResponse.success('获取统计成功', data);
  }
}
