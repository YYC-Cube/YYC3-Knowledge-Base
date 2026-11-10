---
description: Manually install or reinstall agent-browser CLI tool
allowed_tools:
  - Bash
---

# Install agent-browser

Execute the following steps to install agent-browser:

1. First check if Windows - if so, inform user it's not supported and stop:
```bash
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
    echo "❌ agent-browser 不支持 Windows 系统"
    exit 1
fi
```

2. Check if npm is available:
```bash
command -v npm || echo "请先安装 Node.js: https://nodejs.org/"
```

3. Install agent-browser globally:
```bash
npm install -g agent-browser
```

4. Download Chromium:
```bash
agent-browser install
```

5. On Linux, if there are missing dependencies:
```bash
agent-browser install --with-deps
```

6. Verify installation:
```bash
agent-browser --version
```

After installation, remove the initialization flag to allow re-detection:
```bash
rm -f "${CODEBUDDY_PLUGIN_ROOT}/.initialized"
```
