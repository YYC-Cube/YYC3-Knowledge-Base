import { describe, it, expect } from "@jest/globals";
import DataVisualizationUtils from "../../lib/data-visualization-utils";

describe("DataVisualizationUtils", () => {
  const mockData = [
    { category: "A", value: 10, score: 85 },
    { category: "B", value: 20, score: 92 },
    { category: "A", value: 15, score: 78 },
    { category: "C", value: 30, score: 95 },
    { category: "B", value: 25, score: 88 },
  ];

  describe("aggregateData", () => {
    it("should aggregate data by category with sum operation", () => {
      const result = DataVisualizationUtils.aggregateData(
        mockData,
        "category",
        [{ field: "value", operation: "sum" }]
      );

      expect(result).toHaveLength(3);
      expect(result.find((item) => item.category === "A")?.value_sum).toBe(25);
      expect(result.find((item) => item.category === "B")?.value_sum).toBe(45);
      expect(result.find((item) => item.category === "C")?.value_sum).toBe(30);
    });

    it("should aggregate data with average operation", () => {
      const result = DataVisualizationUtils.aggregateData(
        mockData,
        "category",
        [{ field: "score", operation: "avg" }]
      );

      expect(
        result.find((item) => item.category === "A")?.score_avg
      ).toBeCloseTo(81.5);
      expect(result.find((item) => item.category === "B")?.score_avg).toBe(90);
      expect(result.find((item) => item.category === "C")?.score_avg).toBe(95);
    });
  });

  describe("filterData", () => {
    it("should filter data with equals operator", () => {
      const result = DataVisualizationUtils.filterData(mockData, [
        { field: "category", operator: "equals", value: "A" },
      ]);

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.category === "A")).toBe(true);
    });

    it("should filter data with greaterThan operator", () => {
      const result = DataVisualizationUtils.filterData(mockData, [
        { field: "score", operator: "greaterThan", value: 85 },
      ]);

      expect(result).toHaveLength(3);
      expect(result.every((item) => item.score > 85)).toBe(true);
    });
  });

  describe("sortData", () => {
    it("should sort data in ascending order", () => {
      const result = DataVisualizationUtils.sortData(mockData, [
        { field: "value", direction: "asc" },
      ]);

      expect(result[0].value).toBe(10);
      expect(result[result.length - 1].value).toBe(30);
    });

    it("should sort data in descending order", () => {
      const result = DataVisualizationUtils.sortData(mockData, [
        { field: "score", direction: "desc" },
      ]);

      expect(result[0].score).toBe(95);
      expect(result[result.length - 1].score).toBe(78);
    });
  });

  describe("generateColorScheme", () => {
    it("should generate correct number of colors", () => {
      const colors = DataVisualizationUtils.generateColorScheme(5);
      expect(colors).toHaveLength(5);
    });

    it("should generate different color schemes", () => {
      const defaultColors = DataVisualizationUtils.generateColorScheme(
        3,
        "default"
      );
      const vibrantColors = DataVisualizationUtils.generateColorScheme(
        3,
        "vibrant"
      );

      expect(defaultColors).not.toEqual(vibrantColors);
    });
  });

  describe("formatNumber", () => {
    it("should format number as currency", () => {
      const result = DataVisualizationUtils.formatNumber(1234.56, "currency");
      expect(result).toContain("¥");
      expect(result).toContain("1,234.56");
    });

    it("should format number as percent", () => {
      const result = DataVisualizationUtils.formatNumber(0.1234, "percent");
      expect(result).toContain("%");
    });

    it("should format number in compact notation", () => {
      const result = DataVisualizationUtils.formatNumber(1234567, "compact");
      expect(result).toMatch(/\d+[万千]?/);
    });
  });

  describe("detectDataType", () => {
    it("should detect number type", () => {
      expect(DataVisualizationUtils.detectDataType(123)).toBe("number");
      expect(DataVisualizationUtils.detectDataType("123")).toBe("number");
    });

    it("should detect boolean type", () => {
      expect(DataVisualizationUtils.detectDataType(true)).toBe("boolean");
      expect(DataVisualizationUtils.detectDataType(false)).toBe("boolean");
    });

    it("should detect date type", () => {
      expect(DataVisualizationUtils.detectDataType(new Date())).toBe("date");
      expect(DataVisualizationUtils.detectDataType("2024-01-01")).toBe("date");
    });

    it("should detect string type", () => {
      expect(DataVisualizationUtils.detectDataType("hello")).toBe("string");
    });
  });

  describe("calculateStatistics", () => {
    it("should calculate correct statistics", () => {
      const result = DataVisualizationUtils.calculateStatistics(
        mockData,
        "value"
      );

      expect(result.count).toBe(5);
      expect(result.sum).toBe(100);
      expect(result.avg).toBe(20);
      expect(result.min).toBe(10);
      expect(result.max).toBe(30);
    });

    it("should handle empty data", () => {
      const result = DataVisualizationUtils.calculateStatistics([], "value");

      expect(result.count).toBe(0);
      expect(result.sum).toBe(0);
      expect(result.avg).toBe(0);
    });
  });

  describe("paginateData", () => {
    it("should paginate data correctly", () => {
      const result = DataVisualizationUtils.paginateData(mockData, 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(result.totalItems).toBe(5);
    });

    it("should handle last page with fewer items", () => {
      const result = DataVisualizationUtils.paginateData(mockData, 3, 2);

      expect(result.data).toHaveLength(1);
      expect(result.currentPage).toBe(3);
    });
  });

  describe("generateMockData", () => {
    it("should generate correct amount of mock data", () => {
      const result = DataVisualizationUtils.generateMockData(10, [
        { name: "name", type: "string" },
        { name: "value", type: "number" },
        { name: "active", type: "boolean" },
        { name: "date", type: "date" },
      ]);

      expect(result).toHaveLength(10);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("value");
      expect(result[0]).toHaveProperty("active");
      expect(result[0]).toHaveProperty("date");
    });
  });

  describe("transformToChartData", () => {
    it("should transform data for regular charts", () => {
      const result = DataVisualizationUtils.transformToChartData(mockData, {
        xField: "category",
        yFields: ["value", "score"],
      });

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty("category");
      expect(result[0]).toHaveProperty("value");
      expect(result[0]).toHaveProperty("score");
    });

    it("should transform data for pie charts", () => {
      const result = DataVisualizationUtils.transformToChartData(mockData, {
        xField: "category",
        yFields: [],
        categoryField: "category",
        valueField: "value",
      });

      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("value");
    });
  });
});
