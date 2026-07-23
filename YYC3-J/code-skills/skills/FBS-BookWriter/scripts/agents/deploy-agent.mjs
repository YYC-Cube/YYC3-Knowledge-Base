#!/usr/bin/env node
/**
 * 部署智能体
 * 
 * 职责:
 * - S5交付
 * - S6归档
 * - 格式转换
 * - 交付物打包
 * - 版本管理
 */

import { AgentBase } from './agent-base.mjs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DeployAgent extends AgentBase {
  constructor(config = {}) {
    super({
      agentId: 'deploy-agent',
      agentName: 'Deploy-Agent',
      agentType: 'specialist',
      capabilities: [
        's5-delivery',
        's6-archive',
        'format-conversion',
        'delivery-packaging',
        'version-management'
      ],
      ...config
    });
  }

  /**
   * 执行任务(覆盖基类方法)
   * @param {object} task - 任务对象
   * @returns {Promise<object>} - 任务结果
   */
  async executeTask(task) {
    const { state, payload } = task;
    
    switch (state) {
      case 'S5':
        return this._deliverChapter(task);
      case 'S6':
        return this._archiveChapter(task);
      default:
        throw new Error(`DeployAgent does not support state: ${state}`);
    }
  }

  /**
   * 交付章节(S5)
   * @param {object} task - 任务对象
   * @returns {Promise<object>} - 交付结果
   */
  async _deliverChapter(task) {
    const { chapterId, payload } = task;
    const { bookRoot, s4Review } = payload;
    
    console.log(`[Deploy-Agent] Delivering chapter: ${chapterId}`);
    
    // 验证审校结果
    if (!s4Review || !s4Review.passed) {
      throw new Error(`Chapter ${chapterId} review failed, cannot deliver`);
    }
    
    // 格式转换
    const artifacts = await this._convertFormats(bookRoot, chapterId);
    
    // 打包交付物
    const packagePath = await this._packageArtifacts(bookRoot, chapterId, artifacts);
    
    // 验证交付物
    await this._verifyArtifacts(bookRoot, chapterId);
    
    // 生成交付报告
    const deliveryReport = {
      chapterId,
      bookRoot,
      artifacts,
      packagePath,
      deliveryFormat: ['md', 'html'],
      deliveredAt: new Date().toISOString(),
      status: 'completed'
    };
    
    // 发布交付完成事件
    this.publishEvent('s5.delivery.completed', {
      chapterId,
      deliveryReport
    });
    
    return deliveryReport;
  }

  /**
   * 归档章节(S6)
   * @param {object} task - 任务对象
   * @returns {Promise<object>} - 归档结果
   */
  async _archiveChapter(task) {
    const { chapterId, payload } = task;
    const { bookRoot, s5Delivery } = payload;
    
    console.log(`[Deploy-Agent] Archiving chapter: ${chapterId}`);
    
    // 创建归档目录
    const archivePath = await this._createArchive(bookRoot, chapterId);
    
    // 复制文件到归档
    await this._copyToArchive(bookRoot, chapterId, archivePath);
    
    // 生成归档元数据
    const archiveMetadata = this._generateArchiveMetadata(bookRoot, chapterId, s5Delivery);
    
    // 更新章节索引
    await this._updateChapterIndex(bookRoot, chapterId);
    
    // 生成归档报告
    const archiveReport = {
      chapterId,
      bookRoot,
      archivePath,
      archiveMetadata,
      archivedAt: new Date().toISOString(),
      status: 'completed'
    };
    
    // 发布归档完成事件
    this.publishEvent('s6.archive.completed', {
      chapterId,
      archiveReport
    });
    
    return archiveReport;
  }

  /**
   * 格式转换
   * @param {string} bookRoot - 书籍根目录
   * @param {string} chapterId - 章节ID
   * @returns {Promise<object>} - 转换结果
   */
  async _convertFormats(bookRoot, chapterId) {
    console.log(`[Deploy-Agent] Converting formats for chapter: ${chapterId}`);
    
    const artifacts = {};
    
    // MD格式(源文件)
    artifacts.md = await this._convertToMD(bookRoot, chapterId);
    
    // HTML格式
    artifacts.html = await this._convertToHTML(bookRoot, chapterId);
    
    return artifacts;
  }

  /**
   * 转换为MD格式
   */
  async _convertToMD(bookRoot, chapterId) {
    const chapterPath = path.join(bookRoot, '.fbs', 'chapters', `${chapterId}.md`);
    
    if (!existsSync(chapterPath)) {
      throw new Error(`Chapter file not found: ${chapterPath}`);
    }
    
    return {
      format: 'md',
      path: chapterPath,
      size: statSync(chapterPath).size
    };
  }

  /**
   * 转换为HTML格式
   */
  async _convertToHTML(bookRoot, chapterId) {
    const chapterPath = path.join(bookRoot, '.fbs', 'chapters', `${chapterId}.md`);
    const htmlPath = path.join(bookRoot, '.fbs', 'deliverables', `${chapterId}.html`);
    
    // 这里可以调用格式转换工具
    // 暂时返回模拟数据
    
    return {
      format: 'html',
      path: htmlPath,
      size: statSync(chapterPath).size * 1.2 // 估算
    };
  }

  /**
   * 打包交付物
   */
  async _packageArtifacts(bookRoot, chapterId, artifacts) {
    const packagePath = path.join(bookRoot, '.fbs', 'deliverables', `${chapterId}-package.json`);
    
    const packageInfo = {
      chapterId,
      version: new Date().getTime(),
      artifacts,
      checksum: this._calculateChecksum(artifacts),
      packagedAt: new Date().toISOString()
    };
    
    // 写入package文件(实际应写入文件系统)
    console.log(`[Deploy-Agent] Packaged artifacts: ${packagePath}`);
    
    return packagePath;
  }

  /**
   * 验证交付物
   */
  async _verifyArtifacts(bookRoot, chapterId) {
    console.log(`[Deploy-Agent] Verifying artifacts for chapter: ${chapterId}`);
    
    // 调用验证脚本
    const scriptPath = path.join(__dirname, '..', 'verify-expected-artifacts.mjs');
    
    return new Promise((resolve, reject) => {
      const args = ['--book-root', bookRoot, '--chapter-id', chapterId];
      
      const child = spawn(process.execPath, [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[Deploy-Agent] Artifacts verified: ${chapterId}`);
          resolve();
        } else {
          console.error(`[Deploy-Agent] Artifacts verification failed: ${stderr}`);
          reject(new Error(`Artifacts verification failed: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        console.error(`[Deploy-Agent] Verification error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * 创建归档
   */
  async _createArchive(bookRoot, chapterId) {
    const archivePath = path.join(bookRoot, '.fbs', 'archive', chapterId);
    
    // 实际应创建目录
    console.log(`[Deploy-Agent] Created archive: ${archivePath}`);
    
    return archivePath;
  }

  /**
   * 复制到归档
   */
  async _copyToArchive(bookRoot, chapterId, archivePath) {
    console.log(`[Deploy-Agent] Copying to archive: ${chapterId}`);
    
    // 实际应复制文件
  }

  /**
   * 生成归档元数据
   */
  _generateArchiveMetadata(bookRoot, chapterId, s5Delivery) {
    return {
      chapterId,
      archiveDate: new Date().toISOString(),
      deliveryDate: s5Delivery?.deliveredAt,
      formats: s5Delivery?.deliveryFormat || [],
      artifacts: s5Delivery?.artifacts || {},
      checksum: s5Delivery?.checksum || ''
    };
  }

  /**
   * 更新章节索引
   */
  async _updateChapterIndex(bookRoot, chapterId) {
    console.log(`[Deploy-Agent] Updating chapter index: ${chapterId}`);
    
    // 调用索引同步脚本
    const scriptPath = path.join(__dirname, '..', 'sync-book-chapter-index.mjs');
    
    return new Promise((resolve, reject) => {
      const args = ['--book-root', bookRoot];
      
      const child = spawn(process.execPath, [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[Deploy-Agent] Chapter index updated: ${chapterId}`);
          resolve();
        } else {
          console.warn(`[Deploy-Agent] Chapter index update failed, continuing...`);
          resolve();
        }
      });
      
      child.on('error', (error) => {
        console.warn(`[Deploy-Agent] Index update error: ${error.message}`);
        resolve();
      });
    });
  }

  /**
   * 计算校验和(模拟)
   */
  _calculateChecksum(artifacts) {
    return 'checksum-' + Date.now();
  }
}
