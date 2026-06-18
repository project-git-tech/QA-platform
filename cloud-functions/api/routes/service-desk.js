import { Router } from 'express';
import { ServiceDesk } from '../models/index.js';

const router = Router();

// 获取服务台列表
router.get('/', async (req, res) => {
  try {
    const desks = await ServiceDesk.findAll({
      order: [['order', 'ASC'], ['id', 'ASC']]
    });
    res.json(desks);
  } catch (err) {
    console.error('[ServiceDesk] 获取服务台列表失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 创建服务台
router.post('/', async (req, res) => {
  try {
    const { name, url, icon, order } = req.body;
    const desk = await ServiceDesk.create({ name, url, icon, order: order || 0 });
    res.json(desk);
  } catch (err) {
    console.error('[ServiceDesk] 创建服务台失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新服务台
router.put('/:id', async (req, res) => {
  try {
    const desk = await ServiceDesk.findByPk(req.params.id);
    if (!desk) {
      return res.status(404).json({ error: '服务台不存在' });
    }
    const { name, url, icon, order } = req.body;
    await desk.update({ name, url, icon, order });
    res.json(desk);
  } catch (err) {
    console.error('[ServiceDesk] 更新服务台失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 删除服务台
router.delete('/:id', async (req, res) => {
  try {
    const desk = await ServiceDesk.findByPk(req.params.id);
    if (!desk) {
      return res.status(404).json({ error: '服务台不存在' });
    }
    await desk.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[ServiceDesk] 删除服务台失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
