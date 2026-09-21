import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { JourneyModule } from './journey/journey.module';
import { DiaryModule } from './diary/diary.module';
import { PhotoModule } from './photo/photo.module';
import { CopywritingModule } from './copywriting/copywriting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    JourneyModule,
    DiaryModule,
    PhotoModule,
    CopywritingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
