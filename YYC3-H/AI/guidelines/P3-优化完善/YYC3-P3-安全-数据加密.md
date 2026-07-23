# YYC3 P3-安全-数据加密
@file P3-优化完善/YYC3-P3-安全-数据加密.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P3,security,encryption

## 加密方案: AES-GCM 256位 | PBKDF2 100000次迭代 | 随机 IV 12字节 + Salt 16字节
## 密钥管理: Web Crypto API deriveKey | OS 密钥链(tauri-plugin-keychain)
## 加密范围: API 密钥、数据库密码、文件内容、备份文件
## 实现: encrypt(data, password) → {encrypted, salt, iv} | decrypt(encrypted, password, salt, iv) → data
