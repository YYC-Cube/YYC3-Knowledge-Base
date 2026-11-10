/**
 * @file: DevicePresets.ts
 * @description: 设备预设库，包含20+种常见移动设备、平板、桌面设备的完整规格数据
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: device,preset,mobile,tablet,desktop,responsive
 */

// ================================================================
// DevicePresets — 设备预设库
// 包含常见设备的完整规格参数
// ================================================================

/**
 * 设备分类
 */
export type DeviceCategory = 'phone' | 'tablet' | 'desktop' | 'wearable';

/**
 * 设备预设接口
 */
export interface DevicePreset {
  /** 设备唯一ID */
  id: string;
  /** 设备名称 */
  name: string;
  /** 制造商 */
  vendor: string;
  /** 设备分类 */
  category: DeviceCategory;
  /** 屏幕宽度 (px) */
  width: number;
  /** 屏幕高度 (px) */
  height: number;
  /** 设备像素比 (DPR) */
  dpr: number;
  /** User-Agent 字符串 */
  userAgent: string;
  /** 设备缩放因子 */
  scale?: number;
  /** 是否支持触摸 */
  hasTouch?: boolean;
  /** 是否移动设备 */
  isMobile?: boolean;
  /** 设备图标 */
  icon?: string;
  /** 发布年份 */
  year?: number;
  /** 额外参数 */
  extra?: Record<string, any>;
}

/**
 * 设备预设库
 * 包含25种常见设备预设
 */
export const DEVICE_PRESETS: DevicePreset[] = [
  // ==================== iPhone 设备 ====================
  {
    id: 'iphone-14-pro-max',
    name: 'iPhone 14 Pro Max',
    vendor: 'Apple',
    category: 'phone',
    width: 430,
    height: 932,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },
  {
    id: 'iphone-14-pro',
    name: 'iPhone 14 Pro',
    vendor: 'Apple',
    category: 'phone',
    width: 393,
    height: 852,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },
  {
    id: 'iphone-14',
    name: 'iPhone 14',
    vendor: 'Apple',
    category: 'phone',
    width: 390,
    height: 844,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },
  {
    id: 'iphone-13-mini',
    name: 'iPhone 13 Mini',
    vendor: 'Apple',
    category: 'phone',
    width: 375,
    height: 812,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2021
  },
  {
    id: 'iphone-se-2022',
    name: 'iPhone SE (3rd gen)',
    vendor: 'Apple',
    category: 'phone',
    width: 375,
    height: 667,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },

  // ==================== Android 设备 ====================
  {
    id: 'samsung-galaxy-s23-ultra',
    name: 'Samsung Galaxy S23 Ultra',
    vendor: 'Samsung',
    category: 'phone',
    width: 412,
    height: 915,
    dpr: 3.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2023
  },
  {
    id: 'samsung-galaxy-s23',
    name: 'Samsung Galaxy S23',
    vendor: 'Samsung',
    category: 'phone',
    width: 360,
    height: 780,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2023
  },
  {
    id: 'google-pixel-7-pro',
    name: 'Google Pixel 7 Pro',
    vendor: 'Google',
    category: 'phone',
    width: 412,
    height: 892,
    dpr: 3.5,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },
  {
    id: 'google-pixel-7',
    name: 'Google Pixel 7',
    vendor: 'Google',
    category: 'phone',
    width: 412,
    height: 915,
    dpr: 2.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022
  },
  {
    id: 'oneplus-11',
    name: 'OnePlus 11',
    vendor: 'OnePlus',
    category: 'phone',
    width: 412,
    height: 919,
    dpr: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; OnePlus CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2023
  },

  // ==================== 平板设备 ====================
  {
    id: 'ipad-pro-12-9-inch',
    name: 'iPad Pro 12.9" (6th gen)',
    vendor: 'Apple',
    category: 'tablet',
    width: 1024,
    height: 1366,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: false,
    icon: '📱',
    year: 2022
  },
  {
    id: 'ipad-pro-11-inch',
    name: 'iPad Pro 11" (4th gen)',
    vendor: 'Apple',
    category: 'tablet',
    width: 834,
    height: 1194,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: false,
    icon: '📱',
    year: 2022
  },
  {
    id: 'ipad-air-5th-gen',
    name: 'iPad Air (5th gen)',
    vendor: 'Apple',
    category: 'tablet',
    width: 820,
    height: 1180,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: false,
    icon: '📱',
    year: 2022
  },
  {
    id: 'samsung-galaxy-tab-s8-ultra',
    name: 'Samsung Galaxy Tab S8 Ultra',
    vendor: 'Samsung',
    category: 'tablet',
    width: 1848,
    height: 2960,
    dpr: 2.25,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X906B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    hasTouch: true,
    isMobile: false,
    icon: '📱',
    year: 2022
  },
  {
    id: 'microsoft-surface-pro-9',
    name: 'Microsoft Surface Pro 9',
    vendor: 'Microsoft',
    category: 'tablet',
    width: 1440,
    height: 1920,
    dpr: 1.5,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edge/112.0.1722.48',
    hasTouch: true,
    isMobile: false,
    icon: '💻',
    year: 2022
  },

  // ==================== 桌面设备 ====================
  {
    id: 'desktop-hd',
    name: 'Desktop HD',
    vendor: 'Generic',
    category: 'desktop',
    width: 1920,
    height: 1080,
    dpr: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    hasTouch: false,
    isMobile: false,
    icon: '🖥️',
    year: 2023
  },
  {
    id: 'desktop-4k',
    name: 'Desktop 4K',
    vendor: 'Generic',
    category: 'desktop',
    width: 3840,
    height: 2160,
    dpr: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    hasTouch: false,
    isMobile: false,
    icon: '🖥️',
    year: 2023
  },
  {
    id: 'macbook-pro-14',
    name: 'MacBook Pro 14"',
    vendor: 'Apple',
    category: 'desktop',
    width: 1512,
    height: 982,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    hasTouch: false,
    isMobile: false,
    icon: '💻',
    year: 2023
  },
  {
    id: 'macbook-pro-16',
    name: 'MacBook Pro 16"',
    vendor: 'Apple',
    category: 'desktop',
    width: 1728,
    height: 1117,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    hasTouch: false,
    isMobile: false,
    icon: '💻',
    year: 2023
  },

  // ==================== 可穿戴设备 ====================
  {
    id: 'apple-watch-series-8-45mm',
    name: 'Apple Watch Series 8 (45mm)',
    vendor: 'Apple',
    category: 'wearable',
    width: 198,
    height: 242,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0',
    hasTouch: true,
    isMobile: true,
    icon: '⌚',
    year: 2022
  },
  {
    id: 'samsung-galaxy-watch-5-pro',
    name: 'Samsung Galaxy Watch 5 Pro',
    vendor: 'Samsung',
    category: 'wearable',
    width: 396,
    height: 396,
    dpr: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-R920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '⌚',
    year: 2022
  },

  // ==================== 折叠屏设备 ====================
  {
    id: 'samsung-galaxy-z-fold-4',
    name: 'Samsung Galaxy Z Fold 4',
    vendor: 'Samsung',
    category: 'phone',
    width: 884,
    height: 2208,
    dpr: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-F936B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022,
    extra: {
      folded: {
        width: 360,
        height: 780,
        dpr: 2.625
      }
    }
  },
  {
    id: 'samsung-galaxy-z-flip-4',
    name: 'Samsung Galaxy Z Flip 4',
    vendor: 'Samsung',
    category: 'phone',
    width: 360,
    height: 780,
    dpr: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-F721B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    hasTouch: true,
    isMobile: true,
    icon: '📱',
    year: 2022,
    extra: {
      unfolded: {
        width: 704,
        height: 780,
        dpr: 2.625
      }
    }
  }
];

/**
 * 获取所有设备预设
 */
export function getAllDevices(): DevicePreset[] {
  return [...DEVICE_PRESETS];
}

/**
 * 根据ID获取设备预设
 */
export function getDeviceById(id: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find(device => device.id === id);
}

/**
 * 根据分类获取设备预设
 */
export function getDevicesByCategory(category: DeviceCategory): DevicePreset[] {
  return DEVICE_PRESETS.filter(device => device.category === category);
}

/**
 * 根据制造商获取设备预设
 */
export function getDevicesByVendor(vendor: string): DevicePreset[] {
  return DEVICE_PRESETS.filter(device => device.vendor === vendor);
}

/**
 * 搜索设备预设
 */
export function searchDevices(query: string): DevicePreset[] {
  const lowerQuery = query.toLowerCase();
  return DEVICE_PRESETS.filter(device =>
    device.name.toLowerCase().includes(lowerQuery) ||
    device.vendor.toLowerCase().includes(lowerQuery) ||
    device.id.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 获取设备分类列表
 */
export function getCategories(): DeviceCategory[] {
  return ['phone', 'tablet', 'desktop', 'wearable'];
}

/**
 * 获取制造商列表
 */
export function getVendors(): string[] {
  return [...new Set(DEVICE_PRESETS.map(device => device.vendor))];
}
