"use client";

import React, { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnDef,
  RowData,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconArrowDown,
  IconArrowUp,
  IconFilter,
  IconSettings,
  IconCustomArrowLeft,
  IconCustomArrowRight,
} from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// 数据透视表属性
export interface PivotTableProps<T> {
  data: T[];
  defaultColumns: ColumnDef<T>[];
  title?: string;
  description?: string;
  loading?: boolean;
  onExport?: () => void;
  onSettingsChange?: (settings: any) => void;
  className?: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    isNumeric?: boolean;
  }
}

export function PivotTable<T>({
  data,
  defaultColumns,
  title,
  description,
  loading = false,
  onExport,
  onSettingsChange,
  className = "",
}: PivotTableProps<T>) {
  // 表格状态
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  // 表格实例
  const table = useReactTable({
    data,
    columns: defaultColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // 导出选中的行
  const handleExportSelected = () => {
    const selectedRows = Object.keys(rowSelection).map(
      (index) => data[parseInt(index)]
    );
    console.log("导出选中行", selectedRows);
    onExport?.();
  };

  // 渲染表格内容
  const renderTableContent = () => {
    if (loading) {
      return (
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
              {Array.from({ length: defaultColumns.length }).map(
                (_, colIndex) => (
                  <TableCell key={`skeleton-cell-${index}-${colIndex}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (table.getRowModel().rows.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell
              colSpan={defaultColumns.length}
              className="h-24 text-center"
            >
              无数据
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
            {row.getVisibleCells().map((cell) => {
              const isNumeric = cell.column.columnDef.meta?.isNumeric;

              return (
                <TableCell
                  key={cell.id}
                  className={isNumeric ? "text-right tabular-nums" : ""}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2">
            {/* 搜索输入框 */}
            <div className="relative w-full md:w-auto">
              <Input
                placeholder="搜索..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-xs h-9"
              />
            </div>

            {/* 列显示控制 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <IconSettings className="h-4 w-4 mr-1" /> 列设置
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>切换列显示</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 导出按钮 */}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                className="h-9"
              >
                导出
                {Object.keys(rowSelection).length > 0
                  ? ` (${Object.keys(rowSelection).length})`
                  : ""}
              </Button>
            )}
          </div>
        </div>

        {/* 筛选标签显示 */}
        {table.getState().columnFilters.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {table.getState().columnFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant="outline"
                className="flex items-center gap-1"
              >
                {filter.id}: {filter.value as string}
                <button
                  className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  onClick={() =>
                    table.getColumn(filter.id)?.setFilterValue(undefined)
                  }
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => table.resetColumnFilters()}
            >
              清除全部
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isNumeric = header.column.columnDef.meta?.isNumeric;

                    return (
                      <TableHead
                        key={header.id}
                        className={isNumeric ? "text-right" : ""}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-1">
                            <div
                              className={
                                header.column.getCanSort()
                                  ? "cursor-pointer select-none flex items-center gap-1"
                                  : ""
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: <IconArrowUp className="h-3 w-3" />,
                                desc: <IconArrowDown className="h-3 w-3" />,
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>

                            {/* 列筛选器 */}
                            {header.column.getCanFilter() && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4"
                                  >
                                    <IconFilter className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <div className="p-2">
                                    <Input
                                      placeholder={`筛选 ${header.column.id}...`}
                                      value={
                                        (header.column.getFilterValue() as string) ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        header.column.setFilterValue(
                                          e.target.value
                                        )
                                      }
                                      className="min-w-[200px]"
                                    />
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            {renderTableContent()}
          </Table>
        </div>
      </CardContent>

      {/* 分页控制 */}
      <CardFooter className="flex items-center justify-between py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {Object.keys(rowSelection).length > 0 && (
            <div className="flex items-center gap-1">
              已选择{" "}
              <Badge variant="outline">
                {Object.keys(rowSelection).length}
              </Badge>{" "}
              行
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                清除
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="flex items-center gap-1">
            <span className="text-sm">每页:</span>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-[100px] items-center justify-center text-sm">
            第 {table.getState().pagination.pageIndex + 1} 页， 共{" "}
            {table.getPageCount()} 页
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">上一页</span>
              <IconCustomArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">下一页</span>
              <IconCustomArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
