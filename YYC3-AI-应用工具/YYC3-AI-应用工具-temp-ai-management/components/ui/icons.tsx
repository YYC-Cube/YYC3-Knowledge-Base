import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Download,
  Expand,
  Filter,
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Edit,
  type LucideIcon,
} from "lucide-react";

// 导出常用图标
export const IconArrowDown: LucideIcon = ArrowDown;
export const IconArrowLeft: LucideIcon = ArrowLeft;
export const IconArrowRight: LucideIcon = ArrowRight;
export const IconArrowUp: LucideIcon = ArrowUp;
export const IconDownload: LucideIcon = Download;
export const IconEdit: LucideIcon = Edit;
export const IconExpand: LucideIcon = Expand;
export const IconFilter: LucideIcon = Filter;
export const IconLayoutGrid: LucideIcon = LayoutGrid;
export const IconPlus: LucideIcon = Plus;
export const IconRefresh: LucideIcon = RefreshCw;
export const IconSettings: LucideIcon = Settings;
export const IconTrash: LucideIcon = Trash2;

// 数据可视化特定的图标组件
export const IconChart = BarChart3;

// 自定义SVG图标组件
export const IconCustomArrowLeft = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const IconCustomArrowRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);
