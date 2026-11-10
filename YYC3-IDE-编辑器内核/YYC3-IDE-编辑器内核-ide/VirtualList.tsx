// @ts-nocheck — react-window v2 泛型复杂兼容性问题
/**
 * @file: VirtualList.tsx
 * @description: YYC³ 虚拟滚动列表 — 基于 react-window v2 的高性能大列表渲染
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-16
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: react,virtual-scroll,performance,list
 */

import React, { useCallback, useMemo } from "react";
import { List, useListRef, type RowComponentProps } from "react-window";

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  maxHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyPlaceholder?: React.ReactNode;
}

interface RowData<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function VirtualListRow<T>({
  index,
  style,
  ariaAttributes,
  items,
  renderItem,
}: RowComponentProps<RowData<T>>) {
  const item = items[index];
  if (!item) return null;
  return (
    <div style={style} aria-rowindex={index + 1} {...ariaAttributes}>
      {renderItem(item, index)}
    </div>
  );
}

function VirtualListInner<T>({
  items,
  itemHeight,
  maxHeight,
  overscan = 5,
  renderItem,
  className = "",
  emptyPlaceholder,
}: VirtualListProps<T>) {
  const listRef = useListRef(null);

  const rowProps = useMemo(
    () => ({ items, renderItem }),
    [items, renderItem],
  );

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-white/25 text-[12px] ${className}`}
        style={{ height: Math.min(maxHeight, 120) }}
        role="list"
        aria-label="空列表"
      >
        {emptyPlaceholder || <span>暂无数据</span>}
      </div>
    );
  }

  const height = Math.min(maxHeight, items.length * itemHeight);

  return (
    <div className={className} role="list" aria-label={`列表，共 ${items.length} 项`}>
      <List<RowData<T>>
        listRef={listRef}
        defaultHeight={height}
        rowCount={items.length}
        rowHeight={itemHeight}
        overscanCount={overscan}
        rowComponent={VirtualListRow as any}
        rowProps={rowProps}
      />
    </div>
  );
}

export const VirtualList = React.memo(VirtualListInner) as <T>(
  props: VirtualListProps<T>,
) => React.ReactElement | null;
