"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSafeArea } from "@/hooks/use-safe-area";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  quality?: number;
  placeholder?: "blur" | "empty";
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  lazy?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  className = "",
  objectFit = "cover",
  quality,
  placeholder = "blur",
  onLoad,
  onError,
  fallbackSrc = "/placeholder.svg",
  lazy = true,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const safeArea = useSafeArea();

  // 根据设备类型自动调整质量
  const getOptimalQuality = () => {
    if (quality) return quality;
    if (isMobile) return 75; // 移动端使用较低质量节省流量
    if (isTablet) return 85; // 平板使用中等质量
    return 90; // 桌面端使用高质量
  };

  // 计算实际图片尺寸
  const getImageDimensions = () => {
    if (width && height) {
      return { width, height };
    }

    // 默认尺寸，根据设备类型调整
    if (isMobile) {
      return { width: 800, height: 600 };
    } else if (isTablet) {
      return { width: 1200, height: 800 };
    } else {
      return { width: 1600, height: 1200 };
    }
  };

  const { width: imgWidth, height: imgHeight } = getImageDimensions();

  // 生成低质量占位符URL
  const getLQIP = (originalSrc: string) => {
    if (originalSrc.includes("?")) {
      return `${originalSrc}&w=20&q=10`;
    }
    return `${originalSrc}?w=20&q=10`;
  };

  // 处理图片加载完成
  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // 处理图片加载错误
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
    onError?.();
  };

  // 监听src变化，重置状态
  useEffect(() => {
    if (src !== imageSrc && !hasError) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src, imageSrc, hasError]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        paddingBottom: `${(imgHeight / imgWidth) * 100}%`,
        ...safeArea,
      }}
    >
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </motion.div>
        </div>
      )}

      {/* 图片 */}
      <Image
        src={imageSrc || fallbackSrc}
        alt={alt}
        width={imgWidth}
        height={imgHeight}
        sizes={sizes}
        priority={priority}
        quality={getOptimalQuality()}
        placeholder={placeholder}
        blurDataURL={placeholder === "blur" ? getLQIP(imageSrc) : undefined}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        style={{ objectFit }}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? "eager" : lazy ? "lazy" : "eager"}
        unoptimized={false}
      />

      {/* 错误状态 */}
      {hasError && imageSrc === fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500 text-sm">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>图片加载失败</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 响应式图片网格组件
interface ResponsiveImageGridProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap?: string;
  onImageClick?: (image: any, index: number) => void;
  className?: string;
}

export function ResponsiveImageGrid({
  images,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "1rem",
  onImageClick,
  className = "",
}: ResponsiveImageGridProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const getColumns = () => {
    if (isMobile) return columns.mobile;
    if (isTablet) return columns.tablet;
    return columns.desktop;
  };

  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${getColumns()}, 1fr)`,
        gap,
      }}
    >
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="cursor-pointer"
          onClick={() => onImageClick?.(image, index)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="rounded-lg"
          />
        </motion.div>
      ))}
    </div>
  );
}

// 渐进式图片加载组件
interface ProgressiveImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function ProgressiveImage({
  lowQualitySrc,
  highQualitySrc,
  alt,
  className = "",
  width = 800,
  height = 600,
}: ProgressiveImageProps) {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 低质量图片 */}
      <Image
        src={lowQualitySrc}
        alt={alt}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          highQualityLoaded
            ? "opacity-0"
            : lowQualityLoaded
            ? "opacity-100"
            : "opacity-0"
        }`}
        style={{ filter: "blur(2px)" }}
        onLoad={() => setLowQualityLoaded(true)}
        priority
      />

      {/* 高质量图片 */}
      <Image
        src={highQualitySrc}
        alt={alt}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          highQualityLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setHighQualityLoaded(true)}
        loading="lazy"
      />

      {/* 加载指示器 */}
      {!lowQualityLoaded && !highQualityLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}

// 图片查看器组件
interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    id: string;
    src: string;
    alt: string;
  }>;
  initialIndex?: number;
}

export function ImageViewer({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const safeArea = useSafeArea();

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      style={{
        paddingTop: safeArea.top,
        paddingBottom: safeArea.bottom,
      }}
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        className="absolute top-4 right-4 z-10 text-white p-2"
        onClick={onClose}
        style={{ top: `${safeArea.top + 16}px` }}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* 图片 */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <OptimizedImage
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-full max-h-full"
          objectFit="contain"
          priority
        />
      </div>

      {/* 导航 */}
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* 指示器 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
