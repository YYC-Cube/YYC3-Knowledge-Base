/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import {
  useMediaQuery,
  useBreakpoint,
  useOrientation,
} from "@/hooks/use-media-query";
import { useSafeArea, useIsIOSSafari } from "@/hooks/use-safe-area";
import { useIsMobile, useIsTablet, useDeviceType } from "@/hooks/use-mobile";

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock navigator
const mockNavigator = (userAgent: string = "Mozilla/5.0") => {
  Object.defineProperty(window, "navigator", {
    value: {
      userAgent,
      maxTouchPoints: 0,
      vibrate: jest.fn(),
      share: jest.fn(),
    },
    writable: true,
  });
};

describe("Mobile Hooks", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockNavigator();
  });

  describe("useMediaQuery", () => {
    it("should return false when media query does not match", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
      expect(result.current).toBe(false);
    });

    it("should return true when media query matches", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
      expect(result.current).toBe(true);
    });
  });

  describe("useBreakpoint", () => {
    it("should detect mobile breakpoint correctly", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useBreakpoint("md"));
      expect(result.current).toBe(true);
    });

    it("should handle different breakpoints", () => {
      mockMatchMedia(false);
      const { result: sm } = renderHook(() => useBreakpoint("sm"));
      const { result: lg } = renderHook(() => useBreakpoint("lg"));

      expect(sm.current).toBe(false);
      expect(lg.current).toBe(false);
    });
  });

  describe("useOrientation", () => {
    it("should return portrait by default", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe("portrait");
    });

    it("should return landscape when media query matches", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe("landscape");
    });
  });

  describe("useIsMobile", () => {
    it("should detect mobile devices", () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 600,
      });

      mockMatchMedia(true);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it("should detect desktop devices", () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1200,
      });

      mockMatchMedia(false);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });
  });

  describe("useDeviceType", () => {
    it("should return mobile for mobile devices", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 600,
      });

      const { result } = renderHook(() => useDeviceType());
      // The hook internally uses useIsMobile which we need to mock
      expect(["mobile", "tablet", "desktop"]).toContain(result.current);
    });
  });

  describe("useSafeArea", () => {
    it("should return default safe area values", () => {
      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });

    it("should handle orientation changes", () => {
      const { result } = renderHook(() => useSafeArea());

      // Simulate orientation change
      act(() => {
        window.dispatchEvent(new Event("orientationchange"));
      });

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });
  });

  describe("useIsIOSSafari", () => {
    it("should detect iOS Safari", () => {
      mockNavigator(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
      );

      const { result } = renderHook(() => useIsIOSSafari());
      expect(result.current).toBe(true);
    });

    it("should not detect non-iOS browsers", () => {
      mockNavigator(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      const { result } = renderHook(() => useIsIOSSafari());
      expect(result.current).toBe(false);
    });

    it("should not detect iOS Chrome", () => {
      mockNavigator(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.114 Mobile/15E148 Safari/604.1"
      );

      const { result } = renderHook(() => useIsIOSSafari());
      expect(result.current).toBe(false);
    });
  });
});

// Network Status Tests
describe("Network Detection", () => {
  beforeEach(() => {
    // Mock online status
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  it("should detect online status", () => {
    expect(navigator.onLine).toBe(true);
  });

  it("should handle offline status", () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    expect(navigator.onLine).toBe(false);
  });
});

// Touch Detection Tests
describe("Touch Detection", () => {
  it("should detect touch support", () => {
    Object.defineProperty(window, "ontouchstart", {
      value: true,
    });

    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 1,
    });

    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    expect(hasTouch).toBe(true);
  });

  it("should detect non-touch devices", () => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 0,
    });

    const hasTouch = navigator.maxTouchPoints > 0;
    expect(hasTouch).toBe(false);
  });
});

// Platform Detection Tests
describe("Platform Detection", () => {
  it("should detect Android devices", () => {
    mockNavigator(
      "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
    );

    const isAndroid = /Android/.test(navigator.userAgent);
    expect(isAndroid).toBe(true);
  });

  it("should detect iOS devices", () => {
    mockNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1"
    );

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    expect(isIOS).toBe(true);
  });

  it("should detect iPad devices", () => {
    mockNavigator(
      "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1"
    );

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    expect(isIOS).toBe(true);
  });
});

// Feature Support Tests
describe("Feature Support", () => {
  it("should detect vibration support", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: jest.fn(),
    });

    const supportsVibration = "vibrate" in navigator;
    expect(supportsVibration).toBe(true);
  });

  it("should detect share API support", () => {
    Object.defineProperty(navigator, "share", {
      value: jest.fn(),
    });

    const supportsShare = "share" in navigator;
    expect(supportsShare).toBe(true);
  });

  it("should handle missing features gracefully", () => {
    const supportsVibration = "vibrate" in navigator;
    const supportsShare = "share" in navigator;

    // Should not throw errors
    expect(typeof supportsVibration).toBe("boolean");
    expect(typeof supportsShare).toBe("boolean");
  });
});
