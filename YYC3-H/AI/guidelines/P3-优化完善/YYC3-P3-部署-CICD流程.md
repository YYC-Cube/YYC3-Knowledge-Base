# YYC3 P3-部署-CICD流程
@file P3-优化完善/YYC3-P3-部署-CICD流程.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P3,deployment,cicd

## GitHub Actions 工作流
- **CI**: push/PR → checkout → pnpm install → lint → typecheck → test → build → Tauri build (Linux/macOS/Windows)
- **CD**: tag push → build all platforms → create GitHub Release → upload artifacts
- **Release**: softprops/action-gh-release → .AppImage / .dmg / .msi

## 矩阵构建
```yaml
strategy:
  matrix:
    platform: [ubuntu-latest, macos-latest, windows-latest]
    node: [20]
```

## 自动化: 测试覆盖率上传 | 安全扫描 | 依赖更新(Dependabot) | 失败通知
## 产物: 签名安装包 <12MB | 自动更新 URL 配置
