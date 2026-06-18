import { Sequelize } from '../_db.js';

export default sequelize => {
  const HotQuestion = sequelize.define('HotQuestion', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    questionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      field: 'question_id'
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'hot_questions',
    timestamps: true,
    underscored: true
  });

  return HotQuestion;
};
