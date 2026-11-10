// 默认颜色方案
const DEFAULT_COLORS = [
  "#3366CC",
  "#DC3912",
  "#FF9900",
  "#109618",
  "#990099",
  "#0099C6",
  "#DD4477",
  "#66AA00",
  "#B82E2E",
  "#316395",
];

export class DataVisualizationUtils {
  // 数据聚合方法
  static aggregateData(
    data: any[],
    groupBy: string,
    operations: {
      field: string;
      operation: "sum" | "avg" | "count" | "min" | "max";
    }[]
  ): any[] {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy];
      if (!acc[key]) {
        acc[key] = { [groupBy]: key, _count: 0 };
      }

      operations.forEach(({ field, operation }) => {
        const value = item[field];
        const current = acc[key][`${field}_${operation}`] || 0;

        switch (operation) {
          case "sum":
            acc[key][`${field}_sum`] = current + (Number(value) || 0);
            break;
          case "avg":
            acc[key][`${field}_avg`] = current + (Number(value) || 0);
            break;
          case "count":
            acc[key][`${field}_count`] = current + 1;
            break;
          case "min":
            if (current === 0 || Number(value) < current) {
              acc[key][`${field}_min`] = Number(value) || 0;
            }
            break;
          case "max":
            if (Number(value) > current) {
              acc[key][`${field}_max`] = Number(value) || 0;
            }
            break;
        }
      });

      acc[key]._count++;
      return acc;
    }, {});

    // 处理平均值
    Object.values(grouped).forEach((group: any) => {
      operations.forEach(({ field, operation }) => {
        if (operation === "avg") {
          group[`${field}_avg`] = group[`${field}_avg`] / group._count;
        }
      });
    });

    return Object.values(grouped);
  }

  // 数据过滤方法
  static filterData(
    data: any[],
    filters: { field: string; operator: string; value: any }[]
  ): any[] {
    return data.filter((item) => {
      return filters.every((filter) => {
        const itemValue = item[filter.field];

        switch (filter.operator) {
          case "equals":
            return itemValue === filter.value;
          case "notEquals":
            return itemValue !== filter.value;
          case "contains":
            return String(itemValue).includes(String(filter.value));
          case "greaterThan":
            return Number(itemValue) > Number(filter.value);
          case "lessThan":
            return Number(itemValue) < Number(filter.value);
          case "between":
            return (
              Number(itemValue) >= Number(filter.value[0]) &&
              Number(itemValue) <= Number(filter.value[1])
            );
          default:
            return true;
        }
      });
    });
  }

  // 数据排序方法
  static sortData(
    data: any[],
    sortBy: { field: string; direction: "asc" | "desc" }[]
  ): any[] {
    return [...data].sort((a, b) => {
      for (const sort of sortBy) {
        const aValue = a[sort.field];
        const bValue = b[sort.field];

        if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  // 生成颜色方案
  static generateColorScheme(
    count: number,
    scheme: string = "default"
  ): string[] {
    const schemes: { [key: string]: string[] } = {
      default: DEFAULT_COLORS,
      pastel: [
        "#AEC6CF",
        "#FFB3BA",
        "#BAFFC9",
        "#FFDFBA",
        "#B5C9FF",
        "#E6C9FF",
        "#FFC9F0",
        "#C9FFF0",
        "#FFFAC9",
        "#D4C9FF",
      ],
      vibrant: [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7",
        "#DDA0DD",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E9",
      ],
      monochrome: [
        "#8B93FF",
        "#6F78FF",
        "#535DFF",
        "#3742FF",
        "#1B27FF",
        "#0008FF",
        "#0006CC",
        "#000499",
        "#000266",
        "#000133",
      ],
    };

    const selectedScheme = schemes[scheme] || schemes.default;
    const colors: string[] = [];

    for (let i = 0; i < count; i++) {
      colors.push(selectedScheme[i % selectedScheme.length]);
    }

    return colors;
  }

  // 格式化数字
  static formatNumber(value: number, format: string = "default"): string {
    const formats: { [key: string]: Intl.NumberFormat } = {
      currency: new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      }),
      percent: new Intl.NumberFormat("zh-CN", {
        style: "percent",
        minimumFractionDigits: 2,
      }),
      compact: new Intl.NumberFormat("zh-CN", {
        notation: "compact",
      }),
      default: new Intl.NumberFormat("zh-CN"),
    };

    const formatter = formats[format] || formats.default;
    return formatter.format(value);
  }

  // 检测数据类型
  static detectDataType(value: any): "string" | "number" | "date" | "boolean" {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (value instanceof Date) return "date";

    // 检查是否为纯数字字符串
    if (
      typeof value === "string" &&
      !isNaN(Number(value)) &&
      value.trim() !== ""
    ) {
      return "number";
    }

    // 检查是否为日期字符串
    if (typeof value === "string" && !isNaN(Date.parse(value))) {
      // 排除纯数字字符串被误判为日期
      if (!/^\d+$/.test(value)) {
        return "date";
      }
    }

    return "string";
  }

  // 数据转换为图表格式
  static transformToChartData(
    data: any[],
    config: {
      xField: string;
      yFields: string[];
      categoryField?: string;
      valueField?: string;
    }
  ): any[] {
    if (config.categoryField && config.valueField) {
      // 饼图数据格式
      return data.map((item) => ({
        name: item[config.categoryField!],
        value: Number(item[config.valueField!]) || 0,
        ...item,
      }));
    }

    // 其他图表数据格式
    return data.map((item) => {
      const result: any = { [config.xField]: item[config.xField] };

      config.yFields.forEach((field) => {
        result[field] = Number(item[field]) || 0;
      });

      return result;
    });
  }

  // 计算统计信息
  static calculateStatistics(data: any[], field: string) {
    const values = data
      .map((item) => Number(item[field]))
      .filter((val) => !isNaN(val));

    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        median: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      count: values.length,
      sum,
      avg,
      min,
      max,
      median,
    };
  }

  // 数据分页
  static paginateData<T>(
    data: T[],
    page: number,
    pageSize: number
  ): {
    data: T[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
  } {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: data.slice(startIndex, endIndex),
      totalPages,
      currentPage,
      totalItems,
    };
  }

  // 生成模拟数据
  static generateMockData(
    count: number,
    fields: { name: string; type: "string" | "number" | "date" | "boolean" }[]
  ): any[] {
    const data: any[] = [];

    for (let i = 0; i < count; i++) {
      const item: any = {};

      fields.forEach((field) => {
        switch (field.type) {
          case "string":
            item[field.name] = `项目${i + 1}`;
            break;
          case "number":
            item[field.name] = Math.floor(Math.random() * 1000);
            break;
          case "date":
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            item[field.name] = date.toISOString().split("T")[0];
            break;
          case "boolean":
            item[field.name] = Math.random() > 0.5;
            break;
        }
      });

      data.push(item);
    }

    return data;
  }
}

// 导出常用的数据处理函数
export const {
  aggregateData,
  filterData,
  sortData,
  generateColorScheme,
  formatNumber,
  detectDataType,
  transformToChartData,
  calculateStatistics,
  paginateData,
  generateMockData,
} = DataVisualizationUtils;

export default DataVisualizationUtils;
