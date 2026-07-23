import { Server as HttpServer } from "http"
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client"
import jwt from "jsonwebtoken"
import { WebSocketService } from "../websocket.service"

describe("WebSocketService", () => {
  let httpServer: HttpServer
  let wsService: WebSocketService
  let clientSocket: ClientSocket
  const TEST_PORT = 3002

  beforeAll((done) => {
    httpServer = new HttpServer().listen(TEST_PORT, done)
    wsService = new WebSocketService(httpServer)
  })

  afterAll((done) => {
    wsService.close()
    httpServer.close(done)
  })

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect()
    }
  })

  const generateTestToken = () => {
    return jwt.sign(
      {
        userId: "test-user-123",
        username: "testuser",
        roles: ["admin"],
        departments: ["tech"],
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" },
    )
  }

  test("should connect with valid token", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    clientSocket.on("connect_error", (error) => {
      done(error)
    })
  })

  test("should reject connection without token", (done) => {
    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      done(new Error("Should not connect without token"))
    })

    clientSocket.on("connect_error", (error) => {
      expect(error.message).toContain("Authentication")
      done()
    })
  })

  test("should receive welcome message on connect", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connected", (data) => {
      expect(data.message).toContain("YanYu Cloud³")
      expect(data.clientId).toBeDefined()
      expect(data.timestamp).toBeDefined()
      done()
    })
  })

  test("should handle heartbeat", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      clientSocket.emit("heartbeat", {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        clientId: clientSocket.id,
      })
    })

    clientSocket.on("heartbeat_ack", (data) => {
      expect(data.timestamp).toBeDefined()
      done()
    })
  })

  test("should subscribe to channels", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      clientSocket.emit("subscribe", {
        type: "subscribe",
        channels: ["role:admin", "department:tech"],
      })
    })

    clientSocket.on("subscribed", (data) => {
      expect(data.channels).toContain("role:admin")
      expect(data.channels).toContain("department:tech")
      expect(data.timestamp).toBeDefined()
      done()
    })
  })

  test("should receive notifications", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      wsService.sendNotificationToUser("test-user-123", {
        id: "test-notif-1",
        title: "Test Notification",
        message: "This is a test",
        type: "info",
        priority: "medium",
      })
    })

    clientSocket.on("notification", (message) => {
      expect(message.type).toBe("notification")
      expect(message.payload.title).toBe("Test Notification")
      done()
    })
  })

  test("should broadcast ticket created", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      wsService.broadcastTicketCreated({
        id: "ticket-123",
        ticketNumber: "TKT-2024-001",
        title: "Test Ticket",
        priority: "high",
        status: "open",
        createdBy: "test-user",
      })
    })

    clientSocket.on("ticket_created", (message) => {
      expect(message.type).toBe("ticket_created")
      expect(message.payload.ticketNumber).toBe("TKT-2024-001")
      done()
    })
  })

  test("should track online clients", (done) => {
    const token = generateTestToken()

    clientSocket = ioClient(`http://localhost:${TEST_PORT}`, {
      auth: { token },
      transports: ["websocket"],
    })

    clientSocket.on("connect", () => {
      setTimeout(() => {
        expect(wsService.getOnlineClientsCount()).toBeGreaterThan(0)
        expect(wsService.getOnlineUsers()).toContain("test-user-123")
        done()
      }, 100)
    })
  })
})
