/**
 * 数据库连接配置（适配 EdgeOne Pages）
 * 使用外部 PostgreSQL 数据库
 */
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[DB] 警告：DATABASE_URL 环境变量未配置');
}

const sequelize = new Sequelize(DATABASE_URL || 'postgres://localhost:5432/qaui', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

module.exports = sequelize;
