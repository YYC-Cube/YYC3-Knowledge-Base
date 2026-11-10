'use client';

/**
 * YYC³ Claw UI — Layout System 完整展示页
 *
 * 展示内容：
 *   01 · 完整应用布局（Layout + Header + Sidebar + Footer + Container 协同）
 *   02 · 设计系统 Token 面板（ThemeVariables 可视化）
 *   03 · 响应式 Container 尺寸展示
 *   04 · Header 变体展示
 *   05 · Sidebar 变体展示
 *   06 · Footer 变体展示
 */

import React, { useState } from 'react';
import { Layout, YYC3ThemeProvider, useYYC3Theme, type YYC3Theme } from './layout';
import { Header, type NavItem } from './header';
import { Sidebar, type SidebarSection } from './sidebar';
import { Footer, type FooterColumn } from './footer';
import { Container } from './container';
import { getThemeTokens, breakpoints } from './theme-tokens';

// ─────────────────────────────────────────────
// SVG 图标集（零依赖）
// ─────────────────────────────────────────────
const icons = {
  dashboard: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>),
  layers:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  palette:   (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>),
  book:      (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  settings:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  users:     (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  bar:       (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>),
  bell:      (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  github:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>),
  twitter:   (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>),
  moon:      (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>),
  sun:       (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>),
};

// ─────────────────────────────────────────────
// 工具组件
// ─────────────────────────────────────────────
function SectionTitle({ label, title, theme }: { label: string; title: string; theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  const t = getThemeTokens(theme);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '6px' }}>
      <span style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em',
        color: isCyber ? 'rgba(0,229,255,0.4)' : 'rgba(80,100,180,0.45)',
        fontFamily: t.fontFamily, textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <h2 style={{
        margin: 0, fontSize: '18px', fontWeight: 800,
        color: isCyber ? '#00f0ff' : 'rgba(10,20,60,0.92)',
        fontFamily: t.fontFamily, letterSpacing: isCyber ? '0.04em' : '0',
      }}>
        {title}
      </h2>
    </div>
  );
}

function Divider({ theme }: { theme: YYC3Theme }) {
  const t = getThemeTokens(theme);
  return <div style={{ height: '1px', background: t.colors.border, margin: '48px 0' }} />;
}

// ─────────────────────────────────────────────
// 仿真 Dashboard 内容区
// ─────────────────────────────────────────────
function DashboardContent({ theme, activeNav }: { theme: YYC3Theme; activeNav: string }) {
  const isCyber = theme === 'cyberpunk';
  const t = getThemeTokens(theme);

  const cardBase: React.CSSProperties = {
    padding: '18px', borderRadius: t.borderRadius.lg,
    background: t.surfaceBg, border: `1px solid ${t.colors.border}`,
    backdropFilter: t.backdropFilter, WebkitBackdropFilter: t.backdropFilter,
    display: 'flex', flexDirection: 'column', gap: '6px',
    boxShadow: isCyber ? `0 0 12px rgba(0,229,255,0.04)` : t.shadows.sm,
  };

  const metrics = [
    { label: '月活用户', value: '84,291', delta: '+12.4%', up: true, color: t.colors.primary },
    { label: '今日收入', value: '¥62,480', delta: '+8.2%',  up: true, color: t.colors.success },
    { label: '转化率',   value: '3.87%',   delta: '-0.3%',  up: false, color: t.colors.error },
    { label: '响应延迟', value: '42ms',    delta: '-18%',   up: true, color: t.colors.info },
  ];

  const pages: Record<string, string> = {
    dashboard: '数据总览', layers: '组件库', palette: '主题配置',
    book: '开发文档', users: '用户管理', bar: '数据分析',
    bell: '通知中心', settings: '系统设置',
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: isCyber ? '#00f0ff' : 'rgba(10,20,60,0.92)', fontFamily: t.fontFamily, letterSpacing: isCyber ? '0.05em' : '0' }}>
          {pages[activeNav] ?? '数据总览'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily }}>
          YYC³ Claw UI · Layout System · {isCyber ? 'CYBERPUNK MODE' : 'Liquid Glass Mode'}
        </p>
      </div>

      {/* 指标卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px' }}>
        {metrics.map(m => (
          <div key={m.label} style={cardBase}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily }}>
              {m.label}
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: m.color, fontFamily: t.fontFamily }}>
              {m.value}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: m.up ? t.colors.success : t.colors.error, fontFamily: t.fontFamily }}>
              {m.delta} 较上周
            </span>
          </div>
        ))}
      </div>

      {/* 趋势图（纯 div 模拟） */}
      <div style={{ ...cardBase, minHeight: '120px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily }}>
          活跃趋势 · 近 30 天
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', paddingTop: '12px' }}>
          {[42,58,51,67,73,60,80,72,85,78,90,82,95,88,92,76,84,79,88,91,85,93,87,96,89,94,88,97,91,100].map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '3px 3px 0 0',
              height: `${Math.round(h * 0.8)}px`,
              background: isCyber ? `rgba(0,229,255,${0.12 + h / 100 * 0.55})` : `rgba(59,130,246,${0.12 + h / 100 * 0.55})`,
              boxShadow: isCyber && h > 88 ? '0 0 5px rgba(0,229,255,0.3)' : 'none',
              transition: 'height 300ms ease',
            }} />
          ))}
        </div>
      </div>

      {/* 服务状态 + 最近活动 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={cardBase}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily }}>
            服务状态
          </span>
          {[{n:'API Gateway',ok:true},{n:'Database',ok:true},{n:'CDN',ok:false},{n:'Auth Service',ok:true}].map(s => (
            <div key={s.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: '12px', color: isCyber ? 'rgba(0,210,230,0.68)' : 'rgba(40,60,120,0.72)', fontFamily: t.fontFamily }}>{s.n}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
                background: s.ok ? (isCyber ? 'rgba(0,230,118,0.1)' : 'rgba(34,197,94,0.1)') : (isCyber ? 'rgba(255,184,0,0.1)' : 'rgba(234,179,8,0.1)'),
                color: s.ok ? t.colors.success : t.colors.warning }}>
                {s.ok ? '正常' : '降级'}
              </span>
            </div>
          ))}
        </div>
        <div style={cardBase}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily }}>
            最近活动
          </span>
          {[{t:'用户 #2841 注册',time:'2 分钟前'},{t:'订单 #7932 支付',time:'8 分钟前'},{t:'系统备份完成',time:'23 分钟前'},{t:'v2.4.1 已部署',time:'1 小时前'}].map((a,i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderBottom: i < 3 ? `1px solid ${t.colors.border}` : 'none' }}>
              <span style={{ fontSize: '12px', color: isCyber ? 'rgba(0,210,230,0.62)' : 'rgba(40,60,120,0.68)', fontFamily: t.fontFamily }}>{a.t}</span>
              <span style={{ fontSize: '11px', color: isCyber ? 'rgba(0,180,200,0.38)' : 'rgba(100,120,180,0.42)', flexShrink: 0, fontFamily: t.fontFamily }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Token 面板
// ─────────────────────────────────────────────
function TokenPanel({ theme }: { theme: YYC3Theme }) {
  const t = getThemeTokens(theme);
  const isCyber = theme === 'cyberpunk';

  const row = (label: string, value: string, isColor?: boolean) => (
    <div key={label} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: `1px solid ${t.colors.border}`, gap: '12px',
    }}>
      <code style={{ fontSize: '12px', color: isCyber ? 'rgba(0,200,220,0.6)' : 'rgba(60,80,140,0.65)', fontFamily: t.fontFamily }}>
        {label}
      </code>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isColor && (
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: value, border: `1px solid ${t.colors.border}`, flexShrink: 0 }} />
        )}
        <code style={{ fontSize: '11px', color: isCyber ? 'rgba(0,229,255,0.8)' : 'rgba(37,99,235,0.9)', fontFamily: "'Courier New',monospace", textAlign: 'right', wordBreak: 'break-all' }}>
          {value}
        </code>
      </div>
    </div>
  );

  const groups = [
    { title: '颜色 (colors)', entries: Object.entries(t.colors).map(([k, v]) => [`colors.${k}`, v, true]) as [string, string, boolean][] },
    { title: '间距 (spacing)', entries: Object.entries(t.spacing).map(([k, v]) => [`spacing.${k}`, v, false]) as [string, string, boolean][] },
    { title: '圆角 (borderRadius)', entries: Object.entries(t.borderRadius).map(([k, v]) => [`radius.${k}`, v, false]) as [string, string, boolean][] },
    { title: '阴影 (shadows)', entries: Object.entries(t.shadows).map(([k, v]) => [`shadows.${k}`, v, false]) as [string, string, boolean][] },
    { title: '过渡 (transitions)', entries: Object.entries(t.transitions).map(([k, v]) => [`transitions.${k}`, v, false]) as [string, string, boolean][] },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px' }}>
      {groups.map(g => (
        <div key={g.title} style={{
          padding: '16px', borderRadius: t.borderRadius.lg,
          background: t.surfaceBg, border: `1px solid ${t.colors.border}`,
          backdropFilter: t.backdropFilter, WebkitBackdropFilter: t.backdropFilter,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? t.glowColor : t.colors.primary, marginBottom: '10px', fontFamily: t.fontFamily }}>
            {g.title}
          </div>
          {g.entries.map(([k, v, isColor]) => row(k, v, isColor))}
        </div>
      ))}

      {/* 断点 */}
      <div style={{ padding: '16px', borderRadius: t.borderRadius.lg, background: t.surfaceBg, border: `1px solid ${t.colors.border}`, backdropFilter: t.backdropFilter, WebkitBackdropFilter: t.backdropFilter }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCyber ? t.glowColor : t.colors.primary, marginBottom: '10px', fontFamily: t.fontFamily }}>
          断点 (breakpoints) — § 1.4
        </div>
        {Object.entries(breakpoints).map(([k, v]) => row(k, v, false))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Container 尺寸展示
// ─────────────────────────────────────────────
function ContainerDemo({ theme }: { theme: YYC3Theme }) {
  const t = getThemeTokens(theme);
  const isCyber = theme === 'cyberpunk';
  const sizes = ['xs','sm','md','lg','xl','2xl'] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'auto' }}>
      {sizes.map(size => (
        <div key={size} style={{ position: 'relative' }}>
          <Container theme={theme} size={size} padding="md" style={{ padding: '0' }}>
            <div style={{
              padding: '10px 16px', borderRadius: t.borderRadius.md,
              background: t.surfaceBg, border: `1px solid ${t.colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <code style={{ fontSize: '13px', fontFamily: t.fontFamily, fontWeight: 700, color: isCyber ? t.glowColor : t.colors.primary }}>{size}</code>
              <span style={{ fontSize: '12px', color: isCyber ? 'rgba(0,200,220,0.5)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
                max-width: {size === 'xs' ? '576px' : size === 'sm' ? '768px' : size === 'md' ? '992px' : size === 'lg' ? '1200px' : size === 'xl' ? '1280px' : '1536px'}
              </span>
            </div>
          </Container>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 主题切换按钮
// ─────────────────────────────────────────────
function ThemeToggle({ theme, onChange }: { theme: YYC3Theme; onChange: (t: YYC3Theme) => void }) {
  const isCyber = theme === 'cyberpunk';
  const t = getThemeTokens(theme);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: t.borderRadius.md,
    border: `1px solid ${active ? t.colors.primary : t.colors.border}`,
    background: active ? t.surfaceBg : 'transparent',
    color: active ? t.colors.primary : isCyber ? 'rgba(0,200,220,0.5)' : 'rgba(80,100,160,0.55)',
    fontSize: '12px', fontWeight: active ? 700 : 500,
    cursor: 'pointer', fontFamily: t.fontFamily,
    letterSpacing: isCyber ? '0.05em' : '0',
    textTransform: isCyber ? 'uppercase' : 'none',
    transition: 'all 200ms ease',
  });

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: isCyber ? 'rgba(0,180,200,0.45)' : 'rgba(100,120,180,0.45)', fontFamily: t.fontFamily }}>主题：</span>
      <button style={btnStyle(theme === 'cyberpunk')} onClick={() => onChange('cyberpunk')}>{icons.moon} 赛博朋克</button>
      <button style={btnStyle(theme === 'liquid-glass')} onClick={() => onChange('liquid-glass')}>{icons.sun} 液态玻璃</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主展示组件
// ─────────────────────────────────────────────
export function LayoutShowcase() {
  const [theme, setTheme]           = useState<YYC3Theme>('cyberpunk');
  const [activeNav, setActiveNav]   = useState('dashboard');
  const [headerActive, setHeaderActive] = useState('product');

  const isCyber = theme === 'cyberpunk';
  const t = getThemeTokens(theme);

  // ── 数据 ──
  const headerNav: NavItem[] = [
    { key: 'product', label: '产品' },
    { key: 'components', label: '组件库' },
    { key: 'docs', label: '文档' },
    { key: 'blog', label: '博客' },
  ];

  const sidebarSections: SidebarSection[] = [
    {
      title: '核心功能',
      items: [
        { key: 'dashboard', label: '数据总览', icon: icons.dashboard },
        { key: 'bar',       label: '数据分析', icon: icons.bar, badge: 'NEW' },
        { key: 'bell',      label: '通知中心', icon: icons.bell, badge: '12' },
      ],
    },
    {
      title: '管理',
      items: [
        {
          key: 'users', label: '用户管理', icon: icons.users,
          children: [
            { key: 'users-list',  label: '用户列表' },
            { key: 'users-roles', label: '角色权限' },
          ],
        },
        { key: 'layers',  label: '组件库',   icon: icons.layers },
        { key: 'palette', label: '主题配置', icon: icons.palette },
        { key: 'book',    label: '开发文档', icon: icons.book },
        { key: 'divider-1', label: '', divider: true },
      ],
    },
    {
      title: '系统',
      items: [{ key: 'settings', label: '系统设置', icon: icons.settings }],
    },
  ];

  const footerColumns: FooterColumn[] = [
    { title: '产品', links: [{ label: '组件库', href: '#' }, { label: '主题系统', href: '#' }, { label: '设计规范', href: '#' }, { label: '更新日志', href: '#' }] },
    { title: '资源', links: [{ label: '开发文档', href: '#' }, { label: 'API 参考', href: '#' }, { label: '示例代码', href: '#' }] },
    { title: '关于', links: [{ label: '关于 YYC³', href: '#' }, { label: '开源协议', href: '#' }, { label: '联系我们', href: '#' }] },
  ];

  const socials = [
    { label: 'GitHub', icon: icons.github, href: '#' },
    { label: 'Twitter / X', icon: icons.twitter, href: '#' },
  ];

  const logoNode = (
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill={isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(59,130,246,0.1)'} />
        <path d="M8 12l8-4 8 4-8 4-8-4zM8 12v8l8 4M24 12v8l-8 4" stroke={isCyber ? '#00e5ff' : '#3b82f6'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>YYC³</span>
    </span>
  );

  // ── 顶部控制栏背景 ──
  const controlBarBg = isCyber ? 'rgba(1,6,10,0.98)' : 'rgba(235,242,255,0.96)';

  return (
    <YYC3ThemeProvider theme={theme}>
      {/* 控制栏 */}
      <div style={{
        background: controlBarBg,
        borderBottom: `1px solid ${t.colors.border}`,
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '10px',
        fontFamily: t.fontFamily, position: 'sticky', top: 0, zIndex: 9000,
        backdropFilter: isCyber ? 'none' : 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: t.colors.primary, letterSpacing: isCyber ? '0.1em' : '0', textTransform: isCyber ? 'uppercase' : 'none' }}>
            YYC³ Claw UI
          </span>
          <span style={{ fontSize: '11px', color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)' }}>
            Layout · Header · Sidebar · Footer · Container — 设计规范对接
          </span>
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>

      <main style={{ background: isCyber ? t.colors.background : undefined, backgroundImage: isCyber ? undefined : 'linear-gradient(135deg,rgba(219,234,254,0.35) 0%,rgba(248,250,255,0.95) 60%,rgba(238,242,255,0.5) 100%)', minHeight: 'calc(100vh - 44px)' }}>

        {/* ── 01 完整应用布局 ── */}
        <section style={{ padding: '36px 24px 0' }}>
          <SectionTitle theme={theme} label="01" title="完整应用布局 — Full Layout System" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            Layout + Header + Sidebar + Footer + Container 五组件协同，构成完整后台管理界面。
          </p>

          <div style={{
            height: '560px', borderRadius: '10px', overflow: 'hidden',
            border: `1px solid ${t.colors.border}`,
            boxShadow: isCyber ? `0 0 60px rgba(0,229,255,0.07),0 24px 80px rgba(0,0,0,0.6)` : t.shadows.lg,
          }}>
            <Layout theme={theme} style={{ height: '100%', flexDirection: 'column' }}>
              <Layout.Header>
                <Header
                  theme={theme} sticky={false} height={50} logo={logoNode}
                  nav={headerNav} activeKey={headerActive}
                  onNavClick={(key) => setHeaderActive(key)}
                  actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(59,130,246,0.12)', border: `1px solid ${t.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.colors.primary, fontSize: '13px', fontWeight: 700, fontFamily: t.fontFamily }}>
                        A
                      </div>
                    </div>
                  }
                />
              </Layout.Header>

              <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <Layout.Sider>
                  <Sidebar
                    theme={theme} sections={sidebarSections}
                    activeKey={activeNav} defaultOpenKeys={['users']}
                    onItemClick={(key) => setActiveNav(key)}
                    width={200} collapsedWidth={52}
                    logo={<span style={{ fontSize: '14px', fontWeight: 800, color: t.colors.primary, fontFamily: t.fontFamily }}>YYC³</span>}
                  />
                </Layout.Sider>
                <Layout.Content>
                  <DashboardContent theme={theme} activeNav={activeNav} />
                </Layout.Content>
              </div>

              <Layout.Footer>
                <Footer
                  theme={theme} compact
                  copyright={<>© 2025 YYC³ Claw UI · 零依赖双主题组件库</>}
                  socials={socials}
                />
              </Layout.Footer>
            </Layout>
          </div>
        </section>

        <Divider theme={theme} />

        {/* ── 02 设计系统 Token 面板 ── */}
        <section style={{ padding: '0 24px' }}>
          <SectionTitle theme={theme} label="02" title="设计系统 Token — ThemeVariables（§ 1.2）" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            符合 README § 1.2 规范的完整 ThemeVariables 系统，包含颜色、间距、圆角、阴影、过渡及响应式断点。
          </p>
          <TokenPanel theme={theme} />
        </section>

        <Divider theme={theme} />

        {/* ── 03 Container 尺寸 ── */}
        <section style={{ padding: '0 24px' }}>
          <SectionTitle theme={theme} label="03" title="Container 响应式尺寸（§ 1.4）" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            8 档 size 对应 README 断点规范（xs/sm/md/lg/xl/2xl/full/fluid），支持响应式 padding 自动缩减。
          </p>
          <ContainerDemo theme={theme} />
        </section>

        <Divider theme={theme} />

        {/* ── 04 Header 变体 ── */}
        <section style={{ padding: '0 24px' }}>
          <SectionTitle theme={theme} label="04" title="Header 变体展示" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            支持 sticky、shrinkOnScroll、移动端汉堡菜单。全面实现 § 1.3 键盘导航（Tab/Enter/Space/ESC）与 ARIA role。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: '基础 Header（sticky=false）', shrink: false },
              { label: 'shrinkOnScroll Header', shrink: true },
            ].map(({ label, shrink }) => (
              <div key={label} style={{ borderRadius: t.borderRadius.lg, overflow: 'hidden', border: `1px solid ${t.colors.border}` }}>
                <div style={{ padding: '6px 14px', background: t.surfaceBg, fontSize: '11px', fontWeight: 700, color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.colors.border}` }}>
                  {label}
                </div>
                <Header
                  theme={theme} sticky={false} shrinkOnScroll={shrink}
                  logo={logoNode} nav={headerNav} activeKey="product"
                  onNavClick={() => {}}
                  actions={<div style={{ fontSize: '12px', color: t.colors.secondary, fontFamily: t.fontFamily }}>v2.4.1</div>}
                />
              </div>
            ))}
          </div>
        </section>

        <Divider theme={theme} />

        {/* ── 05 Sidebar 变体 ── */}
        <section style={{ padding: '0 24px' }}>
          <SectionTitle theme={theme} label="05" title="Sidebar 变体展示" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            受控/非受控折叠、子菜单展开、section 分组、badge 提示。§ 1.3 role=tree/treeitem/group aria 完整。
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* 展开态 */}
            <div style={{ borderRadius: t.borderRadius.lg, overflow: 'hidden', border: `1px solid ${t.colors.border}`, flex: '1 1 220px', maxWidth: '260px' }}>
              <div style={{ padding: '6px 14px', background: t.surfaceBg, fontSize: '11px', fontWeight: 700, color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.colors.border}` }}>
                展开态
              </div>
              <div style={{ height: '380px' }}>
                <Sidebar
                  theme={theme} sections={sidebarSections}
                  activeKey="bar" defaultOpenKeys={['users']}
                  width={220} collapsedWidth={52}
                  logo={<span style={{ fontSize: '14px', fontWeight: 800, color: t.colors.primary, fontFamily: t.fontFamily }}>YYC³</span>}
                  style={{ height: '100%' }}
                />
              </div>
            </div>

            {/* 折叠态 */}
            <div style={{ borderRadius: t.borderRadius.lg, overflow: 'hidden', border: `1px solid ${t.colors.border}`, flex: '0 0 auto' }}>
              <div style={{ padding: '6px 14px', background: t.surfaceBg, fontSize: '11px', fontWeight: 700, color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.colors.border}` }}>
                折叠态
              </div>
              <div style={{ height: '380px' }}>
                <Sidebar
                  theme={theme} sections={sidebarSections}
                  activeKey="dashboard" defaultCollapsed
                  width={220} collapsedWidth={52}
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          </div>
        </section>

        <Divider theme={theme} />

        {/* ── 06 Footer 变体 ── */}
        <section style={{ padding: '0 24px 48px' }}>
          <SectionTitle theme={theme} label="06" title="Footer 变体展示" />
          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: isCyber ? 'rgba(0,200,220,0.48)' : 'rgba(80,100,160,0.55)', fontFamily: t.fontFamily }}>
            完整模式（响应式 Grid 列）与紧凑模式，role=contentinfo，Footer nav role 与 aria-label 完整。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ borderRadius: t.borderRadius.lg, overflow: 'hidden', border: `1px solid ${t.colors.border}` }}>
              <div style={{ padding: '6px 14px', background: t.surfaceBg, fontSize: '11px', fontWeight: 700, color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.colors.border}` }}>
                完整模式 (compact=false)
              </div>
              <Footer
                theme={theme}
                logo={logoNode}
                description="YYC³ Claw UI 是一套支持赛博朋克/液态玻璃双主题的高质量 React 组件库，零外部依赖，完整 TypeScript 类型。"
                columns={footerColumns}
                socials={socials}
                copyright={<>© 2025 YYC³ Team · MIT License</>}
                extra={<a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>隐私政策</a>}
              />
            </div>

            <div style={{ borderRadius: t.borderRadius.lg, overflow: 'hidden', border: `1px solid ${t.colors.border}` }}>
              <div style={{ padding: '6px 14px', background: t.surfaceBg, fontSize: '11px', fontWeight: 700, color: isCyber ? 'rgba(0,200,220,0.45)' : 'rgba(80,100,160,0.5)', fontFamily: t.fontFamily, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${t.colors.border}` }}>
                紧凑模式 (compact=true)
              </div>
              <Footer
                theme={theme} compact logo={logoNode}
                copyright={<>© 2025 YYC³ Claw UI — 零依赖双主题组件库</>}
                socials={socials}
              />
            </div>
          </div>
        </section>
      </main>
    </YYC3ThemeProvider>
  );
}
