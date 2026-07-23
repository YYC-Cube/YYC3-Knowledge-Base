'use client';

import React, { useState } from 'react';
import { Card, YYC3ThemeProvider, type YYC3Theme } from './card';
import { Modal } from './modal';
import { Button } from './button';

// ─────────────────────────────────────────────
// SVG 图标（零依赖）
// ─────────────────────────────────────────────
const Icons = {
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Heart: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Share: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  More: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  ),
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Link: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────
// 通用区块标题
// ─────────────────────────────────────────────
function SectionTitle({ label, theme }: { label: string; theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';
  return (
    <div style={{ marginBottom: '18px' }}>
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
// 标签徽章
// ─────────────────────────────────────────────
function Tag({ label, theme, color }: { label: string; theme: YYC3Theme; color?: 'blue' | 'green' | 'red' | 'yellow' }) {
  const isCyber = theme === 'cyberpunk';
  const colorMap = {
    blue:   { bg: isCyber ? 'rgba(0,229,255,0.1)'  : 'rgba(59,130,246,0.1)',  text: isCyber ? '#0ff'           : 'rgba(37,99,235,0.9)',   border: isCyber ? 'rgba(0,229,255,0.3)'  : 'rgba(59,130,246,0.3)'  },
    green:  { bg: isCyber ? 'rgba(0,230,118,0.1)'  : 'rgba(34,197,94,0.1)',   text: isCyber ? '#00e676'        : 'rgba(21,128,61,0.9)',   border: isCyber ? 'rgba(0,230,118,0.3)'  : 'rgba(34,197,94,0.3)'   },
    red:    { bg: isCyber ? 'rgba(255,45,85,0.1)'  : 'rgba(239,68,68,0.1)',   text: isCyber ? '#ff2d55'        : 'rgba(185,28,28,0.9)',   border: isCyber ? 'rgba(255,45,85,0.3)'  : 'rgba(239,68,68,0.3)'   },
    yellow: { bg: isCyber ? 'rgba(255,184,0,0.1)'  : 'rgba(234,179,8,0.1)',   text: isCyber ? '#ffb800'        : 'rgba(133,77,14,0.9)',   border: isCyber ? 'rgba(255,184,0,0.3)'  : 'rgba(234,179,8,0.3)'   },
  };
  const c = colorMap[color ?? 'blue'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '100px',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      fontSize: '11px', fontWeight: 600,
      letterSpacing: isCyber ? '0.06em' : '0.02em',
      fontFamily: isCyber ? "'Courier New', monospace" : 'inherit',
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────
// 单主题面板
// ─────────────────────────────────────────────
function ThemePanel({ theme }: { theme: YYC3Theme }) {
  const isCyber = theme === 'cyberpunk';

  // Modal 状态
  const [basicModal, setBasicModal] = useState(false);
  const [centeredModal, setCenteredModal] = useState(false);
  const [noMaskModal, setNoMaskModal] = useState(false);
  const [customFooterModal, setCustomFooterModal] = useState(false);
  const [slideModal, setSlideModal] = useState(false);

  const panelBg = isCyber
    ? 'linear-gradient(160deg, #020d0f 0%, #041218 50%, #020a0c 100%)'
    : 'linear-gradient(160deg, rgba(230,240,255,0.6) 0%, rgba(210,225,255,0.4) 50%, rgba(220,235,250,0.55) 100%)';

  const textMuted = isCyber ? 'rgba(0,180,200,0.55)' : 'rgba(60,90,160,0.55)';
  const textBody  = isCyber ? 'rgba(0,220,240,0.8)'  : 'rgba(30,45,90,0.82)';

  // 命令式弹窗
  const showConfirm = () => {
    (Modal as any).confirm({
      theme,
      title: '确认删除',
      content: '删除后数据将无法恢复，确定要继续吗？此操作不可撤销。',
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => new Promise(resolve => setTimeout(resolve, 1200)),
    });
  };
  const showSuccess = () => {
    (Modal as any).success({ theme, title: '操作成功', content: '数据已成功保存，可以在列表中查看最新记录。' });
  };
  const showError = () => {
    (Modal as any).error({ theme, title: '操作失败', content: '网络连接超时，请检查网络状态后重试。错误码：ERR_TIMEOUT_408' });
  };
  const showWarning = () => {
    (Modal as any).warning({ theme, title: '注意', content: '当前账号存在异常登录记录，建议您立即修改密码以保障账号安全。' });
  };
  const showInfo = () => {
    (Modal as any).info({ theme, title: '系统提示', content: '系统将于今晚 02:00-04:00 进行维护升级，期间部分功能不可用，请提前做好准备。' });
  };

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
          : '0 8px 32px rgba(100,120,200,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isCyber && (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.005) 2px, rgba(0,255,255,0.005) 4px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)', pointerEvents: 'none' }} />
          </>
        )}
        {!isCyber && (
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* ━━━━━━━ CARD 展示区 ━━━━━━━ */}

          {/* 1. 基础卡片 */}
          <div>
            <SectionTitle label="基础卡片 · Basic Cards" theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <Card shadow="medium">
                <Card.Body>
                  <div style={{ fontSize: '14px', color: textBody, lineHeight: 1.6 }}>
                    最基础的卡片，无标题栏，仅包含 Body 内容区域。
                  </div>
                </Card.Body>
              </Card>

              <Card title="带标题的卡片" extra={<span style={{ cursor: 'pointer', color: isCyber ? 'rgba(0,229,255,0.7)' : 'rgba(59,130,246,0.8)', fontSize: '13px' }}>更多</span>} shadow="medium">
                <Card.Body>
                  <div style={{ fontSize: '14px', color: textBody, lineHeight: 1.6 }}>
                    包含标题栏和右侧操作区的标准卡片。
                  </div>
                </Card.Body>
              </Card>

              <Card bordered={false} shadow="medium" hoverable>
                <Card.Body>
                  <div style={{ fontSize: '12px', color: textMuted, marginBottom: '4px', fontFamily: isCyber ? "'Courier New', monospace" : 'inherit' }}>
                    bordered=false / hoverable
                  </div>
                  <div style={{ fontSize: '14px', color: textBody, lineHeight: 1.6 }}>
                    无边框 + 悬停效果，鼠标移入会上浮。
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* 2. 阴影层级 */}
          <div>
            <SectionTitle label="阴影层级 · Shadow Levels" theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              {(['none', 'small', 'medium', 'large'] as const).map(s => (
                <Card key={s} shadow={s} bordered>
                  <Card.Body>
                    <div style={{ fontSize: '12px', color: textMuted, fontFamily: isCyber ? "'Courier New', monospace" : 'inherit', marginBottom: '4px' }}>
                      shadow="{s}"
                    </div>
                    <div style={{ fontSize: '13px', color: textBody }}>阴影级别演示</div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>

          {/* 3. 加载状态 */}
          <div>
            <SectionTitle label="加载状态 · Loading Skeleton" theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <Card loading shadow="medium" />
              <Card loading shadow="medium" />
            </div>
          </div>

          {/* 4. 带图片的卡片 */}
          <div>
            <SectionTitle label="图片卡片 · Image Cards" theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {[
                { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', title: 'Cyberpunk City', tag: 'blue' as const, desc: '霓虹灯光与钢铁森林交织的未来都市，迷幻而真实。' },
                { src: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&q=80', title: 'Liquid Dreams', tag: 'green' as const, desc: '流动的光影与玻璃质感，现代设计的极致美学。' },
                { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', title: 'Neural Network', tag: 'yellow' as const, desc: '人工智能与数字神经网络的可视化艺术呈现。' },
              ].map((item) => (
                <Card key={item.title} hoverable shadow="medium" bordered>
                  <Card.Image src={item.src} alt={item.title} height={180} />
                  <Card.Header
                    title={item.title}
                    extra={
                      <div style={{ display: 'flex', gap: '8px', color: textMuted }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px', display: 'flex', alignItems: 'center' }} aria-label="收藏">
                          <Icons.Heart />
                        </button>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px', display: 'flex', alignItems: 'center' }} aria-label="分享">
                          <Icons.Share />
                        </button>
                      </div>
                    }
                  />
                  <Card.Body>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Tag label={item.tag} theme={theme} color={item.tag} />
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: textBody, lineHeight: 1.6 }}>{item.desc}</p>
                  </Card.Body>
                  <Card.Footer>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: textMuted, fontSize: '12px' }}>
                      <Icons.Star />
                      <span>4.9</span>
                      <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                      <span>2.4k 次查看</span>
                    </div>
                    <Button
                      variant="outline"
                      size="small"
                      theme={theme}
                      style={{ marginLeft: 'auto' }}
                      rightIcon={<Icons.Link />}
                    >
                      查看详情
                    </Button>
                  </Card.Footer>
                </Card>
              ))}
            </div>
          </div>

          {/* 5. 复合卡片 */}
          <div>
            <SectionTitle label="复合卡片 · Composite" theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* 用户资料卡 */}
              <Card shadow="medium" hoverable>
                <Card.Body>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                      background: isCyber
                        ? 'linear-gradient(135deg, rgba(0,180,200,0.3), rgba(0,229,255,0.6))'
                        : 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,197,253,0.7))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${isCyber ? 'rgba(0,229,255,0.4)' : 'rgba(59,130,246,0.3)'}`,
                      fontSize: '20px', fontWeight: 700,
                      color: isCyber ? '#0ff' : 'rgba(37,99,235,0.9)',
                      fontFamily: isCyber ? "'Courier New', monospace" : 'inherit',
                    }}>
                      Y
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: isCyber ? 'rgba(0,240,255,0.95)' : 'rgba(15,25,60,0.92)', marginBottom: '3px' }}>
                        YYC³ User
                      </div>
                      <div style={{ fontSize: '12px', color: textMuted, fontFamily: isCyber ? "'Courier New', monospace" : 'inherit' }}>
                        @yyc3_dev · Level 42
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <Tag label="Pro" theme={theme} color="green" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', textAlign: 'center' }}>
                    {[['128', '项目'], ['4.2k', '星标'], ['96', '贡献']].map(([val, label]) => (
                      <div key={label} style={{
                        padding: '8px',
                        background: isCyber ? 'rgba(0,229,255,0.04)' : 'rgba(59,130,246,0.05)',
                        border: `1px solid ${isCyber ? 'rgba(0,229,255,0.1)' : 'rgba(59,130,246,0.12)'}`,
                        borderRadius: '6px',
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: isCyber ? '#0ff' : 'rgba(37,99,235,0.9)', fontFamily: isCyber ? "'Courier New', monospace" : 'inherit' }}>{val}</div>
                        <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button variant="outline" size="small" theme={theme} style={{ flex: 1, justifyContent: 'center' }}>关注</Button>
                  <Button variant="primary" size="small" theme={theme} style={{ flex: 1, justifyContent: 'center' }} leftIcon={<Icons.Settings />}>设置</Button>
                </Card.Footer>
              </Card>

              {/* 代码任务卡 */}
              <Card title="Sprint #24 — 任务" extra={<Tag label="进行中" theme={theme} color="blue" />} shadow="medium">
                <Card.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { done: true,  label: '设计 Button 组件 API', tag: 'blue'   as const },
                      { done: true,  label: '实现 Input 双主题适配',  tag: 'green'  as const },
                      { done: false, label: '完成 Card & Modal 组件', tag: 'yellow' as const },
                      { done: false, label: '编写单元测试覆盖率 >90%', tag: 'red'   as const },
                    ].map((item) => (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '6px',
                        background: isCyber ? 'rgba(0,229,255,0.03)' : 'rgba(59,130,246,0.04)',
                        border: `1px solid ${isCyber ? 'rgba(0,229,255,0.08)' : 'rgba(59,130,246,0.1)'}`,
                      }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${item.done ? (isCyber ? '#00e676' : '#22c55e') : (isCyber ? 'rgba(0,229,255,0.3)' : 'rgba(100,120,200,0.35)')}`,
                          background: item.done ? (isCyber ? 'rgba(0,230,118,0.25)' : 'rgba(34,197,94,0.2)') : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.done && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <polyline points="2 6 5 9 10 3" stroke={isCyber ? '#00e676' : '#22c55e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span style={{
                          flex: 1, fontSize: '13px', lineHeight: 1.4,
                          color: item.done ? textMuted : textBody,
                          textDecoration: item.done ? 'line-through' : 'none',
                        }}>
                          {item.label}
                        </span>
                        <Tag label={item.tag} theme={theme} color={item.tag} />
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* ━━━━━━━ MODAL 展示区 ━━━━━━━ */}
          <div>
            <SectionTitle label="基础弹窗 · Basic Modals" theme={theme} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Button variant="primary" size="medium" theme={theme} onClick={() => setBasicModal(true)}>
                基础 Modal
              </Button>
              <Button variant="secondary" size="medium" theme={theme} onClick={() => setCenteredModal(true)}>
                垂直居中
              </Button>
              <Button variant="outline" size="medium" theme={theme} onClick={() => setSlideModal(true)}>
                Slide 动画
              </Button>
              <Button variant="ghost" size="medium" theme={theme} onClick={() => setNoMaskModal(true)}>
                无遮罩
              </Button>
              <Button variant="danger" size="medium" theme={theme} onClick={() => setCustomFooterModal(true)}>
                自定义底部
              </Button>
            </div>
          </div>

          {/* 命令式弹窗 */}
          <div>
            <SectionTitle label="命令式弹窗 · Imperative API" theme={theme} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Button variant="danger"    size="medium" theme={theme} leftIcon={<Icons.Trash />}    onClick={showConfirm}>Modal.confirm</Button>
              <Button variant="primary"   size="medium" theme={theme} leftIcon={<Icons.Info />}     onClick={showInfo}>   Modal.info</Button>
              <Button variant="secondary" size="medium" theme={theme} leftIcon={<Icons.Code />}     onClick={showSuccess}>Modal.success</Button>
              <Button variant="outline"   size="medium" theme={theme} leftIcon={<Icons.Settings />} onClick={showWarning}>Modal.warning</Button>
              <Button variant="ghost"     size="medium" theme={theme} leftIcon={<Icons.Link />}     onClick={showError}>  Modal.error</Button>
            </div>
          </div>

        </div>

        {/* ━━━━━━━ MODAL 实例 ━━━━━━━ */}

        {/* 基础 Modal */}
        <Modal
          visible={basicModal}
          title="YYC³ 基础 Modal"
          theme={theme}
          animation="zoom"
          onOk={async () => {
            await new Promise(r => setTimeout(r, 1000));
            setBasicModal(false);
          }}
          onCancel={() => setBasicModal(false)}
        >
          <p style={{ margin: '0 0 12px', lineHeight: 1.65 }}>
            这是一个基础的 Modal 弹窗示例，支持 <strong>zoom</strong> 入场动画，包含标准的标题栏、内容区域和底部操作按钮。
          </p>
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            点击确认按钮会触发 1 秒异步操作演示（okLoading 状态），期间按钮显示加载指示器。
          </p>
        </Modal>

        {/* 垂直居中 Modal */}
        <Modal
          visible={centeredModal}
          title="垂直居中 Modal"
          theme={theme}
          centered
          animation="fade"
          onOk={() => setCenteredModal(false)}
          onCancel={() => setCenteredModal(false)}
        >
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            设置 <code style={{ background: isCyber ? 'rgba(0,229,255,0.08)' : 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '3px', fontSize: '13px' }}>centered=true</code> 后弹窗会在视口中垂直居中显示，使用 fade 动画。
          </p>
        </Modal>

        {/* Slide 动画 Modal */}
        <Modal
          visible={slideModal}
          title="Slide 滑动动画"
          theme={theme}
          animation="slide"
          top={120}
          onOk={() => setSlideModal(false)}
          onCancel={() => setSlideModal(false)}
        >
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            使用 <strong>slide</strong> 动画从顶部滑入，距顶部 120px。支持三种内置动画：<strong>fade</strong>、<strong>zoom</strong>、<strong>slide</strong>。
          </p>
        </Modal>

        {/* 无遮罩 Modal */}
        <Modal
          visible={noMaskModal}
          title="无遮罩 Modal"
          theme={theme}
          mask={false}
          maskClosable={false}
          animation="zoom"
          centered
          onOk={() => setNoMaskModal(false)}
          onCancel={() => setNoMaskModal(false)}
        >
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            设置 <code style={{ background: isCyber ? 'rgba(0,229,255,0.08)' : 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '3px', fontSize: '13px' }}>mask=false</code> 后背景遮罩不显示，适合非阻塞式提示场景。
          </p>
        </Modal>

        {/* 自定义底部 */}
        <Modal
          visible={customFooterModal}
          title="自定义 Footer"
          theme={theme}
          animation="zoom"
          centered
          onCancel={() => setCustomFooterModal(false)}
          footer={
            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '14px 24px',
              borderTop: `1px solid ${isCyber ? 'rgba(0,229,255,0.1)' : 'rgba(180,200,235,0.3)'}`,
            }}>
              <Button variant="ghost"   size="small" theme={theme} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCustomFooterModal(false)}>跳过</Button>
              <Button variant="outline" size="small" theme={theme} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCustomFooterModal(false)}>稍后再说</Button>
              <Button variant="primary" size="small" theme={theme} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCustomFooterModal(false)}>立即升级</Button>
            </div>
          }
        >
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            通过 <code style={{ background: isCyber ? 'rgba(0,229,255,0.08)' : 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '3px', fontSize: '13px' }}>footer</code> prop 可完全自定义底部按钮区域，传入 <code style={{ background: isCyber ? 'rgba(0,229,255,0.08)' : 'rgba(59,130,246,0.08)', padding: '2px 6px', borderRadius: '3px', fontSize: '13px' }}>footer=null</code> 则隐藏底部。
          </p>
        </Modal>
      </div>
    </YYC3ThemeProvider>
  );
}

// ─────────────────────────────────────────────
// Props API 表格
// ─────────────────────────────────────────────
const CARD_API = [
  ['title',     'ReactNode',                           'undefined',  '顶部标题，与 Card.Header 互斥使用'],
  ['extra',     'ReactNode',                           'undefined',  '标题右侧操作区'],
  ['bordered',  'boolean',                             'true',       '是否显示边框'],
  ['hoverable', 'boolean',                             'false',      '悬停时上浮 + 阴影增强'],
  ['loading',   'boolean',                             'false',      '加载态，展示骨架屏动画'],
  ['shadow',    "'none'|'small'|'medium'|'large'",    "'medium'",   '阴影级别'],
  ['theme',     "'cyberpunk'|'liquid-glass'",          '继承上下文', '覆盖主题，不传则继承 ThemeProvider'],
];

const MODAL_API = [
  ['visible',        'boolean',                          '—',         '是否显示（受控）'],
  ['title',          'ReactNode',                        'undefined', '弹窗标题'],
  ['width',          'number | string',                  '520',       '弹窗宽度'],
  ['centered',       'boolean',                          'false',     '是否垂直居中'],
  ['top',            'number | string',                  '80',        '非居中时距顶部距离'],
  ['closable',       'boolean',                          'true',      '是否显示关闭按钮'],
  ['mask',           'boolean',                          'true',      '是否显示背景遮罩'],
  ['maskClosable',   'boolean',                          'true',      '点击遮罩是否关闭'],
  ['destroyOnClose', 'boolean',                          'false',     '关闭时是否销毁子元素'],
  ['animation',      "'fade'|'zoom'|'slide'",           "'zoom'",    '入场/出场动画'],
  ['onOk',           '() => void | Promise<void>',       'undefined', '确认回调，支持异步（显示 loading）'],
  ['onCancel',       '() => void',                       'undefined', '取消/关闭回调'],
  ['afterOpen',      '() => void',                       'undefined', '弹窗完全打开后回调'],
  ['afterClose',     '() => void',                       'undefined', '弹窗完全关闭后回调'],
  ['footer',         'ReactNode | null',                 '默认操作栏', 'null 隐藏底部，ReactNode 完全替换'],
  ['theme',          "'cyberpunk'|'liquid-glass'",       '继承上下文', '覆盖主题'],
];

function ApiTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>{title}</h3>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['属性', '类型', '默认值', '说明'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,229,255,0.7)', fontFamily: "'Courier New', monospace" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([prop, type, def, desc], i) => (
              <tr key={prop} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '10px 18px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: '#0ff', fontWeight: 600, whiteSpace: 'nowrap' }}>{prop}</td>
                <td style={{ padding: '10px 18px', fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'rgba(180,200,255,0.65)', wordBreak: 'break-word' }}>{type}</td>
                <td style={{ padding: '10px 18px', fontFamily: "'Courier New', monospace", fontSize: '13px', color: 'rgba(180,200,220,0.5)', whiteSpace: 'nowrap' }}>{def}</td>
                <td style={{ padding: '10px 18px', fontSize: '13px', color: 'rgba(180,200,220,0.8)', lineHeight: 1.5 }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主 Showcase 组件
// ─────────────────────────────────────────────
export function CardModalShowcase() {
  const [activeTheme, setActiveTheme] = useState<'both' | YYC3Theme>('both');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1520 40%, #080d18 100%)',
      padding: '40px 24px',
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* 头部 */}
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '100px', padding: '6px 16px', marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 6px #0ff' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(0,229,255,0.85)', textTransform: 'uppercase' }}>
              YYC³ Claw UI — Card &amp; Modal System
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800,
            margin: '0 0 16px', color: '#fff',
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            <span style={{ background: 'linear-gradient(90deg, #00e5ff, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Card</span>
            {' '}&amp;{' '}
            <span style={{ background: 'linear-gradient(90deg, #7c3aed, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Modal</span>
            {' '}组件
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(180,200,220,0.75)', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.6 }}>
            支持赛博朋克 · 液态玻璃双主题，骨架屏加载、图片卡片、ESC 关闭、焦点陷阱、命令式弹窗 API
          </p>
          {/* 主题切换 */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
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

        {/* 主题面板 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeTheme === 'both' ? 'repeat(auto-fit, minmax(600px, 1fr))' : '1fr',
          gap: '28px',
        }}>
          {(activeTheme === 'both' || activeTheme === 'cyberpunk') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ff', boxShadow: '0 0 8px #0ff' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0ff', fontFamily: "'Courier New', monospace" }}>
                  Theme: Cyberpunk
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(0,229,255,0.45)', fontFamily: "'Courier New', monospace" }}>v2.4.0-neon</span>
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
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(147,197,253,0.4)' }}>v2.4.0-glass</span>
              </div>
              <ThemePanel theme="liquid-glass" />
            </div>
          )}
        </div>

        {/* Props API */}
        <div style={{ marginTop: '72px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Props API</h2>
            <p style={{ color: 'rgba(180,200,220,0.6)', fontSize: '14px' }}>完整 TypeScript 类型，forwardRef，零运行时依赖</p>
          </div>
          <ApiTable title="Card Props" rows={CARD_API} />
          <ApiTable title="Modal Props" rows={MODAL_API} />
        </div>

        {/* 底部 */}
        <div style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(180,200,220,0.3)', letterSpacing: '0.06em' }}>
            YYC³ Claw UI · Card &amp; Modal Components · Zero Dependencies · React 18+
          </span>
        </div>
      </div>
    </div>
  );
}
