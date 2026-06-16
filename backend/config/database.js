const { Sequelize } = require('sequelize');

// Vercel/Neon 使用 POSTGRES_URL，本地开发使用 DATABASE_URL 或 SQLite
const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

let sequelize;

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, {
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
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

module.exports = sequelize;