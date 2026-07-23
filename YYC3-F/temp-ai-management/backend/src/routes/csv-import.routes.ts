import { Router, type Request, type Response, type NextFunction } from "express"
import multer from "multer"
import { CsvImportService } from "../services/csv-import.service"
import { authenticate as authMiddleware, authorize as checkPermission } from "../middleware/auth.middleware"
import { rateLimiter } from "../middleware/rate-limiter.middleware"
import { logger } from "../config/logger"

const router = Router()
const csvImportService = new CsvImportService()

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true)
    } else {
      cb(new Error("Only CSV files are allowed"))
    }
  },
})

router.use(authMiddleware)

/**
 * @route   POST /api/csv-import/upload
 * @desc    上传并导入 CSV 文件
 * @access  Private (需要 reconciliation:import 权限)
 */
router.post(
  "/upload",
  checkPermission(["reconciliation:import"]),
  rateLimiter({ windowMs: 300000, max: 5 }),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        })
      }

      const userId = (req as any).user.id
      const result = await csvImportService.importCsv(req.file.buffer, req.file.originalname, userId)

      logger.info("CSV import completed", {
        userId,
        fileName: req.file.originalname,
        result,
      })

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/csv-import/batches
 * @desc    获取导入批次列表
 * @access  Private (需要 reconciliation:read 权限)
 */
router.get(
  "/batches",
  checkPermission(["reconciliation:read"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        limit: Number.parseInt(req.query.limit as string) || 50,
        offset: Number.parseInt(req.query.offset as string) || 0,
      }

      const result = await csvImportService.getBatches(filters)

      res.json({
        success: true,
        data: result.batches,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)

/**
 * @route   GET /api/csv-import/export-exceptions
 * @desc    导出异常记录为 CSV
 * @access  Private (需要 reconciliation:export 权限)
 */
router.get(
  "/export-exceptions",
  checkPermission(["reconciliation:export"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exceptionIds = (req.query.ids as string)?.split(",") || []

      if (exceptionIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No exception IDs provided",
        })
      }

      const csvBuffer = await csvImportService.exportExceptions(exceptionIds)

      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", `attachment; filename="exceptions-${Date.now()}.csv"`)
      res.send(csvBuffer)
    } catch (error) {
      next(error)
    }
  },
)

module.exports = router;
