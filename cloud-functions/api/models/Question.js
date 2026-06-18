import { Sequelize } from '../_db.js';

export default sequelize => {
  const Question = sequelize.define('Question', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    typeId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      field: 'type_id'
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    images: {
      type: Sequelize.TEXT,
      defaultValue: '[]',
      get() {
        const val = this.getDataValue('images');
        try { return JSON.parse(val || '[]'); } catch { return []; }
      },
      set(val) {
        this.setDataValue('images', JSON.stringify(val || []));
      }
    }
  }, {
    tableName: 'questions',
    timestamps: true,
    underscored: true
  });

  return Question;
};
