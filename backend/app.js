const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const typesRouter = require('./routes/types');
const questionsRouter = require('./routes/questions');
const hotRouter = require('./routes/hot');
const serviceDeskRouter = require('./routes/service-desk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/types', typesRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/hot', hotRouter);
app.use('/api/service-desk', serviceDeskRouter);

// 托管前端静态文件（生产环境）
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..');
  app.use(express.static(frontendPath));
  // SPA 兜底：所有非 API 请求都返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
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