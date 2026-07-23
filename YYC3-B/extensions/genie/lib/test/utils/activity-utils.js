"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityUtils = void 0;
const robot = __importStar(require("@hurdlegroup/robotjs"));
const vscode = __importStar(require("vscode"));
/**
 * 工具类，封装与工作区、编辑器和文件相关的操作。
 */
class ActivityUtils {
    /**
     * 检查工作区文件夹是否存在，如果不存在则显示错误消息并返回。
     * @returns {vscode.WorkspaceFolder | undefined} 返回第一个工作区文件夹，如果不存在则返回 undefined。
     */
    static getWorkspaceFolder() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('请先打开一个工作区文件夹');
            return undefined;
        }
        return workspaceFolders[0];
    }
    /**
     * 在光标位置插入文本。
     * @param {string} text 要插入的文本。
     * @returns {Promise<void>} 异步操作的结果。
     */
    static async insertTextAtCursor(text) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        try {
            await editor.edit(editBuilder => {
                const position = editor.selection.active;
                editBuilder.insert(position, text);
            });
            await editor.document.save();
        }
        catch (error) {
            vscode.window.showErrorMessage(`插入文本失败: ${error}`);
        }
    }
    /**
     * 创建文件并写入内容。
     * @param {vscode.Uri} fileUri 文件 URI。
     * @param {string} content 要写入的内容。
     * @returns {Promise<void>} 异步操作的结果。
     */
    static async createFileAndWriteContent(fileUri, content = '') {
        try {
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage('文件已创建并写入内容！');
            // 自动在编辑器中打开新文件
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`写入文件失败: ${error}`);
        }
    }
    /**
     * 获取当前编辑器中的文件内容。
     * @returns {Promise<string | undefined>} 文件内容，如果编辑器不存在则返回 undefined。
     */
    static async getEditorContent() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await editor.document.save();
        }
        return editor === null || editor === void 0 ? void 0 : editor.document.getText();
    }
    static async forceWait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static async getWebviewInfo() {
        return vscode.commands.executeCommand('tencentcloud.codingcopilot.getWebviewInfo');
    }
    static async checkWebviewVisible() {
        let isVisible = false;
        for (let i = 0; i < 5; i++) {
            // 第几次尝试
            console.log(`Attempt ${i + 1} to get webview info`);
            const info = await this.getWebviewInfo();
            console.log('info is: ' + (info === null || info === void 0 ? void 0 : info.isVisible));
            if (!(info === null || info === void 0 ? void 0 : info.isVisible)) {
                await this.forceWait(200);
                console.log('Webview info is false, retrying...');
                continue;
            }
            isVisible = info.isVisible;
            break;
        }
        console.log('webview info is: ' + isVisible);
        return isVisible;
    }
    static async execInlineChatCommand(command) {
        await vscode.commands.executeCommand('editor.action.selectAll');
        await vscode.commands.executeCommand('tencentcloud.codingcopilot.inlineChat.start');
        await ActivityUtils.forceWait(1000);
        console.log('inlineChat start execute ok');
        robot.typeString(command);
        console.log(`inlineChat ${command} command typed`);
        robot.keyTap('enter');
        console.log('inlineChat enter command typed');
        return;
    }
    static async reloadWebview() {
        // developer.reload.webviews
        await vscode.commands.executeCommand('workbench.action.showCommands');
        console.log('showCommands execute ok');
        // 需要等待聚焦
        await ActivityUtils.forceWait(500);
        robot.typeString('developer.reload.webviews');
        // 等待搜索结果选中
        await ActivityUtils.forceWait(500);
        robot.keyTap('enter');
        console.log('Webview reloaded');
        // 等待 Webview 重新加载
        await ActivityUtils.forceWait(500);
        return;
    }
}
exports.ActivityUtils = ActivityUtils;
//# sourceMappingURL=activity-utils.js.map