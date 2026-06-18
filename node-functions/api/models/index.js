import { sequelize, Sequelize } from '../_db.js';
import QuestionFactory from './Question.js';
import QuestionTypeFactory from './QuestionType.js';
import HotQuestionFactory from './HotQuestion.js';
import ServiceDeskFactory from './ServiceDesk.js';

// 初始化模型
const Question = QuestionFactory(sequelize);
const QuestionType = QuestionTypeFactory(sequelize);
const HotQuestion = HotQuestionFactory(sequelize);
const ServiceDesk = ServiceDeskFactory(sequelize);

// 定义关联关系
QuestionType.hasMany(Question, {
  foreignKey: 'typeId',
  as: 'questions'
});
Question.belongsTo(QuestionType, {
  foreignKey: 'typeId',
  as: 'type'
});

HotQuestion.belongsTo(Question, {
  foreignKey: 'questionId',
  as: 'question'
});
Question.hasMany(HotQuestion, {
  foreignKey: 'questionId',
  as: 'hotQuestions'
});

export { sequelize, Sequelize, Question, QuestionType, HotQuestion, ServiceDesk };
