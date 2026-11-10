/// <reference types="chrome" />

// WXT type imports
interface BackgroundDefinition {
  main(): void;
}

interface ContentScriptDefinition {
  matches: string[];
  runAt?: 'document_start' | 'document_end' | 'document_idle';
  allFrames?: boolean;
  main: () => void;
}

// WXT global functions
declare function defineBackground(fn: () => void): BackgroundDefinition;
declare function defineContentScript(config: ContentScriptDefinition): ContentScriptDefinition;
