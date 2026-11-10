/**
 * YYC3 Model Settings — Multi-provider management with MCP config & diagnostics
 * Aligned with guidelines/ModelSettings.tsx reference — cyberpunk themed
 * @version 4.8.0
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X, Plus, Trash2, Edit3, Check, ChevronDown, ChevronRight,
  Server, Cloud, Bot, Sparkles, RefreshCw, ExternalLink,
  Eye, EyeOff, AlertCircle, CheckCircle2, Copy, Search,
  Zap, Loader2, XCircle, Clock, Settings2,
  Shield, Globe, Cpu, Activity, Terminal,
  ArrowRight, Wifi, Plug, AlertTriangle,
  FileCode2, PlusCircle, MinusCircle, Lightbulb, Bug, Palette, BarChart3
} from "lucide-react";
import { useModelStore, type AIModel } from "../store/model-store";
import { useI18n } from "../i18n/context";
import { useThemeStore, themeStore, type ThemeTokens, Z_INDEX, BLUR } from "../store/theme-store";
import { ThemePreview } from "./ThemePreview";
import { useAIMetrics, getErrorTypeLabel, aiMetricsStore } from "../store/ai-metrics-store";
import type { AggregatedMetrics, ErrorStats, CostSummary } from "../store/ai-metrics-store";

// Font/color constants removed — use tokens from useThemeStore() instead

// ===== Types =====
interface ProviderDef {
  id: string; name: string; shortName: string; icon: typeof Cloud;
  color: string; bgColor: string; borderColor: string;
  description: string; baseURL: string;
  apiKeyUrl: string; apiKeyPlaceholder: string;
  models: ModelDef[]; openaiCompatible: boolean; docsUrl: string;
}
interface ModelDef {
  id: string; name: string; description: string;
  contextWindow?: string; pricing?: string;
}
interface MCPServerConfig {
  id: string; name: string; description: string;
  command: string; args: string[]; env: Record<string, string>; enabled: boolean;
}
interface DiagnosticResult {
  providerId: string; modelName: string;
  status: "idle" | "testing" | "success" | "error";
  latency?: number; message: string; modelResponse?: string; timestamp?: number;
}
interface OllamaDetectedModel {
  name: string; size: string; status: "online" | "offline"; quantization: string;
}

// ===== Provider Definitions =====
const PROVIDERS: ProviderDef[] = [
  {
    id: "openai", name: "OpenAI", shortName: "GPT", icon: Cloud,
    color: "#00ff88", bgColor: "rgba(0,255,136,0.06)", borderColor: "rgba(0,255,136,0.2)",
    description: "GPT-4o / o3 / o4-mini",
    baseURL: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys", apiKeyPlaceholder: "sk-proj-...",
    openaiCompatible: true, docsUrl: "https://platform.openai.com/docs",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Flagship multimodal", contextWindow: "128K", pricing: "$2.5/1M" },
      { id: "gpt-4o-mini", name: "GPT-4o-mini", description: "Cost-effective", contextWindow: "128K", pricing: "$0.15/1M" },
      { id: "o3-mini", name: "o3-mini", description: "Reasoning enhanced", contextWindow: "128K", pricing: "$1.1/1M" },
      { id: "o4-mini", name: "o4-mini", description: "Latest reasoning", contextWindow: "200K", pricing: "$1.1/1M" },
    ],
  },
  {
    id: "claude", name: "Anthropic", shortName: "Claude", icon: Shield,
    color: "#ff8800", bgColor: "rgba(255,136,0,0.06)", borderColor: "rgba(255,136,0,0.2)",
    description: "Claude Sonnet / Haiku",
    baseURL: "https://api.anthropic.com/v1/messages",
    apiKeyUrl: "https://console.anthropic.com/settings/keys", apiKeyPlaceholder: "sk-ant-...",
    openaiCompatible: false, docsUrl: "https://docs.anthropic.com",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Latest flagship", contextWindow: "200K", pricing: "$3/1M" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast & efficient", contextWindow: "200K", pricing: "$0.8/1M" },
    ],
  },
  {
    id: "zhipu", name: "\u667A\u8C31 AI", shortName: "GLM", icon: Cpu,
    color: "#4488ff", bgColor: "rgba(68,136,255,0.06)", borderColor: "rgba(68,136,255,0.2)",
    description: "GLM-5 / GLM-4 \u7CFB\u5217",
    baseURL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys", apiKeyPlaceholder: "\u8F93\u5165\u667A\u8C31 API Key...",
    openaiCompatible: true, docsUrl: "https://open.bigmodel.cn/dev/api/normal-model/glm-4",
    models: [
      { id: "glm-5", name: "GLM-5", description: "\u6700\u65B0\u65D7\u8230\u63A8\u7406\u6A21\u578B", contextWindow: "128K" },
      { id: "glm-4.5", name: "GLM-4.5", description: "\u9AD8\u8D28\u91CF\u5BF9\u8BDD\u6A21\u578B", contextWindow: "128K" },
      { id: "glm-4.5-air", name: "GLM-4.5-Air", description: "\u8F7B\u91CF\u9AD8\u901F\u6A21\u578B" },
    ],
  },
  {
    id: "qwen", name: "\u901A\u4E49\u5343\u95EE (\u963F\u91CC\u4E91)", shortName: "QWEN", icon: Globe,
    color: "#aa66ff", bgColor: "rgba(170,102,255,0.06)", borderColor: "rgba(170,102,255,0.2)",
    description: "DashScope OpenAI \u517C\u5BB9",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    apiKeyUrl: "https://dashscope.console.aliyun.com/apiKey", apiKeyPlaceholder: "sk-...",
    openaiCompatible: true, docsUrl: "https://help.aliyun.com/zh/model-studio/getting-started/first-api-call-to-qwen",
    models: [
      { id: "qwen3-max", name: "Qwen3-Max", description: "\u65D7\u8230\u601D\u8003\u6A21\u578B", contextWindow: "128K" },
      { id: "qwen-plus", name: "Qwen-Plus", description: "\u6548\u679C/\u901F\u5EA6\u5747\u8861", contextWindow: "128K" },
      { id: "qwen3-coder-plus", name: "Qwen3-Coder-Plus", description: "\u4EE3\u7801\u4E13\u7CBE\u6A21\u578B", contextWindow: "128K" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "DS", icon: Zap,
    color: "#00f0ff", bgColor: "rgba(0,240,255,0.06)", borderColor: "rgba(0,240,255,0.2)",
    description: "DeepSeek V3.2 / R1",
    baseURL: "https://api.deepseek.com/v1/chat/completions",
    apiKeyUrl: "https://platform.deepseek.com/api_keys", apiKeyPlaceholder: "sk-...",
    openaiCompatible: true, docsUrl: "https://api-docs.deepseek.com",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3.2", description: "Latest flagship", contextWindow: "128K", pricing: "$0.27/1M" },
      { id: "deepseek-reasoner", name: "DeepSeek R1", description: "Reasoning enhanced", contextWindow: "128K", pricing: "$0.55/1M" },
    ],
  },
  {
    id: "ollama", name: "Ollama (\u672C\u5730)", shortName: "Local", icon: Server,
    color: "#ffaa00", bgColor: "rgba(255,170,0,0.06)", borderColor: "rgba(255,170,0,0.2)",
    description: "\u672C\u5730\u90E8\u7F72 \u00B7 \u79C1\u6709\u6570\u636E",
    baseURL: "http://localhost:11434/api/chat",
    apiKeyUrl: "", apiKeyPlaceholder: "",
    openaiCompatible: false, docsUrl: "https://ollama.com",
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B", description: "Meta open-source" },
      { id: "codellama:13b", name: "CodeLlama 13B", description: "Code specialist" },
      { id: "qwen2.5:7b", name: "Qwen 2.5 7B", description: "Qwen local edition" },
    ],
  },
];

const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  { id: "mcp-filesystem", name: "Filesystem", description: "\u6587\u4EF6\u7CFB\u7EDF\u8BFB\u5199", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/app/designs"], env: {}, enabled: true },
  { id: "mcp-fetch", name: "Fetch", description: "HTTP \u8BF7\u6C42\u5DE5\u5177", command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"], env: {}, enabled: true },
  { id: "mcp-postgres", name: "PostgreSQL", description: "\u6570\u636E\u5E93\u67E5\u8BE2", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"], env: { DATABASE_URL: "postgresql://user:pwd@localhost:5432/yanyucloud" }, enabled: false },
];

// ===== Storage =====
const SK = { keys: "yyc3-provider-api-keys", urls: "yyc3-provider-urls", mcp: "yyc3-mcp-servers", custom: "yyc3-custom-providers" };
function loadJ<T>(k: string, fb: T): T { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function saveJ(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ===== Cyber input style helper =====
const cyInput = "w-full px-3 py-2 rounded-lg text-[11px] font-mono outline-none transition-all";
function getCyInputStyle(): React.CSSProperties {
  const tk = themeStore.getTokens();
  return { color: tk.foreground, background: tk.inputBg, border: `1px solid ${tk.inputBorder}`, caretColor: tk.primary };
}

/**
 * Adapts provider brand colors for the current theme.
 * Cyberpunk: neon colors as-is. Clean: increased opacity for light-bg visibility.
 */
function getProviderColors(prov: ProviderDef, isClean: boolean) {
  if (!isClean) return { color: prov.color, bgColor: prov.bgColor, borderColor: prov.borderColor };
  return {
    color: prov.color,
    bgColor: prov.bgColor.replace(/[\d.]+\)$/, '0.10)'),
    borderColor: prov.borderColor.replace(/[\d.]+\)$/, '0.30)'),
  };
}

// Legacy cyInputStyle/cyInputFocus removed — use getCyInputStyle() with tokens instead

function CopyBtn({ text }: { text: string }) {
  const [ok, set] = useState(false);
  const { tokens: _tk } = useThemeStore();
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); set(true); setTimeout(() => set(false), 2000); }}
      className="p-1 rounded transition-all hover:opacity-80" style={{ color: ok ? _tk.success : _tk.foregroundMuted }}>
      {ok ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

// ===== Provider Card =====
function ProviderCard({ provider, apiKey, customUrl, diags, expanded, activeModelKey,
  onToggle, onApiKeyChange, onUrlChange, onTestConnection, onSelectModel, isCustom, onRemoveProvider,
  t, tk }: {
  provider: ProviderDef; apiKey: string; customUrl: string;
  diags: Record<string, DiagnosticResult>; expanded: boolean; activeModelKey: string | null;
  onToggle: () => void; onApiKeyChange: (k: string) => void; onUrlChange: (u: string) => void;
  onTestConnection: (modelId: string) => void; onSelectModel: (modelId: string) => void;
  isCustom?: boolean; onRemoveProvider?: () => void;
  t: (ns: string, key: string) => string;
  tk: ThemeTokens;
}) {
  const [showKey, setShowKey] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(customUrl || provider.baseURL);
  const [addingModel, setAddingModel] = useState(false);
  const [newMId, setNewMId] = useState("");
  const [newMName, setNewMName] = useState("");
  const Icon = provider.icon;
  const activeUrl = customUrl || provider.baseURL;
  const hasActive = activeModelKey ? activeModelKey.startsWith(provider.id + ":") : false;
  const hasOnline = Object.values(diags).some(d => d.status === "success");
  const hasError = Object.values(diags).some(d => d.status === "error");
  const isTesting = Object.values(diags).some(d => d.status === "testing");
  const pc = getProviderColors(provider, !tk.enableGlow);

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{
      background: hasActive ? `${pc.color}${tk.enableGlow ? '06' : '0a'}` : tk.cardBg,
      border: `1px solid ${hasActive ? `${pc.color}30` : tk.cardBorder}`,
      boxShadow: hasActive && tk.enableGlow ? `0 0 20px ${pc.color}10` : tk.shadow,
      borderRadius: tk.borderRadius,
    }}>
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:opacity-90">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: pc.bgColor, border: `1px solid ${pc.borderColor}` }}>
          <Icon size={14} color={pc.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: tk.fontMono, fontSize: "12px", color: tk.foreground }}>{provider.name}</span>
            {provider.openaiCompatible && (
              <span className="px-1.5 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.primary, opacity: 0.7, background: tk.primaryGlow, border: `1px solid ${tk.border}` }}>
                OpenAI \u517C\u5BB9
              </span>
            )}
          </div>
          <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, marginTop: 2 }}>{provider.description}</div>
        </div>
        <div className="flex items-center gap-2">
          {hasActive && <span className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.primary, background: tk.primaryGlow, border: `1px solid ${tk.border}` }}>{t("modelSettings", "inUse")}</span>}
          {apiKey && <div className="w-2 h-2 rounded-full" style={{ background: tk.success }} />}
          {hasOnline && <CheckCircle2 size={12} color={tk.success} />}
          {hasError && !hasOnline && <AlertCircle size={12} color={tk.error} />}
          {isTesting && <Loader2 size={12} color={tk.primary} className="animate-spin" />}
          <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{provider.models.length} models</span>
          {expanded ? <ChevronDown size={12} color={tk.foregroundMuted} /> : <ChevronRight size={12} color={tk.foregroundMuted} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${tk.borderDim}` }}>
          {/* API Endpoint */}
          <div className="pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, letterSpacing: "1px" }}>{t("modelSettings", "apiEndpointLabel")}</label>
              <div className="flex items-center gap-1">
                {!editingUrl ? (
                  <button onClick={() => { setEditingUrl(true); setUrlDraft(activeUrl); }} className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                    <Edit3 size={9} />{t("modelSettings", "edit")}
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { onUrlChange(urlDraft); setEditingUrl(false); }} className="px-1.5 py-0.5 rounded transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.success }}><Check size={9} /></button>
                    <button onClick={() => setEditingUrl(false)} className="px-1.5 py-0.5 rounded transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{t("modelSettings", "cancel")}</button>
                  </div>
                )}
                <CopyBtn text={activeUrl} />
              </div>
            </div>
            {editingUrl ? (
              <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)} className={cyInput} style={{ ...getCyInputStyle() }} />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: tk.inputBg, border: `1px solid ${tk.borderDim}` }}>
                <span className="truncate flex-1" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted }}>{activeUrl}</span>
              </div>
            )}
          </div>

          {/* API Key */}
          {provider.id !== "ollama" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, letterSpacing: "1px" }}>API KEY</label>
                {provider.apiKeyUrl && (
                  <a href={provider.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.primary }}>
                    <ExternalLink size={9} />{t("modelSettings", "getApiKey")}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => onApiKeyChange(e.target.value)}
                    placeholder={provider.apiKeyPlaceholder} className={cyInput} style={{ ...getCyInputStyle(), paddingRight: 32 }} />
                  <button onClick={() => setShowKey(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: tk.foregroundMuted }}>
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
              {!apiKey && (
                <div className="flex items-center gap-1.5" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.warning }}>
                  <AlertCircle size={10} /><span>{t("modelSettings", "apiKeyNotSet")}</span>
                </div>
              )}
            </div>
          )}

          {/* Model list */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, letterSpacing: "1px" }}>{t("modelSettings", "modelList")}</label>
              <button onClick={() => setAddingModel(true)} className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                <PlusCircle size={9} />{t("modelSettings", "addModelBtn")}
              </button>
            </div>
            <div className="space-y-1">
              {provider.models.map(model => {
                const diag = diags[model.id];
                const mKey = provider.id + ":" + model.id;
                const isActive = activeModelKey === mKey;
                return (
                  <div key={model.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group" style={{
                    background: isActive ? tk.primaryGlow : tk.cardBg,
                    border: `1px solid ${isActive ? tk.border : "transparent"}`,
                  }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                      background: isActive ? tk.primary : diag?.status === "success" ? tk.success : diag?.status === "error" ? tk.error : diag?.status === "testing" ? tk.primary : tk.borderDim,
                      boxShadow: isActive && tk.enableGlow ? `0 0 4px ${tk.primary}` : "none",
                    }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: isActive ? tk.primary : tk.foreground }}>{model.name}</span>
                        {isActive && <span className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: tk.fontMono, fontSize: "7px", color: tk.primary, background: tk.primaryGlow, border: `1px solid ${tk.border}` }}>{t("modelSettings", "currentUse")}</span>}
                        {model.contextWindow && <span className="px-1 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted, background: tk.cardBg }}>{model.contextWindow}</span>}
                      </div>
                      <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{model.description}</div>
                    </div>
                    {model.pricing && <span style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>{model.pricing}</span>}
                    {diag?.status === "success" && diag.latency != null && <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.success }}>{diag.latency}ms</span>}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isActive && <button onClick={() => onSelectModel(model.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.primary, border: `1px solid ${tk.border}` }}><ArrowRight size={9} />{t("modelSettings", "use")}</button>}
                      <button onClick={() => onTestConnection(model.id)} className="p-1 rounded transition-all hover:opacity-80" style={{ color: tk.foregroundMuted }}>
                        {diag?.status === "testing" ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {addingModel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px dashed ${tk.border}`, background: tk.inputBg }}>
                <input value={newMId} onChange={e => setNewMId(e.target.value)} placeholder="Model ID" className="flex-1 bg-transparent text-[11px] font-mono outline-none" style={{ color: tk.foreground, caretColor: tk.primary }} />
                <input value={newMName} onChange={e => setNewMName(e.target.value)} placeholder="Display Name" className="flex-1 bg-transparent text-[11px] font-mono outline-none" style={{ color: tk.foreground, caretColor: tk.primary }} />
                <button onClick={() => { if (newMId && newMName) { setNewMId(""); setNewMName(""); setAddingModel(false); } }} disabled={!newMId || !newMName} className="p-1 disabled:opacity-30" style={{ color: tk.success }}><Check size={12} /></button>
                <button onClick={() => { setAddingModel(false); setNewMId(""); setNewMName(""); }} className="p-1" style={{ color: tk.foregroundMuted }}><X size={12} /></button>
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => provider.models.forEach(m => onTestConnection(m.id))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: pc.color, background: pc.bgColor, border: `1px solid ${pc.borderColor}` }}>
              <Activity size={10} />{t("modelSettings", "testAll")}
            </button>
            {provider.docsUrl && (
              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted, border: `1px solid ${tk.borderDim}` }}>
                <FileCode2 size={10} />{t("modelSettings", "apiDocs")}
              </a>
            )}
            {isCustom && onRemoveProvider && (
              <button onClick={onRemoveProvider} className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.error, border: `1px solid ${tk.error}22` }}>
                <Trash2 size={10} />{t("modelSettings", "removeProvider")}
              </button>
            )}
          </div>

          {/* Error details */}
          {Object.entries(diags).filter(([, d]) => d.status === "error").map(([mId, diag]) => (
            <div key={mId} className="px-3 py-2 rounded-lg space-y-1" style={{ background: `${tk.error}08`, border: `1px solid ${tk.error}1a` }}>
              <div className="flex items-center gap-1.5">
                <XCircle size={10} color={tk.error} />
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.error }}>{diag.modelName}</span>
                {diag.latency != null && <span className="ml-auto" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{diag.latency}ms</span>}
              </div>
              <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, paddingLeft: 18 }}>{diag.message}</div>
            </div>
          ))}
          {Object.entries(diags).filter(([, d]) => d.status === "success" && d.modelResponse).map(([mId, diag]) => (
            <div key={mId} className="px-3 py-2 rounded-lg space-y-1" style={{ background: `${tk.success}08`, border: `1px solid ${tk.success}1a` }}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} color={tk.success} />
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.success }}>{diag.modelName}</span>
                <span className="ml-auto" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{diag.latency}ms</span>
              </div>
              <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, paddingLeft: 18 }}>{diag.modelResponse}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MCP Config Panel =====
function MCPPanel({ t }: { t: (ns: string, key: string) => string; }) {
  const { tokens: tk, isCyberpunk: isCyber } = useThemeStore();
  const [servers, setServers] = useState<MCPServerConfig[]>(() => loadJ(SK.mcp, DEFAULT_MCP_SERVERS));
  const [addingServer, setAddingServer] = useState(false);
  const [newSrv, setNewSrv] = useState({ name: "", command: "", args: "", env: "", description: "" });
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { saveJ(SK.mcp, servers); }, [servers]);

  const handleAdd = () => {
    if (!newSrv.name || !newSrv.command) return;
    let envObj: Record<string, string> = {};
    try { if (newSrv.env) envObj = JSON.parse(newSrv.env); } catch {}
    setServers(p => [...p, { id: "mcp-" + Date.now(), name: newSrv.name, description: newSrv.description || newSrv.name, command: newSrv.command, args: newSrv.args ? newSrv.args.split(/\s+/) : [], env: envObj, enabled: true }]);
    setNewSrv({ name: "", command: "", args: "", env: "", description: "" });
    setAddingServer(false);
  };

  const exportJson = () => {
    const cfg: any = { mcpServers: {} };
    servers.filter(s => s.enabled).forEach(s => { cfg.mcpServers[s.name.toLowerCase()] = { command: s.command, args: s.args, ...(Object.keys(s.env).length > 0 ? { env: s.env } : {}) }; });
    setJsonDraft(JSON.stringify(cfg, null, 2));
    setJsonMode(true);
    setJsonError("");
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      const ms = parsed.mcpServers || parsed;
      const imported: MCPServerConfig[] = Object.entries(ms).map(([name, conf]: [string, any]) => ({ id: "mcp-" + Date.now() + "-" + name, name, description: conf.description || name, command: conf.command || "", args: conf.args || [], env: conf.env || {}, enabled: true }));
      setServers(imported);
      setJsonMode(false);
      setJsonError("");
    } catch (e: any) { setJsonError("JSON parse error: " + e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug size={14} color={tk.secondary} />
          <span style={{ fontFamily: tk.fontMono, fontSize: "12px", color: tk.foreground }}>{t("modelSettings", "mcpTitle")}</span>
          <span className="px-1.5 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, background: tk.cardBg }}>
            {servers.filter(s => s.enabled).length}/{servers.length} {t("modelSettings", "mcpEnabled")}
          </span>
        </div>
        <button onClick={exportJson} className="flex items-center gap-1 px-2 py-1 rounded transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
          <Terminal size={10} />{jsonMode ? t("modelSettings", "mcpListMode") : t("modelSettings", "mcpJsonMode")}
        </button>
      </div>

      {jsonMode && (
        <div className="space-y-2">
          <textarea value={jsonDraft} onChange={e => { setJsonDraft(e.target.value); setJsonError(""); }} rows={10} className="w-full px-3 py-2 rounded-lg text-[10px] font-mono resize-none outline-none" style={{ color: tk.foreground, background: tk.inputBg, border: `1px solid ${tk.inputBorder}`, caretColor: tk.primary }} />
          {jsonError && <div className="flex items-center gap-1" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.error }}><AlertCircle size={10} />{jsonError}</div>}
          <div className="flex items-center gap-2">
            <button onClick={importJson} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.secondary, background: `${tk.secondary}1a`, border: `1px solid ${tk.secondary}33` }}><Check size={10} />{t("modelSettings", "mcpImport")}</button>
            <button onClick={() => setJsonMode(false)} className="px-3 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted }}>{t("modelSettings", "cancel")}</button>
            <CopyBtn text={jsonDraft} />
          </div>
          <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, padding: "0 4px" }}>{t("modelSettings", "mcpCompatHint")}</div>
        </div>
      )}

      {!jsonMode && (
        <div className="space-y-2">
          {servers.map(srv => (
            <div key={srv.id} className="rounded-xl p-3 space-y-2 transition-all" style={{ background: srv.enabled ? tk.cardBg : tk.backgroundAlt, border: `1px solid ${srv.enabled ? tk.cardBorder : tk.borderDim}`, opacity: srv.enabled ? 1 : 0.5, borderRadius: tk.borderRadius }}>
              <div className="flex items-center gap-2.5">
                <button onClick={() => setServers(p => p.map(s => s.id === srv.id ? { ...s, enabled: !s.enabled } : s))} className="shrink-0">
                  <div className="w-8 h-4 rounded-full transition-all" style={{ background: srv.enabled ? `${tk.secondary}4d` : tk.borderDim }}>
                    <div className="w-3.5 h-3.5 rounded-full transition-all" style={{ background: srv.enabled ? tk.secondary : tk.foregroundMuted, marginTop: 1, marginLeft: srv.enabled ? 17 : 1 }} />
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{srv.name}</div>
                  <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{srv.description}</div>
                </div>
                <button onClick={() => setEditId(editId === srv.id ? null : srv.id)} className="p-1 rounded transition-all hover:opacity-80" style={{ color: tk.foregroundMuted }}><Settings2 size={10} /></button>
                <button onClick={() => setServers(p => p.filter(s => s.id !== srv.id))} className="p-1 rounded transition-all hover:opacity-80" style={{ color: tk.foregroundMuted }}><Trash2 size={10} /></button>
              </div>
              {editId === srv.id && (
                <div className="pl-10 space-y-1" style={{ fontFamily: tk.fontMono, fontSize: "9px" }}>
                  <div className="flex items-center gap-2"><span style={{ color: tk.foregroundMuted, width: 56, flexShrink: 0 }}>command:</span><span style={{ color: tk.foreground }}>{srv.command}</span></div>
                  <div className="flex items-start gap-2"><span style={{ color: tk.foregroundMuted, width: 56, flexShrink: 0 }}>args:</span><span className="break-all" style={{ color: tk.foreground }}>{JSON.stringify(srv.args)}</span></div>
                  {Object.keys(srv.env).length > 0 && <div className="flex items-start gap-2"><span style={{ color: tk.foregroundMuted, width: 56, flexShrink: 0 }}>env:</span><span className="break-all" style={{ color: tk.foreground }}>{JSON.stringify(srv.env)}</span></div>}
                </div>
              )}
            </div>
          ))}

          {addingServer ? (
            <div className="rounded-xl p-3 space-y-2" style={{ border: `1px dashed ${tk.secondary}33`, background: `${tk.secondary}08` }}>
              <div className="grid grid-cols-2 gap-2">
                <input value={newSrv.name} onChange={e => setNewSrv({ ...newSrv, name: e.target.value })} placeholder="Name" className={cyInput} style={{ ...getCyInputStyle(), fontSize: "10px" }} />
                <input value={newSrv.command} onChange={e => setNewSrv({ ...newSrv, command: e.target.value })} placeholder="Command (e.g. npx)" className={cyInput} style={{ ...getCyInputStyle(), fontSize: "10px" }} />
              </div>
              <input value={newSrv.args} onChange={e => setNewSrv({ ...newSrv, args: e.target.value })} placeholder="Args (space-separated)" className={cyInput} style={{ ...getCyInputStyle(), fontSize: "10px" }} />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={!newSrv.name || !newSrv.command} className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all disabled:opacity-30" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.secondary, background: `${tk.secondary}1a`, border: `1px solid ${tk.secondary}33` }}><Plus size={10} />{t("modelSettings", "addModelBtn")}</button>
                <button onClick={() => setAddingServer(false)} className="px-3 py-1.5 rounded-lg" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted }}>{t("modelSettings", "cancel")}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingServer(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-70" style={{ border: `1px dashed ${tk.borderDim}`, color: tk.foregroundMuted, fontFamily: tk.fontMono, fontSize: "11px" }}>
              <Plus size={12} />{t("modelSettings", "mcpAdd")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Performance Monitor Panel =====
function PerformancePanel({ t, tk }: { t: (ns: string, key: string) => string; tk: ThemeTokens }) {
  const { getAggregatedMetrics, getErrorStats, getCostSummaries, getTotalCost, getRecentErrors, getBestProvider, clearAll } = useAIMetrics();

  const metrics: AggregatedMetrics[] = getAggregatedMetrics();
  const errorStats: ErrorStats[] = getErrorStats();
  const costSummaries: CostSummary[] = getCostSummaries();
  const totalCost = getTotalCost();
  const recentErrors = getRecentErrors(10);
  const bestProvider = getBestProvider();
  const locale = (t("common", "online") === "在线" ? "zh" : "en") as "zh" | "en";

  const hasData = metrics.length > 0 || errorStats.length > 0 || costSummaries.length > 0;

  return (
    <div className="space-y-4">
      {/* 概览卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t("modelSettings", "perfTotalRequests"), value: String(metrics.reduce((s, m) => s + m.totalRequests, 0)), icon: Activity, color: tk.primary },
          { label: t("modelSettings", "perfAvgLatency"), value: metrics.length ? Math.round(metrics.reduce((s, m) => s + m.avgLatencyMs, 0) / metrics.length) + "ms" : "-", icon: Clock, color: tk.warning },
          { label: t("modelSettings", "perfSuccessRate"), value: metrics.length ? (metrics.reduce((s, m) => s + m.successRate, 0) / metrics.length * 100).toFixed(1) + "%" : "-", icon: CheckCircle2, color: tk.success },
          { label: t("modelSettings", "perfTotalCost"), value: totalCost.usd > 0 ? "$" + totalCost.usd.toFixed(4) : totalCost.cny > 0 ? "¥" + totalCost.cny.toFixed(4) : "-", icon: Zap, color: tk.secondary },
        ].map(card => (
          <div key={card.label} className="p-3 rounded-xl text-center" style={{ border: `1px solid ${tk.borderDim}`, background: tk.cardBg, borderRadius: tk.borderRadius }}>
            <card.icon size={14} color={card.color} className="mx-auto mb-1" />
            <div style={{ fontFamily: tk.fontMono, fontSize: "16px", color: card.color }}>{card.value}</div>
            <div style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* 智能推荐 */}
      {bestProvider && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: `${tk.success}0d`, border: `1px solid ${tk.success}1a`, borderRadius: tk.borderRadius }}>
          <Sparkles size={12} color={tk.success} />
          <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.success }}>
            {t("modelSettings", "perfSmartPick")}:
          </span>
          <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>
            {bestProvider.modelId}
          </span>
          <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
            ({t("modelSettings", "perfScore")}: {(bestProvider.score * 100).toFixed(0)})
          </span>
        </div>
      )}

      {/* 对齐 Guidelines: Provider 健康看板 — 多 Provider 健康状态一览 */}
      {metrics.length > 0 && (() => {
        const providerMap = new Map<string, AggregatedMetrics[]>();
        metrics.forEach(m => {
          if (!providerMap.has(m.providerId)) providerMap.set(m.providerId, []);
          providerMap.get(m.providerId)!.push(m);
        });
        return (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tk.cardBorder}`, borderRadius: tk.borderRadius }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: tk.cardBg, borderBottom: `1px solid ${tk.borderDim}` }}>
              <Shield size={12} color={tk.primary} />
              <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{t("modelSettings", "perfProviderHealth")}</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {Array.from(providerMap.entries()).map(([pid, pMetrics]) => {
                const avgSuccess = pMetrics.reduce((s, m) => s + m.successRate, 0) / pMetrics.length;
                const avgLatency = Math.round(pMetrics.reduce((s, m) => s + m.avgLatencyMs, 0) / pMetrics.length);
                const totalReqs = pMetrics.reduce((s, m) => s + m.totalRequests, 0);
                const totalErrs = pMetrics.reduce((s, m) => s + m.errorCount, 0);
                const statusColor = avgSuccess >= 0.95 ? tk.success : avgSuccess >= 0.8 ? tk.warning : tk.error;
                const statusLabel = avgSuccess >= 0.95 ? t("modelSettings", "perfHealthy") : avgSuccess >= 0.8 ? t("modelSettings", "perfWarning") : t("modelSettings", "perfError");
                const isBest = bestProvider?.providerId === pid;
                return (
                  <div key={pid} className="p-3 rounded-lg" style={{ border: `1px solid ${isBest ? tk.success + "44" : tk.borderDim}`, background: isBest ? `${tk.success}06` : tk.cardBg }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }} />
                      <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{pid}</span>
                      {isBest && (
                        <span className="px-1 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "7px", color: tk.success, background: `${tk.success}15`, border: `1px solid ${tk.success}33` }}>
                          ★ BEST
                        </span>
                      )}
                      <span className="ml-auto px-1.5 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}22` }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>
                        {t("modelSettings", "perfSuccessLabel")}: <span style={{ color: statusColor }}>{(avgSuccess * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>
                        {t("modelSettings", "perfLatencyLabel")}: <span style={{ color: avgLatency < 1000 ? tk.success : avgLatency < 3000 ? tk.warning : tk.error }}>{avgLatency}ms</span>
                      </div>
                      <div style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>
                        {t("modelSettings", "perfReqsLabel")}: <span style={{ color: tk.foreground }}>{totalReqs}</span>
                      </div>
                      <div style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>
                        {t("modelSettings", "perfErrorsLabel")}: <span style={{ color: totalErrs > 0 ? tk.error : tk.foregroundMuted }}>{totalErrs}</span>
                      </div>
                    </div>
                    {avgSuccess < 0.95 && (
                      <div className="flex items-center gap-1 mt-2 pt-1.5" style={{ borderTop: `1px solid ${tk.borderDim}` }}>
                        <ArrowRight size={8} color={tk.warning} />
                        <span style={{ fontFamily: tk.fontMono, fontSize: "7px", color: tk.warning }}>
                          {t("modelSettings", "perfFallbackReady")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 性能指标表格 */}
      {metrics.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tk.cardBorder}`, borderRadius: tk.borderRadius }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: tk.cardBg, borderBottom: `1px solid ${tk.borderDim}` }}>
            <Activity size={12} color={tk.primary} />
            <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{t("modelSettings", "perfMetrics")}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: tk.fontMono, fontSize: "10px" }}>
              <thead>
                <tr style={{ background: tk.backgroundAlt }}>
                  {[
                    t("modelSettings", "perfModelCol"),
                    t("modelSettings", "perfRequestsCol"),
                    t("modelSettings", "perfAvgLatencyCol"),
                    "P95",
                    t("modelSettings", "perfThroughput"),
                    t("modelSettings", "perfSuccessLabel"),
                    t("modelSettings", "perfErrorsLabel"),
                  ].map(h => (
                    <th key={h} className="px-3 py-2 text-left" style={{ color: tk.foregroundMuted, borderBottom: `1px solid ${tk.borderDim}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => (
                  <tr key={`${m.providerId}:${m.modelId}`} className="transition-all hover:opacity-80" style={{ borderBottom: `1px solid ${tk.borderDim}` }}>
                    <td className="px-3 py-2" style={{ color: tk.foreground }}>{m.modelName}</td>
                    <td className="px-3 py-2" style={{ color: tk.primary }}>{m.totalRequests}</td>
                    <td className="px-3 py-2" style={{ color: m.avgLatencyMs > 3000 ? tk.error : m.avgLatencyMs > 1500 ? tk.warning : tk.success }}>{m.avgLatencyMs}ms</td>
                    <td className="px-3 py-2" style={{ color: tk.foregroundMuted }}>{m.p95LatencyMs}ms</td>
                    <td className="px-3 py-2" style={{ color: tk.primary }}>{m.throughput.toFixed(1)} t/s</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded" style={{ background: m.successRate >= 0.9 ? `${tk.success}14` : m.successRate >= 0.5 ? `${tk.warning}14` : `${tk.error}14`, color: m.successRate >= 0.9 ? tk.success : m.successRate >= 0.5 ? tk.warning : tk.error }}>
                        {(m.successRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: m.errorCount > 0 ? tk.error : tk.foregroundMuted }}>{m.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 错误分析 */}
      {errorStats.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tk.error}1a`, borderRadius: tk.borderRadius }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: `${tk.error}08`, borderBottom: `1px solid ${tk.error}14` }}>
            <AlertTriangle size={12} color={tk.error} />
            <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.error }}>{t("modelSettings", "perfErrorAnalysis")}</span>
          </div>
          <div className="p-3 space-y-2">
            {errorStats.map(es => (
              <div key={es.errorType} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: tk.cardBg, border: `1px solid ${tk.borderDim}` }}>
                <span className="px-1.5 py-0.5 rounded shrink-0" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.error, background: `${tk.error}14` }}>
                  {getErrorTypeLabel(es.errorType, locale)}
                </span>
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foreground }}>×{es.count}</span>
                <span className="flex-1 truncate" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                  {es.affectedModels.join(", ")}
                </span>
                <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                  {es.topSuggestion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近错误详情 */}
      {recentErrors.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tk.borderDim}`, borderRadius: tk.borderRadius }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: tk.cardBg, borderBottom: `1px solid ${tk.borderDim}` }}>
            <Bug size={12} color={tk.warning} />
            <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{t("modelSettings", "perfRecentErrors")}</span>
          </div>
          <div className="max-h-48 overflow-y-auto neon-scrollbar">
            {recentErrors.map(err => (
              <div key={err.id} className="flex items-start gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${tk.borderDim}` }}>
                <XCircle size={10} color={tk.error} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foreground }}>{err.modelName}</span>
                    <span className="px-1 py-0.5 rounded" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.error, background: `${tk.error}14` }}>
                      {getErrorTypeLabel(err.errorType, locale)}
                    </span>
                    <span className="ml-auto" style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="truncate" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, marginTop: 1 }}>
                    {err.errorMessage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成本报告 */}
      {costSummaries.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tk.secondary}1a`, borderRadius: tk.borderRadius }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: `${tk.secondary}08`, borderBottom: `1px solid ${tk.secondary}14` }}>
            <Zap size={12} color={tk.secondary} />
            <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.secondary }}>{t("modelSettings", "perfCostReport")}</span>
            <div className="ml-auto flex items-center gap-3" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
              {totalCost.usd > 0 && <span>USD ${totalCost.usd.toFixed(4)}</span>}
              {totalCost.cny > 0 && <span>CNY ¥{totalCost.cny.toFixed(4)}</span>}
            </div>
          </div>
          {/* 对齐 Guidelines: Cost Report — 成本可视化分布条 */}
          {(() => {
            const totalCostSum = costSummaries.reduce((s, c) => s + c.totalCost, 0) || 0.001;
            const COST_COLORS = [tk.primary, tk.secondary, tk.success, tk.warning, tk.error, '#8b5cf6'];
            const totalTokens = costSummaries.reduce((s, cs) => s + cs.totalInputTokens + cs.totalOutputTokens, 0);
            return (
              <div className="px-3 pt-3 pb-1">
                {/* Token 总量 */}
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{t("modelSettings", "perfTokenUsage")}</span>
                  <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foreground }}>{totalTokens.toLocaleString()} tokens</span>
                </div>
                {/* 可视化条 */}
                <div className="flex rounded overflow-hidden h-2 mb-2" style={{ background: tk.backgroundAlt }}>
                  {costSummaries.map((cs, i) => {
                    const pct = (cs.totalCost / totalCostSum) * 100;
                    return pct > 0 ? (
                      <div key={cs.providerId} style={{ width: `${pct}%`, background: COST_COLORS[i % COST_COLORS.length], minWidth: 2, transition: "width 0.3s" }} title={`${cs.providerName}: ${pct.toFixed(1)}%`} />
                    ) : null;
                  })}
                </div>
                {/* 图例 */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                  {costSummaries.map((cs, i) => (
                    <div key={cs.providerId} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm" style={{ background: COST_COLORS[i % COST_COLORS.length] }} />
                      <span style={{ fontFamily: tk.fontMono, fontSize: "8px", color: tk.foregroundMuted }}>{cs.providerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="p-3 pt-0 space-y-2">
            {costSummaries.map(cs => (
              <div key={cs.providerId} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${tk.borderDim}` }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: tk.cardBg }}>
                  <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foreground }}>{cs.providerName}</span>
                  <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>{cs.requestCount} {t("modelSettings", "perfRequests")}</span>
                  <span className="ml-auto" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.secondary }}>
                    {cs.currency === "CNY" ? "¥" : "$"}{cs.totalCost.toFixed(4)}
                  </span>
                </div>
                {cs.models.map(model => (
                  <div key={model.modelId} className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop: `1px solid ${tk.borderDim}` }}>
                    <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, paddingLeft: 12 }}>{model.modelName}</span>
                    <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                      ↑{model.inputTokens.toLocaleString()} ↓{model.outputTokens.toLocaleString()}
                    </span>
                    <span className="ml-auto" style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted }}>
                      {cs.currency === "CNY" ? "¥" : "$"}{model.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 清除数据 & 空状态 */}
      {hasData ? (
        <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80 mx-auto" style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted, border: `1px solid ${tk.borderDim}` }}>
          <Trash2 size={10} />{t("modelSettings", "perfClearAll")}
        </button>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: tk.backgroundAlt, border: `1px solid ${tk.borderDim}` }}>
            <Activity size={28} color={tk.borderDim} />
          </div>
          <p style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.foregroundMuted }}>{t("modelSettings", "perfNoData")}</p>
          <p style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, opacity: 0.6, marginTop: 4 }}>{t("modelSettings", "perfNoDataHint")}</p>
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====
type TabKey = "providers" | "ollama" | "mcp" | "diagnostics" | "performance" | "theme";

export function ModelSettings() {
  const { t } = useI18n();
  const { modelSettingsOpen, modelSettingsInitialTab, closeModelSettings, aiModels, addAIModel, removeAIModel, updateAIModel, activateAIModel, activeModelId, getActiveModel, sendToActiveModel } = useModelStore();
  const { tokens, isCyberpunk, themeId, setTheme, autoDetect, setAutoDetect } = useThemeStore();
  const [activeTab, setActiveTab] = useState<TabKey>("providers");

  // When ModelSettings opens with a specific initial tab, jump to it
  useEffect(() => {
    if (modelSettingsOpen && modelSettingsInitialTab) {
      const validTabs: TabKey[] = ["providers", "ollama", "mcp", "diagnostics", "performance", "theme"];
      if (validTabs.includes(modelSettingsInitialTab as TabKey)) {
        setActiveTab(modelSettingsInitialTab as TabKey);
      }
    }
  }, [modelSettingsOpen, modelSettingsInitialTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProvider, setExpandedProvider] = useState<string | null>("zhipu");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => loadJ(SK.keys, {}));
  const [customUrls, setCustomUrls] = useState<Record<string, string>>(() => loadJ(SK.urls, {}));
  const [customProviders, setCustomProviders] = useState<ProviderDef[]>(() => loadJ(SK.custom, []));
  const [addingProvider, setAddingProvider] = useState(false);
  const [newProv, setNewProv] = useState({ name: "", baseURL: "", apiKeyUrl: "" });
  const [diagnostics, setDiagnostics] = useState<Record<string, DiagnosticResult>>({});
  const pendingRef = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [ollamaScanning, setOllamaScanning] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaDetectedModel[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [aiDiagReport, setAiDiagReport] = useState<string | null>(null);
  const [aiDiagLoading, setAiDiagLoading] = useState(false);

  useEffect(() => { saveJ(SK.keys, apiKeys); }, [apiKeys]);
  useEffect(() => { saveJ(SK.urls, customUrls); }, [customUrls]);
  useEffect(() => { saveJ(SK.custom, customProviders); }, [customProviders]);

  useEffect(() => {
    const pn = pendingRef.current;
    if (!pn) return;
    const found = aiModels.find(m => m.name === pn && !m.isActive);
    if (found) { pendingRef.current = null; activateAIModel(found.id); }
  }, [aiModels, activateAIModel]);

  const allProviders = useMemo(() => [...PROVIDERS, ...customProviders], [customProviders]);
  const filteredProviders = useMemo(() => {
    if (!searchQuery) return allProviders;
    const q = searchQuery.toLowerCase();
    return allProviders.filter(p => p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q) || p.models.some(m => m.name.toLowerCase().includes(q)));
  }, [allProviders, searchQuery]);

  // Test connection
  const handleTest = useCallback((providerId: string, modelId: string) => {
    const provider = allProviders.find(p => p.id === providerId);
    if (!provider) return;
    const model = provider.models.find(m => m.id === modelId);
    if (!model) return;
    const dk = providerId + ":" + modelId;
    const key = apiKeys[providerId] || "";
    const url = customUrls[providerId] || provider.baseURL;

    if (providerId !== "ollama" && !key) { setDiagnostics(p => ({ ...p, [dk]: { providerId, modelName: model.name, status: "error", message: t("modelSettings", "noApiKey"), timestamp: Date.now() } })); return; }

    setDiagnostics(p => ({ ...p, [dk]: { providerId, modelName: model.name, status: "testing", message: t("modelSettings", "testSending"), timestamp: Date.now() } }));

    const start = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);

    const setR = (r: Omit<DiagnosticResult, "providerId" | "modelName" | "timestamp">) => {
      setDiagnostics(p => ({ ...p, [dk]: { providerId, modelName: model.name, timestamp: Date.now(), ...r } }));
    };

    (async () => {
      try {
        let resp: Response;
        const msg = [{ role: "user", content: "Hi, respond with exactly: YANYUCLOUD_OK" }];
        if (providerId === "ollama") {
          const base = url.replace(/\/+$/, "");
          const chatUrl = base.includes("/api/chat") ? base : base.replace(/\/api\/.*$/, "") + "/api/chat";
          resp = await fetch(chatUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: model.id, messages: msg, stream: false }), signal: ctrl.signal });
        } else if (providerId === "claude") {
          resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: model.id, max_tokens: 20, messages: msg }), signal: ctrl.signal });
        } else {
          resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ model: model.id, messages: msg, stream: false, max_tokens: 20, temperature: 0 }), signal: ctrl.signal });
        }
        clearTimeout(timer);
        const latency = Math.round(performance.now() - start);
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          let detail = ""; try { const j = JSON.parse(errText); detail = j.error?.message || j.message || errText.slice(0, 200); } catch { detail = errText.slice(0, 200); }
          const s = resp.status;
          const sm = s === 401 ? "API Key invalid (401)" : s === 404 ? (providerId === "ollama" ? "Model not found, run: ollama pull " + model.id : "Endpoint not found (404)") : s === 429 ? "Rate limited (429)" : "HTTP " + s;
          setR({ status: "error", message: sm + (detail ? ". " + detail : ""), latency });
          aiMetricsStore.recordError({ providerId, providerName: provider.name, modelId: model.id, modelName: model.name, latencyMs: latency, errorMessage: sm, httpStatus: s });
          return;
        }
        const data = await resp.json().catch(() => null);
        let reply = "";
        if (providerId === "ollama") reply = data?.message?.content || "";
        else if (providerId === "claude") reply = data?.content?.[0]?.text || "";
        else reply = data?.choices?.[0]?.message?.content || data?.result || "";
        setR({ status: "success", message: t("modelSettings", "testOk"), latency, modelResponse: reply.slice(0, 100) });
        // 记录成功指标到 AI Metrics Store
        aiMetricsStore.recordSuccess({ providerId, modelId: model.id, modelName: model.name, latencyMs: latency, inputTokens: 10, outputTokens: Math.ceil((reply?.length || 10) / 4) });
      } catch (err: any) {
        clearTimeout(timer);
        const latency = Math.round(performance.now() - start);
        if (err.name === "AbortError") {
          setR({ status: "error", message: t("modelSettings", "testTimeout"), latency });
          aiMetricsStore.recordError({ providerId, providerName: provider.name, modelId: model.id, modelName: model.name, latencyMs: latency, errorMessage: "Timeout" });
          return;
        }
        setR({ status: "error", message: t("modelSettings", "testNetworkFail") + ": " + (err.message || "").slice(0, 150), latency });
        aiMetricsStore.recordError({ providerId, providerName: provider.name, modelId: model.id, modelName: model.name, latencyMs: latency, errorMessage: err.message || "Unknown error" });
      }
    })();
  }, [allProviders, apiKeys, customUrls, t]);

  // Select model
  const handleSelect = useCallback((providerId: string, modelId: string) => {
    const provider = allProviders.find(p => p.id === providerId);
    if (!provider) return;
    const model = provider.models.find(m => m.id === modelId);
    if (!model) return;
    const url = customUrls[providerId] || provider.baseURL;
    const key = apiKeys[providerId] || "";
    const pt: AIModel["provider"] = providerId === "openai" ? "openai" : providerId === "ollama" ? "ollama" : "custom";
    const existing = aiModels.find(m => (m.name === model.id || m.name === model.name) && m.endpoint === url);
    if (existing) { updateAIModel(existing.id, { apiKey: key, name: model.id }); activateAIModel(existing.id); }
    else { pendingRef.current = model.id; addAIModel({ name: model.id, provider: pt, endpoint: url, apiKey: key, isActive: false }); }
    setToast(model.name);
    setTimeout(() => setToast(null), 2500);
  }, [allProviders, customUrls, apiKeys, aiModels, activateAIModel, addAIModel, updateAIModel]);

  // Active model key
  const activeModelKey = useMemo(() => {
    if (!activeModelId) return null;
    const am = aiModels.find(m => m.id === activeModelId);
    if (!am) return null;
    for (const p of allProviders) {
      const url = customUrls[p.id] || p.baseURL;
      for (const m of p.models) { if ((am.name === m.id || am.name === m.name) && am.endpoint === url) return p.id + ":" + m.id; }
    }
    for (const p of allProviders) { for (const m of p.models) { if (am.name.toLowerCase() === m.name.toLowerCase() || am.name.toLowerCase() === m.id.toLowerCase()) return p.id + ":" + m.id; } }
    return null;
  }, [activeModelId, aiModels, allProviders, customUrls]);

  // Add custom provider
  const handleAddProvider = useCallback(() => {
    if (!newProv.name || !newProv.baseURL) return;
    const id = "custom-" + Date.now();
    setCustomProviders(p => [...p, { id, name: newProv.name, shortName: newProv.name.slice(0, 4), icon: Bot, color: "#ff79c6", bgColor: "rgba(255,121,198,0.06)", borderColor: "rgba(255,121,198,0.2)", description: "Custom OpenAI-compatible", baseURL: newProv.baseURL, apiKeyUrl: newProv.apiKeyUrl, apiKeyPlaceholder: "sk-...", openaiCompatible: true, docsUrl: "", models: [] }]);
    setNewProv({ name: "", baseURL: "", apiKeyUrl: "" });
    setAddingProvider(false);
    setExpandedProvider(id);
  }, [newProv]);

  // Ollama scan
  const handleScanOllama = useCallback(() => {
    setOllamaScanning(true); setOllamaModels([]); setOllamaConnected(false);
    fetch(ollamaHost.replace(/\/+$/, "") + "/api/tags")
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(data => {
        const models: OllamaDetectedModel[] = (data.models || []).map((m: any) => ({ name: m.name || m.model, size: m.size ? (m.size / 1e9).toFixed(1) + " GB" : "N/A", status: "online" as const, quantization: m.details?.quantization_level || m.details?.family || "N/A" }));
        setOllamaModels(models); setOllamaConnected(true); setOllamaScanning(false);
      })
      .catch(() => { setOllamaScanning(false); setOllamaConnected(false); });
  }, [ollamaHost]);

  // Run all diagnostics
  const handleDiagAll = useCallback(async () => {
    setDiagRunning(true);
    for (const p of allProviders) { for (const m of p.models) { handleTest(p.id, m.id); await new Promise(r => setTimeout(r, 300)); } }
    setTimeout(() => setDiagRunning(false), 2000);
  }, [allProviders, handleTest]);

  if (!modelSettingsOpen) return null;

  const totalModels = allProviders.reduce((s, p) => s + p.models.length, 0);
  const onlineCount = Object.values(diagnostics).filter(d => d.status === "success").length;
  const testedCount = Object.values(diagnostics).filter(d => d.status === "success" || d.status === "error").length;
  const avgLat = (() => { const ls = Object.values(diagnostics).filter(d => d.latency != null).map(d => d.latency!); return ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : 0; })();

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.modal }}>
      <div className="absolute inset-0" style={{ background: tokens.overlayBg, backdropFilter: BLUR.lg }} onClick={closeModelSettings} />
      <div className="relative w-[920px] max-h-[88vh] rounded-xl flex flex-col overflow-hidden" style={{ background: tokens.panelBg, border: `1px solid ${tokens.cardBorder}`, boxShadow: isCyberpunk ? `0 0 60px ${tokens.primary}10, 0 0 120px ${tokens.primary}05, inset 0 0 40px ${tokens.primary}02` : tokens.shadowHover, borderRadius: tokens.borderRadius }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${tokens.border}` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.border}` }}>
            <Sparkles size={16} color={tokens.primary} style={{ filter: isCyberpunk ? `drop-shadow(0 0 4px ${tokens.primary})` : "none" }} />
          </div>
          <div className="flex-1">
            <div style={{ fontFamily: tokens.fontDisplay, fontSize: "14px", color: tokens.primary, textShadow: isCyberpunk ? `0 0 8px ${tokens.primary}60` : "none" }}>{t("modelSettings", "title")}</div>
            <div style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>{t("modelSettings", "subtitle")}</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}` }}>
            <Search size={12} color={tokens.foregroundMuted} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent text-[11px] outline-none w-36" style={{ fontFamily: tokens.fontMono, color: tokens.foreground, caretColor: tokens.primary }} />
          </div>
          <button onClick={closeModelSettings} className="p-2 rounded-lg transition-all hover:opacity-80" style={{ border: `1px solid ${tokens.border}` }}><X size={14} color={tokens.primary} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 overflow-x-auto" style={{ borderBottom: `1px solid ${tokens.borderDim}` }}>
          {([
            { key: "providers" as const, labelKey: "tabProviders", icon: Cloud },
            { key: "ollama" as const, labelKey: "tabOllama", icon: Server },
            { key: "mcp" as const, labelKey: "tabMCP", icon: Plug },
            { key: "diagnostics" as const, labelKey: "tabDiagnostics", icon: Activity },
            { key: "performance" as const, labelKey: "tabPerformance", icon: BarChart3 },
            { key: "theme" as const, labelKey: "tabTheme", icon: Palette },
          ]).map(({ key, labelKey, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className="flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap transition-all" style={{
              fontFamily: tokens.fontMono, fontSize: "11px",
              color: activeTab === key ? tokens.primary : tokens.foregroundMuted,
              borderBottom: activeTab === key ? `2px solid ${tokens.primary}` : "2px solid transparent",
              background: activeTab === key ? tokens.primaryGlow : "transparent",
              borderRadius: "6px 6px 0 0",
            }}>
              <Icon size={13} />{t("modelSettings", labelKey)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 neon-scrollbar">
          {/* Providers Tab */}
          {activeTab === "providers" && (
            <div className="space-y-3">
              {/* Active model indicator */}
              {activeModelId && (() => {
                const am = aiModels.find(m => m.id === activeModelId);
                const mp = activeModelKey ? allProviders.find(p => activeModelKey.startsWith(p.id + ":")) : null;
                return (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-1" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
                    {mp ? <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: mp.bgColor, border: `1px solid ${mp.borderColor}` }}><mp.icon size={10} color={mp.color} /></div> : <CheckCircle2 size={14} color={tokens.primary} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.primary }}>{am?.name || "—"}</span>
                        {mp && <span style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted }}>{mp.name}</span>}
                      </div>
                      <div className="truncate" style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted }}>{am?.endpoint}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.primary, background: tokens.primaryGlow, border: `1px solid ${tokens.border}` }}>{t("modelSettings", "currentUse")}</span>
                  </div>
                );
              })()}

              {filteredProviders.map(provider => {
                const pd: Record<string, DiagnosticResult> = {};
                provider.models.forEach(m => { const d = diagnostics[provider.id + ":" + m.id]; if (d) pd[m.id] = d; });
                return (
                  <ProviderCard key={provider.id} provider={provider} apiKey={apiKeys[provider.id] || ""} customUrl={customUrls[provider.id] || ""}
                    diags={pd} expanded={expandedProvider === provider.id} activeModelKey={activeModelKey}
                    onToggle={() => setExpandedProvider(p => p === provider.id ? null : provider.id)}
                    onApiKeyChange={k => setApiKeys(p => ({ ...p, [provider.id]: k }))}
                    onUrlChange={u => setCustomUrls(p => ({ ...p, [provider.id]: u }))}
                    onTestConnection={mId => handleTest(provider.id, mId)}
                    onSelectModel={mId => handleSelect(provider.id, mId)}
                    isCustom={!PROVIDERS.find(p => p.id === provider.id)}
                    onRemoveProvider={!PROVIDERS.find(p => p.id === provider.id) ? () => setCustomProviders(pr => pr.filter(x => x.id !== provider.id)) : undefined}
                    t={t} tk={tokens}
                  />
                );
              })}

              {/* Add custom provider */}
              {addingProvider ? (
                <div className="rounded-xl p-4 space-y-3" style={{ border: `1px dashed ${tokens.secondary}33`, background: `${tokens.secondary}05` }}>
                  <div style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.secondary }}>{t("modelSettings", "addCustomProvider")}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newProv.name} onChange={e => setNewProv(p => ({ ...p, name: e.target.value }))} placeholder={t("modelSettings", "providerName")} className={cyInput} style={{ ...getCyInputStyle() }} />
                    <input value={newProv.apiKeyUrl} onChange={e => setNewProv(p => ({ ...p, apiKeyUrl: e.target.value }))} placeholder={t("modelSettings", "apiKeyLink")} className={cyInput} style={{ ...getCyInputStyle() }} />
                  </div>
                  <input value={newProv.baseURL} onChange={e => setNewProv(p => ({ ...p, baseURL: e.target.value }))} placeholder={t("modelSettings", "baseUrl")} className={cyInput} style={{ ...getCyInputStyle() }} />
                  <div className="flex gap-2">
                    <button onClick={handleAddProvider} disabled={!newProv.name || !newProv.baseURL} className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all disabled:opacity-30" style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.secondary, background: `${tokens.secondary}1a`, border: `1px solid ${tokens.secondary}33` }}><Plus size={10} />{t("modelSettings", "addProvider")}</button>
                    <button onClick={() => setAddingProvider(false)} className="px-4 py-2 rounded-lg" style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.foregroundMuted }}>{t("modelSettings", "cancel")}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingProvider(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all hover:opacity-70" style={{ border: `1px dashed ${tokens.borderDim}`, color: tokens.foregroundMuted, fontFamily: tokens.fontMono, fontSize: "12px" }}>
                  <Plus size={14} />{t("modelSettings", "addProvider")}
                </button>
              )}

              {/* Tip */}
              <div className="px-4 py-2.5 rounded-xl flex items-start gap-2" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.borderDim}` }}>
                <Lightbulb size={12} color={tokens.primary} className="shrink-0 mt-0.5" style={{ opacity: 0.5 }} />
                <div style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>{t("modelSettings", "providerTip")}</div>
              </div>
            </div>
          )}

          {/* Ollama Tab */}
          {activeTab === "ollama" && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 space-y-3" style={{ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, borderRadius: tokens.borderRadius }}>
                <div className="flex items-center gap-2">
                  <Server size={14} color={tokens.warning} />
                  <span style={{ fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.foreground }}>{t("modelSettings", "ollamaEndpoint")}</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ollamaConnected ? tokens.success : tokens.borderDim }} />
                    <span style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: ollamaConnected ? tokens.success : tokens.foregroundMuted }}>{ollamaConnected ? t("modelSettings", "connected") : t("modelSettings", "disconnected")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input value={ollamaHost} onChange={e => setOllamaHost(e.target.value)} className={`flex-1 ${cyInput}`} style={{ ...getCyInputStyle() }} />
                  <button onClick={handleScanOllama} disabled={ollamaScanning} className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all disabled:opacity-50" style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.warning, background: `${tokens.warning}1a`, border: `1px solid ${tokens.warning}33` }}>
                    <RefreshCw size={12} className={ollamaScanning ? "animate-spin" : ""} />{ollamaScanning ? t("modelSettings", "scanning") : t("modelSettings", "autoDetect")}
                  </button>
                </div>
                <div style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>{t("modelSettings", "ollamaHint")}</div>
              </div>
              {ollamaModels.length > 0 && (
                <div className="space-y-2">
                  <div style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted, letterSpacing: "1px" }}>{t("modelSettings", "detectedModels")} ({ollamaModels.length})</div>
                  {ollamaModels.map(model => {
                    const already = aiModels.some(m => m.name === model.name && m.provider === "ollama");
                    return (
                      <div key={model.name} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, borderRadius: tokens.borderRadius }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: model.status === "online" ? tokens.success : tokens.borderDim }} />
                        <div className="flex-1 min-w-0">
                          <div style={{ fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.foreground }}>{model.name}</div>
                          <div style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>{model.size} \u00B7 {model.quantization}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded" style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: model.status === "online" ? tokens.success : tokens.foregroundMuted, background: model.status === "online" ? `${tokens.success}14` : tokens.backgroundAlt }}>{model.status === "online" ? t("modelSettings", "online") : t("modelSettings", "offline")}</span>
                        {already ? (
                          <span className="flex items-center gap-1" style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}><Check size={10} />{t("modelSettings", "imported")}</span>
                        ) : (
                          <button onClick={() => addAIModel({ name: model.name, provider: "ollama", endpoint: ollamaHost.replace(/\/+$/, "") + "/api/chat", apiKey: "", isActive: false, isDetected: true })} disabled={model.status === "offline"}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all disabled:opacity-30" style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.warning, background: `${tokens.warning}14`, border: `1px solid ${tokens.warning}33` }}>
                            <Plus size={10} />{t("modelSettings", "import")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {ollamaModels.length === 0 && !ollamaScanning && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: tokens.backgroundAlt, border: `1px solid ${tokens.borderDim}` }}>
                    <Server size={28} color={tokens.borderDim} />
                  </div>
                  <p style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.foregroundMuted }}>{t("modelSettings", "noOllamaModels")}</p>
                  <p style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted, opacity: 0.6, marginTop: 4 }}>{t("modelSettings", "noOllamaHint")}</p>
                </div>
              )}
            </div>
          )}

          {/* MCP Tab */}
          {activeTab === "mcp" && <MCPPanel t={t} />}

          {/* Diagnostics Tab */}
          {activeTab === "diagnostics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: t("modelSettings", "diagTotalModels"), value: String(totalModels), icon: Cpu, color: tokens.foreground },
                  { label: t("modelSettings", "diagTested"), value: String(testedCount), icon: Activity, color: tokens.primary },
                  { label: t("modelSettings", "diagOnline"), value: String(onlineCount), icon: Wifi, color: tokens.success },
                  { label: t("modelSettings", "diagAvgLatency"), value: avgLat ? avgLat + "ms" : "-", icon: Clock, color: tokens.warning },
                ].map(card => (
                  <div key={card.label} className="p-3 rounded-xl text-center" style={{ border: `1px solid ${tokens.borderDim}`, background: tokens.cardBg }}>
                    <card.icon size={14} color={card.color} className="mx-auto mb-1" />
                    <div style={{ fontFamily: tokens.fontMono, fontSize: "16px", color: card.color }}>{card.value}</div>
                    <div style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted, marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={handleDiagAll} disabled={diagRunning} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all disabled:opacity-50" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.border}`, fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.primary }}>
                {diagRunning ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                {diagRunning ? t("modelSettings", "diagRunning") : t("modelSettings", "diagRunAll")}
              </button>
              {allProviders.map(provider => {
                const pDiags = provider.models.map(m => ({ model: m, diag: diagnostics[provider.id + ":" + m.id] })).filter(d => d.diag);
                if (pDiags.length === 0) return null;
                return (
                  <div key={provider.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <provider.icon size={12} color={provider.color} />
                      <span style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.foreground }}>{provider.name}</span>
                      <span style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted }}>{pDiags.filter(d => d.diag.status === "success").length}/{pDiags.length} online</span>
                    </div>
                    {pDiags.map(({ model, diag }) => {
                      const mKey = provider.id + ":" + model.id;
                      const isActive = activeModelKey === mKey;
                      return (
                        <div key={model.id} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all group" style={{
                          background: isActive ? tokens.primaryGlow : diag.status === "success" ? `${tokens.success}08` : diag.status === "error" ? `${tokens.error}08` : tokens.cardBg,
                          border: `1px solid ${isActive ? tokens.border : diag.status === "success" ? `${tokens.success}14` : diag.status === "error" ? `${tokens.error}14` : tokens.borderDim}`,
                        }}>
                          {isActive ? <CheckCircle2 size={12} color={tokens.primary} /> : diag.status === "success" ? <CheckCircle2 size={10} color={tokens.success} /> : diag.status === "error" ? <XCircle size={10} color={tokens.error} /> : <Loader2 size={10} color={tokens.primary} className="animate-spin" />}
                          <span className="flex-1" style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: isActive ? tokens.primary : tokens.foreground }}>{model.name}</span>
                          {isActive && <span className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: tokens.fontMono, fontSize: "8px", color: tokens.primary, background: tokens.primaryGlow }}>{t("modelSettings", "currentUse")}</span>}
                          {diag.latency != null && <span style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: diag.status === "success" ? tokens.success : tokens.foregroundMuted }}>{diag.latency}ms</span>}
                          {diag.status === "error" && <span className="max-w-[180px] truncate" style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.error }}>{diag.message}</span>}
                          {diag.status === "success" && !isActive && (
                            <button onClick={() => handleSelect(provider.id, model.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all" style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.primary, border: `1px solid ${tokens.border}` }}>
                              <ArrowRight size={9} />{t("modelSettings", "diagSelectUse")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* AI suggestions */}
              {Object.values(diagnostics).filter(d => d.status === "error").length > 0 && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: `${tokens.warning}08`, border: `1px solid ${tokens.warning}1a`, borderRadius: tokens.borderRadius }}>
                  <div className="flex items-center gap-2"><Lightbulb size={14} color={tokens.warning} /><span style={{ fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.warning }}>{t("modelSettings", "diagSuggestions")}</span></div>
                  <div className="space-y-1.5 pl-6">
                    {Object.values(diagnostics).filter(d => d.status === "error").slice(0, 3).map((diag, i) => (
                      <div key={i} className="flex items-start gap-1.5" style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>
                        <Bug size={10} color={tokens.warning} className="shrink-0 mt-0.5" />
                        <span><strong style={{ color: tokens.warning }}>{diag.modelName}</strong>: {
                          diag.message.includes("401") ? "API Key invalid or expired" :
                          diag.message.includes("429") ? "Rate limited, try later" :
                          diag.message.includes("Network") || diag.message.includes("fetch") ? "Network error, check endpoint" :
                          diag.message.includes("timeout") || diag.message.includes("Timeout") ? "Connection timeout" :
                          "Check configuration"
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI-powered diagnostic report */}
              {Object.keys(diagnostics).length > 0 && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.border}`, borderRadius: tokens.borderRadius }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} color={tokens.primary} />
                      <span style={{ fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.primary }}>
                        {t("modelSettings", "aiDiagTitle") || "AI Diagnostic Report"}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        const activeModel = getActiveModel();
                        if (!activeModel) {
                          setToast(t("modelSettings", "noActiveModel") || "No active model to generate report");
                          setTimeout(() => setToast(null), 3000);
                          return;
                        }
                        setAiDiagLoading(true);
                        setAiDiagReport(null);
                        try {
                          const diagData = Object.values(diagnostics).map(d => ({
                            model: d.modelName, provider: d.providerId,
                            status: d.status, latency: d.latency, error: d.status === "error" ? d.message : null,
                          }));
                          const prompt = `Analyze the following AI model diagnostic results and provide a brief, actionable report in ${t("modelSettings", "aiDiagLang") || "Chinese"}. Include: 1) Overall health summary, 2) Issues found, 3) Specific fix suggestions. Keep it concise.\n\nDiagnostic Data:\n${JSON.stringify(diagData, null, 2)}`;
                          const report = await sendToActiveModel(prompt, {
                            systemPrompt: "You are a technical diagnostics assistant for YYC³ AI Code IDE. Provide clear, structured diagnostic reports.",
                          });
                          setAiDiagReport(report);
                        } catch (err: any) {
                          setAiDiagReport(`⚠ ${err?.message || "Failed to generate report"}`);
                        }
                        setAiDiagLoading(false);
                      }}
                      disabled={aiDiagLoading || !getActiveModel()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
                      style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.primary, background: tokens.primaryGlow, border: `1px solid ${tokens.border}` }}
                    >
                      {aiDiagLoading ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                      {aiDiagLoading
                        ? (t("modelSettings", "aiDiagGenerating") || "Generating...")
                        : (t("modelSettings", "aiDiagGenerate") || "Generate AI Report")}
                    </button>
                  </div>
                  {!getActiveModel() && (
                    <p style={{ fontFamily: tokens.fontMono, fontSize: "9px", color: tokens.foregroundMuted }}>
                      {t("modelSettings", "aiDiagNoModel") || "Activate a model first to enable AI diagnostic reports"}
                    </p>
                  )}
                  {aiDiagReport && (
                    <div className="rounded-lg p-3 mt-2" style={{ background: tokens.inputBg, border: `1px solid ${tokens.borderDim}` }}>
                      <pre className="whitespace-pre-wrap" style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foreground, lineHeight: "1.6" }}>
                        {aiDiagReport}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <PerformancePanel t={t} tk={tokens} />
          )}

          {/* Theme Tab */}
          {activeTab === "theme" && (
            <ThemePreview
              currentTheme={themeId}
              onSelect={(id) => { setTheme(id); }}
              autoDetect={autoDetect}
              onAutoDetectChange={setAutoDetect}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${tokens.borderDim}`, background: tokens.cardBg }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.foregroundMuted }}>{allProviders.length} providers \u00B7 {totalModels} models</span>
            {onlineCount > 0 && <span style={{ fontFamily: tokens.fontMono, fontSize: "10px", color: tokens.success }}>{onlineCount} online</span>}
          </div>
          <button onClick={closeModelSettings} className="px-4 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ fontFamily: tokens.fontMono, fontSize: "11px", color: tokens.primary, background: tokens.primaryGlow, border: `1px solid ${tokens.border}` }}>{t("modelSettings", "done")}</button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-sm" style={{ background: tokens.primaryGlow, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
            <CheckCircle2 size={14} color={tokens.primary} />
            <span style={{ fontFamily: tokens.fontMono, fontSize: "12px", color: tokens.primary }}>{t("modelSettings", "switchedTo")} <strong>{toast}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
