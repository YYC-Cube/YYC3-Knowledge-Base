/**
 * @file: PluginMarketPanel.tsx
 * @description: 插件市场面板 - 插件发现、安装、卸载、更新
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: plugin,market,ui,panel
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { pluginManager, type PluginMarketItem, type PluginMarketConfig } from './PluginSystem';
import type { PluginManifest } from './types';
import { logger } from "./services/Logger";

type TabType = 'market' | 'installed' | 'updates';
type SortBy = 'downloads' | 'rating' | 'name' | 'updated';

interface MarketState {
  plugins: PluginMarketItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeTab: TabType;
  sortBy: SortBy;
  selectedPlugin: PluginMarketItem | null;
}

const DEFAULT_REGISTRY_URL = 'https://plugins.yyc3.app';

const CATEGORY_ICONS: Record<string, string> = {
  'ai': '🤖',
  'editor': '📝',
  'theme': '🎨',
  'git': '🔀',
  'tools': '🔧',
  'language': '🌐',
  'default': '📦',
};

const PluginMarketPanel: React.FC = () => {
  const [state, setState] = useState<MarketState>({
    plugins: [],
    loading: false,
    error: null,
    searchQuery: '',
    activeTab: 'market',
    sortBy: 'downloads',
    selectedPlugin: null,
  });

  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [uninstalling, setUninstalling] = useState<Set<string>>(new Set());

  useEffect(() => {
    pluginManager.configureMarket({ registryUrl: DEFAULT_REGISTRY_URL });
    loadPlugins();
  }, []);

  const loadPlugins = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const plugins = await pluginManager.fetchMarketPlugins(forceRefresh);
      setState(prev => ({ ...prev, plugins, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load plugins' 
      }));
    }
  }, []);

  const handleInstall = useCallback(async (pluginId: string) => {
    setInstalling(prev => new Set(prev).add(pluginId));
    try {
      const result = await pluginManager.installPlugin(pluginId);
      if (result.success) {
        setState(prev => ({
          ...prev,
          plugins: prev.plugins.map(p => 
            p.manifest.id === pluginId 
              ? { ...p, installed: true } 
              : p
          ),
        }));
      } else {
        logger.error('Install failed:', result.error);
      }
    } finally {
      setInstalling(prev => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
    }
  }, []);

  const handleUninstall = useCallback(async (pluginId: string) => {
    setUninstalling(prev => new Set(prev).add(pluginId));
    try {
      const success = await pluginManager.uninstallPlugin(pluginId);
      if (success) {
        setState(prev => ({
          ...prev,
          plugins: prev.plugins.map(p => 
            p.manifest.id === pluginId 
              ? { ...p, installed: false, updateAvailable: false } 
              : p
          ),
          selectedPlugin: prev.selectedPlugin?.manifest.id === pluginId 
            ? null 
            : prev.selectedPlugin,
        }));
      }
    } finally {
      setUninstalling(prev => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
    }
  }, []);

  const handleUpdate = useCallback(async (pluginId: string) => {
    setInstalling(prev => new Set(prev).add(pluginId));
    try {
      const result = await pluginManager.updatePlugin(pluginId);
      if (result.success) {
        setState(prev => ({
          ...prev,
          plugins: prev.plugins.map(p => 
            p.manifest.id === pluginId 
              ? { ...p, updateAvailable: false, manifest: result.plugin!.manifest } 
              : p
          ),
        }));
      }
    } finally {
      setInstalling(prev => {
        const next = new Set(prev);
        next.delete(pluginId);
        return next;
      });
    }
  }, []);

  const filteredPlugins = useMemo(() => {
    let result = state.plugins;

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      result = result.filter(p => 
        p.manifest.name.toLowerCase().includes(query) ||
        p.manifest.description.toLowerCase().includes(query) ||
        p.manifest.author.toLowerCase().includes(query) ||
        p.manifest.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    switch (state.activeTab) {
      case 'installed':
        result = result.filter(p => p.installed);
        break;
      case 'updates':
        result = result.filter(p => p.updateAvailable);
        break;
    }

    result = [...result].sort((a, b) => {
      switch (state.sortBy) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.manifest.name.localeCompare(b.manifest.name);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [state.plugins, state.searchQuery, state.activeTab, state.sortBy]);

  const updateCount = state.plugins.filter(p => p.updateAvailable).length;

  const renderPluginCard = (plugin: PluginMarketItem) => {
    const isInstalling = installing.has(plugin.manifest.id);
    const isUninstalling = uninstalling.has(plugin.manifest.id);
    const isBusy = isInstalling || isUninstalling;

    return (
      <div
        key={plugin.manifest.id}
        className="plugin-card"
        style={{
          padding: '16px',
          border: '1px solid var(--border-color, #e0e0e0)',
          borderRadius: '8px',
          marginBottom: '12px',
          cursor: 'pointer',
          background: state.selectedPlugin?.manifest.id === plugin.manifest.id 
            ? 'var(--hover-bg, #f5f5f5)' 
            : 'transparent',
          transition: 'background 0.2s',
        }}
        onClick={() => setState(prev => ({ 
          ...prev, 
          selectedPlugin: prev.selectedPlugin?.manifest.id === plugin.manifest.id 
            ? null 
            : plugin 
        }))}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ 
            fontSize: '32px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card-bg, #f0f0f0)',
            borderRadius: '8px',
          }}>
            {CATEGORY_ICONS[plugin.manifest.category || 'default'] || CATEGORY_ICONS.default}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {plugin.manifest.name}
              </h3>
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary, #666)',
                background: 'var(--tag-bg, #e8e8e8)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                v{plugin.manifest.version}
              </span>
              {plugin.installed && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#4caf50',
                  background: '#e8f5e9',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  已安装
                </span>
              )}
              {plugin.updateAvailable && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#ff9800',
                  background: '#fff3e0',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  有更新
                </span>
              )}
            </div>
            
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '14px', 
              color: 'var(--text-secondary, #666)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {plugin.manifest.description}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-tertiary, #999)' }}>
              <span>👤 {plugin.manifest.author}</span>
              <span>📥 {formatNumber(plugin.downloads)}</span>
              <span>⭐ {plugin.rating.toFixed(1)}</span>
              <span>📅 {formatDate(plugin.updatedAt)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {plugin.installed ? (
              plugin.updateAvailable ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdate(plugin.manifest.id);
                  }}
                  disabled={isBusy}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    opacity: isBusy ? 0.6 : 1,
                  }}
                >
                  {isInstalling ? '更新中...' : '更新'}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUninstall(plugin.manifest.id);
                  }}
                  disabled={isBusy}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: 'transparent',
                    color: '#f44336',
                    border: '1px solid #f44336',
                    borderRadius: '4px',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    opacity: isBusy ? 0.6 : 1,
                  }}
                >
                  {isUninstalling ? '卸载中...' : '卸载'}
                </button>
              )
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstall(plugin.manifest.id);
                }}
                disabled={isBusy}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {isInstalling ? '安装中...' : '安装'}
              </button>
            )}
          </div>
        </div>

        {state.selectedPlugin?.manifest.id === plugin.manifest.id && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-color, #e0e0e0)' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>版本:</strong> {plugin.manifest.version}
              </div>
              <div>
                <strong>作者:</strong> {plugin.manifest.author}
              </div>
              <div>
                <strong>许可:</strong> {plugin.manifest.license || 'MIT'}
              </div>
              <div>
                <strong>发布:</strong> {formatDate(plugin.publishedAt)}
              </div>
            </div>
            
            {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '14px' }}>权限:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {plugin.manifest.permissions.map(perm => (
                    <span 
                      key={perm}
                      style={{ 
                        fontSize: '12px',
                        background: 'var(--tag-bg, #e8e8e8)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {plugin.manifest.tags && plugin.manifest.tags.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '14px' }}>标签:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {plugin.manifest.tags.map(tag => (
                    <span 
                      key={tag}
                      style={{ 
                        fontSize: '12px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {plugin.manifest.homepage && (
              <div style={{ marginTop: '12px' }}>
                <a 
                  href={plugin.manifest.homepage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#2196f3', fontSize: '14px' }}
                >
                  查看主页 →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-color, #fff)',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid var(--border-color, #e0e0e0)',
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>
          插件市场
        </h2>
        
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="搜索插件..."
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '14px',
              border: '1px solid var(--border-color, #e0e0e0)',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          <span style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary, #999)',
          }}>
            🔍
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { key: 'market' as TabType, label: '市场' },
            { key: 'installed' as TabType, label: '已安装' },
            { key: 'updates' as TabType, label: `更新`, badge: updateCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setState(prev => ({ ...prev, activeTab: tab.key }))}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                background: state.activeTab === tab.key ? 'var(--primary-color, #2196f3)' : 'transparent',
                color: state.activeTab === tab.key ? 'white' : 'var(--text-primary, #333)',
                border: '1px solid var(--border-color, #e0e0e0)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  background: '#f44336',
                  color: 'white',
                  fontSize: '11px',
                  padding: '0 4px',
                  borderRadius: '8px',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary, #666)' }}>排序:</span>
          <select
            value={state.sortBy}
            onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as SortBy }))}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid var(--border-color, #e0e0e0)',
              borderRadius: '4px',
              background: 'var(--bg-color, #fff)',
            }}
          >
            <option value="downloads">下载量</option>
            <option value="rating">评分</option>
            <option value="name">名称</option>
            <option value="updated">更新时间</option>
          </select>

          <button
            onClick={() => loadPlugins(true)}
            disabled={state.loading}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              fontSize: '13px',
              background: 'transparent',
              border: '1px solid var(--border-color, #e0e0e0)',
              borderRadius: '4px',
              cursor: state.loading ? 'not-allowed' : 'pointer',
              opacity: state.loading ? 0.6 : 1,
            }}
          >
            {state.loading ? '刷新中...' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
      }}>
        {state.error && (
          <div style={{ 
            padding: '12px', 
            background: '#ffebee', 
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '12px',
          }}>
            {state.error}
          </div>
        )}

        {state.loading && state.plugins.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            color: 'var(--text-secondary, #666)',
          }}>
            加载中...
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            color: 'var(--text-secondary, #666)',
          }}>
            <span style={{ fontSize: '48px', marginBottom: '12px' }}>📦</span>
            <span>
              {state.searchQuery 
                ? `未找到匹配 "${state.searchQuery}" 的插件` 
                : state.activeTab === 'installed' 
                  ? '暂无已安装的插件'
                  : state.activeTab === 'updates'
                    ? '暂无可用更新'
                    : '暂无插件'}
            </span>
          </div>
        ) : (
          filteredPlugins.map(renderPluginCard)
        )}
      </div>
    </div>
  );
};

// ── Helpers ──

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return String(num);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default PluginMarketPanel;
