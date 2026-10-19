import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class PhotoLinkService {
  private readonly secret: string;
  readonly ttlSeconds = 15 * 60;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  sign(filename: string): string {
    const expires = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    const signature = this.digest(filename, expires);
    return `/api/photo-files/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
  }

  verify(filename: string, expires: number, signature: string): boolean {
    if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
    const expected = Buffer.from(this.digest(filename, expires));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private digest(filename: string, expires: number): string {
    return createHmac('sha256', this.secret).update(`${filename}:${expires}`).digest('hex');
  }
}
