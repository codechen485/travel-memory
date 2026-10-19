import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from './cache/cache.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { JourneyModule } from './journey/journey.module';
import { DiaryModule } from './diary/diary.module';
import { PhotoModule } from './photo/photo.module';
import { CopywritingModule } from './copywriting/copywriting.module';
import { StatsModule } from './stats/stats.module';
import { UserModule } from './user/user.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PhotoUrlInterceptor } from './photo/photo-url.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    JourneyModule,
    DiaryModule,
    PhotoModule,
    CopywritingModule,
    StatsModule,
    UserModule,
  ],
  controllers: [],
  providers: [{ provide: APP_INTERCEPTOR, useClass: PhotoUrlInterceptor }],
})
export class AppModule {}
