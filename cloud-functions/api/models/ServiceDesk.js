import { Sequelize } from '../_db.js';

export default sequelize => {
  const ServiceDesk = sequelize.define('ServiceDesk', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false
    },
    icon: {
      type: Sequelize.STRING,
      defaultValue: ''
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'service_desks',
    timestamps: true,
    underscored: true
  });

  return ServiceDesk;
};
