import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"
import { __ENV } from "k6/env"

// Custom metrics
const errorRate = new Rate("errors")
const reconciliationDuration = new Trend("reconciliation_duration")
const ticketCreationDuration = new Trend("ticket_creation_duration")

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 200 }, // Ramp up to 200 users
    { duration: "5m", target: 200 }, // Stay at 200 users
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"], // 95% < 200ms, 99% < 500ms
    http_req_failed: ["rate<0.01"], // Error rate < 1%
    errors: ["rate<0.01"],
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "Bearer test-token-admin"

export default function () {
  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH_TOKEN,
    },
  }

  // Test 1: Get reconciliation records
  const getRecordsStart = Date.now()
  let response = http.get(`${BASE_URL}/api/reconciliation/records?limit=50&offset=0`, params)
  reconciliationDuration.add(Date.now() - getRecordsStart)

  check(response, {
    "get records status is 200": (r) => r.status === 200,
    "get records returns data": (r) => {
      const body = JSON.parse(r.body)
      return body.success === true && Array.isArray(body.data)
    },
  }) || errorRate.add(1)

  sleep(1)

  // Test 2: Get reconciliation stats
  response = http.get(`${BASE_URL}/api/reconciliation/stats`, params)

  check(response, {
    "get stats status is 200": (r) => r.status === 200,
    "get stats returns data": (r) => {
      const body = JSON.parse(r.body)
      return body.success === true && body.data.totalRecords >= 0
    },
  }) || errorRate.add(1)

  sleep(1)

  // Test 3: Create reconciliation record
  const recordPayload = JSON.stringify({
    transactionDate: new Date().toISOString().split("T")[0],
    transactionType: "payment",
    amount: Math.floor(Math.random() * 100000) + 1000,
    currency: "CNY",
    description: `Test transaction ${Date.now()}`,
    category: "sales",
    customerName: "Performance Test Customer",
  })

  response = http.post(`${BASE_URL}/api/reconciliation/records`, recordPayload, params)

  check(response, {
    "create record status is 201": (r) => r.status === 201,
    "create record returns id": (r) => {
      const body = JSON.parse(r.body)
      return body.success === true && body.data.id !== undefined
    },
  }) || errorRate.add(1)

  sleep(1)

  // Test 4: Get tickets
  response = http.get(`${BASE_URL}/api/tickets?limit=50`, params)

  check(response, {
    "get tickets status is 200": (r) => r.status === 200,
    "get tickets returns data": (r) => {
      const body = JSON.parse(r.body)
      return body.success === true && Array.isArray(body.data)
    },
  }) || errorRate.add(1)

  sleep(1)

  // Test 5: Create ticket
  const ticketPayload = JSON.stringify({
    title: `Performance test ticket ${Date.now()}`,
    description: "This is a performance test ticket",
    category: "technical",
    priority: "medium",
    customerName: "Test Customer",
    customerEmail: `test${Date.now()}@example.com`,
  })

  const ticketStart = Date.now()
  response = http.post(`${BASE_URL}/api/tickets`, ticketPayload, params)
  ticketCreationDuration.add(Date.now() - ticketStart)

  check(response, {
    "create ticket status is 201": (r) => r.status === 201,
    "create ticket returns ticket number": (r) => {
      const body = JSON.parse(r.body)
      return body.success === true && body.data.ticketNumber !== undefined
    },
  }) || errorRate.add(1)

  sleep(2)
}

export function handleSummary(data) {
  return {
    "performance-test-results.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  }
}

function textSummary(data, options) {
  const { indent = "", enableColors = false } = options || {}
  let output = "\n"

  output += `${indent}Test Summary:\n`
  output += `${indent}  Scenarios: ${data.metrics.scenarios?.values?.count || 0}\n`
  output += `${indent}  Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`
  output += `${indent}  Duration: ${data.state?.testRunDurationMs / 1000}s\n\n`

  output += `${indent}Response Times:\n`
  output += `${indent}  Avg: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2)}ms\n`
  output += `${indent}  P95: ${data.metrics.http_req_duration?.values["p(95)"]?.toFixed(2)}ms\n`
  output += `${indent}  P99: ${data.metrics.http_req_duration?.values["p(99)"]?.toFixed(2)}ms\n\n`

  output += `${indent}Error Rate: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2)}%\n`

  return output
}
