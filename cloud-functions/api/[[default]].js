/**
 * EdgeOne Pages Node Functions 主入口（Express 框架模式）
 *
 * 关键规则：
 * 1. 所有路由集中在此文件
 * 2. 不调用 app.listen()（Serverless 无需监听端口）
 * 3. 导出 app 实例：module.exports = app
 *
 * 文件名 [[default]].js 是 EdgeOne 的 Catch-all 路由约定，
 * 匹配 /api/* 下所有路径。
 */
const express = require('express');
const cors = require('cors');

// 数据库连接
const sequelize = require('./_db');

// Session 配置
const setupSession = require('./_session');

// 数据模型
const { QuestionType, Question, HotQuestion } = require('./models');

// 路由
const typesRouter = require('./routes/types');
const questionsRouter = require('./routes/questions');
const hotRouter = require('./routes/hot');
const serviceDeskRouter = require('./routes/service-desk');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const publishRouter = require('./routes/publish');

const app = express();

// ========== 中间件 ==========

// CORS 配置（同源部署可放宽）
app.use(cors({
  origin: true,  // 允许所有来源（同源部署实际不需要 CORS）
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session
setupSession(app);

// ========== 路由注册 ==========

app.use('/api/auth', authRouter);
app.use('/api/types', typesRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/hot', hotRouter);
app.use('/api/service-desk', serviceDeskRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/publish', publishRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'QAUI API is running on EdgeOne Pages',
    timestamp: new Date().toISOString()
  });
});

// 数据初始化接口（用于线上环境首次部署）
app.post('/api/init', async (req, res) => {
  try {
    const existingTypes = await QuestionType.count();
    if (existingTypes > 0) {
      return res.json({ success: true, message: '数据库已有数据，跳过初始化' });
    }

    await QuestionType.bulkCreate([
      { id: 'type_1', name: '产品咨询', icon: 'ri-shopping-bag-line', description: '产品规格、材质说明、定制方案等', order: 1, status: true },
      { id: 'type_2', name: '售后服务', icon: 'ri-headphones-line', description: '退换货政策、保修服务、维修咨询等', order: 2, status: true },
      { id: 'type_3', name: '订单相关', icon: 'ri-file-text-line', description: '订单查询、修改、取消、支付问题等', order: 3, status: true },
      { id: 'type_4', name: '物流配送', icon: 'ri-truck-line', description: '配送范围、配送时间、物流查询等', order: 4, status: true }
    ]);

    await Question.bulkCreate([
      { id: 'q_1', typeId: 'type_1', parentId: null, title: '衣柜产品', attribute: 'directory', order: 1 },
      { id: 'q_2', typeId: 'type_1', parentId: 'q_1', title: '衣柜材质选择', attribute: 'directory', order: 1 },
      { id: 'q_3', typeId: 'type_1', parentId: 'q_2', title: '实木衣柜优缺点', attribute: 'article', contentType: 'richtext', content: '<p>实木衣柜的优点：环保、质感好、耐用；缺点：价格较高、需要保养。</p>', order: 1 },
      { id: 'q_4', typeId: 'type_1', parentId: 'q_2', title: '板材衣柜优缺点', attribute: 'article', contentType: 'richtext', content: '<p>板材衣柜的优点：价格实惠、款式多样；缺点：环保性能参差不齐。</p>', order: 2 },
      { id: 'q_5', typeId: 'type_1', parentId: 'q_1', title: '衣柜尺寸规格', attribute: 'article', contentType: 'richtext', content: '<p>常见衣柜尺寸：宽度1.2m-2.4m，高度2.0m-2.4m，深度0.6m-0.8m。</p>', order: 2 },
      { id: 'q_6', typeId: 'type_2', parentId: null, title: '退换货政策', attribute: 'article', contentType: 'richtext', content: '<p>支持7天无理由退换货，需保持商品完好。</p>', order: 1 },
      { id: 'q_7', typeId: 'type_2', parentId: null, title: '保修服务', attribute: 'article', contentType: 'richtext', content: '<p>产品质保期为3年，提供免费维修服务。</p>', order: 2 },
      { id: 'q_8', typeId: 'type_3', parentId: null, title: '如何查询订单', attribute: 'article', contentType: 'richtext', content: '<p>登录账号后在"我的订单"中查看订单状态。</p>', order: 1 },
      { id: 'q_9', typeId: 'type_3', parentId: null, title: '如何取消订单', attribute: 'article', contentType: 'richtext', content: '<p>未发货订单可直接取消，已发货需联系客服。</p>', order: 2 },
      { id: 'q_10', typeId: 'type_4', parentId: null, title: '配送时间', attribute: 'article', contentType: 'richtext', content: '<p>一般3-5个工作日送达，偏远地区可能延迟。</p>', order: 1 }
    ]);

    await HotQuestion.bulkCreate([
      { id: 'hq_1', title: '如何查询订单状态？', linkId: 'q_8', order: 1, status: true },
      { id: 'hq_2', title: '退换货政策是什么？', linkId: 'q_6', order: 2, status: true }
    ]);

    res.json({ success: true, message: '数据初始化完成！' });
  } catch (error) {
    console.error('初始化数据失败:', error);
    res.status(500).json({ success: false, message: '初始化失败: ' + error.message });
  }
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// ========== 数据库同步（冷启动时执行一次） ==========
let dbSynced = false;
async function ensureDbSynced() {
  if (dbSynced) return;
  try {
    await sequelize.sync({ force: false });
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

// ========== 关键：导出 app 实例，不调用 app.listen ==========
module.exports = app;
