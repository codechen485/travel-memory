import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/** AI 生成的文案结果（未落库） */
export interface GeneratedCopywriting {
  scene: string;
  shortVersion: string;
  narrativeVersion: string;
  poeticVersion: string;
}

/** 心情 → 中文描述（预设 key → 中文；自定义心情原样透传） */
export const MOOD_LABELS: Record<string, string> = {
  peaceful: '平静',
  amazed: '震撼',
  miss: '思念',
  relieved: '释怀',
  expect: '期待',
  reluctant: '不舍',
  free: '自由',
  healed: '治愈',
};

/** Prompt 模板：有图时让模型自行观察画面，无图时结合心情自由发挥 */
function buildPrompt(mood: string, hasImage: boolean): { system: string; user: string } {
  const sceneGuide = hasImage
    ? '请先仔细观察所给照片的画面（主体、环境、光线、色彩与氛围），自行识别场景，不要向用户提问。'
    : '用户未提供照片，请结合其心情自由营造一个具体、可信的旅途画面。';
  return {
    system:
      '你是一位旅行作家，擅长用简洁而富有感染力的语言描述旅途中的风景与心情。' +
      '注意：不要使用过于华丽的辞藻，保持真诚自然的语气；' +
      '避免陈词滥调（如"岁月静好"、"诗和远方"）；' +
      '文案中不要出现"AI生成"、"根据您的需求"等字样。' +
      '请严格按照 JSON 格式输出。',
    user:
      `${sceneGuide}\n用户心情：${mood}\n\n` +
      '请据此生成3种风格的旅行文案，并以 JSON 对象返回：\n' +
      '{"scene": "对画面/场景的一句话概括（10-20字）", "shortVersion": "短句版", "narrativeVersion": "叙事版", "poeticVersion": "诗意版"}\n\n' +
      '各版本要求：\n' +
      '1. 【短句版】15字以内，适合社交媒体配文，简洁有力，有画面感。\n' +
      '2. 【叙事版】100-200字，像一段日记，有细节、有感受、有故事感。\n' +
      '3. 【诗意版】50-80字，像一首短诗，注重意象和韵律，可以不完全押韵。',
  };
}

/** 从 AI 返回内容中解析 JSON（容忍 ```json 包裹与前后杂文） */
function parseJsonContent(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('AI 返回内容中未找到 JSON 对象');
  }
  const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
  return JSON.parse(jsonStr) as Record<string, unknown>;
}

/** 规范化文案文本：AI 偶尔会把换行输出成字面 \n，转回真实换行 */
function normalizeText(text: string): string {
  return text.replace(/\\n/g, '\n').trim();
}

@Injectable()
export class DeepSeekService {
  /**
   * 调用 DeepSeek API 生成 3 种风格文案
   */
  async generateCopywriting(opts: {
    mood?: string | null;
    imageDataUrl?: string | null;
  }): Promise<GeneratedCopywriting> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('AI 服务未配置，请联系管理员设置 DEEPSEEK_API_KEY');
    }

    const moodLabel = opts.mood ? (MOOD_LABELS[opts.mood] ?? opts.mood) : '自由发挥';
    const imageDataUrl = opts.imageDataUrl ?? null;
    const { system, user } = buildPrompt(moodLabel, !!imageDataUrl);

    const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: imageDataUrl
                ? [
                    { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
                    { type: 'text', text: user },
                  ]
                : user,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 1.3,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      console.error('DeepSeek API 请求失败:', error);
      throw new ServiceUnavailableException('AI 服务暂时不可用，请稍后重试');
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`DeepSeek API 返回 ${response.status}: ${errText}`);
      throw new ServiceUnavailableException('AI 服务返回异常，请稍后重试');
    }

    const result = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException('AI 未返回有效内容，请稍后重试');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonContent(content);
    } catch (error) {
      console.error('AI 返回内容解析失败:', content.slice(0, 200));
      throw new ServiceUnavailableException('AI 返回内容异常，请重试');
    }

    const shortVersion = typeof parsed.shortVersion === 'string' ? parsed.shortVersion : '';
    const narrativeVersion =
      typeof parsed.narrativeVersion === 'string' ? parsed.narrativeVersion : '';
    const poeticVersion = typeof parsed.poeticVersion === 'string' ? parsed.poeticVersion : '';

    if (!shortVersion || !narrativeVersion || !poeticVersion) {
      throw new ServiceUnavailableException('AI 返回的文案不完整，请重试');
    }

    return {
      scene:
        typeof parsed.scene === 'string' && parsed.scene.trim()
          ? parsed.scene.trim()
          : '旅途瞬间',
      shortVersion: normalizeText(shortVersion),
      narrativeVersion: normalizeText(narrativeVersion),
      poeticVersion: normalizeText(poeticVersion),
    };
  }
}
