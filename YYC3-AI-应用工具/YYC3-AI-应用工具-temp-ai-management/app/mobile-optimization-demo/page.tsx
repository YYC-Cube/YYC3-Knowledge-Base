"use client";

import React, { useState } from "react";
import {
  ResponsiveLayout,
  SwipeAction,
  TouchFriendlyListItem,
  BottomSheet,
  OptimizedImage,
  ResponsiveImageGrid,
  ImageViewer,
  NetworkStatusIndicator,
  useMobile,
  useNetworkStatus,
  useHapticFeedback,
  useShare,
  SafeAreaView,
  MobileOnly,
  DesktopOnly,
} from "@/components/mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Share,
  Delete,
  Settings,
  User,
  Home,
  Search,
  Bell,
  Menu,
  Trash2,
  Star,
  Download,
} from "lucide-react";

export default function MobileOptimizationDemo() {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const {
    deviceType,
    orientation,
    isTouch,
    safeArea,
    isMobile,
    isTablet,
    supportsVibration,
    supportsShare,
  } = useMobile();

  const { isOnline, isSlow, effectiveType, rtt } = useNetworkStatus();
  const haptic = useHapticFeedback();
  const { share } = useShare();

  // 模拟数据
  const demoImages = [
    {
      id: "1",
      src: "/placeholder.jpg",
      alt: "演示图片 1",
    },
    {
      id: "2",
      src: "/placeholder.svg",
      alt: "演示图片 2",
    },
    {
      id: "3",
      src: "/logo.png",
      alt: "演示图片 3",
    },
  ];

  const listItems = [
    {
      id: "1",
      title: "用户管理",
      subtitle: "管理系统用户和权限",
      icon: <User className="w-5 h-5" />,
    },
    {
      id: "2",
      title: "数据分析",
      subtitle: "查看业务数据报表",
      icon: <Search className="w-5 h-5" />,
    },
    {
      id: "3",
      title: "系统设置",
      subtitle: "配置系统参数",
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: "4",
      title: "通知中心",
      subtitle: "查看系统通知",
      icon: <Bell className="w-5 h-5" />,
    },
  ];

  const handleShare = async () => {
    haptic.light();
    try {
      await share({
        title: "YanYu Cloud³ 移动端优化演示",
        text: "体验全新的移动端管理界面",
        url: window.location.href,
      });
    } catch (error) {
      console.log("分享失败:", error);
    }
  };

  const handleSwipeLeft = (item: any) => {
    haptic.medium();
    console.log("左滑删除:", item.title);
  };

  const handleSwipeRight = (item: any) => {
    haptic.light();
    console.log("右滑收藏:", item.title);
  };

  // 侧边栏内容
  const sidebarContent = (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold">YYC Cube</h2>
        <p className="text-sm text-gray-600">移动端管理平台</p>
      </div>

      <nav className="flex-1">
        <div className="space-y-2">
          {listItems.map((item) => (
            <TouchFriendlyListItem
              key={item.id}
              className="rounded-lg hover:bg-gray-100"
              onClick={() => {
                haptic.light();
                console.log("点击:", item.title);
              }}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.subtitle}</div>
                </div>
              </div>
            </TouchFriendlyListItem>
          ))}
        </div>
      </nav>

      <div className="border-t pt-4">
        <NetworkStatusIndicator />
      </div>
    </div>
  );

  // 底部导航项
  const bottomNavItems = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "首页",
      active: true,
      onClick: () => {
        haptic.light();
        console.log("首页");
      },
    },
    {
      icon: <Search className="w-5 h-5" />,
      label: "搜索",
      onClick: () => {
        haptic.light();
        console.log("搜索");
      },
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: "通知",
      onClick: () => {
        haptic.light();
        console.log("通知");
      },
    },
    {
      icon: <User className="w-5 h-5" />,
      label: "我的",
      onClick: () => {
        haptic.light();
        console.log("我的");
      },
    },
  ];

  return (
    <ResponsiveLayout
      mobileSidebar={sidebarContent}
      bottomNavItems={bottomNavItems}
      showBottomNav={true}
    >
      <SafeAreaView className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          {/* 设备信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                设备信息
                <MobileOnly>
                  <Badge variant="secondary">移动端</Badge>
                </MobileOnly>
                <DesktopOnly>
                  <Badge variant="outline">桌面端</Badge>
                </DesktopOnly>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">设备类型:</span> {deviceType}
                </div>
                <div>
                  <span className="font-medium">方向:</span> {orientation}
                </div>
                <div>
                  <span className="font-medium">触控:</span>{" "}
                  {isTouch ? "支持" : "不支持"}
                </div>
                <div>
                  <span className="font-medium">振动:</span>{" "}
                  {supportsVibration ? "支持" : "不支持"}
                </div>
                <div>
                  <span className="font-medium">分享:</span>{" "}
                  {supportsShare ? "支持" : "不支持"}
                </div>
                <div>
                  <span className="font-medium">网络:</span>{" "}
                  {isOnline ? "在线" : "离线"}
                </div>
              </div>

              {isOnline && (
                <div className="pt-2 border-t text-sm text-gray-600">
                  <div>
                    网络类型: {effectiveType} | 延迟: {rtt}ms
                  </div>
                  {isSlow && <div className="text-yellow-600">⚠️ 网络较慢</div>}
                </div>
              )}

              <div className="pt-2 border-t text-xs text-gray-500">
                安全区域: 上{safeArea.top}px 右{safeArea.right}px 下
                {safeArea.bottom}px 左{safeArea.left}px
              </div>
            </CardContent>
          </Card>

          {/* 交互演示 */}
          <Tabs defaultValue="gestures" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gestures">手势</TabsTrigger>
              <TabsTrigger value="images">图片</TabsTrigger>
              <TabsTrigger value="haptic">触觉</TabsTrigger>
              <TabsTrigger value="share">分享</TabsTrigger>
            </TabsList>

            {/* 手势演示 */}
            <TabsContent value="gestures" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>滑动操作演示</CardTitle>
                  <p className="text-sm text-gray-600">
                    在列表项上左滑删除，右滑收藏
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {listItems.map((item) => (
                    <SwipeAction
                      key={item.id}
                      onSwipeLeft={() => handleSwipeLeft(item)}
                      onSwipeRight={() => handleSwipeRight(item)}
                      leftAction={
                        <div className="flex items-center px-4 bg-yellow-100 h-full">
                          <Star className="w-5 h-5 text-yellow-600" />
                        </div>
                      }
                      rightAction={
                        <div className="flex items-center px-4 bg-red-100 h-full">
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                      }
                    >
                      <TouchFriendlyListItem className="bg-white border rounded">
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-gray-500">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                      </TouchFriendlyListItem>
                    </SwipeAction>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>底部抽屉演示</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      haptic.medium();
                      setBottomSheetOpen(true);
                    }}
                    className="w-full"
                  >
                    打开底部抽屉
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 图片演示 */}
            <TabsContent value="images" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>优化图片展示</CardTitle>
                  <p className="text-sm text-gray-600">
                    支持懒加载、响应式尺寸、错误处理
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveImageGrid
                    images={demoImages}
                    columns={{ mobile: 2, tablet: 3, desktop: 4 }}
                    onImageClick={(image, index) => {
                      haptic.light();
                      setSelectedImageIndex(index);
                      setImageViewerOpen(true);
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>单张图片优化</CardTitle>
                </CardHeader>
                <CardContent>
                  <OptimizedImage
                    src="/placeholder.jpg"
                    alt="演示图片"
                    className="rounded-lg"
                    width={400}
                    height={300}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 触觉反馈演示 */}
            <TabsContent value="haptic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>触觉反馈演示</CardTitle>
                  <p className="text-sm text-gray-600">
                    {supportsVibration
                      ? "您的设备支持振动反馈"
                      : "您的设备不支持振动反馈"}
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={haptic.light}
                    disabled={!supportsVibration}
                  >
                    轻触反馈
                  </Button>
                  <Button
                    variant="outline"
                    onClick={haptic.medium}
                    disabled={!supportsVibration}
                  >
                    中等反馈
                  </Button>
                  <Button
                    variant="outline"
                    onClick={haptic.heavy}
                    disabled={!supportsVibration}
                  >
                    强烈反馈
                  </Button>
                  <Button
                    variant="outline"
                    onClick={haptic.success}
                    disabled={!supportsVibration}
                  >
                    成功反馈
                  </Button>
                  <Button
                    variant="outline"
                    onClick={haptic.warning}
                    disabled={!supportsVibration}
                  >
                    警告反馈
                  </Button>
                  <Button
                    variant="outline"
                    onClick={haptic.error}
                    disabled={!supportsVibration}
                  >
                    错误反馈
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 分享演示 */}
            <TabsContent value="share" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>系统分享演示</CardTitle>
                  <p className="text-sm text-gray-600">
                    {supportsShare
                      ? "您的设备支持系统分享"
                      : "将复制链接到剪贴板"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={handleShare} className="w-full">
                    <Share className="w-4 h-4 mr-2" />
                    分享此页面
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 底部抽屉 */}
        <BottomSheet
          isOpen={bottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          title="操作选项"
          snapPoints={["30%", "60%", "90%"]}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-16 flex flex-col">
                <Download className="w-6 h-6 mb-1" />
                <span className="text-xs">下载</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col">
                <Heart className="w-6 h-6 mb-1" />
                <span className="text-xs">收藏</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col">
                <Share className="w-6 h-6 mb-1" />
                <span className="text-xs">分享</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col">
                <Delete className="w-6 h-6 mb-1" />
                <span className="text-xs">删除</span>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              拖拽顶部把手可调整高度
            </div>
          </div>
        </BottomSheet>

        {/* 图片查看器 */}
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          images={demoImages}
          initialIndex={selectedImageIndex}
        />
      </SafeAreaView>
    </ResponsiveLayout>
  );
}
