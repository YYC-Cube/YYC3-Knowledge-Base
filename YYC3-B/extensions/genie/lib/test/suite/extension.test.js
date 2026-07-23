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
suite('Extension Test Suite', () => {
    (0, mocha_1.after)(() => {
        vscode.window.showInformationMessage('All tests done!');
    });
    test('Command \'tencentcloud.codingcopilot.completions.trigger\' should be registered', async () => {
        const timeout = 15000; // 设置总超时时间为 15 秒
        const interval = 500; // 每 500 毫秒检查一次命令是否已注册
        let isCommandRegistered = false;
        // 设置一个超时定时器来保证测试不会无限等待
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Command registration timed out')), timeout));
        const pollCommand = async () => {
            const commands = await vscode.commands.getCommands(true);
            if (commands.includes('tencentcloud.codingcopilot.completions.trigger')) {
                isCommandRegistered = true;
            }
        };
        // 定期轮询检查命令是否注册
        const intervalPromise = new Promise(resolve => {
            const intervalId = setInterval(async () => {
                await pollCommand(); // 执行检查命令是否注册
                if (isCommandRegistered) {
                    clearInterval(intervalId); // 注册成功时清除轮询
                    resolve();
                }
            }, interval);
        });
        // 等待直到命令注册或者超时
        try {
            await Promise.race([intervalPromise, timeoutPromise]);
            // 获取所有已注册的命令
            const commands = await vscode.commands.getCommands(true);
            // 检查是否已注册指定命令
            (0, chai_1.expect)(commands).to.include('tencentcloud.codingcopilot.completions.trigger', 'Required command \'tencentcloud.codingcopilot.completions.trigger\' is not registered.');
        }
        catch (err) {
            console.error('Error during command execution:', err);
            throw err; // 如果发生错误，抛出异常使测试失败
        }
    }).timeout(20000); // 调整测试超时为 20 秒
});
//# sourceMappingURL=extension.test.js.map