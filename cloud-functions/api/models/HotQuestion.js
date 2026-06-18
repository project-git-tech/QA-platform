const { DataTypes } = require('sequelize');
const sequelize = require('../_db');

const HotQuestion = sequelize.define('HotQuestion', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  linkId: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'hot_questions'
});

module.exports = HotQuestion;
