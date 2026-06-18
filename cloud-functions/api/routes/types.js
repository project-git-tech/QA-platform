import { Router } from 'express';
import { QuestionType, Question } from '../models/index.js';

const router = Router();

// 获取所有问题类型（含问题列表）
router.get('/', async (req, res) => {
  try {
    const types = await QuestionType.findAll({
      order: [['order', 'ASC'], ['id', 'ASC']],
      include: [{
        model: Question,
        as: 'questions',
        attributes: ['id', 'title', 'order']
      }]
    });
    res.json(types);
  } catch (err) {
    console.error('[Types] 获取类型列表失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 创建问题类型
router.post('/', async (req, res) => {
  try {
    const { name, icon, order } = req.body;
    const type = await QuestionType.create({ name, icon, order: order || 0 });
    res.json(type);
  } catch (err) {
    console.error('[Types] 创建类型失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新问题类型
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, order } = req.body;
    const type = await QuestionType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: '类型不存在' });
    }
    await type.update({ name, icon, order });
    res.json(type);
  } catch (err) {
    console.error('[Types] 更新类型失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 删除问题类型
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const type = await QuestionType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: '类型不存在' });
    }
    await type.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[Types] 删除类型失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 批量更新排序
router.put('/batch/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await QuestionType.update({ order: item.order }, { where: { id: item.id } });
    }
    res.json({ message: '排序更新成功' });
  } catch (err) {
    console.error('[Types] 批量排序失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
