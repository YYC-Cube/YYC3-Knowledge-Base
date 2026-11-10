"use client";

import React, { useState } from "react";
import {
  motion,
  PanInfo,
  useDragControls,
  AnimatePresence,
} from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useSafeArea } from "@/hooks/use-safe-area";

// 滑动操作组件
interface SwipeActionProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export function SwipeAction({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 0.4,
  disabled = false,
}: SwipeActionProps) {
  const controls = useDragControls();
  const [offset, setOffset] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (disabled) return;

    const { offset, velocity } = info;

    // 计算滑动的百分比
    const width = (event.currentTarget as HTMLElement).offsetWidth;
    const percent = offset.x / width;

    // 如果滑动速度很快或滑动百分比超过阈值，则触发操作
    if (percent <= -threshold || velocity.x <= -500) {
      if (onSwipeLeft) {
        onSwipeLeft();
      }
      setOffset(-100); // 左滑显示右侧操作
      setTimeout(() => setOffset(0), 500);
    } else if (percent >= threshold || velocity.x >= 500) {
      if (onSwipeRight) {
        onSwipeRight();
      }
      setOffset(100); // 右滑显示左侧操作
      setTimeout(() => setOffset(0), 500);
    } else {
      setOffset(0); // 恢复原位
    }
  };

  if (disabled || prefersReducedMotion) {
    return <div className="relative overflow-hidden">{children}</div>;
  }

  return (
    <div className="relative overflow-hidden touch-none">
      {/* 左侧操作区域 */}
      {leftAction && (
        <div className="absolute top-0 bottom-0 left-0 flex items-center z-0">
          {leftAction}
        </div>
      )}

      {/* 右侧操作区域 */}
      {rightAction && (
        <div className="absolute top-0 bottom-0 right-0 flex items-center z-0">
          {rightAction}
        </div>
      )}

      {/* 可滑动内容 */}
      <motion.div
        drag="x"
        dragControls={controls}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: offset }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}

// 触控友好列表项
interface TouchFriendlyListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  activeClassName?: string;
}

export function TouchFriendlyListItem({
  children,
  onClick,
  className = "",
  disabled = false,
  activeClassName = "bg-gray-100",
}: TouchFriendlyListItemProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.div
      className={`p-4 flex items-center min-h-[56px] transition-colors select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${isPressed && !disabled ? activeClassName : ""} ${className}`}
      onClick={disabled ? undefined : onClick}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

// 底部抽屉组件
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: string[];
  initialSnap?: number;
  title?: string;
  closeOnOverlayClick?: boolean;
  closeOnDragDown?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = ["25%", "50%", "90%"],
  initialSnap = 0,
  title,
  closeOnOverlayClick = true,
  closeOnDragDown = true,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const controls = useDragControls();
  const safeArea = useSafeArea();
  const prefersReducedMotion = usePrefersReducedMotion();

  // 处理拖拽结束
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!closeOnDragDown) return;

    const { offset, velocity } = info;

    // 向下滑动速度较快或偏移量较大时关闭
    if (velocity.y > 500 || offset.y > 100) {
      onClose();
      return;
    }

    // 计算最接近的快照点
    const currentHeight =
      window.innerHeight * (parseFloat(snapPoints[currentSnap]) / 100);
    const newHeight = currentHeight - offset.y;
    const newPercent = (newHeight / window.innerHeight) * 100;

    let closestSnap = 0;
    let minDiff = Number.MAX_VALUE;

    snapPoints.forEach((point, index) => {
      const diff = Math.abs(parseFloat(point) - newPercent);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = index;
      }
    });

    setCurrentSnap(closestSnap);
  };

  // 阻止背景滚动
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="absolute inset-0 bg-black/50"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* 抽屉内容 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{
              y: `${100 - parseFloat(snapPoints[currentSnap])}%`,
              transition: {
                type: prefersReducedMotion ? "tween" : "spring",
                stiffness: 300,
                damping: 30,
                duration: prefersReducedMotion ? 0.2 : undefined,
              },
            }}
            exit={{
              y: "100%",
              transition: {
                duration: prefersReducedMotion ? 0.2 : 0.3,
              },
            }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl overflow-hidden flex flex-col"
            style={{
              maxHeight: "90vh",
              paddingBottom: safeArea.bottom,
            }}
          >
            {/* 拖动把手和标题 */}
            <div className="flex-shrink-0">
              {/* 拖动把手 */}
              {closeOnDragDown && (
                <div
                  className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => controls.start(e)}
                >
                  <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
              )}

              {/* 标题 */}
              {title && (
                <div className="px-4 pb-2">
                  <h3 className="text-lg font-semibold text-center">{title}</h3>
                </div>
              )}
            </div>

            {/* 内容区域 */}
            <motion.div
              drag={closeOnDragDown ? "y" : false}
              dragControls={controls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="flex-1 overflow-auto"
            >
              <div className="px-4 pb-4">{children}</div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// 可拖拽排序列表项
interface DraggableListItemProps {
  id: string;
  children: React.ReactNode;
  onDragEnd?: (draggedId: string, targetId: string) => void;
  className?: string;
}

export function DraggableListItem({
  id,
  children,
  onDragEnd,
  className = "",
}: DraggableListItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div className={`${className}`}>{children}</div>;
  }

  return (
    <motion.div
      layout
      layoutId={id}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      whileDrag={{
        scale: 1.05,
        zIndex: 10,
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(event, info) => {
        setIsDragging(false);
        if (onDragEnd) {
          const draggedElement = event.target as HTMLElement;
          const targetElement = document.elementFromPoint(
            info.point.x,
            info.point.y
          );
          const targetId = targetElement?.getAttribute("data-id");
          if (targetId && targetId !== id) {
            onDragEnd(id, targetId);
          }
        }
      }}
      className={`${className} ${
        isDragging ? "opacity-50" : ""
      } cursor-grab active:cursor-grabbing`}
      data-id={id}
    >
      {children}
    </motion.div>
  );
}

// 长按手势组件
interface LongPressProps {
  children: React.ReactNode;
  onLongPress: () => void;
  delay?: number;
  className?: string;
}

export function LongPress({
  children,
  onLongPress,
  delay = 500,
  className = "",
}: LongPressProps) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleStart = () => {
    setIsPressed(true);
    timeoutRef.current = setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, delay);
  };

  const handleEnd = () => {
    setIsPressed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`${className} ${isPressed ? "opacity-70" : ""}`}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {children}
    </div>
  );
}
