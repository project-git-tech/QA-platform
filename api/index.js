const express = require('express');
const cors = require('cors');
const session = require('express-session');
const sequelize = require('../backend/config/database');
const typesRouter = require('../backend/routes/types');
const questionsRouter = require('../backend/routes/questions');
const hotRouter = require('../backend/routes/hot');
const serviceDeskRouter = require('../backend/routes/service-desk');
const authRouter = require('../backend/routes/auth');
const uploadRouter = require('../backend/routes/upload');

const app = express();

// Vercel Serverless Functions 配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session 配置（注意：Vercel Serverless 不支持内存 session，需要使用外部存储）
// 暂时禁用 session，飞书登录功能需要后续使用 JWT 替代
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'qaui-feishu-session-secret-2024',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: true,
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000
//   }
// }));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/types', typesRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/hot', hotRouter);
app.use('/api/service-desk', serviceDeskRouter);
app.use('/api/upload', uploadRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 数据初始化接口
const { QuestionType, Question, HotQuestion, Image } = require('../backend/models');
app.post('/api/init', async (req, res) => {
  try {
    await sequelize.sync({ force: false });
    
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

// 根路径
app.get('/', (req, res) => {
  res.json({ message: 'QAUI Backend Service is running!', platform: 'Vercel' });
});

// 导出为 Vercel Serverless Function
module.exports = app;