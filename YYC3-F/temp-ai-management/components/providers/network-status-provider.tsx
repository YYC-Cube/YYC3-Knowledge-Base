"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

interface NetworkConnection extends NavigatorConnection {
  effectiveType: "2g" | "3g" | "4g" | "slow-2g";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface NetworkStatusContextType {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType: string;
  rtt: number;
  downlink: number;
  saveData: boolean;
  connectionType: string;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  isSlow: false,
  effectiveType: "unknown",
  rtt: 0,
  downlink: 0,
  saveData: false,
  connectionType: "unknown",
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

interface NetworkStatusProviderProps {
  children: React.ReactNode;
  showToasts?: boolean;
  slowThreshold?: number;
}

export function NetworkStatusProvider({
  children,
  showToasts = true,
  slowThreshold = 500,
}: NetworkStatusProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [effectiveType, setEffectiveType] = useState("unknown");
  const [rtt, setRtt] = useState(0);
  const [downlink, setDownlink] = useState(0);
  const [saveData, setSaveData] = useState(false);
  const [connectionType, setConnectionType] = useState("unknown");
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // 监听在线状态
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline && showToasts) {
        toast.success("网络已连接", {
          description: "您现在可以正常使用所有功能",
          duration: 3000,
        });
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      if (showToasts) {
        toast.error("网络已断开", {
          description: "请检查您的网络连接",
          duration: 5000,
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 初始化在线状态
    setIsOnline(navigator.onLine);

    // 监听网络质量变化
    if ("connection" in navigator) {
      const connection = (navigator as any).connection as NetworkConnection;

      const updateConnectionInfo = () => {
        setEffectiveType(connection.effectiveType || "unknown");
        setRtt(connection.rtt || 0);
        setDownlink(connection.downlink || 0);
        setSaveData(connection.saveData || false);

        // 检测慢网络
        const isSlow =
          connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g" ||
          connection.rtt > slowThreshold;

        setIsSlow(isSlow);

        // 设置连接类型
        if (connection.effectiveType) {
          setConnectionType(connection.effectiveType);
        }

        // 显示慢网络提示
        if (isSlow && isOnline && showToasts) {
          toast.warning("网络速度较慢", {
            description: "正在为您优化加载体验",
            duration: 4000,
          });
        }

        // 省流模式提示
        if (connection.saveData && showToasts) {
          toast.info("已启用省流模式", {
            description: "系统将减少数据使用量",
            duration: 3000,
          });
        }
      };

      connection.addEventListener("change", updateConnectionInfo);
      updateConnectionInfo(); // 初始化

      return () => {
        connection.removeEventListener("change", updateConnectionInfo);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, showToasts, slowThreshold, wasOffline]);

  // 网络质量检测
  const performanceTest = async () => {
    if (!isOnline) return;

    try {
      const startTime = performance.now();
      const response = await fetch("/api/ping", {
        method: "HEAD",
        cache: "no-cache",
      });
      const endTime = performance.now();

      const latency = endTime - startTime;
      setRtt(latency);

      if (latency > 1000) {
        setIsSlow(true);
        if (showToasts) {
          toast.warning("网络延迟较高", {
            description: `当前延迟: ${Math.round(latency)}ms`,
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.warn("Network performance test failed:", error);
    }
  };

  // 定期检测网络性能
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(performanceTest, 30000); // 每30秒检测一次
    performanceTest(); // 立即执行一次

    return () => clearInterval(interval);
  }, [isOnline]);

  const contextValue = {
    isOnline,
    isSlow,
    effectiveType,
    rtt,
    downlink,
    saveData,
    connectionType,
  };

  return (
    <NetworkStatusContext.Provider value={contextValue}>
      {children}

      {/* 离线提示横幅 */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-3 text-center z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>您当前处于离线状态，部分功能可能不可用</span>
          </div>
        </div>
      )}

      {/* 慢网络提示横幅 */}
      {isOnline && isSlow && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-40 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>
              当前网络较慢 ({effectiveType.toUpperCase()})，正在优化加载体验
            </span>
          </div>
        </div>
      )}

      {/* 省流模式提示 */}
      {isOnline && saveData && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center z-40 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>省流模式已启用，将减少数据使用量</span>
          </div>
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}

// 网络状态指示器组件
export function NetworkStatusIndicator() {
  const { isOnline, isSlow, effectiveType, rtt } = useNetworkStatus();

  const getStatusColor = () => {
    if (!isOnline) return "bg-red-500";
    if (isSlow) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!isOnline) return "离线";
    if (isSlow) return `慢网络 (${effectiveType})`;
    return `在线 (${effectiveType})`;
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {isOnline && rtt > 0 && (
        <span className="text-xs text-gray-500">{Math.round(rtt)}ms</span>
      )}
    </div>
  );
}

// 自适应内容加载组件
interface AdaptiveContentProps {
  children: React.ReactNode;
  lightContent?: React.ReactNode;
  fallbackContent?: React.ReactNode;
}

export function AdaptiveContent({
  children,
  lightContent,
  fallbackContent,
}: AdaptiveContentProps) {
  const { isOnline, isSlow, saveData } = useNetworkStatus();

  if (!isOnline && fallbackContent) {
    return <>{fallbackContent}</>;
  }

  if ((isSlow || saveData) && lightContent) {
    return <>{lightContent}</>;
  }

  return <>{children}</>;
}
