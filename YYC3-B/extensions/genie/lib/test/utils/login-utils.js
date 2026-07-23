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
exports.LoginUtils = void 0;
const vscode = __importStar(require("vscode"));
class LoginUtils {
    static async sessionLogin() {
        await vscode.commands.executeCommand('tencentcloud.codingcopilot.ide.host.authentication.init', this.session);
    }
}
exports.LoginUtils = LoginUtils;
// 暂时写死一个测试账号的 token 后续优化成动态获取
LoginUtils.session = {
    'id': 'Tencent-Cloud.coding-copilot',
    'account': {
        'uid': '4f84f081-7812-4234-a384-3483c0420ab5',
        'nickname': '18888888888',
        'type': 'personal',
        'lastLogin': true,
        'pluginEnabled': true,
        'deployStatus': {
            'statusCode': 0,
            'statusMsg': '',
            'detailMsg': ''
        },
        'accountType': '',
        'sso': {
            'domain': '',
            'domainModifiedTimes': 0
        }
    },
    'auth': {
        // eslint-disable-next-line max-len
        'accessToken': 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJteWZFenA3ODNLaV9KQ3g4Vm5jM1hfaXg2alpyYjZDZjVPTWtHWk1QSTNzIn0.eyJleHAiOjE3ODI4MDMxNzQsImlhdCI6MTc1MTI4NTI2MCwiYXV0aF90aW1lIjoxNzUxMjY3MTc1LCJqdGkiOiIzM2M1MjA0Ny03MmI1LTQ4MWUtYTIwMS1mZWEwNDYyZWE1YjYiLCJpc3MiOiJodHRwczovL2NvcGlsb3QudGVuY2VudC5jb20vYXV0aC9yZWFsbXMvY29waWxvdCIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiI0Zjg0ZjA4MS03ODEyLTQyMzQtYTM4NC0zNDgzYzA0MjBhYjUiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJjb25zb2xlIiwic2lkIjoiNDg2ZGQ2MTUtNjVmNi00MGZkLWEyZmQtOTNjZDE2ZmIwMTQ4IiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJlbnQtYWRtaW46ZWlkcDgweHlkdTY4IiwiZGVmYXVsdC1yb2xlcyIsImVudC1wbHVnaW4tZW5hYmxlZDplbHVrY3lnNjljemsiLCJlbnQtYWRtaW46ZThqaTg1bXc0cDM0IiwiZW50LXBsdWdpbi1lbmFibGVkOmVsdXdhMmppeWlndyIsImVudC1tZW1iZXI6ZThqaTg1bXc0cDM0IiwiZW50LWFkbWluOmU3NnU1ZWh0NGR0cyIsImVudC1hZG1pbjplNzJ3N3YzYWRiN2siLCJlbnQtbWVtYmVyOmU3NnU1ZWh0NGR0cyIsImVudC1hZG1pbjplOGsxcXh3MDhjOHciLCJlbnQtYWRtaW46ZTZvYWNidnJtMzI4Iiwib2ZmbGluZV9hY2Nlc3MiLCJlbnQtbWVtYmVyOmVsdWtjeWc2OWN6ayIsImVudC1tZW1iZXI6ZWx1d2Eyaml5aWd3IiwiZW50LXBsdWdpbi1lbmFibGVkOmU3NnU1ZWh0NGR0cyIsInVtYV9hdXRob3JpemF0aW9uIiwiZW50LWFkbWluOmVsdWtjeWc2OWN6ayIsImVudC1wbHVnaW4tZW5hYmxlZDplOGppODVtdzRwMzQiLCJlbnQtYWRtaW46ZWx1d2Eyaml5aWd3Il19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBvZmZsaW5lX2FjY2VzcyBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicHJlZmVycmVkX3VzZXJuYW1lIjoiMTg4ODg4ODg4ODgifQ.rOIzyopaZxLnH6pNe8gqWLm5d-InVpLl8LPv1rdOc8iaTCDWkpESMMoR8wTNHJUFqimg18FVS4xLU7lC7_wZQ0n43Z5dC2czzWx2xQOABGmBQegfVtjf2CH4uU_p62EaVhz49OS3OKrds6unGoVgQYee8GuMrbwi-bi6HMrasYk84taCgnpltHTrLaKUvvmMQfwFLlcs2G4V88bBaNnZ_OJlKyjzVoXdijsgZxc4Ps2NSyIqGYDSvjOGbnifLW5MGperHWV5YQMtqX2uvaCUSN6sgHLcXVzckn1NRz_eQ2pvv-qL2QTGrZU6FFrsvzPFMllHkcvamKSbooJiGL-2Pg',
        'expiresIn': 31517901,
        'refreshExpiresIn': 31517901,
        // eslint-disable-next-line max-len
        'refreshToken': 'eyJhbGciOiJIUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI2M2I4YzRkNS1jMTJjLTRhMGQtYjk5NC01ZTBjMDY0N2QwMDIifQ.eyJleHAiOjE3ODI4MDMxNzQsImlhdCI6MTc1MTI4NTI2MCwianRpIjoiOTYwNzlmOTItNjM0OC00NWNjLWE2MWItYzA5MTJjMzQ1ZDFlIiwiaXNzIjoiaHR0cHM6Ly9jb3BpbG90LnRlbmNlbnQuY29tL2F1dGgvcmVhbG1zL2NvcGlsb3QiLCJhdWQiOiJodHRwczovL2NvcGlsb3QudGVuY2VudC5jb20vYXV0aC9yZWFsbXMvY29waWxvdCIsInN1YiI6IjRmODRmMDgxLTc4MTItNDIzNC1hMzg0LTM0ODNjMDQyMGFiNSIsInR5cCI6Ik9mZmxpbmUiLCJhenAiOiJjb25zb2xlIiwic2lkIjoiNDg2ZGQ2MTUtNjVmNi00MGZkLWEyZmQtOTNjZDE2ZmIwMTQ4Iiwic2NvcGUiOiJvcGVuaWQgYWNyIHByb2ZpbGUgYmFzaWMgd2ViLW9yaWdpbnMgcm9sZXMgb2ZmbGluZV9hY2Nlc3MgZW1haWwifQ.CoZecDSm6qi8_jVIGxHhrFweoctMjhmYdftUtCNgfmanXXwlI7SynT8fR8wUxQyzDyMytSPMb4uYPI_2IKiq4Q', 'tokenType': 'Bearer',
        'sessionState': '',
        'scope': 'openid profile offline_access email',
        'domain': 'copilot.tencent.com',
        'expiresAt': 1777085011777,
        'refreshExpiresAt': 1777085011777,
        'lastRefreshTime': 1748423118162
    },
};
//# sourceMappingURL=login-utils.js.map