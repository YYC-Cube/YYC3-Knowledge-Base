/**
 * U5: ESM状态自动更新 (P1)
 * 
 * 功能:
 * - 扫描磁盘章节文件
 * - 自动统计字数
 * - 更新`.fbs/esm-state.json`
 * - 禁止手写
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * ESM状态自动更新器
 */
export class ESMStateAutoUpdater {
  constructor(bookRoot) {
    this.bookRoot = bookRoot;
    this.esmStatePath = path.join(bookRoot, '.fbs', 'esm-state.json');
    this.chaptersPattern = 'ch*/**/*.md';
  }

  /**
   * 自动更新ESM状态
   * @returns {Promise<Object>}
   */
  async update() {
    console.log('\n🔄 [U5-P1] 自动更新ESM状态...');
    console.log(`   书籍根目录: ${this.bookRoot}`);
    
    // 1. 扫描磁盘章节文件
    console.log('\n🔍 [U5-P1] 扫描章节文件...');
    const chapterFiles = await this.scanChapterFiles();
    console.log(`   找到 ${chapterFiles.length} 个章节文件`);
    
    // 2. 统计字数和章节数
    console.log('\n📊 [U5-P1] 统计字数和章节数...');
    const stats = await this.collectStats(chapterFiles);
    console.log(`   完成章节: ${stats.completedChapters}`);
    console.log(`   实际字数: ${stats.actualWordCount.toLocaleString()}字`);
    
    // 3. 读取当前ESM状态
    let currentState = this.loadCurrentState();
    
    // 4. 更新状态
    const newState = this.updateState(currentState, stats);
    
    // 5. 保存新状态
    await this.saveState(newState);
    
    console.log('\n✅ [U5-P1] ESM状态更新完成');
    
    return newState;
  }

  /**
   * 扫描章节文件
   * @returns {Promise<Array>}
   */
  async scanChapterFiles() {
    try {
      const files = await glob(this.chaptersPattern, {
        cwd: this.bookRoot,
        absolute: false
      });
      
      // 过滤掉隐藏文件和临时文件
      return files.filter(file => 
        !file.startsWith('.') && 
        !file.includes('.tmp') &&
        !file.includes('~')
      );
    } catch (error) {
      console.error('❌ [U5-P1] 扫描章节文件失败:', error.message);
      return [];
    }
  }

  /**
   * 收集统计信息
   * @param {Array} chapterFiles - 章节文件列表
   * @returns {Promise<Object>}
   */
  async collectStats(chapterFiles) {
    let actualWordCount = 0;
    const chapterStats = [];
    
    for (const file of chapterFiles) {
      const filepath = path.join(this.bookRoot, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // 统计中文字数
      const wordCount = this.countChineseCharacters(content);
      actualWordCount += wordCount;
      
      // 提取章节号
      const chapterNumber = this.extractChapterNumber(file);
      
      chapterStats.push({
        file,
        chapterNumber,
        wordCount,
        lastModified: fs.statSync(filepath).mtime
      });
    }
    
    return {
      completedChapters: chapterStats.length,
      actualWordCount,
      chapterStats
    };
  }

  /**
   * 统计中文字数
   * @param {string} content - 文本内容
   * @returns {number}
   */
  countChineseCharacters(content) {
    // 统计中文字符(包括标点)
    const chineseRegex = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g;
    const matches = content.match(chineseRegex);
    return matches ? matches.length : 0;
  }

  /**
   * 提取章节号
   * @param {string} filepath - 文件路径
   * @returns {number|null}
   */
  extractChapterNumber(filepath) {
    const match = filepath.match(/ch(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * 加载当前ESM状态
   * @returns {Object}
   */
  loadCurrentState() {
    if (!fs.existsSync(this.esmStatePath)) {
      console.log('📄 [U5-P1] ESM状态文件不存在,创建初始状态');
      return this.createInitialState();
    }
    
    try {
      const content = fs.readFileSync(this.esmStatePath, 'utf-8');
      const state = JSON.parse(content);
      console.log('📄 [U5-P1] 读取当前ESM状态');
      return state;
    } catch (error) {
      console.error('❌ [U5-P1] 读取ESM状态失败:', error.message);
      return this.createInitialState();
    }
  }

  /**
   * 创建初始状态
   * @returns {Object}
   */
  createInitialState() {
    return {
      version: 'U5-P1-v1.0',
      currentState: 'IDLE',
      timestamp: Date.now(),
      completedChapters: 0,
      actualWordCount: 0,
      chapterStats: [],
      transitions: []
    };
  }

  /**
   * 更新状态
   * @param {Object} currentState - 当前状态
   * @param {Object} stats - 统计信息
   * @returns {Object}
   */
  updateState(currentState, stats) {
    const newState = {
      ...currentState,
      timestamp: Date.now(),
      completedChapters: stats.completedChapters,
      actualWordCount: stats.actualWordCount,
      chapterStats: stats.chapterStats,
      lastUpdatedAt: new Date().toISOString()
    };
    
    // 记录状态转换
    const transition = {
      from: currentState.currentState,
      to: 'UPDATED',
      timestamp: Date.now(),
      reason: 'auto_update',
      changes: {
        completedChapters: {
          before: currentState.completedChapters,
          after: stats.completedChapters,
          delta: stats.completedChapters - currentState.completedChapters
        },
        actualWordCount: {
          before: currentState.actualWordCount,
          after: stats.actualWordCount,
          delta: stats.actualWordCount - currentState.actualWordCount
        }
      }
    };
    
    if (!newState.transitions) {
      newState.transitions = [];
    }
    newState.transitions.push(transition);
    
    console.log('\n📊 [U5-P1] 状态变更:');
    console.log(`   完成章节: ${currentState.completedChapters} → ${stats.completedChapters}`);
    console.log(`   实际字数: ${currentState.actualWordCount.toLocaleString()} → ${stats.actualWordCount.toLocaleString()}`);
    
    return newState;
  }

  /**
   * 保存状态
   * @param {Object} state - 状态对象
   * @returns {Promise<void>}
   */
  async saveState(state) {
    const stateContent = JSON.stringify(state, null, 2);
    fs.writeFileSync(this.esmStatePath, stateContent, 'utf-8');
    console.log(`\n💾 [U5-P1] ESM状态已保存: ${this.esmStatePath}`);
  }

  /**
   * 获取当前状态
   * @returns {Object|null}
   */
  getState() {
    if (!fs.existsSync(this.esmStatePath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(this.esmStatePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ [U5-P1] 读取ESM状态失败:', error.message);
      return null;
    }
  }

  /**
   * 验证状态完整性
   * @returns {boolean}
   */
  validateState() {
    const state = this.getState();
    
    if (!state) {
      console.warn('⚠️ [U5-P1] ESM状态不存在');
      return false;
    }
    
    // 验证必需字段
    const requiredFields = [
      'version',
      'currentState',
      'timestamp',
      'completedChapters',
      'actualWordCount'
    ];
    
    for (const field of requiredFields) {
      if (!(field in state)) {
        console.error(`❌ [U5-P1] 缺少必需字段: ${field}`);
        return false;
      }
    }
    
    console.log('✅ [U5-P1] ESM状态完整性验证通过');
    return true;
  }

  /**
   * 获取状态摘要
   * @returns {Object}
   */
  getStateSummary() {
    const state = this.getState();
    
    if (!state) {
      return {
        exists: false,
        message: 'ESM状态不存在'
      };
    }
    
    return {
      exists: true,
      version: state.version,
      currentState: state.currentState,
      completedChapters: state.completedChapters,
      actualWordCount: state.actualWordCount,
      lastUpdatedAt: state.lastUpdatedAt,
      transitions: state.transitions?.length || 0
    };
  }
}

/**
 * 快速更新ESM状态
 * @param {string} bookRoot - 书籍根目录
 * @returns {Promise<Object>}
 */
export async function autoUpdateESMState(bookRoot) {
  const updater = new ESMStateAutoUpdater(bookRoot);
  return updater.update();
}

// CLI入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const bookRoot = process.argv[2] || process.cwd();
  
  console.log('========================================');
  console.log('U5: ESM状态自动更新 (P1)');
  console.log('========================================\n');
  
  const updater = new ESMStateAutoUpdater(bookRoot);
  
  updater.update()
    .then((state) => {
      console.log('\n✅ U5 完成');
      console.log('\n状态摘要:');
      console.log(JSON.stringify(updater.getStateSummary(), null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ U5 失败:', error.message);
      process.exit(1);
    });
}

export default ESMStateAutoUpdater;
