const Redis = require("ioredis")

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: Number.parseInt(process.env.REDIS_DB || "0"),
})

async function flushCache() {
  try {
    console.log("Connecting to Redis...")
    await redis.ping()
    console.log("Connected to Redis successfully")

    const pattern = process.argv[2] || "*"
    console.log(`\nFlushing cache with pattern: ${pattern}`)

    if (pattern === "*") {
      await redis.flushdb()
      console.log("✅ All cache cleared")
    } else {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) {
        console.log("No keys found matching pattern")
      } else {
        const pipeline = redis.pipeline()
        keys.forEach((key) => pipeline.del(key))
        await pipeline.exec()
        console.log(`✅ Cleared ${keys.length} keys`)
      }
    }

    await redis.quit()
    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

flushCache()
