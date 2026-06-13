const express = require('express');
const router = express.Router();
const { HotQuestion } = require('../models');

router.get('/', async (req, res) => {
  try {
    const hotQuestions = await HotQuestion.findAll({
      where: { status: true },
      order: [['order', 'ASC']]
    });
    res.json(hotQuestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, linkId, order, status } = req.body;
    const hotQuestion = await HotQuestion.create({
      id: 'hq_' + Date.now(),
      title,
      linkId,
      order: order || 0,
      status: status !== undefined ? status : true
    });
    res.json(hotQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, linkId, order, status } = req.body;
    const hotQuestion = await HotQuestion.findByPk(id);
    if (!hotQuestion) {
      return res.status(404).json({ error: '热门问题不存在' });
    }
    hotQuestion.title = title;
    hotQuestion.linkId = linkId;
    hotQuestion.order = order;
    hotQuestion.status = status;
    await hotQuestion.save();
    res.json(hotQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hotQuestion = await HotQuestion.findByPk(id);
    if (!hotQuestion) {
      return res.status(404).json({ error: '热门问题不存在' });
    }
    await hotQuestion.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;