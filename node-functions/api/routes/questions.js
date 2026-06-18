import { Router } from 'express';
import { Question, QuestionType } from '../models/index.js';

const router = Router();

// 获取问题列表
router.get('/', async (req, res) => {
  try {
    const { typeId } = req.query;
    const where = {};
    if (typeId) where.typeId = typeId;

    const questions = await Question.findAll({
      where,
      order: [['order', 'ASC'], ['id', 'ASC']],
      include: [{
        model: QuestionType,
        as: 'type',
        attributes: ['id', 'name']
      }]
    });
    res.json(questions);
  } catch (err) {
    console.error('[Questions] 获取问题列表失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 获取单个问题详情
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [{
        model: QuestionType,
        as: 'type',
        attributes: ['id', 'name']
      }]
    });
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    res.json(question);
  } catch (err) {
    console.error('[Questions] 获取问题详情失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 创建问题
router.post('/', async (req, res) => {
  try {
    const { title, content, typeId, order, images } = req.body;
    const question = await Question.create({
      title, content, typeId, order: order || 0, images: images || []
    });
    res.json(question);
  } catch (err) {
    console.error('[Questions] 创建问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新问题
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    const { title, content, typeId, order, images } = req.body;
    await question.update({ title, content, typeId, order, images });
    res.json(question);
  } catch (err) {
    console.error('[Questions] 更新问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 删除问题
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    await question.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[Questions] 删除问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 批量更新排序
router.put('/batch/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await Question.update({ order: item.order }, { where: { id: item.id } });
    }
    res.json({ message: '排序更新成功' });
  } catch (err) {
    console.error('[Questions] 批量排序失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
