import type { AiAnalysisRequest, AiAnalysisPrompt } from "../types/ai-analysis"

export class PromptTemplatesService {
  /**
   * 生成系统提示词
   */
  private getSystemPrompt(): string {
    return `你是 YanYu Cloud³ 财务系统的高级数据分析专家，专门负责分析未匹配的财务对账记录。

你的任务是：
1. 分析交易记录未能自动匹配的根本原因
2. 识别数据质量问题、业务流程异常或系统配置问题
3. 提供具体、可执行的解决建议
4. 基于历史数据识别潜在的模式和趋势

分析维度：
- 金额差异（汇率、四舍五入、手续费）
- 时间差异（记账延迟、时区问题）
- 描述不匹配（命名规范、编码问题）
- 缺失信息（参考号、客户名称）
- 重复记录
- 业务流程异常

输出要求：
- 使用专业但易懂的语言
- 提供具体的数字和例子
- 按优先级排序建议
- 标注置信度（0-100）

请以JSON格式输出，包含以下字段：
{
  "rootCause": "根本原因分析",
  "confidence": 85,
  "recommendations": ["建议1", "建议2", "建议3"],
  "suggestedActions": [
    {
      "action": "具体行动",
      "priority": "high|medium|low",
      "estimatedImpact": "预期影响描述"
    }
  ],
  "relatedPatterns": ["相关模式1", "相关模式2"]
}`
  }

  /**
   * 生成用户提示词
   */
  private getUserPrompt(request: AiAnalysisRequest): string {
    const { transactionData, matchingAttempts, historicalContext } = request

    let prompt = `请分析以下未匹配的财务交易记录：

## 交易信息
- 日期：${transactionData.date}
- 金额：${transactionData.amount} ${transactionData.currency}
- 类型：${transactionData.type}
- 描述：${transactionData.description}
${transactionData.reference ? `- 参考号：${transactionData.reference}` : ""}
${transactionData.customerName ? `- 客户名称：${transactionData.customerName}` : ""}
`

    if (matchingAttempts && matchingAttempts.length > 0) {
      prompt += `\n## 匹配尝试历史\n系统已尝试以下匹配，但均未达到阈值：\n`
      matchingAttempts.forEach((attempt, index) => {
        prompt += `${index + 1}. 相似度 ${attempt.similarity}% - ${attempt.reason}\n`
      })
    }

    if (historicalContext) {
      prompt += `\n## 历史上下文
- 相似交易数量：${historicalContext.similarTransactions}
- 平均交易金额：${historicalContext.averageAmount}
${historicalContext.frequentCustomers.length > 0 ? `- 常见客户：${historicalContext.frequentCustomers.join(", ")}` : ""}
`
    }

    prompt += `\n请基于以上信息，分析该记录未能匹配的根本原因，并提供专业的解决建议。`

    return prompt
  }

  /**
   * 构建完整的分析提示词
   */
  buildAnalysisPrompt(request: AiAnalysisRequest): AiAnalysisPrompt {
    return {
      systemMessage: this.getSystemPrompt(),
      userMessage: this.getUserPrompt(request),
      temperature: 0.3,
      maxTokens: 2000,
    }
  }

  /**
   * 构建批量分析提示词
   */
  buildBatchAnalysisPrompt(requests: AiAnalysisRequest[]): AiAnalysisPrompt {
    const systemMessage = this.getSystemPrompt() + "\n\n注意：这是一个批量分析任务，请为每条记录提供单独的分析结果。"

    let userMessage = `请分析以下 ${requests.length} 条未匹配的财务交易记录：\n\n`

    requests.forEach((request, index) => {
      userMessage += `### 记录 ${index + 1} (ID: ${request.recordId})\n`
      userMessage += this.getUserPrompt(request)
      userMessage += "\n---\n\n"
    })

    return {
      systemMessage,
      userMessage,
      temperature: 0.3,
      maxTokens: 4000,
    }
  }

  /**
   * 生成异常趋势分析提示词
   */
  buildTrendAnalysisPrompt(summary: {
    totalExceptions: number
    exceptionsByType: Record<string, number>
    exceptionsBySeverity: Record<string, number>
    topCustomers: string[]
    timeRange: { start: string; end: string }
  }): AiAnalysisPrompt {
    const systemMessage = `你是 YanYu Cloud³ 财务系统的数据分析专家。请分析财务异常的整体趋势和模式。

输出JSON格式：
{
  "overallTrend": "整体趋势描述",
  "keyFindings": ["发现1", "发现2"],
  "riskAreas": ["风险领域1", "风险领域2"],
  "recommendations": ["建议1", "建议2"]
}`

    const userMessage = `请分析以下财务异常数据趋势：

时间范围：${summary.timeRange.start} 至 ${summary.timeRange.end}
总异常数：${summary.totalExceptions}

异常类型分布：
${Object.entries(summary.exceptionsByType)
  .map(([type, count]) => `- ${type}: ${count} 条`)
  .join("\n")}

严重程度分布：
${Object.entries(summary.exceptionsBySeverity)
  .map(([severity, count]) => `- ${severity}: ${count} 条`)
  .join("\n")}

高频客户：${summary.topCustomers.join(", ")}

请提供趋势分析、风险识别和改进建议。`

    return {
      systemMessage,
      userMessage,
      temperature: 0.4,
      maxTokens: 2000,
    }
  }
}
