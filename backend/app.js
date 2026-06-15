const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const sequelize = require('./config/database');
const typesRouter = require('./routes/types');
const questionsRouter = require('./routes/questions');
const hotRouter = require('./routes/hot');
const serviceDeskRouter = require('./routes/service-desk');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session 配置（用于存储飞书登录状态）
app.use(session({
  secret: process.env.SESSION_SECRET || 'qaui-feishu-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 生产环境必须HTTPS
    httpOnly: true, // 防止XSS攻击
    maxAge: 24 * 60 * 60 * 1000 // 24小时过期
  }
}));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/types', typesRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/hot', hotRouter);
app.use('/api/service-desk', serviceDeskRouter);
app.use('/api/upload', uploadRouter);

// 静态文件服务（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 数据初始化接口（用于线上环境首次部署）
const { QuestionType, Question, HotQuestion } = require('./models');
app.post('/api/init', async (req, res) => {
  try {
    // 检查是否已有数据
    const existingTypes = await QuestionType.count();
    if (existingTypes > 0) {
      return res.json({ success: true, message: '数据库已有数据，跳过初始化' });
    }

    // 创建问题类型
    await QuestionType.bulkCreate([
      { id: 'type_1', name: '产品咨询', icon: 'ri-shopping-bag-line', description: '产品规格、材质说明、定制方案等', order: 1, status: true },
      { id: 'type_2', name: '售后服务', icon: 'ri-headphones-line', description: '退换货政策、保修服务、维修咨询等', order: 2, status: true },
      { id: 'type_3', name: '订单相关', icon: 'ri-file-text-line', description: '订单查询、修改、取消、支付问题等', order: 3, status: true },
      { id: 'type_4', name: '物流配送', icon: 'ri-truck-line', description: '配送范围、配送时间、物流查询等', order: 4, status: true }
    ]);

    // 创建问题
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

    // 创建热门问题
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

// 托管前端静态文件（开发+生产环境都启用）
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// SPA 兜底：所有非 API、非静态资源请求都返回 index.html（仅生产环境）
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res, next) => {
    // 不拦截 API 请求
    if (req.path.startsWith('/api')) {
      return next();
    }
    // 不拦截静态资源请求（图片、CSS、JS、字体等）
    const staticExts = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|json|xml|txt|map|pdf)$/i;
    if (staticExts.test(req.path)) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.get('/', (req, res) => {
  res.json({ message: 'QAUI Backend Service is running!' });
});

async function startServer() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database connected and synchronized');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();