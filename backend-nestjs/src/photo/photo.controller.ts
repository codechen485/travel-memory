import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PhotoService } from './photo.service';
import { ApiResponse } from '../common/dto/api-response.dto';
import type { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: number;
    username: string;
    email: string;
  };
}

/** 上传大小限制 10MB（与前端校验保持一致） */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 上传文件的最小结构（与 multer 的 File 兼容） */
interface UploadedFileShape {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@UseGuards(JwtAuthGuard)
@Controller('api/photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: UploadedFileShape,
    @Body() body: { journeyId?: string; diaryId?: string },
  ) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('图片大小不能超过10MB');
    }

    const journeyId = Number(body.journeyId);
    if (!Number.isInteger(journeyId) || journeyId <= 0) {
      throw new BadRequestException('journeyId 不能为空');
    }

    const diaryId = body.diaryId ? Number(body.diaryId) : undefined;
    if (diaryId !== undefined && (!Number.isInteger(diaryId) || diaryId <= 0)) {
      throw new BadRequestException('diaryId 参数不合法');
    }

    const data = await this.photoService.upload(req.user.id, file, journeyId, diaryId);
    return ApiResponse.success('照片上传成功', data);
  }

  /** 通用图片上传（旅程封面/头像等）：只存文件返回 URL，不创建照片记录 */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: UploadedFileShape) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('图片大小不能超过10MB');
    }

    const data = await this.photoService.uploadGeneric(file);
    return ApiResponse.success('图片上传成功', data);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.photoService.findOne(req.user.id, id);
    return ApiResponse.success('获取照片成功', data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.photoService.remove(req.user.id, id);
    return ApiResponse.success('照片已删除', null);
  }
}
