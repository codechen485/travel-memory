import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { StreamableFile } from '@nestjs/common';
import { PhotoLinkService } from './photo-link.service';

@Injectable()
export class PhotoUrlInterceptor implements NestInterceptor {
  constructor(private readonly links: PhotoLinkService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => this.rewrite(value)));
  }

  private rewrite(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.replace(/\/(?:uploads|api\/photo-files)\/([\w.-]+)(?:\?[^\s"'<>)]*)?/g,
        (_match, filename: string) => this.links.sign(filename));
    }
    if (Array.isArray(value)) return value.map((entry) => this.rewrite(entry));
    if (!value || typeof value !== 'object' || value instanceof Date || value instanceof StreamableFile || Buffer.isBuffer(value)) return value;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'originalUrl' || key === 'thumbnailUrl' || key === 'coverImage' || key === 'avatar' || key === 'content' || key === 'html') {
        (value as Record<string, unknown>)[key] = this.rewrite(child);
      } else if (child && typeof child === 'object') {
        (value as Record<string, unknown>)[key] = this.rewrite(child);
      }
    }
    return value;
  }
}
