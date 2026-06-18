import session from 'express-session';

export default function setupSession(app) {
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
}
