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

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const THUMB_MAX_WIDTH = 480;

@Injectable()
export class PhotoService {
  constructor(private prisma: PrismaService) {}

  async readStoredFile(filename: string): Promise<Buffer> {
    try {
      return await fs.readFile(path.join(UPLOAD_DIR, path.basename(filename)));
    } catch {
      throw new NotFoundException('照片不存在');
    }
  }

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
    const encoded = await this.validateAndSanitize(file);

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
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const originalName = `${baseName}.jpg`;
    const thumbName = `thumb_${baseName}.jpg`;
    const originalPath = path.join(UPLOAD_DIR, originalName);
    const thumbPath = path.join(UPLOAD_DIR, thumbName);

    // 写入原图
    await fs.writeFile(originalPath, encoded);

    // 生成缩略图并读取元信息（含 EXIF GPS / 拍摄时间）
    let width: number | null = null;
    let height: number | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let exifTakenAt: Date | null = null;
    try {
      const meta = await sharp(encoded).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      await sharp(encoded)
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
    } catch {
      await this.safeUnlink(originalPath);
      await this.safeUnlink(thumbPath);
      throw new BadRequestException('图片处理失败，请确认文件是有效图片');
    }

    try {
      return await this.prisma.photo.create({
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
    } catch (error) {
      await this.safeUnlink(originalPath);
      await this.safeUnlink(thumbPath);
      throw error;
    }
  }

  /**
   * 通用图片上传：只存文件不写数据库（旅程封面/头像等场景）
   */
  async uploadGeneric(file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }
    const encoded = await this.validateAndSanitize(file);

    await this.ensureUploadDir();

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const originalName = `${baseName}.jpg`;
    await fs.writeFile(path.join(UPLOAD_DIR, originalName), encoded);

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
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  /** Validate actual image bytes, cap decompression work, and strip GPS/EXIF from stored files. */
  private async validateAndSanitize(file: UploadedFile): Promise<Buffer> {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPEG、PNG、WebP、GIF 图片');
    }
    try {
      const image = sharp(file.buffer, { limitInputPixels: 40_000_000, animated: false });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format ?? '')) {
        throw new Error('unsupported image format');
      }
      return await image.rotate().jpeg({ quality: 90 }).toBuffer();
    } catch {
      throw new BadRequestException('图片内容无效或尺寸过大');
    }
  }

  private async safeUnlink(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件可能已不存在，忽略
    }
  }
}
