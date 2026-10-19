import { promises as fs } from 'fs';
import path from 'path';
import type { PrismaService } from '../prisma/prisma.service';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

/** Remove local assets after cascade deletes, unless another database row still references them. */
export async function removeUnreferencedUploads(prisma: PrismaService, urls: string[]): Promise<void> {
  const names = [...new Set(urls.map((url) => path.basename(url.split('?')[0] ?? url)).filter(Boolean))];
  for (const name of names) {
    const [photo, journey, user] = await Promise.all([
      prisma.photo.findFirst({ where: { OR: [{ originalUrl: { contains: name } }, { thumbnailUrl: { contains: name } }] }, select: { id: true } }),
      prisma.journey.findFirst({ where: { coverImage: { contains: name } }, select: { id: true } }),
      prisma.user.findFirst({ where: { avatar: { contains: name } }, select: { id: true } }),
    ]);
    if (photo || journey || user) continue;
    try { await fs.unlink(path.join(uploadDir, name)); } catch { /* already removed or storage unavailable */ }
  }
}
