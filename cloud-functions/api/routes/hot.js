import { Router } from 'express';
import { HotQuestion, Question } from '../models/index.js';

const router = Router();

// 获取热门问题列表
router.get('/', async (req, res) => {
  try {
    const hotQuestions = await HotQuestion.findAll({
      order: [['order', 'ASC'], ['id', 'ASC']],
      include: [{
        model: Question,
        as: 'question',
        attributes: ['id', 'title']
      }]
    });
    res.json(hotQuestions);
  } catch (err) {
    console.error('[Hot] 获取热门问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 添加热门问题
router.post('/', async (req, res) => {
  try {
    const { questionId, order } = req.body;
    const hot = await HotQuestion.create({ questionId, order: order || 0 });
    res.json(hot);
  } catch (err) {
    console.error('[Hot] 添加热门问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 删除热门问题
router.delete('/:id', async (req, res) => {
  try {
    const hot = await HotQuestion.findByPk(req.params.id);
    if (!hot) {
      return res.status(404).json({ error: '热门问题不存在' });
    }
    await hot.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[Hot] 删除热门问题失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 批量更新排序
router.put('/batch/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await HotQuestion.update({ order: item.order }, { where: { id: item.id } });
    }
    res.json({ message: '排序更新成功' });
  } catch (err) {
    console.error('[Hot] 批量排序失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
