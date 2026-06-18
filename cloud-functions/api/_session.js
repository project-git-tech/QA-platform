/**
 * Session 配置（适配 EdgeOne Pages）
 *
 * 说明：Serverless 环境下内存 session 在冷启动后会丢失，
 * 但 Cookie-based session 可以持久化。
 * 对于管理后台场景，这是可接受的。
 */
const session = require('express-session');

module.exports = function setupSession(app) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'qaui-feishu-session-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,          // EdgeOne 自动 HTTPS
      httpOnly: true,        // 防止 XSS
      maxAge: 24 * 60 * 60 * 1000  // 24 小时
    }
  }));
};
