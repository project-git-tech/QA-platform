/**
 * 飞书开放平台配置
 * 
 * 使用说明：
 * 1. 在飞书开放平台 (https://open.feishu.cn) 创建应用
 * 2. 获取 App ID 和 App Secret
 * 3. 配置重定向 URL（回调地址）
 * 
 * 安全提示：
 * - 生产环境请使用环境变量，不要将密钥提交到代码仓库
 * - 本地开发可暂时硬编码（仅用于测试）
 */

module.exports = {
  // 飞书应用凭证
  appId: process.env.FEISHU_APP_ID || 'cli_a97ad490803d5bd3',
  appSecret: process.env.FEISHU_APP_SECRET || 'VKNVjpMx55RfzdinjuH07dBt6KByJqW8',
  
  // OAuth 回调地址（必须与飞书平台配置一致）
  // 开发环境：http://localhost:3000/api/auth/callback
  // 生产环境：https://qa-platform-1-zat2.onrender.com/api/auth/callback
  redirectUri: process.env.FEISHU_REDIRECT_URI || 'https://qa-platform-dpd6byolbe9l.edgeone.cool/api/auth/callback',
  
  // 飞书 API 基础地址
  apiBase: 'https://open.feishu.cn/open-apis',
  
  // 服务台会话ID（用于后续跳转功能）
  serviceDeskChatId: 'oc_bd8493feec04047d8399fe6c103ebc90',
  
  // 管理员飞书账号白名单（用户名）
  // 登录后根据飞书用户名判断是否为管理员
  adminUsers: [
    '王西'  // TODO: 替换为实际管理员飞书用户名
  ]
};
