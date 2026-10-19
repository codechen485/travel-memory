import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PhotoLinkService } from './photo-link.service';

describe('PhotoLinkService', () => {
  const service = new PhotoLinkService({ getOrThrow: () => 'a-test-secret-with-more-than-thirty-two-chars' } as unknown as ConfigService);

  it('签名链接可验证，文件名或签名被篡改时拒绝', () => {
    const url = new URL(service.sign('photo.jpg'), 'http://localhost');
    const expires = Number(url.searchParams.get('expires'));
    const signature = url.searchParams.get('signature') ?? '';
    expect(service.verify('photo.jpg', expires, signature)).toBe(true);
    expect(service.verify('other.jpg', expires, signature)).toBe(false);
    expect(service.verify('photo.jpg', expires, `${signature}x`)).toBe(false);
  });

  it('过期的签名链接被拒绝', () => {
    const expired = Math.floor(Date.now() / 1000) - 1;
    expect(service.verify('photo.jpg', expired, 'signature')).toBe(false);
  });
});
