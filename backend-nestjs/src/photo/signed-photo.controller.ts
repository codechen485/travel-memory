import { BadRequestException, Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { PhotoLinkService } from './photo-link.service';
import { PhotoService } from './photo.service';

/** This route is unauthenticated by design; the short-lived signature is the access capability. */
@Controller('api/photo-files')
export class SignedPhotoController {
  constructor(private readonly photos: PhotoService, private readonly links: PhotoLinkService) {}

  @Get(':filename')
  async read(
    @Param('filename') filename: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!/^[\w.-]+\.(?:jpe?g|png|webp|gif)$/.test(filename) || !this.links.verify(filename, Number(expires), signature ?? '')) {
      throw new BadRequestException('图片链接无效或已过期');
    }
    const file = await this.photos.readStoredFile(filename);
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : extension === 'gif' ? 'image/gif' : 'image/jpeg';
    response.set({ 'Content-Type': contentType, 'Cache-Control': 'private, max-age=60' });
    return new StreamableFile(file);
  }
}
