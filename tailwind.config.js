/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 胶片风格的低饱和度暖色调
        film: {
          bg: '#e8e3db',      // 主背景：米白色
          paper: '#f5f2ed',    // 卡片背景：纸质白
          cream: '#f0ebe3',    // 奶油色
          sand: '#d9d4cc',     // 沙色
          stone: '#c4bfb6',    // 石灰色
          warm: '#b8b3aa',     // 暖灰
          carbon: '#9a958c',   // 碳灰
          slate: '#6e6b64',    // 板岩灰
          charcoal: '#4a4740', // 炭黑
          ink: '#2d2b28',      // 墨黑
        },
        accent: {
          50: '#f9f3ed',
          100: '#f3e7da',
          200: '#e7cfb5',
          300: '#d9b190',
          400: '#c9936b',
          500: '#b87d52',   // 主强调色：低饱和橙棕
          600: '#a06944',
          700: '#805337',
          800: '#604029',
          900: '#40291b',
        },
        // 保留原始的 primary/secondary/neutral 但降低饱和度
        primary: {
          50: '#f5f5f4',
          100: '#e7e6e4',
          200: '#cfceca',
          300: '#b3b1ab',
          400: '#908e87',
          500: '#75736d',
          600: '#5a5854',
          700: '#46443f',
          800: '#37352f',
          900: '#282621',
        },
        secondary: {
          50: '#f7f7f6',
          100: '#efeeec',
          200: '#dddbd7',
          300: '#c6c4be',
          400: '#aba8a0',
          500: '#8e8b83',
          600: '#6e6b64',
          700: '#53514b',
          800: '#3e3d38',
          900: '#2b2a26',
        },
        neutral: {
          50: '#f8f7f5',
          100: '#f1f0ed',
          200: '#e3e1dc',
          300: '#d1cfc8',
          400: '#b5b2a9',
          500: '#95928a',
          600: '#77746c',
          700: '#5a5853',
          800: '#42403c',
          900: '#2e2d2a',
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // 胶片风格的柔和阴影
        'film-soft': '0 2px 8px rgba(45, 43, 40, 0.06), 0 1px 3px rgba(45, 43, 40, 0.04)',
        'film-medium': '0 4px 12px rgba(45, 43, 40, 0.08), 0 2px 6px rgba(45, 43, 40, 0.06)',
        'film-large': '0 8px 24px rgba(45, 43, 40, 0.1), 0 4px 12px rgba(45, 43, 40, 0.08)',
        'film-inner': 'inset 0 1px 3px rgba(45, 43, 40, 0.1)',
        // 保留原有的
        'soft': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 6px rgba(0, 0, 0, 0.07)',
        'large': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'ios': '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        // 无衬线字体：用于UI元素、正文、导航
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // 衬线字体：用于大标题、强调文本
        serif: ['Merriweather', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        // 代码字体
        mono: ['SF Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
