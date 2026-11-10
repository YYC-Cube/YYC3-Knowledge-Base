/**
 * YYC3 App Root — Three-mode layout with global command palette,
 *   settings panel, notification center, global search, and keyboard shortcuts.
 * Code-split: overlay panels loaded via React.lazy; main views imported eagerly.
 * @version 4.8.0
 */

import { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import "../styles/cyberpunk.css";
import { I18nProvider, useI18n } from "./i18n/context";
import { ModelStoreProvider, useModelStore } from "./store/model-store";
import { useThemeStore } from "./store/theme-store";
import { useShortcutStore } from "./store/shortcut-store";
import { CyberpunkBackground } from "./components/CyberpunkBackground";
import { CyberToaster } from "./components/CyberToast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PanelSkeleton } from "./components/LoadingSkeleton";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { panelDnDActions } from "./store/panel-dnd-store";

// ===== Eager imports — main views (critical rendering path) =====
import { FullscreenMode } from "./components/FullscreenMode";
import { ModelSettings } from "./components/ModelSettings";

// ===== React.lazy — code-split views & overlay panels (loaded on demand) =====
const IDEMode = lazy(() => import("./components/IDEMode").then(m => ({ default: m.IDEMode })));
const FloatingWidget = lazy(() => import("./components/FloatingWidget").then(m => ({ default: m.FloatingWidget })));
const CommandPalette = lazy(() => import("./components/CommandPalette").then(m => ({ default: m.CommandPalette })));
const SettingsPanel = lazy(() => import("./components/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const NotificationCenter = lazy(() => import("./components/NotificationCenter").then(m => ({ default: m.NotificationCenter })));
const GlobalSearch = lazy(() => import("./components/GlobalSearch").then(m => ({ default: m.GlobalSearch })));
const ShortcutCheatSheet = lazy(() => import("./components/ShortcutCheatSheet").then(m => ({ default: m.ShortcutCheatSheet })));

// Type-only import (erased at compile time)
import type { PaletteCommand } from "./components/CommandPalette";

import {
  Monitor, Sun, Moon, Globe, Settings, Bot,
  Sparkles, Code2, Terminal, FolderPlus,
  Keyboard, Bell, Eye, Search, Users,
  GitBranch, Activity, AlertTriangle, LayoutGrid, Scissors, Clock, Database,
  Puzzle, Shield, Wifi,
} from "lucide-react";

type AppMode = "fullscreen" | "widget" | "ide";

/** Read file content map from localStorage (written by IDEMode autoSave) */
function readFileContentMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem("yyc3_file_content_map");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    }
  } catch { /* ignore */ }
  return {};
}

function AppContent() {
  const [mode, setMode] = useState<AppMode>("fullscreen");
  const { t, toggleLocale } = useI18n();
  const { tokens, isCyberpunk, toggleTheme, setTheme } = useThemeStore();
  const { openModelSettings } = useModelStore();
  const { shortcuts } = useShortcutStore();

  // ===== Shared Layout URL Detection (对齐 Guidelines: Layout Sharing) =====
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#yyc3-layout=')) {
        const result = panelDnDActions.importFromShareURL(hash);
        if (result.success && result.layout) {
          console.log(`[YYC³] Imported shared layout: ${result.layout.name}`);
          // Clean hash — wrapped in try/catch for sandboxed iframe environments
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* sandboxed */ }
        }
      }
    } catch { /* ignore hash parsing errors in preview iframe */ }
  }, []);

  // Panel states
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);

  // Shortcut cheat sheet
  const [cheatSheetVisible, setCheatSheetVisible] = useState(false);

  // Read file content map fresh each time search opens
  const [searchFileMap, setSearchFileMap] = useState<Record<string, string>>({});
  const openGlobalSearch = useCallback(() => {
    setSearchFileMap(readFileContentMap());
    setGlobalSearchVisible(true);
  }, []);

  // File select from search — switch to IDE and select the file
  const handleSearchSelectFile = useCallback((fileName: string, _line?: number) => {
    setMode("ide");
    // The IDE will pick up the file from its fileContentMap (restored from localStorage)
  }, []);

  // ===== Command definitions =====
  const commands = useMemo<PaletteCommand[]>(() => [
    // Navigation
    {
      id: 'switch-fullscreen', labelKey: 'cmdSwitchFullscreen', categoryKey: 'catNavigation',
      icon: Monitor, shortcut: '',
      action: () => setMode('fullscreen'),
    },
    {
      id: 'switch-ide', labelKey: 'cmdSwitchIDE', categoryKey: 'catNavigation',
      icon: Code2, shortcut: '',
      action: () => setMode('ide'),
    },
    {
      id: 'switch-widget', labelKey: 'cmdSwitchWidget', categoryKey: 'catNavigation',
      icon: Sparkles, shortcut: '',
      action: () => setMode('widget'),
    },
    // Theme
    {
      id: 'toggle-theme', labelKey: 'cmdToggleTheme', categoryKey: 'catTheme',
      icon: isCyberpunk ? Sun : Moon, shortcut: shortcuts.toggleTheme?.display ?? '⌘⇧T',
      action: toggleTheme,
    },
    {
      id: 'cyberpunk-theme', labelKey: 'cmdCyberpunkTheme', categoryKey: 'catTheme',
      icon: Moon,
      action: () => setTheme('cyberpunk'),
    },
    {
      id: 'clean-theme', labelKey: 'cmdCleanTheme', categoryKey: 'catTheme',
      icon: Sun,
      action: () => setTheme('clean'),
    },
    {
      id: 'toggle-lang', labelKey: 'cmdToggleLang', categoryKey: 'catTheme',
      icon: Globe, shortcut: shortcuts.toggleLang?.display ?? '⌘⇧L',
      action: toggleLocale,
    },
    // Tools
    {
      id: 'open-settings', labelKey: 'cmdOpenSettings', categoryKey: 'catTools',
      icon: Settings, shortcut: shortcuts.openSettings?.display ?? '⌘,',
      action: () => setSettingsVisible(true),
    },
    {
      id: 'open-model-settings', labelKey: 'cmdOpenModelSettings', categoryKey: 'catAI',
      icon: Bot, shortcut: shortcuts.modelSettings?.display ?? '⌘⇧M',
      action: () => openModelSettings(),
    },
    {
      id: 'open-notifications', labelKey: 'cmdOpenNotifications', categoryKey: 'catTools',
      icon: Bell,
      action: () => setNotificationsVisible(true),
    },
    {
      id: 'keyboard-shortcuts', labelKey: 'cmdKeyboardShortcuts', categoryKey: 'catTools',
      icon: Keyboard,
      action: () => { setCheatSheetVisible(true) },
    },
    // IDE-specific
    {
      id: 'toggle-terminal', labelKey: 'cmdToggleTerminal', categoryKey: 'catEditor',
      icon: Terminal, shortcut: shortcuts.toggleTerminal?.display ?? '⌘`',
      action: () => { setMode('ide') },
    },
    {
      id: 'new-project', labelKey: 'cmdNewProject', categoryKey: 'catProject',
      icon: FolderPlus, shortcut: shortcuts.newProject?.display ?? '⌘⇧N',
      action: () => { setMode('ide') },
    },
    {
      id: 'open-ai-assist', labelKey: 'cmdOpenAIAssist', categoryKey: 'catAI',
      icon: Sparkles, shortcut: shortcuts.aiAssist?.display ?? '⌘⇧A',
      action: () => { setMode('ide') },
    },
    {
      id: 'open-code-gen', labelKey: 'cmdOpenCodeGen', categoryKey: 'catAI',
      icon: Code2, shortcut: shortcuts.codeGen?.display ?? '⌘⇧G',
      action: () => { setMode('ide') },
    },
    {
      id: 'toggle-preview', labelKey: 'cmdTogglePreview', categoryKey: 'catEditor',
      icon: Eye, shortcut: shortcuts.togglePreview?.display ?? '⌘1',
      action: () => { setMode('ide') },
    },
    {
      id: 'global-search', labelKey: 'cmdGlobalSearch', categoryKey: 'catTools',
      icon: Search, shortcut: shortcuts.globalSearch?.display ?? '⌘⇧F',
      action: openGlobalSearch,
    },
    {
      id: 'toggle-collab', labelKey: 'cmdToggleCollab', categoryKey: 'catTools',
      icon: Users,
      action: () => { setMode('ide') },
    },
    // New MVP expansion panels
    {
      id: 'open-git-panel', labelKey: 'cmdOpenGitPanel', categoryKey: 'catTools',
      icon: GitBranch, shortcut: shortcuts.openGitPanel?.display ?? '⌘ Shift H',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'git' })) },
    },
    {
      id: 'open-performance', labelKey: 'cmdOpenPerformance', categoryKey: 'catTools',
      icon: Activity, shortcut: shortcuts.openPerformance?.display ?? '⌘ Shift P',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'performance' })) },
    },
    {
      id: 'open-diagnostics', labelKey: 'cmdOpenDiagnostics', categoryKey: 'catTools',
      icon: AlertTriangle, shortcut: shortcuts.openDiagnostics?.display ?? '⌘ Shift D',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'diagnostics' })) },
    },
    {
      id: 'open-task-board', labelKey: 'cmdOpenTaskBoard', categoryKey: 'catProject',
      icon: LayoutGrid, shortcut: shortcuts.openTaskBoard?.display ?? '⌘ Shift B',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'taskBoard' })) },
    },
    {
      id: 'open-snippets', labelKey: 'cmdOpenSnippets', categoryKey: 'catEditor',
      icon: Scissors, shortcut: shortcuts.openSnippets?.display ?? '⌘ Shift S',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'snippets' })) },
    },
    {
      id: 'open-activity-log', labelKey: 'cmdOpenActivityLog', categoryKey: 'catTools',
      icon: Clock, shortcut: shortcuts.openActivityLog?.display ?? '⌘ Shift J',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'activityLog' })) },
    },
    {
      id: 'open-database', labelKey: 'cmdOpenDatabase', categoryKey: 'catTools',
      icon: Database, shortcut: '⌘ Shift Q',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'database' })) },
    },
    {
      id: 'open-plugins', labelKey: 'cmdOpenPlugins', categoryKey: 'catTools',
      icon: Puzzle, shortcut: '⌘ Shift E',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'plugins' })) },
    },
    {
      id: 'open-security', labelKey: 'cmdOpenSecurity', categoryKey: 'catTools',
      icon: Shield, shortcut: '⌘ Shift X',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'security' })) },
    },
    {
      id: 'open-offline', labelKey: 'cmdOpenOffline', categoryKey: 'catTools',
      icon: Wifi, shortcut: '⌘ Shift O',
      action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'offline' })) },
    },
  ], [isCyberpunk, toggleTheme, setTheme, toggleLocale, openModelSettings, shortcuts, openGlobalSearch]);

  // ===== Keyboard shortcuts — use custom bindings from store =====
  useKeyboardShortcuts([
    { keys: shortcuts.commandPalette?.internal ?? 'mod+k', action: () => setCommandPaletteVisible((v) => !v) },
    { keys: shortcuts.toggleTheme?.internal ?? 'mod+shift+t', action: toggleTheme },
    { keys: shortcuts.toggleLang?.internal ?? 'mod+shift+l', action: toggleLocale },
    { keys: shortcuts.openSettings?.internal ?? 'mod+,', action: () => setSettingsVisible((v) => !v) },
    { keys: shortcuts.modelSettings?.internal ?? 'mod+shift+m', action: () => openModelSettings() },
    { keys: shortcuts.globalSearch?.internal ?? 'mod+shift+f', action: openGlobalSearch },
    // Panel shortcuts — dispatch custom events for IDEMode to handle
    { keys: shortcuts.openSnippets?.internal ?? 'mod+shift+s', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'snippets' })) } },
    { keys: shortcuts.openTaskBoard?.internal ?? 'mod+shift+b', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'taskBoard' })) } },
    { keys: shortcuts.openGitPanel?.internal ?? 'mod+shift+h', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'git' })) } },
    { keys: shortcuts.openPerformance?.internal ?? 'mod+shift+p', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'performance' })) } },
    { keys: shortcuts.openDiagnostics?.internal ?? 'mod+shift+d', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'diagnostics' })) } },
    { keys: shortcuts.openActivityLog?.internal ?? 'mod+shift+j', action: () => { setMode('ide'); window.dispatchEvent(new CustomEvent('yyc3:open-panel', { detail: 'activityLog' })) } },
    // Shortcut cheat sheet
    { keys: shortcuts.shortcutCheatSheet?.internal ?? 'mod+/', action: () => setCheatSheetVisible(v => !v) },
    { keys: 'escape', action: () => {
      if (globalSearchVisible) setGlobalSearchVisible(false)
      else if (commandPaletteVisible) setCommandPaletteVisible(false)
      else if (settingsVisible) setSettingsVisible(false)
      else if (notificationsVisible) setNotificationsVisible(false)
      else if (cheatSheetVisible) setCheatSheetVisible(false)
    }, preventDefault: false },
  ]);

  return (
    <div
      className="w-full h-screen overflow-hidden"
      style={{
        background: tokens.background,
        fontFamily: tokens.fontBody,
        position: "relative",
        color: tokens.foreground,
        transition: "background 0.4s ease, color 0.4s ease",
      }}
    >
      <CyberpunkBackground />
      {mode === "fullscreen" ? (
        <FullscreenMode
          onSwitchMode={() => setMode("widget")}
          onSwitchToIDE={() => setMode("ide")}
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenNotifications={() => setNotificationsVisible(true)}
          onOpenCommandPalette={() => setCommandPaletteVisible(true)}
          onOpenGlobalSearch={openGlobalSearch}
        />
      ) : mode === "ide" ? (
        <Suspense fallback={<PanelSkeleton />}>
          <IDEMode
            onSwitchMode={() => setMode("fullscreen")}
            onOpenSettings={() => setSettingsVisible(true)}
            onOpenNotifications={() => setNotificationsVisible(true)}
            onOpenCommandPalette={() => setCommandPaletteVisible(true)}
            onOpenGlobalSearch={openGlobalSearch}
          />
        </Suspense>
      ) : (
        <div style={{ position: "relative", zIndex: 10, width: "100%", height: "100%" }}>
          <div className="flex items-center justify-center size-full">
            <div className="text-center">
              <p
                style={{
                  fontFamily: tokens.fontMono,
                  fontSize: "12px",
                  color: tokens.primaryDim,
                  letterSpacing: "4px",
                  opacity: isCyberpunk ? 0.3 : 0.6,
                }}
              >
                YYC&sup3; {t("common", "systemSubtitle")}
              </p>
              <p
                style={{
                  fontFamily: tokens.fontMono,
                  fontSize: "10px",
                  color: isCyberpunk ? tokens.accent : tokens.foregroundMuted,
                  marginTop: "8px",
                  letterSpacing: "2px",
                  opacity: isCyberpunk ? 0.15 : 0.6,
                }}
              >
                {t("mode", "widgetModeActive")}
              </p>
            </div>
          </div>
          <Suspense fallback={<PanelSkeleton />}>
            <FloatingWidget onSwitchMode={() => setMode("fullscreen")} />
          </Suspense>
        </div>
      )}

      {/* Global overlays — eagerly imported */}
      <ModelSettings />
      <CyberToaster />

      {/* Feature panels */}
      <Suspense fallback={<PanelSkeleton />}>
        <CommandPalette
          visible={commandPaletteVisible}
          onClose={() => setCommandPaletteVisible(false)}
          commands={commands}
        />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <SettingsPanel
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <NotificationCenter
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <GlobalSearch
          visible={globalSearchVisible}
          onClose={() => setGlobalSearchVisible(false)}
          fileContentMap={searchFileMap}
          onSelectFile={handleSearchSelectFile}
          onReplace={(fileName, oldText, newText) => {
            // 对齐 Guidelines: Host-File-System Manager — 全局搜索替换
            try {
              const stored = localStorage.getItem("yyc3_file_content_map");
              if (stored) {
                const map = JSON.parse(stored) as Record<string, string>;
                if (map[fileName]) {
                  map[fileName] = map[fileName].replaceAll(oldText, newText);
                  localStorage.setItem("yyc3_file_content_map", JSON.stringify(map));
                  setSearchFileMap({ ...map });
                }
              }
            } catch { /* ignore */ }
          }}
        />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <ShortcutCheatSheet visible={cheatSheetVisible} onClose={() => setCheatSheetVisible(false)} />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ModelStoreProvider>
          <AppContent />
        </ModelStoreProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}