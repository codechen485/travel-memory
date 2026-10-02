/**
 * 首页风景轮播配置（图片位于 public/hero/，由 prep 脚本从原图压缩生成）
 * quote 为每张图对应的治愈文案，随轮播切换展示
 */
export interface HeroSlide {
  src: string
  quote: string
}

export const HERO_SLIDES: HeroSlide[] = [
  { src: '/hero/1.jpg', quote: '山不见我，我自去见山' },
  { src: '/hero/2.jpg', quote: '风把经幡翻动，替我念完心愿' },
  { src: '/hero/3.jpg', quote: '云停留在山腰，我停留在山脚' },
  { src: '/hero/4.jpg', quote: '水乡的黄昏很慢，一条船载着整个夜晚' },
  { src: '/hero/5.jpg', quote: '日落把雪山染金，所有赶路都有了答案' },
  { src: '/hero/6.jpg', quote: '马儿低头吃草，时间低头陪我' },
  { src: '/hero/7.jpg', quote: '河流奔向雪山，我奔向远方' },
]
