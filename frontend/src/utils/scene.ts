/**
 * 场景说明工具
 *
 * 场景不再由用户从固定标签里选择，也不再作为筛选键；
 * 它由 AI 识图后自由生成一句话概括（如"草原上马群与远山"），
 * 仅作为展示用的描述文字，直接存入 Copywriting.sceneTag。
 */

/** 场景为空时的占位文本 */
export const SCENE_FALLBACK = '旅途瞬间'

/**
 * 获取场景展示文本：原样返回 AI 概括的一句话场景，空值返回占位
 */
export function getSceneLabel(sceneTag: string | null | undefined): string {
  const text = sceneTag?.trim()
  return text || SCENE_FALLBACK
}
