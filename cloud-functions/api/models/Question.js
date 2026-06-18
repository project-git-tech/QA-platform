const { DataTypes } = require('sequelize');
const sequelize = require('../_db');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  typeId: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  parentId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  attribute: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hyperlink: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'questions'
});

module.exports = Question;
