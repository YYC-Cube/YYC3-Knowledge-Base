import { toast } from "sonner";

interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

export const handleApiError = (
  error: any,
  defaultMessage: string = "操作失败，请稍后重试"
): string => {
  // 处理fetch或axios错误
  if (error?.response?.data?.error || error?.error) {
    const apiError = error.response?.data?.error || error.error;

    // 记录到前端日志系统
    console.error(`API Error [${apiError.code}]: ${apiError.message}`, {
      requestId: apiError.requestId,
      details: apiError.details,
      url: error.config?.url || error.url,
      method: error.config?.method || "unknown",
    });

    // 根据错误代码返回友好消息
    switch (apiError.code) {
      case "ERR_1001":
      case "ERR_1002":
      case "ERR_1003":
        return "您的登录已过期，请重新登录";

      case "ERR_1004":
      case "ERR_1005":
        return "您没有执行此操作的权限";

      case "ERR_3001":
        return "请求的资源不存在";

      case "ERR_3002":
        return "资源状态冲突，请刷新后重试";

      case "ERR_4001":
      case "ERR_4002":
        return apiError.message || "业务处理失败，请检查输入";

      case "ERR_5001":
      case "ERR_5002":
      case "ERR_5003":
        return "系统暂时不可用，请稍后重试";

      default:
        return apiError.message || defaultMessage;
    }
  }

  // 处理网络错误
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return "网络连接超时，请检查网络后重试";
  }

  // 处理其他类型错误
  console.error("Unknown error", error);
  return defaultMessage;
};

// 使用示例 - 安全的API调用包装器
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showSuccess?: boolean;
    showError?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  } = {}
): Promise<T | null> => {
  const {
    successMessage,
    errorMessage,
    showSuccess = false,
    showError = true,
    onSuccess,
    onError,
  } = options;

  try {
    const data = await apiCall();

    if (showSuccess && successMessage) {
      toast.success(successMessage);
    }

    onSuccess?.(data);
    return data;
  } catch (error) {
    const message = handleApiError(error, errorMessage);

    if (showError) {
      toast.error(message);
    }

    onError?.(error);
    return null;
  }
};

// React Hook for error boundary
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: any) => {
    console.error("React Error Boundary caught an error:", error, errorInfo);

    // 发送错误到监控系统
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      // 这里可以集成错误监控服务，如Sentry、Bugsnag等
      // sendErrorToMonitoring(error, errorInfo);
    }

    toast.error("页面发生了错误，请刷新页面重试");
  };

  return { handleError };
}
