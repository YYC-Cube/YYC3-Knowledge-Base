'use client';

import React, { useState } from 'react';
import { Input, YYC3ThemeProvider, type YYC3Theme, type InputStatus } from './input';

// ─────────────────────────────────────────────
// 共享 SVG 图标（零依赖）
// ─────────────────────────────────────────────
const icons = {
  User: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Lock: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Phone: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.9a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z" />
    </svg>
  ),
  At: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
  Globe: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Https: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Send: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Code: (color = 'currentColor') => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

// ─────────────────────────────────────────────
// Section 标题（与 ButtonShowcase 一致的风格）
// ─────────────────────────────────────────────
function SectionTitle({ label, theme }: { label: string; theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  return (
    <div style={{ marginBottom: '18px', marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        {isCyber && (
          <div style={{
            width: '3px', height: '16px',
            background: 'linear-gradient(180deg, #0ff, #007a91)',
            boxShadow: '0 0 6px #0ff',
            borderRadius: '2px', flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: '11px', fontWeight: 700,
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
// 代码片段展示块
// ─────────────────────────────────────────────
function CodeBlock({ code, theme }: { code: string; theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  return (
    <pre style={{
      background: isCyber ? 'rgba(0,10,12,0.8)' : 'rgba(240,245,255,0.7)',
      border: `1px solid ${isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(180,200,230,0.3)'}`,
      borderRadius: '4px',
      padding: '10px 14px',
      fontSize: '12px',
      fontFamily: "'Courier New', monospace",
      color: isCyber ? 'rgba(0,229,255,0.75)' : 'rgba(50,80,160,0.8)',
      overflowX: 'auto',
      margin: '0 0 8px',
      lineHeight: 1.6,
      whiteSpace: 'pre',
    }}>
      <code>{code}</code>
    </pre>
  );
}

// ─────────────────────────────────────────────
// 单主题展示面板
// ─────────────────────────────────────────────
function ThemePanel({ theme }: { theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';

  // 受控示例 state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [bioVal, setBioVal] = useState('');
  const [pwdVal, setPwdVal] = useState('');
  const [urlVal, setUrlVal] = useState('');
  const [demoStatus, setDemoStatus] = useState<InputStatus>('default');

  const handleEmailBlur = () => {
    if (!email) { setDemoStatus('default'); return; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setDemoStatus(valid ? 'success' : 'error');
  };

  const iconColor = isCyber ? 'rgba(0,200,220,0.5)' : 'rgba(100,130,200,0.6)';

  const panelBg = isCyber
    ? 'linear-gradient(160deg, #020d0f 0%, #041218 50%, #020a0c 100%)'
    : 'linear-gradient(160deg, rgba(230,240,255,0.6) 0%, rgba(210,225,255,0.4) 50%, rgba(220,235,250,0.55) 100%)';

  return (
    <YYC3ThemeProvider theme={theme}>
      <div style={{
        background: panelBg,
        backdropFilter: isCyber ? 'none' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: isCyber ? 'none' : 'blur(20px) saturate(180%)',
        border: `1px solid ${isCyber ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.6)'}`,
        borderRadius: '16px',
        padding: '32px',
        boxShadow: isCyber
          ? '0 0 0 1px rgba(0,229,255,0.05), 0 20px 60px rgba(0,0,0,0.6)'
          : '0 8px 32px rgba(100,120,200,0.12), 0 2px 8px rgba(100,120,200,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Cyberpunk 扫描线 */}
        {isCyber && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.006) 2px, rgba(0,255,255,0.006) 4px)',
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
            width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            pointerEvents: 'none', borderRadius: '50%',
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* ── 1. 基础输入框 ── */}
          <div>
            <SectionTitle label="基础输入框 · Basic" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input placeholder="请输入内容" />
              <Input placeholder="带前缀图标" prefix={icons.User(iconColor)} />
              <Input
                type="search"
                placeholder="搜索..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                allowClear
              />
              <Input placeholder="带自定义后缀" suffix={icons.Send(iconColor)} />
            </div>
          </div>

          {/* ── 2. 尺寸规格 ── */}
          <div>
            <SectionTitle label="尺寸规格 · Sizes" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input size="small" placeholder="小尺寸 Small (4px 8px / 14px)" prefix={icons.Code(iconColor)} />
              <Input size="medium" placeholder="中等尺寸 Medium (8px 12px / 16px)" prefix={icons.Code(iconColor)} />
              <Input size="large" placeholder="大尺寸 Large (12px 16px / 18px)" prefix={icons.Code(iconColor)} />
            </div>
          </div>

          {/* ── 3. 密码输入框 ── */}
          <div>
            <SectionTitle label="密码输入框 · Password" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                type="password"
                passwordToggle
                prefix={icons.Lock(iconColor)}
                placeholder="请输入密码（点击图标切换可见性）"
                value={pwdVal}
                onChange={e => setPwdVal(e.target.value)}
                allowClear
              />
              <Input
                type="password"
                passwordToggle
                placeholder="确认密码"
                size="large"
              />
            </div>
          </div>

          {/* ── 4. 验证状态 ── */}
          <div>
            <SectionTitle label="验证状态 · Validation Status" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                placeholder="请输入邮箱地址（失焦验证）"
                type="email"
                prefix={icons.Mail(iconColor)}
                status={demoStatus}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                onFocus={() => setDemoStatus('default')}
                allowClear
                errorMessage="邮箱格式不正确，请检查后重试"
                successMessage="邮箱格式正确"
              />
              <Input
                status="error"
                defaultValue="已提交的错误值"
                errorMessage="用户名不能为空，请输入 3-20 个字符"
                prefix={icons.User(iconColor)}
              />
              <Input
                status="warning"
                defaultValue="重复使用的密码"
                warningMessage="该密码过于常见，建议使用更复杂的密码"
                prefix={icons.Lock(iconColor)}
              />
              <Input
                status="success"
                defaultValue="yyc3_username"
                successMessage="用户名可用"
                prefix={icons.User(iconColor)}
              />
            </div>
          </div>

          {/* ── 5. 允许清除 & 字数统计 ── */}
          <div>
            <SectionTitle label="清除 & 字数统计 · Clear & Count" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                placeholder="输入内容后会出现清除按钮"
                allowClear
                value={username}
                onChange={e => setUsername(e.target.value)}
                prefix={icons.User(iconColor)}
              />
              <Input
                placeholder="URL 输入框（最多 80 字）"
                prefix={icons.Globe(iconColor)}
                suffix={icons.Https(iconColor)}
                allowClear
                showCount
                maxLength={80}
                value={urlVal}
                onChange={e => setUrlVal(e.target.value)}
              />
            </div>
          </div>

          {/* ── 6. 文本域 ── */}
          <div>
            <SectionTitle label="文本域 · Textarea" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                type="textarea"
                rows={3}
                placeholder="请输入描述内容..."
                value={bioVal}
                onChange={e => setBioVal(e.target.value)}
              />
              <Input
                type="textarea"
                rows={4}
                maxLength={200}
                showCount
                placeholder="带字数统计的文本域（最多 200 字）"
              />
              <Input
                type="textarea"
                rows={3}
                status="error"
                errorMessage="描述内容不能为空"
                placeholder="错误状态文本域"
              />
            </div>
          </div>

          {/* ── 7. 禁用与只读 ── */}
          <div>
            <SectionTitle label="禁用 & 只读 · Disabled & ReadOnly" theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input
                disabled
                defaultValue="已禁用的输入框"
                prefix={icons.Lock(iconColor)}
              />
              <Input
                readOnly
                defaultValue="只读内容，不可编辑"
                suffix={icons.Code(iconColor)}
              />
              <Input
                disabled
                type="password"
                passwordToggle
                defaultValue="disabledpassword"
                prefix={icons.Lock(iconColor)}
              />
            </div>
          </div>

          {/* ── 8. 真实场景：注册表单 ── */}
          <div>
            <SectionTitle label="真实场景 · Sign-up Form" theme={theme} />
            <div style={{
              background: isCyber ? 'rgba(0,229,255,0.03)' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${isCyber ? 'rgba(0,229,255,0.1)' : 'rgba(180,200,230,0.35)'}`,
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  placeholder="用户名"
                  prefix={icons.User(iconColor)}
                  allowClear
                  maxLength={20}
                  showCount
                />
                <Input
                  type="email"
                  placeholder="电子邮箱"
                  prefix={icons.Mail(iconColor)}
                />
              </div>
              <Input
                placeholder="联系电话（选填）"
                prefix={icons.Phone(iconColor)}
                allowClear
                type="number"
              />
              <Input
                type="password"
                placeholder="设置密码（8-20位）"
                prefix={icons.Lock(iconColor)}
                passwordToggle
                allowClear
              />
              <Input
                type="textarea"
                rows={3}
                placeholder="个人简介（选填，最多 150 字）"
                maxLength={150}
                showCount
              />
            </div>
          </div>

        </div>
      </div>
    </YYC3ThemeProvider>
  );
}

// ─────────────────────────────────────────────
// Props API 表格
// ─────────────────────────────────────────────
const API_ROWS = [
  ['type', "'text' | 'password' | 'email' | 'number' | 'search' | 'textarea'", "'text'", '输入框类型'],
  ['size', "'small' | 'medium' | 'large'", "'medium'", '输入框尺寸规格'],
  ['status', "'default' | 'error' | 'warning' | 'success'", "'default'", '验证状态，影响边框与图标颜色'],
  ['errorMessage', 'string', 'undefined', '错误时显示的提示文字'],
  ['warningMessage', 'string', 'undefined', '警告时显示的提示文字'],
  ['successMessage', 'string', 'undefined', '成功时显示的提示文字'],
  ['prefix', 'ReactNode', 'undefined', '前缀内容（图标或文本）'],
  ['suffix', 'ReactNode', 'undefined', '后缀内容（图标或文本）'],
  ['allowClear', 'boolean', 'false', '有值时显示清除按钮'],
  ['showCount', 'boolean', 'false', '显示字数统计，配合 maxLength 显示上限'],
  ['passwordToggle', 'boolean', 'false', '密码可见性切换按钮（type="password" 时生效）'],
  ['rows', 'number', '4', 'Textarea 行数（type="textarea" 时生效）'],
  ['theme', "'cyberpunk' | 'liquid-glass'", '继承上下文', '覆盖当前主题，不传则继承 ThemeProvider'],
  ['onPressEnter', '(e) => void', 'undefined', '回车键回调（textarea 不触发）'],
  ['wrapperStyle', 'CSSProperties', 'undefined', '外层容器内联样式'],
  ['wrapperClassName', 'string', 'undefined', '外层容器 class 名'],
];

// ─────────────────────────────────────────────
// 主 Showcase 组件
// ─────────────────────────────────────────────
export function InputShowcase() {
  const [activeTheme, setActiveTheme] = useState<'both' | YYC3Theme>('both');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1520 40%, #080d18 100%)',
      padding: '40px 24px',
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ── 头部 ── */}
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '100px', padding: '6px 16px', marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 6px #0ff' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(0,229,255,0.85)', textTransform: 'uppercase' }}>
              YYC³ Claw UI — Input System
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
            margin: '0 0 16px', color: '#fff',
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            高度可定制的{' '}
            <span style={{
              background: 'linear-gradient(90deg, #00e5ff, #7c3aed)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Input
            </span>{' '}
            组件
          </h1>
          <p style={{
            fontSize: '17px', color: 'rgba(180,200,220,0.75)',
            maxWidth: '600px', margin: '0 auto 36px', lineHeight: 1.6,
          }}>
            支持赛博朋克 · 液态玻璃双主题，多类型输入、验证状态、密码切换、字数统计与完整无障碍访问
          </p>

          {/* 主题切换 Tabs */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '4px', gap: '4px',
          }}>
            {(['both', 'cyberpunk', 'liquid-glass'] as const).map(t => {
              const isActive = activeTheme === t;
              const label = t === 'both' ? '双主题对比' : t === 'cyberpunk' ? '赛博朋克' : '液态玻璃';
              return (
                <button
                  key={t}
                  onClick={() => setActiveTheme(t)}
                  style={{
                    padding: '8px 20px', borderRadius: '8px',
                    border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600,
                    transition: 'all 200ms ease',
                    background: isActive
                      ? t === 'cyberpunk' ? 'rgba(0,229,255,0.15)'
                        : t === 'liquid-glass' ? 'rgba(59,130,246,0.2)'
                        : 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    color: isActive
                      ? t === 'cyberpunk' ? '#0ff' : t === 'liquid-glass' ? '#93c5fd' : '#fff'
                      : 'rgba(180,200,220,0.5)',
                    boxShadow: isActive && t === 'cyberpunk' ? '0 0 8px rgba(0,255,255,0.2)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 主题面板区 ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeTheme === 'both' ? 'repeat(auto-fit, minmax(580px, 1fr))' : '1fr',
          gap: '28px',
        }}>
          {(activeTheme === 'both' || activeTheme === 'cyberpunk') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 8px #0ff' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0ff', fontFamily: "'Courier New', monospace" }}>
                  Theme: Cyberpunk
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(0,229,255,0.45)', fontFamily: "'Courier New', monospace" }}>
                  v2.4.0-neon
                </span>
              </div>
              <ThemePanel theme="cyberpunk" />
            </div>
          )}
          {(activeTheme === 'both' || activeTheme === 'liquid-glass') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(59,130,246,0.8)', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(147,197,253,0.9)' }}>
                  Theme: Liquid Glass
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(147,197,253,0.4)' }}>
                  v2.4.0-glass
                </span>
              </div>
              <ThemePanel theme="liquid-glass" />
            </div>
          )}
        </div>

        {/* ── 代码示例 ── */}
        <div style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              使用示例 · Code Examples
            </h2>
            <p style={{ color: 'rgba(180,200,220,0.6)', fontSize: '14px' }}>
              零外部依赖，纯 React 实现，开箱即用
            </p>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '20px',
          }}>
            {[
              {
                title: '基础输入框',
                code: `<Input\n  placeholder="请输入内容"\n  onChange={e => console.log(e.target.value)}\n/>`,
              },
              {
                title: '带前后缀',
                code: `<Input\n  prefix={<SearchIcon />}\n  suffix={<SendIcon />}\n  allowClear\n  placeholder="搜索..."\n/>`,
              },
              {
                title: '密码输入框',
                code: `<Input\n  type="password"\n  passwordToggle\n  prefix={<LockIcon />}\n  allowClear\n  placeholder="请输入密码"\n/>`,
              },
              {
                title: '验证状态',
                code: `<Input\n  status="error"\n  errorMessage="邮箱格式不正确"\n  prefix={<MailIcon />}\n/>`,
              },
              {
                title: '文本域 + 字数统计',
                code: `<Input\n  type="textarea"\n  rows={4}\n  maxLength={200}\n  showCount\n  placeholder="请输入描述..."\n/>`,
              },
              {
                title: '主题上下文',
                code: `<YYC3ThemeProvider theme="cyberpunk">\n  <Input placeholder="继承赛博朋克主题" />\n  <Input\n    theme="liquid-glass"\n    placeholder="覆盖为液态玻璃"\n  />\n</YYC3ThemeProvider>`,
              },
            ].map(({ title, code }) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '18px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,229,255,0.7)', marginBottom: '10px', fontFamily: "'Courier New', monospace", letterSpacing: '0.06em' }}>
                  {title}
                </div>
                <CodeBlock code={code} theme="cyberpunk" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Props API 表格 ── */}
        <div style={{ marginTop: '60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Props API
            </h2>
            <p style={{ color: 'rgba(180,200,220,0.6)', fontSize: '14px' }}>
              完整类型定义，支持所有原生 input / textarea 属性透传
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', overflow: 'hidden', overflowX: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['属性', '类型', '默认值', '说明'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left',
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'rgba(0,229,255,0.7)', fontFamily: "'Courier New', monospace",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {API_ROWS.map(([prop, type, def, desc], i) => (
                  <tr key={prop} style={{
                    borderBottom: i < API_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '11px 20px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: '#0ff', fontWeight: 600, whiteSpace: 'nowrap' }}>{prop}</td>
                    <td style={{ padding: '11px 20px', fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'rgba(180,200,255,0.65)', wordBreak: 'break-word' }}>{type}</td>
                    <td style={{ padding: '11px 20px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: 'rgba(180,200,220,0.5)', whiteSpace: 'nowrap' }}>{def}</td>
                    <td style={{ padding: '11px 20px', fontSize: '13px', color: 'rgba(180,200,220,0.8)', lineHeight: 1.5 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 底部 */}
        <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(180,200,220,0.3)', letterSpacing: '0.06em' }}>
            YYC³ Claw UI · Input Component · Zero Dependencies · React 18+
          </span>
        </div>
      </div>
    </div>
  );
}
