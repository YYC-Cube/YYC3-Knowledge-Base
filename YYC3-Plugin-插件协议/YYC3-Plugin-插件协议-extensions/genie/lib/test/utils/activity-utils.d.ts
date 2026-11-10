import * as vscode from 'vscode';
import { WebviewInfo } from '../utils/webview-info';
/**
 * 工具类，封装与工作区、编辑器和文件相关的操作。
 */
export declare class ActivityUtils {
    /**
     * 检查工作区文件夹是否存在，如果不存在则显示错误消息并返回。
     * @returns {vscode.WorkspaceFolder | undefined} 返回第一个工作区文件夹，如果不存在则返回 undefined。
     */
    static getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
    /**
     * 在光标位置插入文本。
     * @param {string} text 要插入的文本。
     * @returns {Promise<void>} 异步操作的结果。
     */
    static insertTextAtCursor(text: string): Promise<void>;
    /**
     * 创建文件并写入内容。
     * @param {vscode.Uri} fileUri 文件 URI。
     * @param {string} content 要写入的内容。
     * @returns {Promise<void>} 异步操作的结果。
     */
    static createFileAndWriteContent(fileUri: vscode.Uri, content?: string): Promise<void>;
    /**
     * 获取当前编辑器中的文件内容。
     * @returns {Promise<string | undefined>} 文件内容，如果编辑器不存在则返回 undefined。
     */
    static getEditorContent(): Promise<string | undefined>;
    static forceWait(ms: number): Promise<void>;
    static getWebviewInfo(): Promise<WebviewInfo | undefined>;
    static checkWebviewVisible(): Promise<boolean>;
    static execInlineChatCommand(command: string): Promise<void>;
    static reloadWebview(): Promise<void>;
}
//# sourceMappingURL=activity-utils.d.ts.map