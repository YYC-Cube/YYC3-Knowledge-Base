import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { API } from '../configs/api.config';
import { ProjectService } from './project.service';
import { CmdService } from './cmd.service';
import { WorkflowService, ProcessState } from './workflow.service';
import { TranslateService } from '@ngx-translate/core';
import { NoticeService } from './notice.service';
import { LogOptions, LogService } from './log.service';
import { satisfies, valid, gt, minVersion, coerce } from 'semver';
import { AppDataResourceLockService } from './appdata-resource-lock.service';
import { BlocklyLibraryPackageService } from './blockly-library-package.service';

interface GlobalDependencyUsageFile {
  version: 1;
  dependencies: Record<string, number>;
}

const GLOBAL_DEPENDENCY_USAGE_FILE = 'dependency-usage.json';

@Injectable({
  providedIn: 'root'
})
export class NpmService {
  constructor(
    private http: HttpClient,
    private electronService: ElectronService,
    private prjService: ProjectService,
    private cmdService: CmdService,
    private workflowService: WorkflowService,
    private translate: TranslateService,
    private noticeService: NoticeService,
    private logService: LogService,
    private appDataResourceLock: AppDataResourceLockService,
    private blocklyLibraryPackageService: BlocklyLibraryPackageService
  ) {
    this.logService.stateSubject.subscribe((log) => {
      this.handleBoardDependencyProgressLog(log);
    });
  }

  isInstalling = false;
  private boardDependencyInstallProgress?: BoardDependencyInstallProgress;
  private boardDepsInstallPromise?: Promise<void>;

  private getNpmErrorMessage(error: any): string {
    return (error?.message || String(error)).replace(/^Error invoking remote method 'npm-run': Error:\s*/i, '');
  }

  private traceToAppLog(event: string, data: any = {}): void {
    try {
      if (window['ipcRenderer']?.invoke) {
        void window['ipcRenderer']
          .invoke('log-info', `[PROC_TRACE][NPM_SERVICE_${event}] ${JSON.stringify(data)}`)
          .catch(() => {});
      }
    } catch {
      // 诊断日志不能影响安装流程
    }
  }

  private clampProgress(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private updateBoardDependencyNotice(progress: BoardDependencyInstallProgress, value: number) {
    const nextProgress = Math.max(progress.lastProgress, this.clampProgress(value));
    progress.lastProgress = nextProgress;

    this.noticeService.update({
      title: this.translate.instant('NPM.DEPENDENCY_INSTALLING_TITLE'),
      text: this.translate.instant('NPM.INSTALLING_DEPENDENCY', { name: progress.name }),
      state: 'doing',
      progress: nextProgress
    });
  }

  private parseDependencyProgressLog(log: LogOptions): { phase: 'download' | 'extract', percent: number } | null {
    const text = String(log?.detail || log?.title || '').trim();
    if (!text) {
      return null;
    }

    if (/^(下载完成|Download complete)[:：]/i.test(text)) {
      return { phase: 'download', percent: 100 };
    }

    const match = text.match(/^(下载进度|Download progress|解压进度|Extract progress)[:：]?\s*(\d+(?:\.\d+)?)/i);
    if (!match) {
      return null;
    }

    const percent = Math.max(0, Math.min(100, Number(match[2])));
    const isDownload = /^(下载进度|Download progress)/i.test(match[1]);
    return {
      phase: isDownload ? 'download' : 'extract',
      percent
    };
  }

  private handleBoardDependencyProgressLog(log: LogOptions) {
    const progress = this.boardDependencyInstallProgress;
    if (!progress) {
      return;
    }

    const parsed = this.parseDependencyProgressLog(log);
    if (!parsed) {
      return;
    }

    if (parsed.phase === 'download') {
      progress.downloadProgress = Math.max(progress.downloadProgress, parsed.percent);
    } else {
      // 收到解压进度说明下载必然已完成，避免 downloadProgress=0 导致整体进度偏低
      progress.downloadProgress = 100;
      progress.extractProgress = Math.max(progress.extractProgress, parsed.percent);
    }

    const singleDependencyProgress = progress.downloadProgress * 0.5 + progress.extractProgress * 0.5;
    const overallProgress = ((progress.index + singleDependencyProgress / 100) / progress.total) * 100;
    this.updateBoardDependencyNotice(progress, overallProgress);
  }

  async init() {
    if (this.electronService.isElectron) {
      window['ipcRenderer'].on('window-receive', async (event, message) => {
        // console.log("npm-exec: ", message);
        const action = message.data.action;
        // console.log("action: ", action);
        if (action !== "npm-exec") {
          return;
        }

        const subAction = message.data.detail.action;
        const subData = message.data.detail.data;

        if (subAction === 'install-board-dependencies') {
          const packageJson = JSON.parse(window['fs'].readFileSync(subData));
          await this.installBoardDependencies(packageJson)
        } else if (subAction === 'install-board') {
          const packagePath = await this.installBoard(subData)
          console.log("packagePath: ", packagePath);
          const packageJson = JSON.parse(window['fs'].readFileSync(packagePath));
          await this.installBoardDependencies(packageJson)
        } else if (subAction === 'install-tool') {
          let tool = subData;
          if (typeof (tool) === 'string') {
            tool = JSON.parse(tool);
          }
          await this.installTool(tool);
        } else if (subAction === 'install-sdk') {
          let sdk = subData;
          if (typeof (sdk) === 'string') {
            sdk = JSON.parse(sdk);
          }
          await this.installSDK(sdk);
        } else if (subAction === 'install-compiler') {
          let compiler = subData;
          if (typeof (compiler) === 'string') {
            compiler = JSON.parse(compiler);
          }
          await this.installCompiler(compiler);
        } else if (subAction === 'uninstall-board') {
          let board = subData;
          if (typeof (board) === 'string') {
            board = JSON.parse(board);
          }
          await this.uninstallBoard(board);
        } else if (subAction === 'uninstall-tool') {
          let tool = subData;
          if (typeof (tool) === 'string') {
            tool = JSON.parse(tool);
          }

          await this.uninstallTool(tool);
        } else if (subAction === 'uninstall-sdk') {
          let sdk = subData;
          if (typeof (sdk) === 'string') {
            sdk = JSON.parse(sdk);
          }
          await this.uninstallSDK(sdk);
        } else if (subAction === 'uninstall-compiler') {
          let compiler = subData;
          if (typeof (compiler) === 'string') {
            compiler = JSON.parse(compiler);
          }
          await this.uninstallCompiler(compiler);
        }

        console.log("messageId: ", message.messageId);
        if (message.messageId) {
          console.log("发送消息: ", message.messageId);
          window['ipcRenderer'].send('main-window-response', {
            messageId: message.messageId,
            result: 'success'
          })
        }
      });
    }
  }

  // 安装开发板
  async installBoard(board: any) {
    if (typeof (board) === 'string') {
      board = JSON.parse(board);
    }
    this.isInstalling = true;
    this.workflowService.startInstall();
    // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
    const appDataPath = window['path'].getAppDataPath();
    const cmd = `npm install ${board.name}@${board.version} --prefix "${appDataPath}"`;
    // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING', { name: board.name }), timeout: 300000 });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.INSTALLING_TITLE'), 
      text: this.translate.instant('NPM.INSTALLING', { name: board.name }), 
      state: 'doing',
      showProgress: false,
      setTimeout: 300000
    });
    try {
      await this.appDataResourceLock.runExclusive(`npm:install-board:${board.name}`, () => window['npm'].run({ cmd: cmd }));
    } catch (error) {
      const errorMessage = this.getNpmErrorMessage(error);
      console.error(`安装开发板 ${board.name} 失败:`, error);
      this.noticeService.update({
        title: this.translate.instant('NPM.INSTALL_FAILED_TITLE'),
        text: this.translate.instant('NPM.INSTALLING', { name: board.name }),
        detail: errorMessage,
        state: 'error'
      });
      this.isInstalling = false;
      this.workflowService.finishInstall(false, errorMessage);
      throw error;
    }

    // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.BOARD_INSTALL_COMPLETE') });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.INSTALL_COMPLETE_TITLE'), 
      text: this.translate.instant('NPM.BOARD_INSTALL_COMPLETE'), 
      state: 'done',
      setTimeout: 3000
    });
    this.isInstalling = false;
    this.workflowService.finishInstall(true);
    // return template/package.json
    return `${appDataPath}/node_modules/${board.name}/template/package.json`;
  }

  async installBoardDeps() {
    if (this.boardDepsInstallPromise) {
      return this.boardDepsInstallPromise;
    }

    this.boardDepsInstallPromise = (async () => {
      this.isInstalling = true;
      const installStateStarted = this.workflowService.startInstall();

      try {
        const boardPackageJson = await this.prjService.getBoardPackageJson() || {};
        const projectPackageJson = await this.prjService.getPackageJson() || {};
        try {
          await this.recordGlobalDependencyUsage(projectPackageJson, boardPackageJson);
        } catch (error) {
          console.warn('Failed to record global dependency usage:', error);
        }
        // console.log("boardPackageJson: ", boardPackageJson);
        await this.installBoardDependencies(boardPackageJson, false);
        if (installStateStarted && this.workflowService.currentState === ProcessState.INSTALLING) {
          this.workflowService.finishInstall(true);
        }
      } catch (error) {
        const errorMessage = this.getNpmErrorMessage(error);
        if (installStateStarted && this.workflowService.currentState === ProcessState.INSTALLING) {
          this.workflowService.finishInstall(false, errorMessage);
        }
        throw error;
      } finally {
        this.isInstalling = false;
        this.boardDependencyInstallProgress = undefined;
        this.boardDepsInstallPromise = undefined;
      }
    })();

    return this.boardDepsInstallPromise;
  }

  async removeGlobalDependencies(unusedDays: 30 | 90 | null): Promise<string[]> {
    const appDataPath = window['path'].getAppDataPath();

    return this.appDataResourceLock.runExclusive(`npm:remove-global-dependencies:${unusedDays ?? 'all'}`, async () => {
      const now = Date.now();
      const dependencyNames = this.getDeclaredGlobalDependencyNames(appDataPath);
      const usage = this.syncGlobalDependencyUsage(appDataPath, dependencyNames, now);
      this.writeGlobalDependencyUsage(appDataPath, usage);

      const cutoff = unusedDays === null ? Number.POSITIVE_INFINITY : now - unusedDays * 24 * 60 * 60 * 1000;
      const packagesToRemove = dependencyNames.filter((name) => usage.dependencies[name] <= cutoff);
      if (packagesToRemove.length === 0) {
        return [];
      }

      const invalidPackageName = packagesToRemove.find((name) => !this.isValidNpmPackageName(name));
      if (invalidPackageName) {
        throw new Error(`Invalid npm package name: ${invalidPackageName}`);
      }

      const cmd = `npm uninstall ${packagesToRemove.join(' ')} --prefix "${appDataPath}"`;
      await window['npm'].run({ cmd });

      const remainingNames = new Set(this.getDeclaredGlobalDependencyNames(appDataPath));
      for (const name of Object.keys(usage.dependencies)) {
        if (!remainingNames.has(name)) {
          delete usage.dependencies[name];
        }
      }
      this.writeGlobalDependencyUsage(appDataPath, usage);

      return packagesToRemove;
    });
  }

  private async recordGlobalDependencyUsage(projectPackageJson: any, boardPackageJson: any): Promise<void> {
    const appDataPath = window['path'].getAppDataPath();
    const usedNames = new Set<string>([
      ...this.getDependencyNames(projectPackageJson),
      ...Object.keys(boardPackageJson?.boardDependencies || {})
    ]);
    if (typeof boardPackageJson?.name === 'string' && boardPackageJson.name) {
      usedNames.add(boardPackageJson.name);
    }

    await this.appDataResourceLock.runExclusive('npm:record-global-dependency-usage', () => {
      const now = Date.now();
      const dependencyNames = this.getDeclaredGlobalDependencyNames(appDataPath);
      const declaredNames = new Set(dependencyNames);
      const usage = this.syncGlobalDependencyUsage(appDataPath, dependencyNames, now);

      for (const name of usedNames) {
        if (declaredNames.has(name)) {
          usage.dependencies[name] = now;
        }
      }

      this.writeGlobalDependencyUsage(appDataPath, usage);
    });
  }

  private getDeclaredGlobalDependencyNames(appDataPath: string): string[] {
    const packageJsonPath = window['path'].join(appDataPath, 'package.json');
    if (!window['fs'].existsSync(packageJsonPath)) {
      return [];
    }

    const packageJson = JSON.parse(window['fs'].readFileSync(packageJsonPath, 'utf8'));
    return this.getDependencyNames(packageJson).sort((a, b) => a.localeCompare(b));
  }

  private getDependencyNames(packageJson: any): string[] {
    const names = new Set<string>();
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const dependencies = packageJson?.[field];
      if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
        continue;
      }
      Object.keys(dependencies).forEach((name) => names.add(name));
    }
    return Array.from(names);
  }

  private syncGlobalDependencyUsage(
    appDataPath: string,
    dependencyNames: string[],
    now: number
  ): GlobalDependencyUsageFile {
    const current = this.readGlobalDependencyUsage(appDataPath);
    const dependencies: Record<string, number> = {};

    for (const name of dependencyNames) {
      dependencies[name] = current.dependencies[name] || now;
    }

    return { version: 1, dependencies };
  }

  private readGlobalDependencyUsage(appDataPath: string): GlobalDependencyUsageFile {
    const usagePath = window['path'].join(appDataPath, GLOBAL_DEPENDENCY_USAGE_FILE);
    try {
      if (!window['fs'].existsSync(usagePath)) {
        return { version: 1, dependencies: {} };
      }

      const parsed = JSON.parse(window['fs'].readFileSync(usagePath, 'utf8'));
      const dependencies: Record<string, number> = {};
      for (const [name, timestamp] of Object.entries(parsed?.dependencies || {})) {
        const value = Number(timestamp);
        if (Number.isFinite(value) && value > 0) {
          dependencies[name] = value;
        }
      }
      return { version: 1, dependencies };
    } catch (error) {
      console.warn('Failed to read global dependency usage, resetting it:', error);
      return { version: 1, dependencies: {} };
    }
  }

  private writeGlobalDependencyUsage(appDataPath: string, usage: GlobalDependencyUsageFile): void {
    const usagePath = window['path'].join(appDataPath, GLOBAL_DEPENDENCY_USAGE_FILE);
    window['fs'].writeFileSync(usagePath, JSON.stringify(usage, null, 2), 'utf8');
  }

  private isValidNpmPackageName(name: string): boolean {
    return /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name);
  }

  boardDependenciesChanged = false;

  /** 已安装版本是否满足 boardDependencies 中的声明（支持 ^ / ~ 等，与 npm 行为一致） */
  private depVersionSatisfiesDecl(installedVersion: string, declared: string): boolean {
    const ins = String(installedVersion ?? '').trim();
    const dec = String(declared ?? '').trim();
    if (!ins || !dec) {
      return false;
    }
    if (ins === dec) {
      return true;
    }
    if (!valid(ins)) {
      return false;
    }
    try {
      return satisfies(ins, dec, { includePrerelease: true });
    } catch {
      return false;
    }
  }

  /**
   * 已安装版本是否高于声明所允许的最低基线（用于判断是否需先卸载再降级；升级场景不卸载）
   */
  private installedIsNewerThanDeclared(installedVersion: string, declared: string): boolean {
    const ins = String(installedVersion ?? '').trim();
    const dec = String(declared ?? '').trim();
    if (!ins || !dec || !valid(ins)) {
      return false;
    }
    let baseline: string | null = null;
    try {
      const m = minVersion(dec);
      baseline = m ? m.version : null;
    } catch {
      baseline = null;
    }
    if (!baseline || !valid(baseline)) {
      const c = coerce(dec);
      baseline = c ? c.version : null;
    }
    if (!baseline || !valid(baseline)) {
      return false;
    }
    try {
      return gt(ins, baseline);
    } catch {
      return false;
    }
  }

  getMissingBoardDependencies(packageJson: any): string[] {
    const appDataPath = window['path'].getAppDataPath();
    const boardDependencies = packageJson?.boardDependencies || {};
    const missingDependencies: string[] = [];

    for (const [key, version] of Object.entries(boardDependencies)) {
      const declaredVersion = String(version);
      const depPathPackageJson = `${appDataPath}/node_modules/${key}/package.json`;

      if (!window['path'].isExists(depPathPackageJson)) {
        missingDependencies.push(`${key}@${declaredVersion}`);
        continue;
      }

      try {
        const depPackageJson = JSON.parse(window['fs'].readFileSync(depPathPackageJson));
        if (!this.depVersionSatisfiesDecl(depPackageJson.version, declaredVersion)) {
          missingDependencies.push(`${key}@${declaredVersion} (installed ${depPackageJson.version || 'unknown'})`);
        }
      } catch {
        missingDependencies.push(`${key}@${declaredVersion}`);
      }
    }

    return missingDependencies;
  }

  // 安装开发板依赖
  async installBoardDependencies(packageJson: any, manageInstallState: boolean = true) {
    try {
      if (manageInstallState) {
        this.isInstalling = true;
        this.workflowService.startInstall();
      }
      this.boardDependenciesChanged = false;
      this.boardDependencyInstallProgress = undefined;
      console.log('开始安装开发板依赖...');
      // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
      const appDataPath = window['path'].getAppDataPath();
      const boardDependencies = packageJson.boardDependencies || {};
      const dependenciesToInstall: BoardDependencyToInstall[] = [];
      this.traceToAppLog('DEPS_START', {
        packageName: packageJson?.name || '',
        packageVersion: packageJson?.version || '',
        dependencyCount: Object.keys(boardDependencies).length
      });

      // console.log("boardDependencies: ", boardDependencies);

      for (const [key, version] of Object.entries(boardDependencies)) {
        const declaredVersion = String(version);
        const depPath = `${appDataPath}/node_modules/${key}`;
        const depPathPackageJson = `${depPath}/package.json`;
        let installedVersionWhenMismatch: string | undefined;
        // 检查依赖是否已经安装
        if (window['path'].isExists(depPathPackageJson)) {
          const depPackageJson = JSON.parse(window['fs'].readFileSync(depPathPackageJson));
          if (this.depVersionSatisfiesDecl(depPackageJson.version, declaredVersion)) {
            console.log(`依赖 ${key} 已安装，版本满足声明 (${depPackageJson.version} satisfies ${version})`);
            this.traceToAppLog('DEP_SKIP', { name: key, declaredVersion, installedVersion: depPackageJson.version });
            continue;
          }
          installedVersionWhenMismatch = depPackageJson.version;
        }

        const needUninstallForDowngrade =
          window['path'].isExists(depPath) &&
          installedVersionWhenMismatch !== undefined &&
          this.installedIsNewerThanDeclared(installedVersionWhenMismatch, declaredVersion);

        dependenciesToInstall.push({
          name: key,
          version: declaredVersion,
          needUninstallForDowngrade
        });
        this.traceToAppLog('DEP_PLAN', { name: key, declaredVersion, installedVersionWhenMismatch, needUninstallForDowngrade });
      }

      if (dependenciesToInstall.length === 0) {
        if (manageInstallState && this.workflowService.currentState === ProcessState.INSTALLING) {
          this.workflowService.finishInstall(true);
        }
        return;
      }

      this.boardDependenciesChanged = true;

      await this.appDataResourceLock.runExclusive(`npm:board-dependencies:${packageJson?.name || ''}`, async () => {
        for (let index = 0; index < dependenciesToInstall.length; index++) {
          const dependency = dependenciesToInstall[index];
          const progress: BoardDependencyInstallProgress = {
            total: dependenciesToInstall.length,
            index,
            name: dependency.name,
            downloadProgress: 0,
            extractProgress: 0,
            lastProgress: Math.max(1, this.clampProgress((index / dependenciesToInstall.length) * 100))
          };
          this.boardDependencyInstallProgress = progress;

          // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING_DEPENDENCY', { name: key }), timeout: 300000 });
          this.updateBoardDependencyNotice(progress, progress.lastProgress);

          // 仅当当前安装版本高于声明基线（需降级）时先卸载；升级或未读到版本时直接 install，避免无谓卸载
          if (dependency.needUninstallForDowngrade) {
            const uninstallCmd = `npm uninstall ${dependency.name} --prefix "${appDataPath}"`;
            console.log(`执行命令: ${uninstallCmd}, 时间: ${new Date().toISOString()}`);
            this.traceToAppLog('DEP_UNINSTALL_START', { name: dependency.name, version: dependency.version });
            await window['npm'].run({ cmd: uninstallCmd });
          }

          // --save-exact：与开发板声明版本一致写入 prefix 下 package.json，避免 ^ 导致再次解析到更高版
          const npmCmd = `npm install ${dependency.name}@${dependency.version} --save-exact --prefix "${appDataPath}"`;
          console.log(`执行命令: ${npmCmd}, 时间: ${new Date().toISOString()}`);
          this.traceToAppLog('DEP_INSTALL_START', { name: dependency.name, version: dependency.version });

          await window['npm'].run({ cmd: npmCmd });

          this.updateBoardDependencyNotice(progress, ((index + 1) / dependenciesToInstall.length) * 100);
          console.log(`依赖 ${dependency.name} 安装成功, 时间: ${new Date().toISOString()}`);
          this.traceToAppLog('DEP_INSTALL_DONE', { name: dependency.name, version: dependency.version });
        }
      });

      // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.BOARD_DEPS_INSTALL_COMPLETE') });
      this.noticeService.update({
        title: this.translate.instant('NPM.INSTALL_COMPLETE_TITLE'),
        text: this.translate.instant('NPM.BOARD_DEPS_INSTALL_COMPLETE'),
        state: 'done',
        progress: 100,
        setTimeout: 3000
      });
      if (manageInstallState && this.workflowService.currentState === ProcessState.INSTALLING) {
        this.workflowService.finishInstall(true);
      }
    } catch (error) {
      const errorMessage = this.getNpmErrorMessage(error);
      console.error(error);
      this.traceToAppLog('DEPS_ERROR', { error: errorMessage });
      // this.uiService.updateFooterState({ state: 'error', text: this.translate.instant('NPM.BOARD_DEPS_INSTALL_FAILED') });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.DEPENDENCY_INSTALL_FAILED_TITLE'), 
        text: this.translate.instant('NPM.BOARD_DEPS_INSTALL_FAILED'), 
        detail: errorMessage,
        state: 'error',
        sendToLog: false
      });
      if (manageInstallState && this.workflowService.currentState === ProcessState.INSTALLING) {
        this.workflowService.finishInstall(false, errorMessage);
      }
      throw error;
    } finally {
      this.boardDependencyInstallProgress = undefined;
      if (manageInstallState) {
        this.isInstalling = false;
      }
    }
  }

  // 卸载开发板依赖
  async uninstallBoardDependencies(depName, packageJson: any) {
    try {
      // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
      const appDataPath = window['path'].getAppDataPath();
      const boardDependenciesToUninstall = packageJson.boardDependencies || {};

      // 获取所有已安装的包
      const installedPackagesList = await this.getInstalledPackageList(appDataPath);
      const installedBoards = [];

      // 从已安装的包中找出开发板（具有template/package.json的包且包名以@aily-project/board-开头）
      for (const packageItem of installedPackagesList) {
        const packageName = '@' + packageItem.split('@')[1];

        // 排除掉被卸载包本身
        if (packageName === depName) {
          continue;
        }

        // 检查包名是否以board-开头
        if (packageName.startsWith('@aily-project/board-')) {
          const boardPath = `${appDataPath}/node_modules/${packageName}`;
          const packageJsonPath = `${boardPath}/template/package.json`;

          if (window['path'].isExists(packageJsonPath)) {
            try {
              const boardPackageJson = JSON.parse(window['fs'].readFileSync(packageJsonPath));
              // 排除当前正在卸载的开发板
              if (packageName !== packageJson.name) {
                installedBoards.push({
                  name: packageName,
                  dependencies: boardPackageJson.boardDependencies || {}
                });
              }
            } catch (error) {
              console.error(`无法读取开发板 ${packageName} 的package.json:`, error);
            }
          }
        }
      }

      // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING_UNUSED_DEPS'), timeout: 300000 });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.UNINSTALLING_TITLE'), 
        text: this.translate.instant('NPM.UNINSTALLING_UNUSED_DEPS'), 
        state: 'doing',
        showProgress: false,
        setTimeout: 300000
      });

      // 检查每个依赖是否被其他开发板使用
      console.log("installedBoards: ", installedBoards);
      await this.appDataResourceLock.runExclusive(`npm:uninstall-board-dependencies:${depName}`, async () => {
        for (const [depName, depVersion] of Object.entries(boardDependenciesToUninstall)) {
          const isUsedByOtherBoards = installedBoards.some(board =>
            board.dependencies && board.dependencies[depName] !== undefined
          );

          if (!isUsedByOtherBoards) {
            // 如果不被其他开发板使用，则卸载它
            try {
              const depPath = `${appDataPath}/node_modules/${depName}`;
              if (!window['path'].isExists(depPath)) {
                console.log(`依赖 ${depName} 未安装，跳过卸载`);
                continue;
              }

              const npmCmd = `npm uninstall ${depName} --prefix "${appDataPath}"`;
              console.log(`执行命令: ${npmCmd}, 时间: ${new Date().toISOString()}`);

              await window['npm'].run({ cmd: npmCmd });

              console.log(`依赖 ${depName} 卸载成功, 时间: ${new Date().toISOString()}`);
            } catch (error) {
              console.error(`依赖 ${depName} 卸载失败:`, error);
            }
          } else {
            console.log(`依赖 ${depName} 被其他开发板使用，跳过卸载`);
          }
        }
      });

      // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.DEPS_UNINSTALL_COMPLETE') });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.UNINSTALL_COMPLETE_TITLE'), 
        text: this.translate.instant('NPM.DEPS_UNINSTALL_COMPLETE'), 
        state: 'done',
        setTimeout: 3000
      });
    } catch (error) {
      console.error('卸载开发板依赖时出错:', error);
      // this.uiService.updateFooterState({ state: 'error', text: this.translate.instant('NPM.DEPS_UNINSTALL_FAILED') });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.UNINSTALL_FAILED_TITLE'), 
        text: this.translate.instant('NPM.DEPS_UNINSTALL_FAILED'), 
        state: 'error'
      });
    }
  }

  // 卸载开发板
  async uninstallBoard(board: any) {
    // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
    const appDataPath = window['path'].getAppDataPath();
    const packageJson = JSON.parse(window['fs'].readFileSync(`${appDataPath}/node_modules/${board.name}/template/package.json`));
    // 卸载开发板
    const cmd = `npm uninstall ${board.name} --prefix "${appDataPath}"`;
    // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING', { name: board.name }), timeout: 300000 });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.UNINSTALLING_TITLE'), 
      text: this.translate.instant('NPM.UNINSTALLING', { name: board.name }), 
      state: 'doing',
      showProgress: false,
      setTimeout: 300000
    });
    // 添加超时保护和正确的参数名
    await this.appDataResourceLock.runExclusive(`npm:uninstall-board:${board.name}`, () => window['npm'].run({ cmd: cmd }));
    // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.BOARD_UNINSTALL_COMPLETE') });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.UNINSTALL_COMPLETE_TITLE'), 
      text: this.translate.instant('NPM.BOARD_UNINSTALL_COMPLETE'), 
      state: 'done',
      setTimeout: 3000
    });

    return packageJson;
  }

  // 通用安装方法
  private async installPackage(packageInfo: any, type: string, version?: string) {
    // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
    const appDataPath = window['path'].getAppDataPath();

    if (!packageInfo || !packageInfo.name) {
      throw new Error(this.translate.instant('NPM.NAME_REQUIRED', { type: type }));
    }

    try {
      await this.appDataResourceLock.runExclusive(`npm:install-package:${packageInfo.name}`, async () => {
        if (version) {
          const nmPath = `${appDataPath}/node_modules/${packageInfo.name}`;
          const pjPath = `${nmPath}/package.json`;
          let installedVer: string | undefined;
          if (window['path'].isExists(pjPath)) {
            try {
              const pj = JSON.parse(window['fs'].readFileSync(pjPath, 'utf8'));
              if (this.depVersionSatisfiesDecl(pj.version, String(version))) {
                console.log(`${type} ${packageInfo.name} 已安装且满足版本声明，跳过 npm install`);
                return;
              }
              installedVer = pj.version;
            } catch {
              /* 无法读取版本时不按「更高版」卸载 */
            }
          }
          if (
            window['path'].isExists(nmPath) &&
            installedVer !== undefined &&
            this.installedIsNewerThanDeclared(installedVer, String(version))
          ) {
            await this.cmdService.runAsyncChecked(
              `npm uninstall ${packageInfo.name} --prefix "${appDataPath}"`,
              appDataPath
            );
          }
        }

        const packageName = version ? `${packageInfo.name}@${version}` : packageInfo.name;
        const cmd = `npm install ${packageName} --save-exact --prefix "${appDataPath}"`;

        // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING', { name: packageInfo.name }), timeout: 300000 });
        this.noticeService.update({ 
          title: this.translate.instant('NPM.INSTALLING_TITLE'), 
          text: this.translate.instant('NPM.INSTALLING', { name: packageInfo.name }), 
          state: 'doing',
          showProgress: false,
          setTimeout: 300000
        });

        await this.cmdService.runAsyncChecked(cmd, appDataPath);
      });

      // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.INSTALL_COMPLETE', { name: packageInfo.name }) });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.INSTALL_COMPLETE_TITLE'), 
        text: this.translate.instant('NPM.INSTALL_COMPLETE', { name: packageInfo.name }), 
        state: 'done',
        setTimeout: 3000
      });
    } catch (error) {
      // this.uiService.updateFooterState({ state: 'error', text: this.translate.instant('NPM.INSTALL_FAILED', { name: packageInfo.name }) });
      this.noticeService.update({ 
        title: this.translate.instant('NPM.INSTALL_FAILED_TITLE'), 
        text: this.translate.instant('NPM.INSTALL_FAILED', { name: packageInfo.name }), 
        state: 'error'
      });
      throw error;
    }
  }

  // 安装工具
  async installTool(tool: any) {
    await this.installPackage(tool, this.translate.instant('NPM.TYPE_TOOL'), tool?.version);
  }

  // 安装SDK
  async installSDK(sdk: any) {
    await this.installPackage(sdk, this.translate.instant('NPM.TYPE_SDK'), sdk?.version);
  }

  // 安装编译器
  async installCompiler(compiler: any) {
    await this.installPackage(compiler, this.translate.instant('NPM.TYPE_COMPILER'), compiler?.version);
  }

  // 通用卸载方法
  private async uninstallPackage(packageInfo: any, type: string) {
    // const appDataPath = this.configService.data.appdata_path[this.configService.data.platform].replace('%HOMEPATH%', window['path'].getUserHome());
    const appDataPath = window['path'].getAppDataPath();

    if (!packageInfo || !packageInfo.name) {
      throw new Error(this.translate.instant('NPM.NAME_REQUIRED', { type: type }));
    }

    const packageNodeModulesPath = `${appDataPath}/node_modules/${packageInfo.name}`;
    if (!window['path'].isExists(packageNodeModulesPath)) {
      console.log(`${type} ${packageInfo.name} 未安装，跳过卸载`);
      return;
    }

    // 尝试执行包的清理脚本
    // let cmd = `cd /d "${packageNodeModulesPath}" && npm run uninstall`;
    // try {
    //   await window['npm'].run({ cmd: cmd });
    // } catch (error) {
    //   console.log(`${type}执行清理失败:`, error);
    // }

    // this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING', { name: packageInfo.name }), timeout: 300000 });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.UNINSTALLING_TITLE'), 
      text: this.translate.instant('NPM.UNINSTALLING', { name: packageInfo.name }), 
      state: 'doing',
      showProgress: false,
      setTimeout: 300000
    });

    let cmd = `npm run uninstall`
    console.log("PackageNodeModulesPath: ", packageNodeModulesPath);
    await this.appDataResourceLock.runExclusive(`npm:run-uninstall-script:${packageInfo.name}`, () => this.cmdService.runAsyncChecked(cmd, packageNodeModulesPath));

    // 卸载包
    cmd = `npm uninstall ${packageInfo.name} --prefix "${appDataPath}"`;
    // await window['npm'].run({ cmd: cmd });
    await this.appDataResourceLock.runExclusive(`npm:uninstall-package:${packageInfo.name}`, () => this.cmdService.runAsyncChecked(cmd, appDataPath));
    // this.uiService.updateFooterState({ state: 'done', text: this.translate.instant('NPM.UNINSTALL_COMPLETE', { name: packageInfo.name }) });
    this.noticeService.update({ 
      title: this.translate.instant('NPM.UNINSTALL_COMPLETE_TITLE'), 
      text: this.translate.instant('NPM.UNINSTALL_COMPLETE', { name: packageInfo.name }), 
      state: 'done',
      setTimeout: 3000
    });
  }

  // 卸载SDK
  async uninstallSDK(sdk: any) {
    await this.uninstallPackage(sdk, this.translate.instant('NPM.TYPE_SDK'));
  }

  // 卸载工具
  async uninstallTool(tool: any) {
    await this.uninstallPackage(tool, this.translate.instant('NPM.TYPE_TOOL'));
  }

  // 卸载编译器
  async uninstallCompiler(compiler: any) {
    await this.uninstallPackage(compiler, this.translate.instant('NPM.TYPE_COMPILER'));
  }

  // 指定获取packageName的可用版本列表
  async getPackageVersionList(packageName: string): Promise<string[]> {
    let data = JSON.parse(await window['npm'].run({ cmd: `npm view ${packageName} versions --json` }))
    let packageVersionList = [];
    if (typeof data === 'string') {
      packageVersionList.push(data);
    } else {
      packageVersionList = data;
    }
    return packageVersionList;
  }

  async getInstalledPackageList(path) {
    let data = JSON.parse(await window['npm'].run({ cmd: `npm list --depth=0 --json --prefix "${path}"` }));
    let installedPackageList = [];
    for (let key in data.dependencies) {
      const item = data.dependencies[key];
      installedPackageList.push(key + '@' + item.version);
    }
    return installedPackageList;
  }

  /**
   * 检查 npm 依赖是否安装完整（仅检查第一层）
   * 通过读取 package.json 的依赖声明，再扫描 node_modules 下对应包的 package.json 做对比
   */
  async installedOk(path) {
    const startTime = performance.now();
    console.log('[installedOk] 开始检查依赖状态...');
    try {
      const packageJsonPath = window['path'].join(path, 'package.json');
      const nodeModulesPath = window['path'].join(path, 'node_modules');

      if (!window['path'].isExists(packageJsonPath)) {
        const elapsed = (performance.now() - startTime).toFixed(1);
        console.log(`[installedOk] package.json 不存在，耗时: ${elapsed}ms`);
        return false;
      }

      const packageJson = JSON.parse(window['fs'].readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
      const depNames = Object.keys(deps);

      if (depNames.length === 0) {
        const elapsed = (performance.now() - startTime).toFixed(1);
        console.log(`[installedOk] 无依赖声明，检查通过，耗时: ${elapsed}ms`);
        return true;
      }

      if (!window['path'].isExists(nodeModulesPath)) {
        const elapsed = (performance.now() - startTime).toFixed(1);
        console.log(`[installedOk] node_modules 不存在，依赖未安装，耗时: ${elapsed}ms`);
        return false;
      }

      for (const name of depNames) {
        const depPackageJsonPath = window['path'].join(nodeModulesPath, name, 'package.json');
        if (!window['path'].isExists(depPackageJsonPath)) {
          const elapsed = (performance.now() - startTime).toFixed(1);
          console.log(`[installedOk] 缺少依赖: ${name}，耗时: ${elapsed}ms`);
          return false;
        }
      }

      const elapsed = (performance.now() - startTime).toFixed(1);
      console.log(`[installedOk] 检查完成，依赖已完整，耗时: ${elapsed}ms`);
      return true;
    } catch (err) {
      const elapsed = (performance.now() - startTime).toFixed(1);
      console.log(`[installedOk] 检查异常，耗时: ${elapsed}ms`, err);
      return false;
    }
  }

  /**
   * 库列表
   * @param data
   */
  list(data: any) {
    return this.http.get<ResponseModel>(API.projectList, {
      params: data,
    });
  }

  /**
   * 库搜索
   * @param data
   * @param data.text 搜索关键字
   * @param data.size
   * @param data.from
   * @param data.quality
   * @param data.popularity
   * @param data.maintenance
   */
  search(data: any) {
    return this.http.get<SearchResponseModel>(API.projectSearch, {
      params: data,
    });
  }

  async getAllInstalledLibraries(path: string): Promise<any[]> {
    return this.blocklyLibraryPackageService.scanInstalledLibraries(path);
  }
}

interface BoardDependencyToInstall {
  name: string;
  version: string;
  needUninstallForDowngrade: boolean;
}

interface BoardDependencyInstallProgress {
  total: number;
  index: number;
  name: string;
  downloadProgress: number;
  extractProgress: number;
  lastProgress: number;
}

export interface SearchResponseModel {
  objects: any[],
  time: string,
  total: number
}

export interface ResponseModel {
  status: number;
  messages: string;
  data: any;
}

