'use client';

import React, { useState } from 'react';
import { Button, YYC3ThemeProvider, type YYC3Theme, type ButtonVariant, type ButtonSize } from './button';

// ─────────────────────────────────────────────
// SVG 图标（零依赖）
// ─────────────────────────────────────────────
const icons = {
  Plus: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Trash: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  Arrow: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Download: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Heart: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Settings: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Star: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Share: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Check: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Zap: (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

// ─────────────────────────────────────────────
// Section 标题组件
// ─────────────────────────────────────────────
function SectionTitle({ label, theme }: { label: string; theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '6px',
      }}>
        {isCyber && (
          <div style={{
            width: '3px',
            height: '16px',
            background: 'linear-gradient(180deg, #0ff, #007a91)',
            boxShadow: '0 0 6px #0ff',
            borderRadius: '2px',
            flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: isCyber ? '0.18em' : '0.1em',
          textTransform: 'uppercase',
          color: isCyber ? 'rgba(0,229,255,0.65)' : 'rgba(59,130,246,0.7)',
          fontFamily: isCyber ? "'Courier New', monospace" : 'inherit',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        height: '1px',
        background: isCyber
          ? 'linear-gradient(90deg, rgba(0,229,255,0.3), transparent)'
          : 'linear-gradient(90deg, rgba(59,130,246,0.2), transparent)',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 单主题展示面板
// ─────────────────────────────────────────────
function ThemePanel({ theme }: { theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  const [loadingVariant, setLoadingVariant] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<string | null>(null);

  const handleLoadingDemo = (key: string) => {
    setLoadingVariant(key);
    setTimeout(() => setLoadingVariant(null), 2000);
  };

  const toggleActive = (key: string) => {
    setActiveVariant(prev => (prev === key ? null : key));
  };

  const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger'];
  const variantLabels: Record<ButtonVariant, string> = {
    primary: '主要按钮',
    secondary: '次要按钮',
    outline: '轮廓按钮',
    ghost: '幽灵按钮',
    danger: '危险按钮',
  };

  const panelBg = isCyber
    ? 'linear-gradient(160deg, #020d0f 0%, #041218 50%, #020a0c 100%)'
    : 'linear-gradient(160deg, rgba(230,240,255,0.6) 0%, rgba(210,225,255,0.4) 50%, rgba(220,235,250,0.55) 100%)';

  const panelBorder = isCyber
    ? '1px solid rgba(0,229,255,0.12)'
    : '1px solid rgba(255,255,255,0.6)';

  return (
    <YYC3ThemeProvider theme={theme}>
      <div style={{
        background: panelBg,
        backdropFilter: isCyber ? 'none' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: isCyber ? 'none' : 'blur(20px) saturate(180%)',
        border: panelBorder,
        borderRadius: '16px',
        padding: '32px',
        boxShadow: isCyber
          ? '0 0 0 1px rgba(0,229,255,0.05), 0 20px 60px rgba(0,0,0,0.6)'
          : '0 8px 32px rgba(100,120,200,0.12), 0 2px 8px rgba(100,120,200,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Cyberpunk 扫描线装饰 */}
        {isCyber && (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.008) 2px, rgba(0,255,255,0.008) 4px)',
              pointerEvents: 'none', zIndex: 0,
            }} />
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Liquid Glass 光晕 */}
        {!isCyber && (
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none', borderRadius: '50%',
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ── 所有变体 ── */}
          <SectionTitle label="所有变体 · Variants" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            {variants.map(v => (
              <Button key={v} variant={v} size="medium">
                {variantLabels[v]}
              </Button>
            ))}
          </div>

          {/* ── 尺寸 ── */}
          <SectionTitle label="尺寸规格 · Sizes" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
            {(['small', 'medium', 'large'] as ButtonSize[]).map(s => (
              <Button key={s} variant="primary" size={s}>
                {s === 'small' ? '小尺寸' : s === 'medium' ? '中等尺寸' : '大尺寸'}
              </Button>
            ))}
            {(['small', 'medium', 'large'] as ButtonSize[]).map(s => (
              <Button key={`out-${s}`} variant="outline" size={s}>
                {s === 'small' ? '小' : s === 'medium' ? '中' : '大'}
              </Button>
            ))}
          </div>

          {/* ── 加载状态 ── */}
          <SectionTitle label="加载状态 · Loading（点击触发）" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            {variants.map(v => (
              <Button
                key={v}
                variant={v}
                size="medium"
                loading={loadingVariant === v}
                onClick={() => handleLoadingDemo(v)}
              >
                {loadingVariant === v ? '处理中...' : `${variantLabels[v]}`}
              </Button>
            ))}
          </div>

          {/* ── 禁用状态 ── */}
          <SectionTitle label="禁用状态 · Disabled" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            {variants.map(v => (
              <Button key={v} variant={v} size="medium" disabled>
                {variantLabels[v]}
              </Button>
            ))}
          </div>

          {/* ── 激活状态 ── */}
          <SectionTitle label="激活状态 · Active（点击切换）" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            {variants.map(v => (
              <Button
                key={v}
                variant={v}
                size="medium"
                active={activeVariant === v}
                onClick={() => toggleActive(v)}
              >
                {activeVariant === v ? '已激活' : variantLabels[v]}
              </Button>
            ))}
          </div>

          {/* ── 图标按钮 ── */}
          <SectionTitle label="图标支持 · Icons" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
            <Button variant="primary" leftIcon={icons.Plus}>新增项目</Button>
            <Button variant="secondary" rightIcon={icons.Arrow}>继续下一步</Button>
            <Button variant="outline" leftIcon={icons.Download} rightIcon={icons.Arrow}>下载文件</Button>
            <Button variant="danger" leftIcon={icons.Trash}>删除记录</Button>
            <Button variant="ghost" leftIcon={icons.Share}>分享链接</Button>
            <Button variant="primary" leftIcon={icons.Zap} size="small">快速操作</Button>
          </div>

          {/* ── 纯图标模式 ── */}
          <SectionTitle label="纯图标模式 · Icon Only" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px', alignItems: 'center' }}>
            {(['small', 'medium', 'large'] as ButtonSize[]).map(s => (
              <Button key={`icon-${s}`} variant="primary" size={s} iconOnly leftIcon={icons.Plus} aria-label="新增" />
            ))}
            <Button variant="secondary" iconOnly leftIcon={icons.Settings} aria-label="设置" />
            <Button variant="outline" iconOnly leftIcon={icons.Heart} aria-label="收藏" />
            <Button variant="ghost" iconOnly leftIcon={icons.Star} aria-label="星标" />
            <Button variant="danger" iconOnly leftIcon={icons.Trash} aria-label="删除" />
            <Button variant="primary" iconOnly loading aria-label="加载中" />
          </div>

          {/* ── 复合场景 ── */}
          <SectionTitle label="真实场景 · Real-world Usage" theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Button variant="primary" size="large" leftIcon={icons.Zap}>
              {isCyber ? '启动系统' : '立即开始'}
            </Button>
            <Button variant="secondary" size="large">
              了解更多
            </Button>
            <Button variant="outline" size="medium" rightIcon={icons.Arrow}>
              查看详情
            </Button>
            <Button variant="ghost" size="medium" leftIcon={icons.Check}>
              {isCyber ? '确认操作' : '已完成'}
            </Button>
            <Button variant="danger" size="medium" leftIcon={icons.Trash}>
              永久删除
            </Button>
            <Button variant="primary" size="medium" loading>
              提交中...
            </Button>
          </div>
        </div>
      </div>
    </YYC3ThemeProvider>
  );
}

// ─────────────────────────────────────────────
// 主 Showcase 组件
// ─────────────────────────────────────────────
export function ButtonShowcase() {
  const [activeTheme, setActiveTheme] = useState<'both' | YYC3Theme>('both');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1520 40%, #080d18 100%)',
      padding: '40px 24px',
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    }}>
      {/* ── 头部 ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          {/* Logo / Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '100px',
            padding: '6px 16px',
            marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 6px #0ff' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(0,229,255,0.85)', textTransform: 'uppercase' }}>
              YYC³ Claw UI — Button System
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            margin: '0 0 16px',
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}>
            高度可定制的{' '}
            <span style={{
              background: 'linear-gradient(90deg, #00e5ff, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Button
            </span>{' '}
            组件
          </h1>
          <p style={{
            fontSize: '17px',
            color: 'rgba(180,200,220,0.75)',
            maxWidth: '560px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}>
            支持赛博朋克 · 液态玻璃双主题，多变体、多尺寸、完整状态管理与无障碍访问支持
          </p>

          {/* 主题切换 */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
          }}>
            {(['both', 'cyberpunk', 'liquid-glass'] as const).map(t => {
              const isActive = activeTheme === t;
              const label = t === 'both' ? '双主题对比' : t === 'cyberpunk' ? '赛博朋克' : '液态玻璃';
              return (
                <button
                  key={t}
                  onClick={() => setActiveTheme(t)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 200ms ease',
                    background: isActive
                      ? t === 'cyberpunk'
                        ? 'rgba(0,229,255,0.15)'
                        : t === 'liquid-glass'
                        ? 'rgba(59,130,246,0.2)'
                        : 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    color: isActive
                      ? t === 'cyberpunk' ? '#0ff' : t === 'liquid-glass' ? '#93c5fd' : '#fff'
                      : 'rgba(180,200,220,0.5)',
                    boxShadow: isActive
                      ? t === 'cyberpunk' ? '0 0 8px rgba(0,255,255,0.2)' : 'none'
                      : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 主题展示区 ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeTheme === 'both' ? 'repeat(auto-fit, minmax(560px, 1fr))' : '1fr',
          gap: '28px',
        }}>
          {/* 赛博朋克面板 */}
          {(activeTheme === 'both' || activeTheme === 'cyberpunk') && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#0ff',
                  boxShadow: '0 0 8px #0ff',
                }} />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#0ff',
                  fontFamily: "'Courier New', monospace",
                }}>
                  Theme: Cyberpunk
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: 'rgba(0,229,255,0.45)',
                  fontFamily: "'Courier New', monospace",
                }}>
                  v2.4.0-neon
                </span>
              </div>
              <ThemePanel theme="cyberpunk" />
            </div>
          )}

          {/* 液态玻璃面板 */}
          {(activeTheme === 'both' || activeTheme === 'liquid-glass') && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'rgba(59,130,246,0.8)',
                  boxShadow: '0 0 8px rgba(59,130,246,0.5)',
                }} />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(147,197,253,0.9)',
                }}>
                  Theme: Liquid Glass
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: 'rgba(147,197,253,0.4)',
                }}>
                  v2.4.0-glass
                </span>
              </div>
              <ThemePanel theme="liquid-glass" />
            </div>
          )}
        </div>

        {/* ── API 文档表格 ── */}
        <div style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '8px',
            }}>
              Props API
            </h2>
            <p style={{ color: 'rgba(180,200,220,0.6)', fontSize: '14px' }}>
              完整类型定义，支持所有原生 button 属性
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            overflow: 'hidden',
            overflowX: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['属性', '类型', '默认值', '说明'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(0,229,255,0.7)',
                      fontFamily: "'Courier New', monospace",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['variant', "'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'", "'primary'", '按钮视觉变体'],
                  ['size', "'small' | 'medium' | 'large'", "'medium'", '按钮尺寸规格'],
                  ['loading', 'boolean', 'false', '加载状态，显示 Spinner，禁止交互'],
                  ['active', 'boolean', 'false', '激活/选中状态，用于切换按钮'],
                  ['disabled', 'boolean', 'false', '禁用状态，不可点击'],
                  ['leftIcon', 'ReactNode', 'undefined', '左侧图标内容'],
                  ['rightIcon', 'ReactNode', 'undefined', '右侧图标内容'],
                  ['iconOnly', 'boolean', 'false', '纯图标模式，隐藏文字内容'],
                  ['theme', "'cyberpunk' | 'liquid-glass'", '继承上下文', '覆盖当前主题'],
                  ['className', 'string', 'undefined', '追加 CSS 类名'],
                  ['style', 'CSSProperties', 'undefined', '内联样式覆盖'],
                ].map(([prop, type, def, desc], i) => (
                  <tr key={prop} style={{
                    borderBottom: i < 10 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '12px 20px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: '#0ff', fontWeight: 600 }}>{prop}</td>
                    <td style={{ padding: '12px 20px', fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'rgba(180,200,255,0.65)', wordBreak: 'break-all' }}>{type}</td>
                    <td style={{ padding: '12px 20px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: 'rgba(180,200,220,0.5)' }}>{def}</td>
                    <td style={{ padding: '12px 20px', fontSize: '13px', color: 'rgba(180,200,220,0.8)', lineHeight: 1.5 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 底部 */}
        <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(180,200,220,0.3)', letterSpacing: '0.06em' }}>
            YYC³ Claw UI · Button Component · Zero Dependencies · React 18+
          </span>
        </div>
      </div>
    </div>
  );
}
