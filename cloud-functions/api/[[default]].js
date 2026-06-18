import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { sequelize } from './models/index.js';
import setupSession from './_session.js';
import authRouter from './routes/auth.js';
import typesRouter from './routes/types.js';
import questionsRouter from './routes/questions.js';
import hotRouter from './routes/hot.js';
import serviceDeskRouter from './routes/service-desk.js';
import uploadRouter from './routes/upload.js';
import publishRouter from './routes/publish.js';

const app = express();

// 中间件
app.use(cors({
  origin: ['https://project-git-tech.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 配置
setupSession(app);

// 数据库同步（冷启动时执行一次）
let dbSynced = false;
async function ensureDbSynced() {
  if (dbSynced) return;
  try {
    await sequelize.sync({ alter: true });
    dbSynced = true;
    console.log('[DB] 数据库同步完成');
  } catch (err) {
    console.error('[DB] 数据库同步失败:', err.message);
  }
}

// 在每个请求前确保数据库已同步
app.use((req, res, next) => {
  ensureDbSynced().then(next);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 环境变量诊断（调试用，上线前删除）
app.get('/debug/env', (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  res.json({
    hasDatabaseUrl: !!dbUrl,
    databaseUrlPrefix: dbUrl ? dbUrl.split('@')[1]?.split('/')[0] : null,
    hasGithubToken: !!process.env.GITHUB_TOKEN,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV || 'undefined'
  });
});

// API 路由（EdgeOne 的 cloud-functions/api/ 目录已提供 /api/ 前缀，这里不需要再加）
app.use('/auth', authRouter);
app.use('/types', typesRouter);
app.use('/questions', questionsRouter);
app.use('/hot', hotRouter);
app.use('/service-desk', serviceDeskRouter);
app.use('/upload', uploadRouter);
app.use('/publish', publishRouter);

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 导出 app 实例（EdgeOne 要求 ESM 格式）
export default app;
