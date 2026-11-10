// @ts-nocheck
/**
 * @file: DeviceSimulator.test.ts
 * @description: 设备模拟引擎完整测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,device,simulator,validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DeviceSimulator, 
  type DeviceState,
  type DeviceOrientation
} from '../DeviceSimulator';
import { 
  DevicePresets,
  getAllDevices,
  getDeviceById,
  getDevicesByCategory,
  getDevicesByVendor,
  searchDevices
} from '../DevicePresets';
import { DeviceValidator } from '../DeviceValidator';

// ================================================================
// 测试套件：设备模拟引擎
// ================================================================

describe('任务2.1: 设备模拟引擎', () => {
  
  // ================================================================
  // 2.1.1 设备预设库测试
  // ================================================================
  
  describe('2.1.1 设备预设库', () => {
    
    it('应该包含至少20种设备预设', () => {
      const devices = getAllDevices();
      expect(devices.length).toBeGreaterThanOrEqual(20);
    });

    it('应该包含完整的设备参数', () => {
      const devices = getAllDevices();
      
      devices.forEach(device => {
        expect(device.id).toBeDefined();
        expect(device.name).toBeDefined();
        expect(device.vendor).toBeDefined();
        expect(device.category).toBeDefined();
        expect(device.width).toBeDefined();
        expect(device.height).toBeDefined();
        expect(device.dpr).toBeDefined();
        expect(device.userAgent).toBeDefined();
      });
    });

    it('应该包含各类设备分类', () => {
      const phones = getDevicesByCategory('phone');
      const tablets = getDevicesByCategory('tablet');
      const desktops = getDevicesByCategory('desktop');
      const wearables = getDevicesByCategory('wearable');
      
      expect(phones.length).toBeGreaterThan(0);
      expect(tablets.length).toBeGreaterThan(0);
      expect(desktops.length).toBeGreaterThan(0);
      expect(wearables.length).toBeGreaterThan(0);
    });

    it('应该支持根据ID获取设备', () => {
      const device = getDeviceById('iphone-14-pro-max');
      
      expect(device).toBeDefined();
      expect(device?.name).toBe('iPhone 14 Pro Max');
      expect(device?.width).toBe(430);
      expect(device?.height).toBe(932);
      expect(device?.dpr).toBe(3);
    });

    it('应该支持根据制造商获取设备', () => {
      const appleDevices = getDevicesByVendor('Apple');
      
      expect(appleDevices.length).toBeGreaterThan(0);
      appleDevices.forEach(device => {
        expect(device.vendor).toBe('Apple');
      });
    });

    it('应该支持设备搜索', () => {
      const results = searchDevices('iPhone');
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(device => {
        expect(
          device.name.toLowerCase().includes('iphone') ||
          device.id.toLowerCase().includes('iphone')
        ).toBe(true);
      });
    });

    it('应该包含正确的iPhone 14 Pro Max参数', () => {
      const device = getDeviceById('iphone-14-pro-max');
      
      expect(device).toBeDefined();
      expect(device?.width).toBe(430);
      expect(device?.height).toBe(932);
      expect(device?.dpr).toBe(3);
      expect(device?.category).toBe('phone');
      expect(device?.hasTouch).toBe(true);
    });

    it('应该包含正确的Google Pixel 7参数', () => {
      const device = getDeviceById('google-pixel-7');
      
      expect(device).toBeDefined();
      expect(device?.width).toBe(412);
      expect(device?.height).toBe(915);
      expect(device?.dpr).toBe(2.75);
      expect(device?.category).toBe('phone');
    });

    it('应该包含正确的iPad Pro参数', () => {
      const device = getDeviceById('ipad-pro-12-9-inch');
      
      expect(device).toBeDefined();
      expect(device?.width).toBe(1024);
      expect(device?.height).toBe(1366);
      expect(device?.dpr).toBe(2);
      expect(device?.category).toBe('tablet');
    });
  });

  // ================================================================
  // 2.1.2 设备模拟核心测试
  // ================================================================
  
  describe('2.1.2 设备模拟核心', () => {
    let simulator: DeviceSimulator;

    beforeEach(() => {
      // 重置单例
      DeviceSimulator.resetInstance();
      localStorage.clear();
      
      // 创建新实例
      simulator = DeviceSimulator.getInstance();
    });

    afterEach(() => {
      DeviceSimulator.resetInstance();
    });

    it('应该成功初始化设备模拟器', () => {
      expect(simulator).toBeDefined();
      
      const state = simulator.getState();
      expect(state.device).toBeDefined();
      expect(state.width).toBeGreaterThan(0);
      expect(state.height).toBeGreaterThan(0);
      expect(state.dpr).toBeGreaterThan(0);
    });

    it('应该成功应用iPhone 14 Pro Max预设', () => {
      const result = simulator.applyDevice('iphone-14-pro-max');
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('iphone-14-pro-max');
      expect(state.width).toBe(430);
      expect(state.height).toBe(932);
      expect(state.dpr).toBe(3);
    });

    it('应该成功应用Google Pixel 7预设', () => {
      const result = simulator.applyDevice('google-pixel-7');
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('google-pixel-7');
      expect(state.width).toBe(412);
      expect(state.height).toBe(915);
      expect(state.dpr).toBe(2.75);
    });

    it('应该成功应用iPad Pro预设', () => {
      const result = simulator.applyDevice('ipad-pro-12-9-inch');
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('ipad-pro-12-9-inch');
      expect(state.width).toBe(1024);
      expect(state.height).toBe(1366);
      expect(state.dpr).toBe(2);
    });

    it('应该成功调整预览窗口尺寸', () => {
      const result = simulator.resize(800, 600);
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.width).toBe(800);
      expect(state.height).toBe(600);
    });

    it('应该成功设置DPR', () => {
      const result = simulator.setDPR(2.5);
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.dpr).toBe(2.5);
    });

    it('应该成功设置User-Agent', () => {
      const customUA = 'Mozilla/5.0 Custom User Agent';
      const result = simulator.setUserAgent(customUA);
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.userAgent).toBe(customUA);
    });

    it('应该成功旋转设备', () => {
      simulator.applyDevice('iphone-14-pro-max');
      const beforeState = simulator.getState();
      
      simulator.rotate();
      
      const afterState = simulator.getState();
      expect(afterState.width).toBe(beforeState.height);
      expect(afterState.height).toBe(beforeState.width);
      expect(afterState.orientation).not.toBe(beforeState.orientation);
    });

    it('应该在锁定旋转时禁止旋转', () => {
      simulator.applyDevice('iphone-14-pro-max');
      simulator.setRotationLocked(true);
      
      const beforeState = simulator.getState();
      simulator.rotate();
      const afterState = simulator.getState();
      
      expect(afterState.width).toBe(beforeState.width);
      expect(afterState.height).toBe(beforeState.height);
    });

    it('应该成功设置设备方向', () => {
      simulator.applyDevice('iphone-14-pro-max');
      
      simulator.setOrientation('landscape');
      
      const state = simulator.getState();
      expect(state.orientation).toBe('landscape');
      expect(state.width).toBeGreaterThan(state.height);
    });

    it('应该支持自定义设备预设', () => {
      const result = simulator.setCustomDevice({
        id: 'my-custom-device',
        name: 'My Custom Phone',
        vendor: 'Custom',
        category: 'phone',
        width: 400,
        height: 800,
        dpr: 2,
        userAgent: 'Mozilla/5.0 Custom'
      });
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('my-custom-device');
      expect(state.width).toBe(400);
      expect(state.height).toBe(800);
    });
  });

  // ================================================================
  // 2.1.3 设备参数验证测试
  // ================================================================
  
  describe('2.1.3 设备参数验证', () => {
    
    it('应该验证有效的宽度范围', () => {
      const result = DeviceValidator.validateWidth(1920);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝小于最小值的宽度', () => {
      const result = DeviceValidator.validateWidth(200);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝大于最大值的宽度', () => {
      const result = DeviceValidator.validateWidth(5000);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该警告非整数宽度', () => {
      const result = DeviceValidator.validateWidth(1920.5);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该验证有效的高度范围', () => {
      const result = DeviceValidator.validateHeight(1080);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝小于最小值的高度', () => {
      const result = DeviceValidator.validateHeight(300);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝大于最大值的高度', () => {
      const result = DeviceValidator.validateHeight(5000);
      expect(result.valid).toBe(false);
    });

    it('应该验证有效的DPR范围', () => {
      const result = DeviceValidator.validateDPR(2);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝小于最小值的DPR', () => {
      const result = DeviceValidator.validateDPR(0.5);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝大于最大值的DPR', () => {
      const result = DeviceValidator.validateDPR(5);
      expect(result.valid).toBe(false);
    });

    it('应该警告非常见DPR值', () => {
      const result = DeviceValidator.validateDPR(2.3);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该验证有效的User-Agent格式', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
      const result = DeviceValidator.validateUserAgent(ua);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空的User-Agent', () => {
      const result = DeviceValidator.validateUserAgent('');
      expect(result.valid).toBe(false);
    });

    it('应该警告过短的User-Agent', () => {
      const result = DeviceValidator.validateUserAgent('Short UA');
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该验证完整的设备预设', () => {
      const device = getDeviceById('iphone-14-pro-max')!;
      const result = DeviceValidator.validateDevice(device);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝缺少必需字段的设备', () => {
      const result = DeviceValidator.validateDevice({
        name: 'Invalid Device'
      });
      expect(result.valid).toBe(false);
    });

    it('应该警告罕见的宽高比', () => {
      const result = DeviceValidator.validateDevice({
        id: 'test',
        name: 'Test',
        vendor: 'Test',
        category: 'phone',
        width: 350,
        height: 2000,
        dpr: 2,
        userAgent: 'Mozilla/5.0'
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('宽高比'))).toBe(true);
    });
  });

  // ================================================================
  // 2.1.4 设备切换和集成测试
  // ================================================================
  
  describe('2.1.4 设备切换和集成', () => {
    let simulator: DeviceSimulator;

    beforeEach(() => {
      DeviceSimulator.resetInstance();
      localStorage.clear();
      simulator = DeviceSimulator.getInstance();
    });

    afterEach(() => {
      DeviceSimulator.resetInstance();
    });

    it('应该成功切换多个设备', () => {
      const devices = ['iphone-14-pro-max', 'google-pixel-7', 'ipad-pro-12-9-inch'];
      
      devices.forEach(deviceId => {
        const result = simulator.applyDevice(deviceId);
        expect(result.valid).toBe(true);
        
        const state = simulator.getState();
        expect(state.device?.id).toBe(deviceId);
      });
    });

    it('应该在设备切换时触发监听器', () => {
      const listener = vi.fn();
      simulator.addListener(listener);
      
      simulator.applyDevice('iphone-14-pro-max');
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].device?.id).toBe('iphone-14-pro-max');
    });

    it('应该支持添加和移除多个监听器', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      simulator.addListener(listener1);
      simulator.addListener(listener2);
      
      simulator.applyDevice('iphone-14-pro-max');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      simulator.removeListener(listener1);
      simulator.applyDevice('google-pixel-7');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('应该持久化设备状态', () => {
      simulator.applyDevice('iphone-14-pro-max');
      
      // 创建新实例，应该恢复状态
      DeviceSimulator.resetInstance();
      const newSimulator = DeviceSimulator.getInstance();
      
      const state = newSimulator.getState();
      expect(state.device?.id).toBe('iphone-14-pro-max');
    });

    it('应该成功重置到默认状态', () => {
      simulator.applyDevice('iphone-14-pro-max');
      simulator.reset();
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('desktop-hd');
    });

    it('应该成功重置到指定设备', () => {
      simulator.applyDevice('iphone-14-pro-max');
      const result = simulator.resetToDevice('google-pixel-7');
      
      expect(result.valid).toBe(true);
      
      const state = simulator.getState();
      expect(state.device?.id).toBe('google-pixel-7');
    });

    it('应该获取所有设备列表（包含自定义设备）', () => {
      const beforeCount = simulator.getAllDevices().length;
      
      simulator.setCustomDevice({
        id: 'custom-test',
        name: 'Custom Test',
        vendor: 'Test',
        category: 'phone',
        width: 400,
        height: 800,
        dpr: 2,
        userAgent: 'Mozilla/5.0'
      });
      
      const afterCount = simulator.getAllDevices().length;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it('应该完整执行设备切换流程', () => {
      // 1. 添加监听器
      const listener = vi.fn();
      simulator.addListener(listener);
      
      // 2. 应用iPhone设备
      const result1 = simulator.applyDevice('iphone-14-pro-max');
      expect(result1.valid).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      
      // 3. 旋转设备
      const beforeState = simulator.getState();
      simulator.rotate();
      const afterState = simulator.getState();
      
      expect(afterState.width).toBe(beforeState.height);
      expect(afterState.height).toBe(beforeState.width);
      expect(listener).toHaveBeenCalledTimes(2);
      
      // 4. 设置DPR
      const result2 = simulator.setDPR(2);
      expect(result2.valid).toBe(true);
      expect(listener).toHaveBeenCalledTimes(3);
      
      // 5. 重置
      simulator.reset();
      expect(listener).toHaveBeenCalledTimes(4);
      
      // 6. 验证状态
      const finalState = simulator.getState();
      expect(finalState.device?.id).toBe('desktop-hd');
    });
  });

  // ================================================================
  // 边界情况和错误处理
  // ================================================================
  
  describe('边界情况和错误处理', () => {
    let simulator: DeviceSimulator;

    beforeEach(() => {
      DeviceSimulator.resetInstance();
      localStorage.clear();
      simulator = DeviceSimulator.getInstance();
    });

    afterEach(() => {
      DeviceSimulator.resetInstance();
    });

    it('应该处理无效的设备ID', () => {
      const result = simulator.applyDevice('invalid-device-id');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该处理监听器中的错误', () => {
      const errorListener = () => {
        throw new Error('Listener error');
      };
      
      simulator.addListener(errorListener);
      
      // 应该不会抛出错误
      expect(() => {
        simulator.applyDevice('iphone-14-pro-max');
      }).not.toThrow();
    });

    it('应该正确处理localStorage错误', () => {
      // 保存原始localStorage
      const originalLocalStorage = window.localStorage;
      
      // 模拟localStorage错误
      const mockStorage = {
        setItem: vi.fn(() => {
          throw new Error('Storage quota exceeded');
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true
      });
      
      // 应该不会抛出错误
      expect(() => {
        simulator.applyDevice('iphone-14-pro-max');
      }).not.toThrow();
      
      // 恢复原始localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true
      });
    });

    it('应该验证设备参数范围的边界值', () => {
      // 测试宽度边界
      expect(DeviceValidator.validateWidth(320).valid).toBe(true);
      expect(DeviceValidator.validateWidth(4096).valid).toBe(true);
      expect(DeviceValidator.validateWidth(319).valid).toBe(false);
      expect(DeviceValidator.validateWidth(4097).valid).toBe(false);
      
      // 测试高度边界
      expect(DeviceValidator.validateHeight(480).valid).toBe(true);
      expect(DeviceValidator.validateHeight(4096).valid).toBe(true);
      expect(DeviceValidator.validateHeight(479).valid).toBe(false);
      expect(DeviceValidator.validateHeight(4097).valid).toBe(false);
      
      // 测试DPR边界
      expect(DeviceValidator.validateDPR(1).valid).toBe(true);
      expect(DeviceValidator.validateDPR(4).valid).toBe(true);
      expect(DeviceValidator.validateDPR(0.9).valid).toBe(false);
      expect(DeviceValidator.validateDPR(4.1).valid).toBe(false);
    });
  });
});
