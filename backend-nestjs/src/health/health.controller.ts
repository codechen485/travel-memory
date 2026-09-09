import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '../common/dto/api-response.dto';

@Controller('api')
export class HealthController {
  @Get('health')
  health() {
    return ApiResponse.success('服务运行正常', null);
  }
}
