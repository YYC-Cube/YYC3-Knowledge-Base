/* 这个服务用来控制窗口、工具的显示和隐藏，通过 Subject 来实现组件之间的通信。
 */
import { Injectable, Injector } from '@angular/core';
import { Subject } from 'rxjs';
import { ElectronService } from './electron.service';
import { TerminalService } from '../tools/terminal/terminal.service';
import { FeedbackDialogComponent } from '../components/feedback-dialog/feedback-dialog.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ProjectSettingDialogComponent } from '../components/project-setting-dialog/project-setting-dialog.component';
import { AuthService } from './auth.service';
import { LogService } from './log.service';
import { getChildToolConfig } from '../configs/tool.config';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  // 用来控制窗口和工具的显示和隐藏
  actionSubject = new Subject();

  // 用来更新footer右下角的状态
  stateSubject = new Subject<ActionState>();

  // 用来记录当前已打开的工具
  openToolList: string[] = [];

  openWindowPathList: string[] = [];

  // 用来获取当前最上层的工具
  get topTool() {
    return this.openToolList[this.openToolList.length - 1] || null;
  }

  // 用来记录terminal是否打开
  terminalIsOpen = false;
  // 当前选中的底部面板tab
  currentBottomTab = '';
  theme = 'dark';
  isMainWindow = false;

  /**
   * 向 aily-chat 发送消息的 Subject。
   * 外部组件通过 openAndSendToChat() 触发，
   * aily-chat 模组内部订阅 chatMessage$ 消费。
   */
  private chatMessageSubject = new Subject<{ text: string; options?: Record<string, any> }>();
  chatMessage$ = this.chatMessageSubject.asObservable();
  private modalService: NzModalService | null = null;


  constructor(
    private electronService: ElectronService,
    private terminalService: TerminalService,
    private authService: AuthService,
    private logService: LogService,
    private injector: Injector
  ) { }

  private get modal(): NzModalService {
    if (!this.modalService) {
      this.modalService = this.injector.get(NzModalService);
    }
    return this.modalService;
  }


  // 初始化UI服务，这个init函数仅供main-window使用
  init(): void {
    // 注册 window 全局方法，供非 Angular 环境调用
    (window as any).openAndSendToAilyChat = (text: string, options?: Record<string, any>) => {
      this.openAndSendToChat(text, options);
    };
    if (this.electronService.isElectron) {
      this.isMainWindow = true;
      window['ipcRenderer'].on('window-go-main', (event, toolName) => {
        this.openToolInMainWindow(toolName);
      });

      window['ipcRenderer'].on('sub-window-state-changed', (_event, state) => {
        this.updateSubWindowState(state?.path, !!state?.open);
      });

      window['ipcRenderer'].on('window-receive', async (event, message) => {
        // console.log('window-receive', message);
        let data;
        if (message.data?.action === 'logout') {
          // 处理登出请求
          try {
            await this.authService.logout();
            data = { success: true };
          } catch (error) {
            console.error('登出失败:', error);
            data = { success: false, error: error.message };
          }
        } else if (message.data?.action === 'log') {
          // 处理子窗口发来的日志
          this.logService.update(message.data.log);
          data = { success: true };
        } else if (message.data?.action === 'get-build-path') {
          // 返回当前项目的构建缓存路径
          try {
            const { ProjectService } = await import('./project.service');
            const projectService = this.injector.get(ProjectService);
            if (projectService.currentProjectPath) {
              const buildPath = await projectService.getBuildPath();
              data = { success: true, buildPath };
            } else {
              data = { success: true, buildPath: null };
            }
          } catch (error) {
            data = { success: true, buildPath: null };
          }
        }
        // if (message.data.action == 'open-terminal') {
        //   data = await this.openTerminal();
        //   // console.log('open-terminal', pid);
        // } else if (message.data.action == 'close-terminal') {
        //   this.closeTerminal();
        // } else {
        //   return;
        // }
        // 反馈完成结果
        if (message.messageId) {
          window['ipcRenderer'].send('main-window-response', {
            messageId: message.messageId,
            result: "success",
            data,
          });
        }
      });
    }

  }

  openWindow(opt: WindowOpts) {
    this.updateSubWindowState(opt.path, true);
    window['subWindow'].open(opt);
  }

  // 这个方法是给header用的
  turnTool(opt: ToolOpts) {
    if (this.topTool == opt.data) {
      this.closeTool(opt.data);
    } else {
      this.openTool(opt.data);
    }
  }

  // 如果其它组件/程序要打开工具，调用这个方法
  openTool(name: string) {
    // if (name == 'terminal') {
    //   this.openTerminal();
    //   return;
    // }
    const toolWindowPath = this.getToolWindowPath(name);
    if (this.isMainWindow && toolWindowPath && window['subWindow']?.focus) {
      void window['subWindow'].focus(toolWindowPath)
        .then((focused: boolean) => {
          if (!focused) {
            this.openToolInMainWindow(name);
          }
        })
        .catch(() => this.openToolInMainWindow(name));
      return;
    }

    this.openToolInMainWindow(name);
  }

  private openToolInMainWindow(name: string) {
    this.openToolList = this.openToolList.filter((e) => e !== name);
    this.openToolList.push(name);
    this.actionSubject.next({ action: 'open', type: 'tool', data: name });
  }

  private getToolWindowPath(name: string): string | null {
    const childToolConfig = getChildToolConfig(name);
    if (childToolConfig) {
      return childToolConfig.routePath || `/child-tool/${childToolConfig.id}`;
    }

    switch (name) {
      case 'code-viewer':
      case 'serial-monitor':
      case 'ffs-manager':
      case 'simulator':
      case 'model-store':
        return `/${name}`;
      default:
        return null;
    }
  }

  private normalizeToolWindowPath(path: string | null | undefined): string | null {
    if (typeof path !== 'string') {
      return null;
    }
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return null;
    }
    const hashRouteIndex = trimmedPath.indexOf('#/');
    const routePath = hashRouteIndex >= 0 ? trimmedPath.slice(hashRouteIndex + 2) : trimmedPath;
    return `/${routePath.replace(/^\/+/, '')}`;
  }

  private updateSubWindowState(path: string | null | undefined, open: boolean) {
    const normalizedPath = this.normalizeToolWindowPath(path);
    if (!normalizedPath) {
      return;
    }

    const isOpen = this.openWindowPathList.includes(normalizedPath);
    if (open && !isOpen) {
      this.openWindowPathList.push(normalizedPath);
      this.actionSubject.next({ action: 'open', type: 'sub-window', data: normalizedPath });
    } else if (!open && isOpen) {
      this.openWindowPathList = this.openWindowPathList.filter((path) => path !== normalizedPath);
      this.actionSubject.next({ action: 'close', type: 'sub-window', data: normalizedPath });
    }
  }

  private isToolWindowOpen(name: string): boolean {
    const toolWindowPath = this.getToolWindowPath(name);
    if (!toolWindowPath) {
      return false;
    }

    const normalizedPath = this.normalizeToolWindowPath(toolWindowPath);
    return !!normalizedPath && this.openWindowPathList.includes(normalizedPath);
  }

  closeTool(name: string) {
    if (name == 'terminal') {
      this.closeTerminal();
      return;
    }
    this.openToolList = this.openToolList.filter((e) => e !== name);
    this.actionSubject.next({ action: 'close', type: 'tool', data: name });
  }

  closeToolAll() {
    this.openToolList.forEach((name) => {
      this.closeTool(name);
    });
    this.openToolList = [];
  }

  // 发送工具信号，格式为 "toolname:action"，如 "serial-monitor:disconnect"
  sendToolSignal(signal: string, payload?: unknown) {
    this.actionSubject.next({ action: 'signal', type: 'tool', data: signal, payload });
  }

  /**
   * 打开 aily-chat 面板并发送消息。
   * 标准接口：任何需要「代为向大模型发送消息」的场景，统一调用此方法。
   * aily-chat 模组内部订阅 chatMessage$ 处理，外部无需导入 aily-chat 的任何服务。
   *
   * @param text 要发送的文本内容
   * @param options 发送选项，如 { autoSend: true, cover: true }
   */
  openAndSendToChat(text: string, options?: Record<string, any>): void {
    this.openTool('aily-chat');
    setTimeout(() => {
      this.chatMessageSubject.next({ text, options });
    }, 100);
  }

  // 判断某个工具是否打开
  isToolOpen(name: string): boolean {
    return this.openToolList.includes(name) || this.isToolWindowOpen(name);
  }

  turnBottomSider(data = 'default') {
    if (this.terminalIsOpen && this.currentBottomTab === data) {
      // 如果底部面板已经打开且当前选中的就是要打开的tab，则关闭面板
      this.closeTerminal();
    } else if (this.terminalIsOpen) {
      // 如果底部面板已经打开但选中的不是要打开的tab，则切换到指定的tab
      this.switchBottomSiderTab(data);
    } else {
      // 如果底部面板未打开，则打开面板并显示指定的组件
      this.openBottomSider(data);
    }
  }

  // 切换底部面板的tab
  switchBottomSiderTab(data: string) {
    this.currentBottomTab = data;
    if (this.isMainWindow) {
      this.actionSubject.next({ action: 'switch-tab', type: 'bottom-sider', data });
    } else {
      window['iWindow'].send({ to: 'main', data: { action: 'switch-terminal-tab', tab: data } });
    }
  }

  async openBottomSider(data = 'default'): Promise<{ pid: number }> {
    return new Promise(async (resolve, reject) => {
      this.currentBottomTab = data;
      if (this.isMainWindow) {
        this.actionSubject.next({ action: 'open', type: 'bottom-sider', data });
        this.terminalIsOpen = true;
        const intervalId = setInterval(() => {
          if (this.terminalService.currentPid) {
            clearInterval(intervalId);
            resolve({ pid: this.terminalService.currentPid });
          }
        }, 100);
      } else {
        // 其它窗口调用
        let { pid } = await window['iWindow'].send({ to: 'main', data: { action: 'open-terminal' } });
        // console.log('open-terminal', pid);
        resolve({ pid });
      }
    });
  }

  closeTerminal() {
    if (this.isMainWindow) {
      this.actionSubject.next({ action: 'close', type: 'bottom-sider' });
      this.terminalIsOpen = false;
      this.currentBottomTab = '';
    } else {
      window['iWindow'].send({ to: 'main', data: { action: 'close-terminal' } });
    }
  }

  // 更新footer右下角的状态
  updateFooterState(state: ActionState) {
    // 判断当前url是否是main-window
    if (this.isMainWindow) {
      this.stateSubject.next(state);
    } else {
      window['ipcRenderer'].send('state-update', state);
    }
  }

  // 关闭当前窗口
  closeWindow() {
    window['iWindow'].close();
  }


  openFeedback(data?: any) {
    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzCentered: true,
      nzWrapClassName: 'feedback-modal-wrap',
      nzBodyStyle: {
        padding: '0',
      },
      nzContent: FeedbackDialogComponent,
      nzWidth: '520px',
      nzData: data,
    });

    // 处理反馈结果
    modalRef.afterClose.subscribe(result => {
      if (result?.result === 'success') {
        console.log('反馈已提交:', result.data);
      }
    });
  }

  openProjectSettings() {
    // 这里参考 USAGE_EXAMPLE.ts 中的代码实现
    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzBodyStyle: {
        padding: '0',
      },
      nzContent: ProjectSettingDialogComponent,
      nzWidth: '520px',
    });

    // 处理反馈结果
    modalRef.afterClose.subscribe(result => {
      if (result?.result === 'success') {
        console.log('反馈已提交:', result.data);
      }
    });
  }
}

export interface WindowOpts {
  path: string;
  data?: any;
  title?: string;
  alwaysOnTop?: boolean;
  width?: number;
  height?: number;
}

export interface ToolOpts {
  type: string;
  data: string;
  title?: string;
}

export interface ActionState {
  text: string;
  desc?: string;
  state?: 'done' | 'doing' | 'error' | 'warn' | 'loading' | string,
  color?: string;
  icon?: string;
  timeout?: number;
}
