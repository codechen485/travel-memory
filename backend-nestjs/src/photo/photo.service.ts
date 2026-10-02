import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';

/** 上传文件的最小结构（与 multer 的 File 兼容） */
interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const THUMB_MAX_WIDTH = 480;

/** 图片 MIME → 扩展名映射 */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class PhotoService {
  constructor(private prisma: PrismaService) {}

  /**
   * 上传照片：本地存储 + sharp 生成缩略图 + 写入数据库
   */
  async upload(
    userId: number,
    file: UploadedFile,
    journeyId: number,
    diaryId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件');
    }

    // 校验旅程归属
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, userId },
    });
    if (!journey) {
      throw new NotFoundException('旅程不存在');
    }
    if (journey.status === 'archived') {
      throw new ConflictException('旅程已封存，无法上传照片');
    }

    // 若指定了日记，校验日记归属且属于该旅程
    if (diaryId) {
      const diary = await this.prisma.diary.findFirst({
        where: { id: diaryId, journeyId },
      });
      if (!diary) {
        throw new NotFoundException('日记不存在或不属于该旅程');
      }
    }

    await this.ensureUploadDir();

    // 生成唯一文件名
    const ext = MIME_EXT[file.mimetype] ?? 'jpg';
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const originalName = `${baseName}.${ext}`;
    const thumbName = `thumb_${baseName}.jpg`;
    const originalPath = path.join(UPLOAD_DIR, originalName);
    const thumbPath = path.join(UPLOAD_DIR, thumbName);

    // 写入原图
    await fs.writeFile(originalPath, file.buffer);

    // 生成缩略图并读取元信息（含 EXIF GPS / 拍摄时间）
    let width: number | null = null;
    let height: number | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let exifTakenAt: Date | null = null;
    try {
      const meta = await sharp(file.buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      await sharp(file.buffer)
        .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      // EXIF GPS 坐标（用于地图轨迹展示）
      const gps = await exifr.gps(file.buffer);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        latitude = Number(gps.latitude.toFixed(7));
        longitude = Number(gps.longitude.toFixed(7));
      }

      // EXIF 拍摄时间（轨迹排序依据）
      const exifDate = await exifr.parse(file.buffer, ['DateTimeOriginal']);
      if (exifDate?.DateTimeOriginal) {
        const takenAt = new Date(exifDate.DateTimeOriginal);
        if (!Number.isNaN(takenAt.getTime())) {
          exifTakenAt = takenAt;
        }
      }
    } catch (error) {
      console.error('缩略图生成失败，回退使用原图:', error);
      // 缩略图生成失败时，复制原图作为缩略图
      await fs.copyFile(originalPath, thumbPath);
    }

    return this.prisma.photo.create({
      data: {
        journeyId,
        diaryId: diaryId ?? null,
        originalUrl: `/uploads/${originalName}`,
        thumbnailUrl: `/uploads/${thumbName}`,
        width,
        height,
        fileSize: file.size,
        latitude,
        longitude,
        exifTakenAt,
      },
    });
  }

  /**
   * 通用图片上传：只存文件不写数据库（旅程封面/头像等场景）
   */
  async uploadGeneric(file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件');
    }

    await this.ensureUploadDir();

    const ext = MIME_EXT[file.mimetype] ?? 'jpg';
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const originalName = `${baseName}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, originalName), file.buffer);

    return { url: `/uploads/${originalName}` };
  }

  /**
   * 获取照片详情
   */
  async findOne(userId: number, id: number) {
    const photo = await this.prisma.photo.findFirst({
      where: { id },
      include: { journey: true },
    });

    if (!photo || photo.journey.userId !== userId) {
      throw new NotFoundException('照片不存在');
    }

    return photo;
  }

  /**
   * 删除照片：删除数据库记录 + 删除磁盘文件
   */
  async remove(userId: number, id: number) {
    const photo = await this.prisma.photo.findFirst({
      where: { id },
      include: { journey: true },
    });

    if (!photo || photo.journey.userId !== userId) {
      throw new NotFoundException('照片不存在');
    }

    await this.prisma.photo.delete({ where: { id } });

    // 删除磁盘文件（失败不影响接口结果）
    await this.safeUnlink(path.join(UPLOAD_DIR, path.basename(photo.originalUrl)));
    await this.safeUnlink(path.join(UPLOAD_DIR, path.basename(photo.thumbnailUrl)));

    return null;
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('创建上传目录失败:', error);
    }
  }

  private async safeUnlink(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // 文件可能已不存在，忽略
    }
  }
}
