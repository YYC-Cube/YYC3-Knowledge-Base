import { CacheService } from "../cache.service"
import { redis } from "../../config/redis"
import jest from "jest"

// Mock Redis
jest.mock("../../config/redis", () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
  },
}))

jest.mock("../../config/logger")
jest.mock("../../config/metrics")

describe("CacheService", () => {
  let cacheService: CacheService

  beforeEach(() => {
    cacheService = new CacheService()
    jest.clearAllMocks()
  })

  describe("get", () => {
    it("should return cached data on cache hit", async () => {
      const testData = { id: "123", name: "Test" }
      ;(redis.get as jest.Mock).mockResolvedValue(JSON.stringify(testData))

      const result = await cacheService.get("test-key")

      expect(result).toEqual(testData)
      expect(redis.get).toHaveBeenCalledWith("test-key")
    })

    it("should return null on cache miss", async () => {
      ;(redis.get as jest.Mock).mockResolvedValue(null)

      const result = await cacheService.get("test-key")

      expect(result).toBeNull()
      expect(redis.get).toHaveBeenCalledWith("test-key")
    })

    it("should return null on error", async () => {
      ;(redis.get as jest.Mock).mockRejectedValue(new Error("Redis error"))

      const result = await cacheService.get("test-key")

      expect(result).toBeNull()
    })

    it("should use prefix when provided", async () => {
      ;(redis.get as jest.Mock).mockResolvedValue(null)

      await cacheService.get("test-key", { prefix: "app" })

      expect(redis.get).toHaveBeenCalledWith("app:test-key")
    })
  })

  describe("set", () => {
    it("should set data with default TTL", async () => {
      const testData = { id: "123", name: "Test" }
      ;(redis.setex as jest.Mock).mockResolvedValue("OK")

      const result = await cacheService.set("test-key", testData)

      expect(result).toBe(true)
      expect(redis.setex).toHaveBeenCalledWith(
        "test-key",
        3600, // default TTL
        JSON.stringify(testData),
      )
    })

    it("should set data with custom TTL", async () => {
      const testData = { id: "123", name: "Test" }
      ;(redis.setex as jest.Mock).mockResolvedValue("OK")

      const result = await cacheService.set("test-key", testData, { ttl: 600 })

      expect(result).toBe(true)
      expect(redis.setex).toHaveBeenCalledWith("test-key", 600, JSON.stringify(testData))
    })

    it("should return false on error", async () => {
      ;(redis.setex as jest.Mock).mockRejectedValue(new Error("Redis error"))

      const result = await cacheService.set("test-key", { test: "data" })

      expect(result).toBe(false)
    })
  })

  describe("delete", () => {
    it("should delete cache key", async () => {
      ;(redis.del as jest.Mock).mockResolvedValue(1)

      const result = await cacheService.delete("test-key")

      expect(result).toBe(true)
      expect(redis.del).toHaveBeenCalledWith("test-key")
    })

    it("should return false when key does not exist", async () => {
      ;(redis.del as jest.Mock).mockResolvedValue(0)

      const result = await cacheService.delete("test-key")

      expect(result).toBe(false)
    })
  })

  describe("deletePattern", () => {
    it("should delete all keys matching pattern", async () => {
      ;(redis.keys as jest.Mock).mockResolvedValue(["key1", "key2", "key3"])
      ;(redis.del as jest.Mock).mockResolvedValue(3)

      const result = await cacheService.deletePattern("test:*")

      expect(result).toBe(3)
      expect(redis.keys).toHaveBeenCalledWith("test:*")
      expect(redis.del).toHaveBeenCalledWith("key1", "key2", "key3")
    })

    it("should return 0 when no keys match", async () => {
      ;(redis.keys as jest.Mock).mockResolvedValue([])

      const result = await cacheService.deletePattern("test:*")

      expect(result).toBe(0)
      expect(redis.del).not.toHaveBeenCalled()
    })
  })

  describe("exists", () => {
    it("should return true when key exists", async () => {
      ;(redis.exists as jest.Mock).mockResolvedValue(1)

      const result = await cacheService.exists("test-key")

      expect(result).toBe(true)
      expect(redis.exists).toHaveBeenCalledWith("test-key")
    })

    it("should return false when key does not exist", async () => {
      ;(redis.exists as jest.Mock).mockResolvedValue(0)

      const result = await cacheService.exists("test-key")

      expect(result).toBe(false)
    })
  })

  describe("ttl", () => {
    it("should return remaining TTL", async () => {
      ;(redis.ttl as jest.Mock).mockResolvedValue(300)

      const result = await cacheService.ttl("test-key")

      expect(result).toBe(300)
      expect(redis.ttl).toHaveBeenCalledWith("test-key")
    })
  })

  describe("getOrSet", () => {
    it("should return cached value when available", async () => {
      const testData = { id: "123", name: "Test" }
      ;(redis.get as jest.Mock).mockResolvedValue(JSON.stringify(testData))

      const fetcher = jest.fn()
      const result = await cacheService.getOrSet("test-key", fetcher)

      expect(result).toEqual(testData)
      expect(fetcher).not.toHaveBeenCalled()
    })

    it("should call fetcher and cache result on cache miss", async () => {
      const testData = { id: "123", name: "Test" }
      ;(redis.get as jest.Mock).mockResolvedValue(null)
      ;(redis.setex as jest.Mock).mockResolvedValue("OK")

      const fetcher = jest.fn().mockResolvedValue(testData)
      const result = await cacheService.getOrSet("test-key", fetcher)

      expect(result).toEqual(testData)
      expect(fetcher).toHaveBeenCalled()
      expect(redis.setex).toHaveBeenCalled()
    })
  })

  describe("increment", () => {
    it("should increment counter", async () => {
      ;(redis.incr as jest.Mock).mockResolvedValue(5)

      const result = await cacheService.increment("counter")

      expect(result).toBe(5)
      expect(redis.incr).toHaveBeenCalledWith("counter")
    })
  })

  describe("decrement", () => {
    it("should decrement counter", async () => {
      ;(redis.decr as jest.Mock).mockResolvedValue(3)

      const result = await cacheService.decrement("counter")

      expect(result).toBe(3)
      expect(redis.decr).toHaveBeenCalledWith("counter")
    })
  })

  describe("getStats", () => {
    it("should calculate correct hit rate", async () => {
      // Simulate some cache hits and misses
      ;(redis.get as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ data: "test1" }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ data: "test2" }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify({ data: "test3" }))

      await cacheService.get("key1")
      await cacheService.get("key2")
      await cacheService.get("key3")
      await cacheService.get("key4")
      await cacheService.get("key5")

      const stats = cacheService.getStats()

      expect(stats.hits).toBe(3)
      expect(stats.misses).toBe(2)
      expect(stats.total).toBe(5)
      expect(stats.hitRate).toBe("60.00%")
    })
  })
})
