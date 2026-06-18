const express = require('express');
const router = express.Router();
const { QuestionType } = require('../models');

router.get('/', async (req, res) => {
  try {
    const types = await QuestionType.findAll({
      order: [['order', 'ASC']]
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, description, order, status } = req.body;
    const type = await QuestionType.create({
      id: 'type_' + Date.now(),
      name,
      icon: icon || 'ri-file-text-line',
      description,
      order: order || 0,
      status: status !== undefined ? status : true
    });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description, order, status } = req.body;
    const type = await QuestionType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: '问题类型不存在' });
    }
    type.name = name;
    type.icon = icon;
    type.description = description;
    type.order = order;
    type.status = status;
    await type.save();
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const type = await QuestionType.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: '问题类型不存在' });
    }
    await type.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
