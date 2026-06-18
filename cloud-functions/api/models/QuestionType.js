import { Sequelize } from '../_db.js';

export default sequelize => {
  const QuestionType = sequelize.define('QuestionType', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
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
    tableName: 'question_types',
    timestamps: true,
    underscored: true
  });

  return QuestionType;
};
