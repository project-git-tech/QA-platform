import { Sequelize } from 'sequelize';

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

export { sequelize, Sequelize };
