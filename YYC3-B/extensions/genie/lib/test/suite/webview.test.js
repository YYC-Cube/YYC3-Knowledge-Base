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
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const vscode = __importStar(require("vscode"));
const activity_utils_1 = require("../utils/activity-utils");
const get_webview_info_1 = require("../utils/get-webview-info");
const login_utils_1 = require("../utils/login-utils");
suite('Webview Test Suite', function () {
    (0, mocha_1.before)(async function () {
        await login_utils_1.LoginUtils.sessionLogin();
        // 登录动作执行完成后，等待 1s
        await activity_utils_1.ActivityUtils.forceWait(1000);
    });
    test('Should open CodeBuddy WebView', async function () {
        this.timeout(20000);
        const label = 'CodeBuddy';
        // 1. 激活扩展
        const ext = vscode.extensions.getExtension('tencent-cloud.coding-copilot');
        await (ext === null || ext === void 0 ? void 0 : ext.activate());
        console.log('extension active ok');
        // 2. 执行打开 WebView 的命令（命令名请根据实际扩展调整）
        await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.newWindowOpen');
        console.log('newWindowOpen execute ok');
        let viewLabel = '';
        for (let i = 0; i < 10; i++) {
            // 这里用 tabGroups API，VSCode 1.64+ 支持
            const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
            const codeBuddyTab = tabs.find(tab => tab.label.includes('CodeBuddy'));
            if (codeBuddyTab) {
                viewLabel = codeBuddyTab.label;
                break;
            }
            await new Promise(res => setTimeout(res, 500));
        }
        (0, chai_1.expect)(viewLabel).to.equal(label);
    });
    test('Should open switch account success', async function () {
        this.timeout(15000);
        try {
            console.log('Starting switch account test');
            // 使用 Promise.race 来防止命令执行卡住
            await Promise.race([
                vscode.commands.executeCommand('tencentcloud.codingcopilot.switch.account.open'),
                activity_utils_1.ActivityUtils.forceWait(5000).then(() => {
                    console.log('switch.account.open command timeout after 5s');
                })
            ]);
            console.log('switch.account.open command executed');
            // 等待一段时间让 webview 完全加载
            await activity_utils_1.ActivityUtils.forceWait(1000);
            for (let i = 0; i < 5; i++) {
                console.log(`Attempt ${i + 1} to check webview visibility`);
                const isVisible = await get_webview_info_1.GetWebviewInfo.isWebviewVisible();
                console.log(`Webview visible: ${isVisible}`);
                if (isVisible) {
                    break;
                }
                await activity_utils_1.ActivityUtils.forceWait(1000);
            }
            const finalResult = await get_webview_info_1.GetWebviewInfo.isWebviewVisible();
            console.log(`Final webview visibility check: ${finalResult}`);
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            (0, chai_1.expect)(finalResult).to.be.true;
            await vscode.commands.executeCommand('workbench.view.explorer');
        }
        catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });
    test('Should open chatHistory success', async function () {
        this.timeout(10000);
        try {
            await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.switchChatMode', {
                'mode': 'craft'
            });
            await vscode.commands.executeCommand('tencentcloud.codingcopilot.chatHistory');
            const checkResult = await activity_utils_1.ActivityUtils.checkWebviewVisible();
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            (0, chai_1.expect)(checkResult).to.be.true;
            await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.startNewChat');
            await vscode.commands.executeCommand('workbench.view.explorer');
        }
        catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });
    test('Should Login success and completion success', async function () {
        this.timeout(35000);
        const workspaceFolder = activity_utils_1.ActivityUtils.getWorkspaceFolder();
        const fileUri = vscode.Uri.joinPath(workspaceFolder === null || workspaceFolder === void 0 ? void 0 : workspaceFolder.uri, 'test.py');
        await activity_utils_1.ActivityUtils.createFileAndWriteContent(fileUri);
        await activity_utils_1.ActivityUtils.insertTextAtCursor("print('hello ");
        // 写入内容之后等待 2s 再触发补全
        await activity_utils_1.ActivityUtils.forceWait(2000);
        const contentBefore = await activity_utils_1.ActivityUtils.getEditorContent();
        console.log('before: ' + contentBefore);
        // 增加一下聚焦动作
        const doc = await vscode.workspace.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(doc);
        // 获取文件的最后一行
        const lastLine = doc.lineCount - 1;
        const lastLineLength = doc.lineAt(lastLine).text.length;
        // 创建光标位置
        const position = new vscode.Position(lastLine, lastLineLength);
        // 设置光标并滚动到末尾
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.Default);
        let success = false;
        let contentAfter;
        for (let i = 0; i < 5; i++) {
            try {
                // 触发补全
                await vscode.commands.executeCommand('deleteLeft');
                console.log(`deleteLeft attempt ${i + 1} ok`);
                // 等待补全触发，测试发现 2s 时容易偶现失败
                await activity_utils_1.ActivityUtils.forceWait(3000);
                // 自动接受当前幽灵字符
                await vscode.commands.executeCommand('tencentcloud.codingcopilot.completions.accept.all');
                console.log(`attempt ${i + 1} ok`);
                contentAfter = await activity_utils_1.ActivityUtils.getEditorContent();
                if ((contentAfter === null || contentAfter === void 0 ? void 0 : contentAfter.length) && contentAfter.length > contentBefore.length) {
                    success = true;
                    console.log('after: ' + contentAfter);
                    console.log('Completion accepted successfully');
                    break;
                }
                // 失败后等待 3s 再重试
                await activity_utils_1.ActivityUtils.forceWait(3000);
            }
            catch (err) {
                console.log(`attempt ${i + 1} failed: ${err}`);
            }
        }
        if (!success) {
            throw new Error('Failed to trigger or accept completion after multiple attempts');
        }
        contentAfter = await activity_utils_1.ActivityUtils.getEditorContent();
        console.log('after: ' + contentAfter);
        // 校验 contentAfter 长度大于 contentBefore
        (0, chai_1.expect)(contentAfter.length).to.be.greaterThan(contentBefore.length);
        // 删除创建的临时文件
        setTimeout(async () => {
            try {
                await vscode.workspace.fs.delete(fileUri);
                vscode.window.showInformationMessage('文件已被删除！');
            }
            catch (err) {
                vscode.window.showErrorMessage('删除文件失败: ' + err);
            }
        }, 3000);
    });
});
//# sourceMappingURL=webview.test.js.map