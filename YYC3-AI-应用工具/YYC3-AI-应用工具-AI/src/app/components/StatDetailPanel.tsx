/**
 * YYC3 Stat Detail Panel — Drill-down analytics for dashboard stat cards
 * @description Full-screen overlay with area/bar charts, real-time data,
 *   time-range filtering, and historical trend analysis.
 * @version 4.8.0
 */
import { useState, useEffect, useMemo } from "react";
import { X, Activity, TrendingUp, TrendingDown, Minus, ArrowUpRight, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useI18n } from "../i18n/context";
import { useThemeStore, Z_INDEX, BLUR } from "../store/theme-store";

interface StatData {
  key: string;
  value: number;
}

interface StatDetailPanelProps {
  stat: StatData;
  onClose: () => void;
}

// Generate mock historical data
function generateHistoryData(baseValue: number, points: number) {
  const data = [];
  const now = Date.now();
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now - i * 60000 * 5);
    const variance = (Math.random() - 0.5) * 30;
    const value = Math.max(5, Math.min(99, baseValue + variance + Math.sin(i * 0.3) * 10));
    data.push({
      time: `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`,
      value: parseFloat(value.toFixed(1)),
      secondary: parseFloat((value * (0.6 + Math.random() * 0.3)).toFixed(1)),
    });
  }
  return data;
}

function generateBarData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    load: 20 + Math.random() * 70,
    peak: 40 + Math.random() * 55,
  }));
}

const descKeyMap: Record<string, string> = {
  neuralNet: "neuralNetDesc",
  memory: "memoryDesc",
  bandwidth: "bandwidthDesc",
  quantum: "quantumDesc",
};

const timeRangeKeys = ["last1h", "last6h", "last24h", "last7d"];

export function StatDetailPanel({ stat, onClose }: StatDetailPanelProps) {
  const { t } = useI18n();
  const { tokens: tk, isCyberpunk } = useThemeStore();
  const [selectedRange, setSelectedRange] = useState(0);
  const [liveValue, setLiveValue] = useState(stat.value);
  const [liveHistory, setLiveHistory] = useState<{ time: string; value: number }[]>([]);

  const historyData = useMemo(() => generateHistoryData(stat.value, 30), [stat.key]);
  const barData = useMemo(() => generateBarData(), [stat.key]);

  const peak = useMemo(() => Math.max(...historyData.map((d) => d.value)), [historyData]);
  const avg = useMemo(() => historyData.reduce((s, d) => s + d.value, 0) / historyData.length, [historyData]);
  const min = useMemo(() => Math.min(...historyData.map((d) => d.value)), [historyData]);

  // Simulate realtime data
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveValue((prev) => {
        const next = Math.max(5, Math.min(99, prev + (Math.random() - 0.5) * 4));
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        setLiveHistory((h) => [...h.slice(-29), { time: timeStr, value: parseFloat(next.toFixed(1)) }]);
        return parseFloat(next.toFixed(1));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = liveValue > 80 ? tk.success : liveValue > 50 ? tk.warning : tk.error;
  const statusKey = liveValue > 80 ? "optimal" : liveValue > 50 ? "normal" : "warning";

  const descKey = descKeyMap[stat.key] || "neuralNetDesc";

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.overlay, background: tk.overlayBg, backdropFilter: BLUR.md }}>
      <div
        className={`detail-panel-enter ${isCyberpunk ? "detail-panel-grid" : ""} w-[90vw] max-w-[1100px] h-[80vh] max-h-[700px] rounded-lg overflow-hidden flex flex-col`}
        style={{
          background: tk.panelBg,
          border: `1px solid ${tk.cardBorder}`,
          boxShadow: isCyberpunk ? `0 0 30px ${tk.primary}20, 0 0 60px ${tk.primary}10` : tk.shadowHover,
          borderRadius: tk.borderRadius,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: tk.border }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Activity size={20} color={tk.primary} style={{ filter: isCyberpunk ? `drop-shadow(0 0 6px ${tk.primary})` : "none" }} />
              <div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: statusColor, boxShadow: isCyberpunk ? `0 0 6px ${statusColor}` : "none" }}
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: tk.fontDisplay, fontSize: "16px", color: tk.primary, textShadow: isCyberpunk ? `0 0 10px ${tk.primary}` : "none" }}>
                  {t("stats", stat.key)}
                </span>
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.foregroundMuted, letterSpacing: "2px" }}>
                  {t("dashboard", "detailTitle")}
                </span>
              </div>
              <p style={{ fontFamily: tk.fontBody, fontSize: "11px", color: tk.foregroundMuted, marginTop: "2px" }}>
                {t("dashboard", descKey)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {timeRangeKeys.map((rk, i) => (
                <button
                  key={rk}
                  onClick={() => setSelectedRange(i)}
                  className="px-2 py-0.5 rounded transition-all"
                  style={{
                    fontFamily: tk.fontMono,
                    fontSize: "9px",
                    color: selectedRange === i ? tk.background : tk.primary,
                    background: selectedRange === i ? tk.primary : "transparent",
                    border: `1px solid ${selectedRange === i ? tk.primary : tk.border}`,
                  }}
                >
                  {t("dashboard", rk)}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1 rounded transition-all hover:opacity-80"
              style={{ border: `1px solid ${tk.border}`, fontFamily: tk.fontMono, fontSize: "10px", color: tk.primary }}
            >
              <X size={12} />
              {t("dashboard", "close")}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 gap-4 flex flex-col neon-scrollbar">
          {/* Top row: Live value + mini stats */}
          <div className="grid grid-cols-5 gap-4">
            {/* Live value - big */}
            <div
              className="col-span-2 rounded-lg p-4 flex flex-col justify-center items-center"
              style={{ background: tk.primaryGlow, border: `1px solid ${tk.border}` }}
            >
              <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, letterSpacing: "2px" }}>
                {t("dashboard", "realtime")}
              </span>
              <div
                className="mt-2 relative"
                style={{ fontFamily: tk.fontDisplay, fontSize: "48px", color: tk.primary, textShadow: isCyberpunk ? `0 0 20px ${tk.primary}80` : "none" }}
              >
                {liveValue.toFixed(1)}
                <span style={{ fontSize: "20px", opacity: 0.6 }}>%</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: isCyberpunk ? `0 0 6px ${statusColor}` : "none" }} />
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: statusColor }}>
                  {t("dashboard", "status")}: {t("dashboard", statusKey)}
                </span>
              </div>
              {/* Mini progress ring */}
              <div className="mt-3 w-full h-2 rounded-full overflow-hidden" style={{ background: tk.primaryGlow }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${liveValue}%`,
                    background: `linear-gradient(90deg, ${tk.primary}80, ${tk.primary})`,
                    boxShadow: isCyberpunk ? `0 0 8px ${tk.primary}` : "none",
                  }}
                />
              </div>
            </div>

            {/* Mini stat cards */}
            {[
              { key: "peak", value: peak.toFixed(1), icon: TrendingUp, iconColor: tk.success },
              { key: "average", value: avg.toFixed(1), icon: Minus, iconColor: tk.primary },
              { key: "minimum", value: min.toFixed(1), icon: TrendingDown, iconColor: tk.error },
            ].map((ms) => (
              <div
                key={ms.key}
                className="rounded-lg p-3 flex flex-col"
                style={{ background: tk.primaryGlow, border: `1px solid ${tk.border}` }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <ms.icon size={10} color={ms.iconColor} />
                  <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.foregroundMuted, letterSpacing: "1px" }}>
                    {t("dashboard", ms.key)}
                  </span>
                </div>
                <div style={{ fontFamily: tk.fontDisplay, fontSize: "22px", color: tk.primary, textShadow: isCyberpunk ? `0 0 8px ${tk.primary}60` : "none" }}>
                  {ms.value}%
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Area chart - historical trend (2 cols) */}
            <div
              className="col-span-2 rounded-lg p-4 flex flex-col"
              style={{ background: tk.primaryGlow, border: `1px solid ${tk.border}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={12} color={tk.primary} />
                <span style={{ fontFamily: tk.fontMono, fontSize: "10px", color: tk.primary, letterSpacing: "1px" }}>
                  {t("dashboard", "history")}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveHistory.length > 5 ? liveHistory : historyData}>
                    <defs>
                      <linearGradient id={`grad-${stat.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tk.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={tk.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={tk.borderDim} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: tk.foregroundMuted, fontSize: 9, fontFamily: tk.fontMono }}
                      axisLine={{ stroke: tk.border }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: tk.foregroundMuted, fontSize: 9, fontFamily: tk.fontMono }}
                      axisLine={{ stroke: tk.border }}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        background: tk.panelBg,
                        border: `1px solid ${tk.border}`,
                        borderRadius: tk.borderRadius,
                        fontFamily: tk.fontMono,
                        fontSize: "11px",
                        color: tk.primary,
                        boxShadow: tk.shadow,
                      }}
                      labelStyle={{ color: tk.foregroundMuted, fontFamily: tk.fontMono, fontSize: "9px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={tk.primary}
                      strokeWidth={2}
                      fill={`url(#grad-${stat.key})`}
                      dot={false}
                      activeDot={{ r: 4, fill: tk.primary, stroke: tk.background, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right column - bar chart + extra info */}
            <div className="flex flex-col gap-4">
              {/* Bar chart */}
              <div
                className="flex-1 rounded-lg p-3 flex flex-col min-h-0"
                style={{ background: tk.primaryGlow, border: `1px solid ${tk.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={10} color={tk.primary} />
                  <span style={{ fontFamily: tk.fontMono, fontSize: "9px", color: tk.primary, letterSpacing: "1px" }}>
                    {t("dashboard", "throughput")}
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={tk.borderDim} />
                      <XAxis dataKey="hour" tick={{ fill: tk.foregroundMuted, fontSize: 8, fontFamily: tk.fontMono }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, 100]} />
                      <Bar dataKey="load" fill={tk.primary + "99"} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick stats */}
              <div
                className="rounded-lg p-3"
                style={{ background: tk.primaryGlow, border: `1px solid ${tk.border}` }}
              >
                {[
                  { k: "latency", v: "0.003ms" },
                  { k: "errorRate", v: "0.02%" },
                  { k: "uptime", v: "99.97%" },
                ].map((item) => (
                  <div key={item.k} className="flex items-center justify-between py-1.5">
                    <span style={{ fontFamily: tk.fontBody, fontSize: "11px", color: tk.foregroundMuted }}>
                      {t("dashboard", item.k)}
                    </span>
                    <div className="flex items-center gap-1">
                      <ArrowUpRight size={9} color={tk.success} />
                      <span style={{ fontFamily: tk.fontMono, fontSize: "11px", color: tk.primary }}>
                        {item.v}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}