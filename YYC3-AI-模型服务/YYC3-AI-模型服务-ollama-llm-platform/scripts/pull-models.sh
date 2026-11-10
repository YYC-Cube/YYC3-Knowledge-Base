#!/bin/bash
for model in llama3:70b mixtral codellama qwen2 phi3; do
  ollama pull $model &
done
wait
echo "全部模型下载完成！"