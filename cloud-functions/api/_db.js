import { Sequelize } from 'sequelize';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[DB] 警告：DATABASE_URL 环境变量未配置');
}

const sequelize = new Sequelize(DATABASE_URL || 'postgres://localhost:5432/qaui', {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    family: 4  // 强制使用 IPv4（EdgeOne 不支持 IPv6）
  },
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

export { sequelize, Sequelize };
