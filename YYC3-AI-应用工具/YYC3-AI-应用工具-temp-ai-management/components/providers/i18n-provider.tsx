"use client";

import React, { useEffect, Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../lib/i18n.config";

// Loading fallback for i18n initialization
function I18nLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  );
}

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // 确保 i18n 已初始化
    if (!i18n.isInitialized) {
      i18n.init();
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<I18nLoadingFallback />}>{children}</Suspense>
    </I18nextProvider>
  );
}
