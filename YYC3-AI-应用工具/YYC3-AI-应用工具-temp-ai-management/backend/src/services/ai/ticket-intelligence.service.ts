import { OpenAI } from 'openai';
import { pool } from '../../config/database';
import { logger } from '../../config/logger';
import { AppError } from '../../utils/app-error';
import { ErrorCode } from '../../constants/error-codes';
import { TicketAnalysisResult, ReplyRecommendation, CustomerSatisfactionPrediction, SmartDataExtraction, BatchClassificationResult } from '../../types/ticket';

export class TicketIntelligenceService {
  private openai: OpenAI;
  private readonly model = 'gpt-4o';

  constructor() {
    // 初始化OpenAI客户端
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
    });
    
    logger.info('Ticket Intelligence Service initialized');
  }

  /**
   * 分析工单内容，提取情感、紧急程度、分类等信息
   */
  async analyzeTicket(ticketId: string, content: string): Promise<TicketAnalysisResult> {
    try {
      logger.info('Analyzing ticket content', { ticketId });

      const prompt = `Analyze the following ticket content and provide a structured analysis including sentiment, urgency, category, keywords, and a summary.

Ticket Content: ${content}

Please respond in JSON format with the following structure:
{
  "sentiment": "positive" | "negative" | "neutral",
  "urgency": "low" | "medium" | "high" | "critical",
  "category": "A short category name",
  "keywords": ["array", "of", "relevant", "keywords"],
  "summary": "A brief summary of the ticket content"
}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as TicketAnalysisResult;

      // 验证结果
      if (!result.sentiment || !result.urgency || !result.category) {
        throw new Error('Invalid analysis result from AI service');
      }

      logger.info('Ticket analysis completed successfully', { ticketId });
      return result;
    } catch (error) {
      logger.error('Failed to analyze ticket', { ticketId, error });
      throw AppError.internal('Failed to analyze ticket content', ErrorCode.AI_ANALYSIS_FAILED);
    }
  }

  /**
   * 生成工单回复建议
   */
  async generateReplyRecommendation(
    ticketId: string,
    content: string,
    context?: string
  ): Promise<ReplyRecommendation> {
    try {
      logger.info('Generating reply recommendation', { ticketId });

      const contextPrompt = context ? `\n\nContext information:\n${context}` : '';
      
      const prompt = `Generate a professional reply recommendation for the following ticket. The reply should be helpful, empathetic, and address the core issue.\n\nTicket Content: ${content}${contextPrompt}\n\nPlease respond in JSON format with the following structure:\n{\n  "content": "The recommended reply content",\n  "confidence": 0.0-1.0,\n  "tone": "A description of the tone (e.g., professional, empathetic, informative)",\n  "suggestedActions": ["array", "of", "suggested", "actions"]\n}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as ReplyRecommendation;

      if (!result.content) {
        throw new Error('Invalid reply recommendation from AI service');
      }

      logger.info('Reply recommendation generated successfully', { ticketId });
      return result;
    } catch (error) {
      logger.error('Failed to generate reply recommendation', { ticketId, error });
      throw AppError.internal('Failed to generate reply recommendation', ErrorCode.AI_REPLY_GENERATION_FAILED);
    }
  }

  /**
   * 执行情感分析
   */
  async analyzeSentiment(content: string): Promise<{ sentiment: string; score: number }> {
    try {
      logger.info('Performing sentiment analysis');

      const prompt = `Analyze the sentiment of the following text and provide a sentiment label and score.\n\nText: ${content}\n\nPlease respond in JSON format with the following structure:\n{\n  "sentiment": "positive" | "negative" | "neutral",\n  "score": -1.0 to 1.0\n}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      if (!result.sentiment || result.score === undefined) {
        throw new Error('Invalid sentiment analysis result');
      }

      logger.info('Sentiment analysis completed successfully');
      return result;
    } catch (error) {
      logger.error('Failed to perform sentiment analysis', { error });
      throw AppError.internal('Failed to analyze sentiment', ErrorCode.AI_SENTIMENT_ANALYSIS_FAILED);
    }
  }

  /**
   * 智能数据提取
   */
  async extractSmartData(content: string, targetFields?: string[]): Promise<SmartDataExtraction> {
    try {
      logger.info('Extracting smart data from content');

      const fieldsPrompt = targetFields && targetFields.length > 0 
        ? `\n\nTarget fields to extract: ${targetFields.join(', ')}` 
        : '';
      
      const prompt = `Extract structured data from the following content. Identify key entities, main issues, and required actions.${fieldsPrompt}\n\nContent: ${content}\n\nPlease respond in JSON format with the following structure:\n{\n  "entities": {"key": "value"},\n  "keyIssues": ["array", "of", "key", "issues"],\n  "requiredActions": ["array", "of", "required", "actions"]\n}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as SmartDataExtraction;

      if (!result.entities) {
        throw new Error('Invalid data extraction result');
      }

      logger.info('Smart data extraction completed successfully');
      return result;
    } catch (error) {
      logger.error('Failed to extract smart data', { error });
      throw AppError.internal('Failed to extract smart data', ErrorCode.AI_DATA_EXTRACTION_FAILED);
    }
  }

  /**
   * 预测客户满意度
   */
  async predictCustomerSatisfaction(
    ticketId: string,
    content: string,
    customerHistory?: string
  ): Promise<CustomerSatisfactionPrediction> {
    try {
      logger.info('Predicting customer satisfaction', { ticketId });

      const historyPrompt = customerHistory ? `\n\nCustomer history:\n${customerHistory}` : '';
      
      const prompt = `Based on the ticket content and customer history, predict the customer's satisfaction score.\n\nTicket Content: ${content}${historyPrompt}\n\nPlease respond in JSON format with the following structure:\n{\n  "score": 1-10,\n  "factors": ["factors", "influencing", "the", "prediction"],\n  "confidence": 0.0-1.0\n}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}') as CustomerSatisfactionPrediction;

      if (result.score === undefined) {
        throw new Error('Invalid satisfaction prediction result');
      }

      logger.info('Customer satisfaction prediction completed successfully', { ticketId });
      return result;
    } catch (error) {
      logger.error('Failed to predict customer satisfaction', { ticketId, error });
      throw AppError.internal('Failed to predict customer satisfaction', ErrorCode.AI_SATISFACTION_PREDICTION_FAILED);
    }
  }

  /**
   * 批量分类工单
   */
  async batchClassifyTickets(
    tickets: Array<{ id: string; content: string }>,
    categories?: string[]
  ): Promise<BatchClassificationResult[]> {
    try {
      logger.info('Batch classifying tickets', { count: tickets.length });

      const categoriesPrompt = categories && categories.length > 0 
        ? `\n\nAvailable categories: ${categories.join(', ')}` 
        : '';
      
      const prompt = `Classify the following tickets into appropriate categories.${categoriesPrompt}\n\nTickets: ${JSON.stringify(tickets)}\n\nPlease respond in JSON format with an array of objects with the following structure:\n[\n  {\n    "ticketId": "string",\n    "category": "string",\n    "confidence": 0.0-1.0\n  }\n]`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '[]') as BatchClassificationResult[];

      if (!Array.isArray(result)) {
        throw new Error('Invalid batch classification result');
      }

      logger.info('Batch classification completed successfully');
      return result;
    } catch (error) {
      logger.error('Failed to batch classify tickets', { error });
      throw AppError.internal('Failed to batch classify tickets', ErrorCode.AI_BATCH_CLASSIFICATION_FAILED);
    }
  }

  /**
   * 保存AI分析结果到数据库
   */
  async saveAnalysisResult(ticketId: string, analysis: TicketAnalysisResult): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ticket_ai_analyses (ticket_id, sentiment, urgency, category, keywords, summary, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (ticket_id) DO UPDATE
         SET sentiment = $2, urgency = $3, category = $4, keywords = $5, summary = $6, updated_at = NOW()`,
        [ticketId, analysis.sentiment, analysis.urgency, analysis.category, analysis.keywords, analysis.summary]
      );
      
      logger.info('AI analysis result saved to database', { ticketId });
    } catch (error) {
      logger.error('Failed to save AI analysis result', { ticketId, error });
      throw AppError.internal('Failed to save analysis result', ErrorCode.DATABASE_ERROR);
    }
  }
}

// 创建单例实例
export const ticketIntelligenceService = new TicketIntelligenceService();