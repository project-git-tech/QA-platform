const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  questionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imageData: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    defaultValue: 'image/png'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'images',
  timestamps: false
});

module.exports = Image;