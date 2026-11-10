import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"
import { __ENV } from "k6"

// 自定义指标
const cacheHitRate = new Rate("cache_hit_rate")
const cacheResponseTime = new Trend("cache_response_time")
const dbResponseTime = new Trend("db_response_time")

export const options = {
  stages: [
    { duration: "2m", target: 50 }, // Warm up cache
    { duration: "5m", target: 100 }, // Test cache performance
    { duration: "3m", target: 200 }, // Stress test
    { duration: "2m", target: 0 }, // Cool down
  ],
  thresholds: {
    cache_hit_rate: ["rate>0.8"], // 80% cache hit rate
    cache_response_time: ["p(95)<100"], // 95% under 100ms
    db_response_time: ["p(95)<500"], // 95% under 500ms
    http_req_duration: ["p(95)<200"], // Overall 95% under 200ms
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001"
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "Bearer test_token"

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Authorization: AUTH_TOKEN,
  }

  // Test 1: Get reconciliation stats (should be heavily cached)
  const statsStart = Date.now()
  const statsRes = http.get(`${BASE_URL}/api/reconciliation/stats`, { headers })
  const statsTime = Date.now() - statsStart

  check(statsRes, {
    "stats status is 200": (r) => r.status === 200,
    "stats has data": (r) => r.json("data") !== undefined,
  })

  // Check if response came from cache (custom header or response time)
  const isCached = statsTime < 50 // Assume < 50ms is cached
  cacheHitRate.add(isCached ? 1 : 0)

  if (isCached) {
    cacheResponseTime.add(statsTime)
  } else {
    dbResponseTime.add(statsTime)
  }

  // Test 2: Get records list (paginated, should be cached per page)
  const page = Math.floor(Math.random() * 10) // Random page 0-9
  const recordsStart = Date.now()
  const recordsRes = http.get(`${BASE_URL}/api/reconciliation/records?limit=50&offset=${page * 50}`, { headers })
  const recordsTime = Date.now() - recordsStart

  check(recordsRes, {
    "records status is 200": (r) => r.status === 200,
    "records has data": (r) => r.json("data") !== undefined,
  })

  const isRecordsCached = recordsTime < 100
  cacheHitRate.add(isRecordsCached ? 1 : 0)

  if (isRecordsCached) {
    cacheResponseTime.add(recordsTime)
  } else {
    dbResponseTime.add(recordsTime)
  }

  // Test 3: Get specific record (should be cached)
  const recordId = `rec-${Math.floor(Math.random() * 1000) + 1}`
  const recordStart = Date.now()
  const recordRes = http.get(`${BASE_URL}/api/reconciliation/records/${recordId}`, { headers })
  const recordTime = Date.now() - recordStart

  if (recordRes.status === 200) {
    const isRecordCached = recordTime < 50
    cacheHitRate.add(isRecordCached ? 1 : 0)

    if (isRecordCached) {
      cacheResponseTime.add(recordTime)
    } else {
      dbResponseTime.add(recordTime)
    }
  }

  // Test 4: Get exceptions list (should be cached)
  const exceptionsStart = Date.now()
  const exceptionsRes = http.get(`${BASE_URL}/api/reconciliation/exceptions?status=pending&limit=20`, { headers })
  const exceptionsTime = Date.now() - exceptionsStart

  check(exceptionsRes, {
    "exceptions status is 200": (r) => r.status === 200,
  })

  const isExceptionsCached = exceptionsTime < 100
  cacheHitRate.add(isExceptionsCached ? 1 : 0)

  if (isExceptionsCached) {
    cacheResponseTime.add(exceptionsTime)
  } else {
    dbResponseTime.add(exceptionsTime)
  }

  sleep(1)
}

export function handleSummary(data) {
  const cacheHitRateValue = data.metrics.cache_hit_rate.values.rate * 100
  const avgCacheTime = data.metrics.cache_response_time.values.avg
  const avgDbTime = data.metrics.db_response_time.values.avg
  const improvement = (((avgDbTime - avgCacheTime) / avgDbTime) * 100).toFixed(2)

  console.log("\n=== Cache Performance Summary ===")
  console.log(`Cache Hit Rate: ${cacheHitRateValue.toFixed(2)}%`)
  console.log(`Avg Cache Response Time: ${avgCacheTime.toFixed(2)}ms`)
  console.log(`Avg DB Response Time: ${avgDbTime.toFixed(2)}ms`)
  console.log(`Performance Improvement: ${improvement}%`)
  console.log("================================\n")

  return {
    "cache-performance-summary.json": JSON.stringify(data, null, 2),
  }
}
