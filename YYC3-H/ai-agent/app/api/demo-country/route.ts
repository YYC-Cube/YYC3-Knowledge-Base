/** 
 * @file 国家信息演示API
 * @description 提供用户所在国家信息的API接口
 * @author YYC³ 
 * @version 1.0.0 
 * @created 2025-09-15 
 */
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') { 
    return Response.json({
      country: 'US',
      message: `Hello from US!`,
    })
  }
  
  const country = request.headers.get('x-vercel-ip-country');
  return Response.json({
    country,
    message: `Hello from ${country}!`,
  })
}
