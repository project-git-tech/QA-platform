const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServiceDesk = sequelize.define('ServiceDesk', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: 'service_desk_config'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    defaultValue: ''
  }
}, {
  timestamps: true,
  tableName: 'service_desk'
});

module.exports = ServiceDesk;
