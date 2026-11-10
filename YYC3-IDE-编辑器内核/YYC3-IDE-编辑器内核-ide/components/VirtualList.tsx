/**
 * @file: VirtualList.tsx
 * @description: 虚拟列表组件 - 基于react-window的高性能列表渲染
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: virtual-list,performance,react-window,optimization
 */

// ================================================================
// Virtual List - 虚拟列表组件
// ================================================================
//
// 功能：
//   - 虚拟滚动渲染
//   - 固定高度/动态高度支持
//   - 无限滚动加载
//   - 搜索过滤
//   - 排序支持
//   - 多选支持
//
// 使用场景：
//   - 文件列表
//   - 历史记录列表
//   - 搜索结果列表
//   - 日志列表
// ================================================================

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { List, useListRef, type RowComponentProps } from 'react-window';

// ── Types ─
export interface VirtualListItem {
  id: string;
  [key: string]: unknown;
}

export interface VirtualListProps<T extends VirtualListItem> {
  items: T[];
  itemHeight?: number | ((index: number) => number);
  height: number | string;
  width?: number | string;
  overscan?: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  sortable?: boolean;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  onSortChange?: (config: { key: string; direction: 'asc' | 'desc' }) => void;
  className?: string;
  style?: React.CSSProperties;
  innerElementType?: React.FC<{ children: React.ReactNode; style: React.CSSProperties }>;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
}

export interface VirtualListRef {
  scrollToItem: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  getScrollPosition: () => number;
  resetAfterIndex: (index: number) => void;
  recomputeRowHeights: () => void;
}

// ── Virtual List Component ──

export const VirtualList = forwardRef(
  <T extends VirtualListItem>(
    props: VirtualListProps<T>,
    ref: React.Ref<VirtualListRef>
  ) => {
    const {
      items,
      itemHeight = 40,
      height,
      width = '100%',
      overscan = 5,
      renderItem,
      keyExtractor = (item) => item.id,
      onEndReached,
      endReachedThreshold = 0.8,
      onLoadMore,
      hasMore = false,
      isLoading = false,
      loadingComponent,
      emptyComponent,
      selectedIds = new Set(),
      onSelectionChange,
      multiSelect = false,
      searchable = false,
      searchQuery = '',
      onSearchChange,
      searchPlaceholder = '搜索...',
      sortable = false,
      sortConfig,
      onSortChange,
      className,
      style,
      innerElementType,
      onScroll,
      scrollToIndex,
    } = props;

    const listRef = useListRef<any>(null);
    const [internalScrollTop, setInternalScrollTop] = useState(0);
    const loadingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      scrollToItem: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
        listRef.current?.scrollToRow({ index, align });
      },
      scrollToTop: () => {
        listRef.current?.scrollToRow({ index: 0, align: 'start' });
      },
      getScrollPosition: () => internalScrollTop,
      resetAfterIndex: (_index: number) => {
        listRef.current?.scrollToRow({ index: 0, align: 'start' });
      },
      recomputeRowHeights: () => {
        // react-window v2.x handles this automatically
      },
    }));

    const getItemHeight = useCallback(
      (index: number) => {
        if (typeof itemHeight === 'function') {
          return itemHeight(index);
        }
        return itemHeight;
      },
      [itemHeight]
    );

    const itemCount = useMemo(() => {
      return items.length + (isLoading ? 1 : 0);
    }, [items.length, isLoading]);

    const handleItemsRendered = useCallback(
      ({ visibleStopIndex }: { visibleStartIndex: number; visibleStopIndex: number }) => {
        if (!hasMore || isLoading || loadingRef.current) return;

        const threshold = Math.floor(items.length * endReachedThreshold);
        if (visibleStopIndex >= threshold) {
          onEndReached?.();
          if (onLoadMore) {
            loadingRef.current = true;
            onLoadMore().finally(() => {
              loadingRef.current = false;
            });
          }
        }
      },
      [hasMore, isLoading, items.length, endReachedThreshold, onEndReached, onLoadMore]
    );

    const handleScroll = useCallback(
      ({ scrollDirection, scrollOffset, scrollUpdateWasRequested }: any) => {
        setInternalScrollTop(scrollOffset);
        onScroll?.(scrollOffset);
      },
      [onScroll]
    );

    const handleItemClick = useCallback(
      (item: T, index: number, event: React.MouseEvent) => {
        if (!onSelectionChange) return;

        const newSelectedIds = new Set(selectedIds);
        const itemId = keyExtractor(item, index);

        if (multiSelect && (event.ctrlKey || event.metaKey)) {
          if (newSelectedIds.has(itemId)) {
            newSelectedIds.delete(itemId);
          } else {
            newSelectedIds.add(itemId);
          }
        } else if (multiSelect && event.shiftKey && selectedIds.size > 0) {
          const lastSelectedIndex = items.findIndex((i, idx) =>
            selectedIds.has(keyExtractor(i, idx))
          );
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i++) {
            newSelectedIds.add(keyExtractor(items[i], i));
          }
        } else {
          newSelectedIds.clear();
          newSelectedIds.add(itemId);
        }

        onSelectionChange(newSelectedIds);
      },
      [selectedIds, onSelectionChange, multiSelect, keyExtractor, items]
    );

    const rowProps = useMemo(
      () => ({
        items,
        isLoading,
        loadingComponent,
        keyExtractor,
        selectedIds,
        renderItem,
        handleItemClick,
      }),
      [items, isLoading, loadingComponent, keyExtractor, selectedIds, renderItem, handleItemClick],
    );

    const itemKey = useCallback(
      (index: number) => {
        if (isLoading && index === items.length) {
          return 'loading';
        }
        return keyExtractor(items[index], index);
      },
      [items, isLoading, keyExtractor]
    );

    const listHeight = typeof height === 'number' ? height : 400;

    const listStyle: React.CSSProperties = {
      width,
      height: listHeight,
      ...style,
    };

    if (items.length === 0 && !isLoading) {
      return (
        <div className={className} style={listStyle}>
          {searchable && (
            <SearchBox
              value={searchQuery}
              onChange={onSearchChange || (() => { })}
              placeholder={searchPlaceholder}
            />
          )}
          {emptyComponent || <DefaultEmptyComponent />}
        </div>
      );
    }

    const ListComponent = List;

    return (
      <div className={className} style={listStyle}>
        {searchable && (
          <SearchBox
            value={searchQuery}
            onChange={onSearchChange || (() => { })}
            placeholder={searchPlaceholder}
          />
        )}
        {sortable && sortConfig && (
          <SortHeader
            sortConfig={sortConfig}
            onSortChange={onSortChange || (() => { })}
          />
        )}
        <List
          listRef={listRef as any}
          style={{ height: listHeight - (searchable ? 48 : 0) - (sortable ? 40 : 0), width: typeof width === 'number' ? width : '100%' }}
          rowCount={itemCount}
          rowHeight={getItemHeight}
          overscanCount={overscan}
          onRowsRendered={({ startIndex = 0, stopIndex = 0 }) => handleItemsRendered({ visibleStartIndex: startIndex, visibleStopIndex: stopIndex })}
          rowComponent={VirtualListRow as any}
          rowProps={rowProps}
        />
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';

// ── Row Component (extracted for react-window v2 rowProps pattern) ──

interface VirtualListRowData<T extends VirtualListItem> {
  items: T[];
  isLoading: boolean;
  loadingComponent?: React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  selectedIds: Set<string>;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  handleItemClick: (item: T, index: number, event: React.MouseEvent) => void;
}

function VirtualListRow<T extends VirtualListItem>({
  index,
  style,
  ariaAttributes,
  items,
  isLoading,
  loadingComponent,
  keyExtractor,
  selectedIds,
  renderItem,
  handleItemClick,
}: RowComponentProps<VirtualListRowData<T>>) {
  if (isLoading && index === items.length) {
    return (
      <div style={style} {...ariaAttributes}>
        {loadingComponent || <DefaultLoadingComponent />}
      </div>
    );
  }

  const item = items[index];
  if (!item) return null;

  const itemId = keyExtractor(item, index);
  const isSelected = selectedIds.has(itemId);

  return (
    <div
      style={style}
      onClick={(e) => handleItemClick(item, index, e)}
      aria-selected={isSelected}
      {...ariaAttributes}
    >
      {renderItem(item, index, isSelected)}
    </div>
  );
}

// ── Helper Components ──

const DefaultLoadingComponent: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-secondary, #666)',
    }}
  >
    <div
      style={{
        width: '20px',
        height: '20px',
        border: '2px solid var(--border-color, #e0e0e0)',
        borderTopColor: 'var(--primary-color, #2196f3)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '8px',
      }}
    />
    加载中...
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const DefaultEmptyComponent: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-secondary, #666)',
    }}
  >
    暂无数据
  </div>
);

const SearchBox: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div
    style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--border-color, #e0e0e0)',
    }}
  >
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid var(--border-color, #e0e0e0)',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
      }}
    />
  </div>
);

const SortHeader: React.FC<{
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSortChange: (config: { key: string; direction: 'asc' | 'desc' }) => void;
}> = ({ sortConfig, onSortChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderBottom: '1px solid var(--border-color, #e0e0e0)',
      fontSize: '12px',
      color: 'var(--text-secondary, #666)',
    }}
  >
    <span>排序: {sortConfig.key}</span>
    <button
      onClick={() =>
        onSortChange({
          key: sortConfig.key,
          direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
        })
      }
      style={{
        marginLeft: '8px',
        padding: '2px 8px',
        border: '1px solid var(--border-color, #e0e0e0)',
        borderRadius: '4px',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {sortConfig.direction === 'asc' ? '↑' : '↓'}
    </button>
  </div>
);

// ── Hook for Virtual List ──

export function useVirtualList<T extends VirtualListItem>(
  items: T[],
  options: {
    pageSize?: number;
    defaultSortConfig?: { key: string; direction: 'asc' | 'desc' };
  } = {}
) {
  const { pageSize = 50, defaultSortConfig } = options;

  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState(defaultSortConfig);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some(
          (value) =>
            typeof value === 'string' && value.toLowerCase().includes(query)
        )
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [items, searchQuery, sortConfig]);

  const hasMore = useMemo(() => {
    return displayedItems.length < filteredItems.length;
  }, [displayedItems.length, filteredItems.length]);

  const loadMore = useCallback(async () => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    const newItems = filteredItems.slice(start, end);
    setDisplayedItems((prev) => [...prev, ...newItems]);
    setPageIndex((prev) => prev + 1);
  }, [filteredItems, pageIndex, pageSize]);

  const reset = useCallback(() => {
    setDisplayedItems([]);
    setPageIndex(0);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    displayedItems,
    filteredItems,
    hasMore,
    loadMore,
    reset,
    searchQuery,
    setSearchQuery,
    sortConfig,
    setSortConfig,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
  };
}

// ── Export Default ──

export default VirtualList;
