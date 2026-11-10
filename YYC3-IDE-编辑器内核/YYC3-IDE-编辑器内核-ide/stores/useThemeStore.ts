/**
 * @file: stores/useThemeStore.ts
 * @description: 主题状态管理 Store - 管理主题切换、自定义颜色、系统主题同步
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-31
 * @updated: 2026-04-01
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,zustand,state-management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyThemeToDOM,
  loadActiveThemeId,
  PRESET_THEMES,
  loadCustomThemes,
} from "../CustomThemeStore";

export type ThemeId = "navy" | "cyberpunk";

export interface ThemeColors {
  primary?: string;
  background?: string;
  foreground?: string;
  accent?: string;
  muted?: string;
  [key: string]: string | undefined;
}

export interface ThemeState {
  currentTheme: ThemeId;
  customColors: ThemeColors;
  systemThemeFollow: boolean;
  showThemeCustomizer: boolean;
  isCyber: boolean;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  updateCustomColors: (colors: Partial<ThemeColors>) => void;
  setSystemThemeFollow: (follow: boolean) => void;
  setShowThemeCustomizer: (show: boolean) => void;
}

const themePresets: Record<ThemeId, ThemeColors> = {
  navy: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    primary: "#2563eb",
    accent: "#7c3aed",
    muted: "#a1a1aa",
  },
  cyberpunk: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    primary: "#3b82f6",
    accent: "#8b5cf6",
    muted: "#71717a",
  },
};

function applyThemeClasses(theme: ThemeId) {
  document.documentElement.classList.remove("navy", "cyberpunk");
  document.documentElement.classList.add(theme);
  document.body.classList.remove("navy", "cyberpunk");
  document.body.classList.add(theme);
}

function restoreCustomTheme() {
  const customId = loadActiveThemeId();
  if (customId) {
    const allThemes = [...PRESET_THEMES, ...loadCustomThemes()];
    const found = allThemes.find((t) => t.id === customId);
    if (found) {
      applyThemeToDOM(found);
    }
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: "navy",
      customColors: {},
      systemThemeFollow: false,
      showThemeCustomizer: false,
      isCyber: false,
      setTheme: (theme: ThemeId) => {
        set({ currentTheme: theme, isCyber: theme === "cyberpunk" });
        applyThemeClasses(theme);
        restoreCustomTheme();
      },
      toggleTheme: () => {
        const { currentTheme } = get();
        const newTheme = currentTheme === "navy" ? "cyberpunk" : "navy";
        set({ currentTheme: newTheme, isCyber: newTheme === "cyberpunk" });
        applyThemeClasses(newTheme);
        restoreCustomTheme();
      },
      updateCustomColors: (colors: Partial<ThemeColors>) => {
        set((state) => {
          const newColors = { ...state.customColors, ...colors };
          return { customColors: newColors };
        });
      },
      setSystemThemeFollow: (follow: boolean) => {
        set({ systemThemeFollow: follow });
      },
      setShowThemeCustomizer: (show: boolean) => {
        set({ showThemeCustomizer: show });
        if (show) {
          restoreCustomTheme();
        }
      },
    }),
    {
      name: "yyc3-theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClasses(state.currentTheme);
          restoreCustomTheme();
        }
      },
    }
  )
);
