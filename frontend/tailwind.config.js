/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 《行囊》主题色
        primary: '#5B8C5A', // 苔藓绿（主色）
        secondary: '#8FB996', // 浅叶绿（辅色）
        accent: '#E8C07A', // 麦秆黄（强调色）
        background: '#F7F5F0', // 米白（背景）
        text: '#3D3D3D', // 深灰（文字）
        card: '#D4E2D4', // 薄雾绿（卡片）
        decoration: '#A8C5A8', // 远山绿（装饰）
      },
    },
  },
  plugins: [],
}
