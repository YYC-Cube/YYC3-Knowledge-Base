# 常见问题解答

## 如何切换不同的大模型？

在平台前端或命令行中选择模型名称即可，如 `llama3:70b`、`mixtral:latest` 等。

## Ollama 支持哪些模型？

通过 `ollama list` 查看本地已下载模型，也可参考 Ollama 官网模型库。

## 如何自定义 Prompt？

在 `content/prompts/` 目录下新建或编辑 YAML 文件，平台前端或API可加载并选择。

## 平台支持多人协作吗？

支持。所有内容、Prompt、脚本均可用 Git 管理，实现多端同步与版本回溯
