const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;

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