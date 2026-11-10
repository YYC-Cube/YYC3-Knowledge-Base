import React from "react";
import { render, screen } from "@testing-library/react";

// 模拟KPI卡片组件
function KpiCard({
  title,
  value,
  currency = "￥",
  change,
  timeframe,
  trend = "up",
}: {
  title: string;
  value: number;
  currency?: string;
  change: number;
  timeframe: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {currency}
          {value.toLocaleString()}
        </span>
        <div
          className={`flex items-center text-sm ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          <span>
            {trend === "up" ? "↑" : "↓"} {change}%
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{timeframe}</p>
    </div>
  );
}

describe("KpiCard Component", () => {
  it("renders correctly with all props", () => {
    render(
      <KpiCard
        title="总收入"
        value={1234567.89}
        currency="￥"
        change={5.4}
        timeframe="本月"
        trend="up"
      />
    );
    
    expect(screen.getByText("总收入")).toBeInTheDocument();
    expect(screen.getByText("￥1,234,567.89")).toBeInTheDocument();
    expect(screen.getByText("↑ 5.4%")).toBeInTheDocument();
    expect(screen.getByText("本月")).toBeInTheDocument();
  });

  it("renders correctly with negative change", () => {
    render(
      <KpiCard
        title="总支出"
        value={987654.32}
        currency="$"
        change={-2.1}
        timeframe="本周"
        trend="down"
      />
    );
    
    expect(screen.getByText("总支出")).toBeInTheDocument();
    expect(screen.getByText("$987,654.32")).toBeInTheDocument();
    expect(screen.getByText("↓ -2.1%")).toBeInTheDocument();
    expect(screen.getByText("本周")).toBeInTheDocument();
  });

  it("renders correctly with minimal props", () => {
    render(<KpiCard title="用户数" value={42} change={0} timeframe="今日" />);
    
    expect(screen.getByText("用户数")).toBeInTheDocument();
    expect(screen.getByText("￥42")).toBeInTheDocument();
    expect(screen.getByText("↑ 0%")).toBeInTheDocument();
    expect(screen.getByText("今日")).toBeInTheDocument();
  });
});
