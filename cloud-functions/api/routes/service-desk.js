const express = require('express');
const router = express.Router();
const { ServiceDesk } = require('../models');

// 获取服务台链接
router.get('/', async (req, res) => {
  try {
    let config = await ServiceDesk.findByPk('service_desk_config');
    if (!config) {
      config = await ServiceDesk.create({ id: 'service_desk_config', url: '' });
    }
    res.json({ url: config.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新服务台链接
router.put('/', async (req, res) => {
  try {
    const { url } = req.body;
    let config = await ServiceDesk.findByPk('service_desk_config');
    if (!config) {
      config = await ServiceDesk.create({ id: 'service_desk_config', url: url || '' });
    } else {
      config.url = url || '';
      await config.save();
    }
    res.json({ url: config.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
