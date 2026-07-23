import { describe, it, expect } from 'vitest';
import { YYC3Provider, useYYC3Context } from '../src/provider';

describe('Web UI Components', () => {
  describe('YYC3Provider', () => {
    it('should be defined', () => {
      expect(YYC3Provider).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof YYC3Provider).toBe('function');
    });
  });

  describe('useYYC3Context', () => {
    it('should be defined', () => {
      expect(useYYC3Context).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof useYYC3Context).toBe('function');
    });
  });
});
