/**
 * 飞书开放平台配置（适配 EdgeOne Pages）
 *
 * 安全提示：
 * - 生产环境请使用环境变量，不要将密钥提交到代码仓库
 */
module.exports = {
  // 飞书应用凭证
  appId: process.env.FEISHU_APP_ID || 'cli_a97ad490803d5bd3',
  appSecret: process.env.FEISHU_APP_SECRET || 'VKNVjpMx55RfzdinjuH07dBt6KByJqW8',

  // OAuth 回调地址（必须与飞书平台配置一致）
  // EdgeOne 部署后请更新为实际域名
  redirectUri: process.env.FEISHU_REDIRECT_URI || 'https://qa-platform-dpd6byolbe9l.edgeone.cool/api/auth/callback',

  // 飞书 API 基础地址
  apiBase: 'https://open.feishu.cn/open-apis',

  // 服务台会话ID
  serviceDeskChatId: 'oc_bd8493feec04047d8399fe6c103ebc90',

  // 管理员飞书账号白名单
  adminUsers: [
    '王西'
  ]
};
