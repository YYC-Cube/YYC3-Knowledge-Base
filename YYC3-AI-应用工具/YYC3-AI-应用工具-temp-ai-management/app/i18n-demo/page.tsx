"use client";

import React from "react";
import {
  useI18n,
  I18nText,
  I18nButton,
  I18nLabel,
  I18nInput,
} from "../../components/i18n/i18n-components";
import {
  I18nNavigationHeader,
  I18nNavigationContainer,
} from "../../components/i18n/i18n-navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function I18nDemoPage() {
  // 简化版本：移除了所有i18n相关的组件和功能
  // 仅保留基本的页面结构，避免构建超时

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col w-full">
        <main className="flex-1 p-6 space-y-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Internationalization Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is a simplified version of the i18n demo page.</p>
                <div className="mt-6">
                  <p>The full i18n functionality has been temporarily disabled to resolve build timeout issues.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
