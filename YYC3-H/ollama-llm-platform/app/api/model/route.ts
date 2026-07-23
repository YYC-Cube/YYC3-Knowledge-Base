import { NextResponse } from 'next/server';
import { callOllamaModel } from '@/lib/ollama';

export async function POST(request: Request) {
  try {
    // 参数校验：确保 model 与 prompt 为字符串
    const body = await request.json();
    const model = typeof body?.model === 'string' ? body.model : '';
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';

    if (!model || !prompt) {
      return NextResponse.json(
        { success: false, error: '请求参数无效：model 和 prompt 为必填字符串' },
        { status: 400 }
      );
    }

    // 调用上游模型
    const response = await callOllamaModel(model, prompt);

    // 上游不可用或响应为空：返回 502 更贴近语义
    if (typeof response === 'undefined') {
      return NextResponse.json(
        { success: false, error: '上游模型不可用或无响应（请确认 Ollama 服务与模型已就绪）' },
        { status: 502 }
      );
    }

    // 正常返回
    return NextResponse.json(
      {
        success: true,
        data: { response },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: `服务器内部错误：${message}` },
      { status: 500 }
    );
  }
}