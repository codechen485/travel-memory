import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { DeepSeekService } from './deepseek.service';

/** 构造一个 OpenAI 风格的 chat/completions 响应 */
const chatResponse = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});

describe('DeepSeekService', () => {
  let service: DeepSeekService;
  const originalKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'sk-test';
    service = new DeepSeekService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it('未配置 API Key 应抛 503', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(service.generateCopywriting({})).rejects.toThrow(ServiceUnavailableException);
  });

  it('正常返回应解析出四段文案', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        chatResponse(
          '{"scene":"山间晨雾","shortVersion":"短句","narrativeVersion":"叙事","poeticVersion":"诗意"}',
        ),
      ),
    );

    const res = await service.generateCopywriting({ mood: 'peaceful' });
    expect(res).toEqual({
      scene: '山间晨雾',
      shortVersion: '短句',
      narrativeVersion: '叙事',
      poeticVersion: '诗意',
    });
  });

  it('应容忍 ```json 代码块包裹', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        chatResponse(
          '```json\n{"scene":"海","shortVersion":"s","narrativeVersion":"n","poeticVersion":"p"}\n```',
        ),
      ),
    );
    const res = await service.generateCopywriting({});
    expect(res.shortVersion).toBe('s');
    expect(res.scene).toBe('海');
  });

  it('scene 缺失时应兜底为「旅途瞬间」', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        chatResponse('{"shortVersion":"s","narrativeVersion":"n","poeticVersion":"p"}'),
      ),
    );
    const res = await service.generateCopywriting({});
    expect(res.scene).toBe('旅途瞬间');
  });

  it('字面 \\n 应还原为真实换行', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        chatResponse(
          '{"scene":"x","shortVersion":"第一行\\n第二行","narrativeVersion":"n","poeticVersion":"p"}',
        ),
      ),
    );
    const res = await service.generateCopywriting({});
    expect(res.shortVersion).toBe('第一行\n第二行');
  });

  it('文案不完整应抛 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => chatResponse('{"scene":"x","shortVersion":"s"}')),
    );
    await expect(service.generateCopywriting({})).rejects.toThrow(ServiceUnavailableException);
  });

  it('HTTP 非 2xx 应抛 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, text: async () => 'err' })),
    );
    await expect(service.generateCopywriting({})).rejects.toThrow(ServiceUnavailableException);
  });

  it('网络异常应抛 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await expect(service.generateCopywriting({})).rejects.toThrow(ServiceUnavailableException);
  });
});
