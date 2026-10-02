import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const data = await this.userService.getProfile(req.user.id);
    return ApiResponse.success('获取个人资料成功', data);
  }

  @Put('profile')
  async updateProfile(@Request() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const data = await this.userService.updateProfile(req.user.id, dto);
    return ApiResponse.success('更新个人资料成功', data);
  }
}
