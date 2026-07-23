import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * @file 中间件
 * @description 拦截 /service-worker.js 请求，返回 204 避免 500；其他请求正常放行
 * @module middleware
 * @author YYC
 * @version 1.0.0
 * @created 2024-10-31
 * @updated 2024-10-31
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/service-worker.js') {
    // 防止浏览器或旧 SW 请求导致 500
    return new Response('', {
      status: 204,
      headers: { 'content-type': 'application/javascript' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/service-worker.js'],
};
