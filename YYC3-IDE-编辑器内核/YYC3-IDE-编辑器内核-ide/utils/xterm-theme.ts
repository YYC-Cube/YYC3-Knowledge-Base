/**
 * @file: xterm-theme.ts
 * @description: IDE 主题到 xterm.js 主题的转换器
 *              支持动态切换、自定义主题扩展
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-04
 * @updated: 2026-04-09
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: xterm,theme,converter,styling
 */

import type { ITheme } from '@xterm/xterm'
import { logger } from "../services/Logger";

// YYC³ IDE 主题配置接口（假设的格式）
interface YYC3ThemeConfig {
  name: string
  type: 'dark' | 'light'
  colors: {
    // 编辑器基础颜色
    'editor.background'?: string
    'editor.foreground'?: string
    'editor.selectionBackground'?: string
    'editor.lineHighlightBackground'?: string
    'editorCursor.foreground'?: string
    'editorCursor.background'?: string
    'editorLineNumber.activeForeground'?: string

    // 终端专用颜色（可选覆盖）
    'terminal.background'?: string
    'terminal.foreground'?: string
    'terminal.cursorBackground'?: string
    'terminal.cursorAccent'?: string
    'terminal.selectionBackground'?: string
    'terminal.ansiBlack'?: string
    'terminal.ansiRed'?: string
    'terminal.ansiGreen'?: string
    'terminal.ansiYellow'?: string
    'terminal.ansiBlue'?: string
    'terminal.ansiMagenta'?: string
    'terminal.ansiCyan'?: string
    'terminal.ansiWhite'?: string
    'terminal.ansiBrightBlack'?: string
    'terminal.ansiBrightRed'?: string
    'terminal.ansiBrightGreen'?: string
    'terminal.ansiBrightYellow'?: string
    'terminal.ansiBrightBlue'?: string
    'terminal.ansiBrightMagenta'?: string
    'terminal.ansiBrightCyan'?: string
    'terminal.ansiBrightWhite'?: string
  }
}

// 预定义主题集合
export const XTERM_THEMES: Record<string, ITheme> = {
  // VS Code Dark+ (默认)
  'vscode-dark': {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: '#264f78',
    selectionForeground: '#ffffff',
    selectionInactiveBackground: '#3a3d41',
    black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
    blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
    brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b',
    brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6',
    brightCyan: '#29b8db', brightWhite: '#ffffff',
  },

  // VS Code Light+
  'vscode-light': {
    background: '#ffffff',
    foreground: '#383838',
    cursor: '#000000',
    cursorAccent: '#ffffff',
    selectionBackground: '#add6ff',
    selectionForeground: '#000000',
    selectionInactiveBackground: '#e5e5e5',
    black: '#000000', red: '#c72e2e', green: '#008000', yellow: '#795e26',
    blue: '#0451a5', magenta: '#a626a4', cyan: '#0598bc', white: '#555555',
    brightBlack: '#666666', brightRed: '#c72e2e', brightGreen: '#008000',
    brightYellow: '#795e26', brightBlue: '#0451a5', brightMagenta: '#a626a4',
    brightCyan: '#0598bc', brightWhite: '#383838',
  },

  // One Dark Pro (Atom/VS Code 热门)
  'one-dark-pro': {
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    cursorAccent: '#282c34',
    selectionBackground: '#3e4451',
    selectionForeground: '#ffffff',
    selectionInactiveBackground: '#2c313a',
    black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
    blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
    brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379',
    brightYellow: '#e5c07b', brightBlue: '#61afef', brightMagenta: '#c678dd',
    brightCyan: '#56b6c2', brightWhite: '#ffffff',
  },

  // Dracula (流行暗色)
  'dracula': {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    selectionForeground: '#f8f8f2',
    selectionInactiveBackground: '#343746',
    black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
    blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
    brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94',
    brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df',
    brightCyan: '#a4ffff', brightWhite: '#ffffff',
  },

  // Tokyo Night (现代日系风格)
  'tokyo-night': {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selectionBackground: '#283457',
    selectionForeground: '#c0caf5',
    selectionInactiveBackground: '#16161e',
    black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
    blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
    brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a',
    brightYellow: '#e0af68', brightBlue: '#7aa2f7', brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff', brightWhite: '#c0caf5',
  },

  // Catppuccin Mocha (柔和配色)
  'catppuccin-mocha': {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    cursorAccent: '#1e1e2e',
    selectionBackground: '#585b70',
    selectionForeground: '#cdd6f4',
    selectionInactiveBackground: '#181825',
    black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
    blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
    brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5', brightWhite: '#a6adc8',
  },

  // Monokai (经典代码编辑器)
  'monokai': {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#272822',
    selectionBackground: '#49483e',
    selectionForeground: '#f8f8f2',
    selectionInactiveBackground: '#3e3d32',
    black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
    blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2',
    brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e',
    brightYellow: '#f4bf75', brightBlue: '#66d9ef', brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4', brightWhite: '#f9f8f5',
  },

  // Solarized Dark
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    selectionForeground: '#93a1a1',
    selectionInactiveBackground: '#002b36',
    black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
    blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
    brightBlack: '#002b36', brightRed: '#cb4b16', brightGreen: '#586e75',
    brightYellow: '#657b83', brightBlue: '#839496', brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1', brightWhite: '#fdf6e3',
  },
}

/**
 * 将 YYC³ IDE 主题转换为 xterm.js 主题
 *
 * @param themeConfig - IDE 主题配置对象
 * @param fallbackTheme - 回退主题名称（默认 'vscode-dark'）
 * @returns xterm.js ITheme 对象
 */
export function convertIDEToXtermTheme(
  themeConfig: Partial<YYC3ThemeConfig> | null,
  fallbackTheme: keyof typeof XTERM_THEMES = 'vscode-dark'
): ITheme {

  if (!themeConfig || !themeConfig.colors) {
    logger.info('使用预设主题: ${fallbackTheme}');
    return { ...XTERM_THEMES[fallbackTheme] }
  }

  const { colors } = themeConfig

  const xtermTheme: ITheme = {
    // 基础颜色（优先使用终端专用，回退到编辑器通用）
    background: colors['terminal.background'] ||
                colors['editor.background'] ||
                XTERM_THEMES[fallbackTheme].background,

    foreground: colors['terminal.foreground'] ||
                colors['editor.foreground'] ||
                XTERM_THEMES[fallbackTheme].foreground,

    cursor: colors['terminal.cursorBackground'] ||
                      colors['editorCursor.foreground'] ||
                      XTERM_THEMES[fallbackTheme].cursor,

    cursorAccent: colors['terminal.cursorAccent'] ||
                  colors['editorCursor.background'] ||
                  XTERM_THEMES[fallbackTheme].cursorAccent,


    selectionBackground: colors['terminal.selectionBackground'] ||
                        colors['editor.selectionBackground'] ||
                        XTERM_THEMES[fallbackTheme].selectionBackground,

    selectionForeground: undefined, // 使用默认值

    selectionInactiveBackground: colors['editor.lineHighlightBackground'] ||
                                XTERM_THEMES[fallbackTheme].selectionInactiveBackground,

    // ANSI 颜色映射
    black: colors['terminal.ansiBlack'] || XTERM_THEMES[fallbackTheme].black,
    red: colors['terminal.ansiRed'] || XTERM_THEMES[fallbackTheme].red,
    green: colors['terminal.ansiGreen'] || XTERM_THEMES[fallbackTheme].green,
    yellow: colors['terminal.ansiYellow'] || XTERM_THEMES[fallbackTheme].yellow,
    blue: colors['terminal.ansiBlue'] || XTERM_THEMES[fallbackTheme].blue,
    magenta: colors['terminal.ansiMagenta'] || XTERM_THEMES[fallbackTheme].magenta,
    cyan: colors['terminal.ansiCyan'] || XTERM_THEMES[fallbackTheme].cyan,
    white: colors['terminal.ansiWhite'] || XTERM_THEMES[fallbackTheme].white,

    brightBlack: colors['terminal.ansiBrightBlack'] || XTERM_THEMES[fallbackTheme].brightBlack,
    brightRed: colors['terminal.ansiBrightRed'] || XTERM_THEMES[fallbackTheme].brightRed,
    brightGreen: colors['terminal.ansiBrightGreen'] || XTERM_THEMES[fallbackTheme].brightGreen,
    brightYellow: colors['terminal.ansiBrightYellow'] || XTERM_THEMES[fallbackTheme].brightYellow,
    brightBlue: colors['terminal.ansiBrightBlue'] || XTERM_THEMES[fallbackTheme].brightBlue,
    brightMagenta: colors['terminal.ansiBrightMagenta'] || XTERM_THEMES[fallbackTheme].brightMagenta,
    brightCyan: colors['terminal.ansiBrightCyan'] || XTERM_THEMES[fallbackTheme].brightCyan,
    brightWhite: colors['terminal.ansiBrightWhite'] || XTERM_THEMES[fallbackTheme].brightWhite,
  }

  logger.info(`已转换 IDE 主题: ${themeConfig.name || 'Custom'}`);
  return xtermTheme
}

/**
 * 根据系统偏好自动选择主题
 */
export function getSystemPreferredTheme(): ITheme {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return { ...XTERM_THEMES['vscode-dark'] }
  } else {
    return { ...XTERM_THEMES['vscode-light'] }
  }
}

/**
 * 创建自定义主题（用于用户个性化）
 */
export function createCustomTheme(overrides: Partial<ITheme>, baseTheme?: keyof typeof XTERM_THEMES): ITheme {
  const base = baseTheme ? { ...XTERM_THEMES[baseTheme] } : getDefaultDarkTheme()

  return {
    ...base,
    ...overrides,
  }
}

function getDefaultDarkTheme(): ITheme {
  return { ...XTERM_THEMES['vscode-dark'] }
}

export default convertIDEToXtermTheme
