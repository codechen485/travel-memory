import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { PhotoLinkService } from './photo-link.service';
import { PhotoUrlInterceptor } from './photo-url.interceptor';
import { SignedPhotoController } from './signed-photo.controller';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [PhotoController, SignedPhotoController],
  providers: [PhotoService, PhotoLinkService, PhotoUrlInterceptor],
  exports: [PhotoLinkService, PhotoUrlInterceptor],
})
export class PhotoModule {}
