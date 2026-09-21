import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { CopywritingController } from './copywriting.controller';
import { CopywritingService } from './copywriting.service';
import { DeepSeekService } from './deepseek.service';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CopywritingController],
  providers: [CopywritingService, DeepSeekService],
})
export class CopywritingModule {}
