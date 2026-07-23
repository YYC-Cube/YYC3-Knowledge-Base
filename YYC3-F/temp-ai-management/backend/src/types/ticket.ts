/**
 * 工单系统类型定义
 */

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  assignedTo?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tags?: string[];
  slaDeadline?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  authorId: string;
  authorName: string;
  isInternal: boolean;
  attachments?: TicketAttachment[];
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  action: TicketAction;
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: Date;
  comment?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  overdue: number;
  averageResolutionTime: number;
  slaCompliance: number;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: string[];
  createdBy?: string[];
  customerName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  isOverdue?: boolean;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tags?: string[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  tags?: string[];
}

export interface TicketSearchRequest {
  query?: string;
  filters?: TicketFilters;
  sortBy?: TicketSortField;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface TicketResponse {
  success: boolean;
  data: Ticket;
  message?: string;
}

export interface TicketListResponse {
  success: boolean;
  data: Ticket[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  message?: string;
}

export interface TicketStatsResponse {
  success: boolean;
  data: TicketStats;
  message?: string;
}

// 枚举类型
export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  PENDING = "pending",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TicketCategory {
  TECHNICAL = "technical",
  BILLING = "billing",
  GENERAL = "general",
  FEATURE_REQUEST = "feature_request",
  BUG_REPORT = "bug_report",
  ACCOUNT = "account",
  RECONCILIATION = "reconciliation",
  AI_ANALYSIS = "ai_analysis",
}

export enum TicketAction {
  CREATED = "created",
  UPDATED = "updated",
  STATUS_CHANGED = "status_changed",
  ASSIGNED = "assigned",
  UNASSIGNED = "unassigned",
  PRIORITY_CHANGED = "priority_changed",
  MESSAGE_ADDED = "message_added",
  ATTACHMENT_ADDED = "attachment_added",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REOPENED = "reopened",
}

export enum TicketSortField {
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  PRIORITY = "priority",
  STATUS = "status",
  SLA_DEADLINE = "slaDeadline",
  CUSTOMER_NAME = "customerName",
  TITLE = "title",
}

// SLA配置
export interface SLAConfig {
  priority: TicketPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

export const DEFAULT_SLA_CONFIG: SLAConfig[] = [
  {
    priority: TicketPriority.URGENT,
    responseTimeHours: 1,
    resolutionTimeHours: 4,
  },
  {
    priority: TicketPriority.HIGH,
    responseTimeHours: 4,
    resolutionTimeHours: 24,
  },
  {
    priority: TicketPriority.MEDIUM,
    responseTimeHours: 8,
    resolutionTimeHours: 48,
  },
  {
    priority: TicketPriority.LOW,
    responseTimeHours: 24,
    resolutionTimeHours: 72,
  },
];

// 工单状态流转规则
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.PENDING,
    TicketStatus.RESOLVED,
    TicketStatus.OPEN,
  ],
  [TicketStatus.PENDING]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [TicketStatus.OPEN],
};

// 工单通知事件
export interface TicketNotificationEvent {
  type:
    | "ticket_created"
    | "ticket_updated"
    | "ticket_assigned"
    | "ticket_resolved"
    | "sla_breach";
  ticketId: string;
  ticketNumber: string;
  message: string;
  recipients: string[];
  data?: Record<string, any>;
}

// AI分析相关类型
export interface TicketAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  keywords: string[];
  summary: string;
}

export interface ReplyRecommendation {
  content: string;
  confidence: number;
  tone: string;
  suggestedActions: string[];
}

export interface CustomerSatisfactionPrediction {
  score: number;
  factors: string[];
  confidence: number;
}

export interface SmartDataExtraction {
  entities: Record<string, string>;
  keyIssues: string[];
  requiredActions: string[];
}

export interface BatchClassificationResult {
  ticketId: string;
  category: string;
  confidence: number;
}
