/**
 * @file: APIKeyManagerPanel.tsx
 * @description: API 密钥管理面板组件
 * @version: 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  AlertTriangle,
  Copy,
  RefreshCw,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { apiKeyVault, PROVIDERS, type APIKeyConfig, type ProviderId, type ProviderInfo } from './services/APIKeyVault';
import { confirmDialog } from './stores/useConfirmStore';

interface APIKeyManagerPanelProps {
  onClose?: () => void;
  onProviderChange?: (provider: ProviderId) => void;
}

export function APIKeyManagerPanel({ onClose, onProviderChange }: APIKeyManagerPanelProps) {
  const [keys, setKeys] = useState<APIKeyConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKeyConfig | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const allKeys = await apiKeyVault.listKeys();
      setKeys(allKeys);
    } catch (err) {
      setError('加载密钥失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleAddKey = async (provider: ProviderId, apiKey: string, name: string, baseUrl?: string) => {
    setError(null);
    try {
      await apiKeyVault.saveKey({
        provider,
        apiKey,
        name: name || PROVIDERS[provider].name,
        baseUrl: baseUrl || PROVIDERS[provider].baseUrl,
        isActive: true,
      });
      await loadKeys();
      setShowAddForm(false);
      setSelectedProvider(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!(await confirmDialog('确定要删除此 API Key 吗？'))) return;
    await apiKeyVault.deleteKey(id);
    await loadKeys();
  };

  const handleSetActive = async (id: string) => {
    await apiKeyVault.setActive(id);
    await loadKeys();
    const key = keys.find(k => k.id === id);
    if (key && onProviderChange) {
      onProviderChange(key.provider);
    }
  };

  const handleCopyKey = async (id: string) => {
    const key = await apiKeyVault.getKey(id);
    if (key) {
      await navigator.clipboard.writeText(key);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const groupedKeys = keys.reduce((acc, key) => {
    if (!acc[key.provider]) {
      acc[key.provider] = [];
    }
    acc[key.provider].push(key);
    return acc;
  }, {} as Record<ProviderId, APIKeyConfig[]>);

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold">API 密钥管理</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加密钥
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <Key className="w-12 h-12 mb-2 opacity-50" />
            <p>暂无 API 密钥</p>
            <p className="text-sm mt-1">点击"添加密钥"开始配置</p>
          </div>
        ) : (
          Object.entries(groupedKeys).map(([provider, providerKeys]) => (
            <ProviderKeySection
              key={provider}
              provider={PROVIDERS[provider as ProviderId]}
              keys={providerKeys}
              visibleKeys={visibleKeys}
              onToggleVisibility={toggleKeyVisibility}
              onSetActive={handleSetActive}
              onDelete={handleDeleteKey}
              onCopy={handleCopyKey}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>密钥使用 AES-256-GCM 加密存储，仅在本地浏览器中保存</span>
        </div>
      </div>

      {showAddForm && (
        <AddKeyModal
          onClose={() => {
            setShowAddForm(false);
            setSelectedProvider(null);
          }}
          onSubmit={handleAddKey}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
        />
      )}
    </div>
  );
}

interface ProviderKeySectionProps {
  provider: ProviderInfo;
  keys: APIKeyConfig[];
  visibleKeys: Set<string>;
  onToggleVisibility: (id: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
}

function ProviderKeySection({
  provider,
  keys,
  visibleKeys,
  onToggleVisibility,
  onSetActive,
  onDelete,
  onCopy,
}: ProviderKeySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const activeKey = keys.find(k => k.isActive);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
            <Key className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <div className="font-medium">{provider.name}</div>
            <div className="text-xs text-slate-500">{provider.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeKey && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              已激活
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="p-3 space-y-2">
          {keys.map(key => (
            <KeyItem
              key={key.id}
              config={key}
              isVisible={visibleKeys.has(key.id)}
              onToggleVisibility={() => onToggleVisibility(key.id)}
              onSetActive={() => onSetActive(key.id)}
              onDelete={() => onDelete(key.id)}
              onCopy={() => onCopy(key.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface KeyItemProps {
  config: APIKeyConfig;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSetActive: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function KeyItem({ config, isVisible, onToggleVisibility, onSetActive, onDelete, onCopy }: KeyItemProps) {
  return (
    <div className={`p-3 rounded-lg border ${config.isActive ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{config.name}</span>
          {config.isActive && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded">
              当前使用
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleVisibility}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title={isVisible ? '隐藏密钥' : '显示密钥'}
          >
            {isVisible ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="复制密钥"
          >
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          {!config.isActive && (
            <button
              onClick={onSetActive}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="设为当前"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 px-2 py-1 bg-slate-900 rounded text-xs font-mono text-slate-400 overflow-hidden text-ellipsis">
          {isVisible ? config.apiKey.replace(/\*+/g, '••••') : config.apiKey}
        </code>
      </div>
      {config.baseUrl && config.baseUrl !== PROVIDERS[config.provider]?.baseUrl && (
        <div className="mt-1 text-xs text-slate-500">
          自定义端点: {config.baseUrl}
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span>使用次数: {config.usageCount}</span>
        {config.lastUsed && (
          <span>最后使用: {new Date(config.lastUsed).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

interface AddKeyModalProps {
  onClose: () => void;
  onSubmit: (provider: ProviderId, apiKey: string, name: string, baseUrl?: string) => void;
  selectedProvider: ProviderId | null;
  onSelectProvider: (provider: ProviderId) => void;
}

function AddKeyModal({ onClose, onSubmit, selectedProvider, onSelectProvider }: AddKeyModalProps) {
  const [provider, setProvider] = useState<ProviderId>(selectedProvider || 'openai');
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const providerInfo = PROVIDERS[provider];

  useEffect(() => {
    if (selectedProvider) {
      setProvider(selectedProvider);
    }
  }, [selectedProvider]);

  useEffect(() => {
    setBaseUrl(PROVIDERS[provider].baseUrl);
    setName(PROVIDERS[provider].name);
  }, [provider]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = apiKeyVault.validateKey(provider, apiKey);
    if (!validation.valid) {
      setValidationError(validation.error || '无效的 API Key');
      return;
    }

    onSubmit(provider, apiKey, name, baseUrl || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold">添加 API 密钥</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">服务商</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value as ProviderId)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(PROVIDERS).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name} - {info.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">显示名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如: 我的 OpenAI 账号"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">API Key</label>
              <a
                href={providerInfo.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                获取密钥 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  setValidationError(null);
                }}
                placeholder={providerInfo.keyPrefix ? `以 ${providerInfo.keyPrefix} 开头` : '输入 API Key'}
                className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
              >
                {showKey ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            {validationError && (
              <p className="mt-1 text-xs text-red-400">{validationError}</p>
            )}
          </div>

          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">API 端点</label>
              <input
                type="url"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200">
              密钥将使用 AES-256-GCM 加密后存储在本地浏览器中，不会上传到任何服务器
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
