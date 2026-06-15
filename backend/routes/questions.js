const express = require('express');
const router = express.Router();
const { Question } = require('../models');

// 列表接口：只返回轻量字段，不含 content（避免 base64 图片导致 JSON 过大）
router.get('/', async (req, res) => {
  try {
    const questions = await Question.findAll({
      attributes: ['id', 'typeId', 'parentId', 'title', 'attribute', 'contentType', 'hyperlink', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC']]
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 按类型查询列表（同样不含 content）
router.get('/type/:typeId', async (req, res) => {
  try {
    const { typeId } = req.params;
    const questions = await Question.findAll({
      where: { typeId },
      attributes: ['id', 'typeId', 'parentId', 'title', 'attribute', 'contentType', 'hyperlink', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC']]
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 单条详情接口：返回完整数据（含 content），供文章页面使用
// 优化：将大的 base64 图片替换为引用，通过独立 API 获取
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    
    const result = { ...question.toJSON() };
    const imageCache = {};
    
    // 如果 content 包含大的 base64 图片，替换为引用
    if (result.content) {
      const base64ImgRegex = /<img([^>]+)src="(data:image\/[^;]+;base64,[^"]+)"([^>]*)>/gi;
      let imageIndex = 0;
      
      result.content = result.content.replace(base64ImgRegex, (match, before, src, after) => {
        if (src.length > 10000) {
          imageIndex++;
          const imgKey = `${id}_img_${imageIndex}`;
          imageCache[imgKey] = src;
          return `<div class="img-lazy-placeholder" data-img-key="${imgKey}" style="padding-top:56.25%"></div>`;
        }
        return match;
      });
    }
    
    // 将图片缓存到全局变量（简化实现）
    if (Object.keys(imageCache).length > 0) {
      global.__imageCache = global.__imageCache || {};
      Object.assign(global.__imageCache, imageCache);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取分离的图片数据
router.get('/:id/image/:imgKey', async (req, res) => {
  try {
    const { imgKey } = req.params;
    const imageCache = global.__imageCache || {};
    
    if (!imageCache[imgKey]) {
      return res.status(404).json({ error: '图片不存在' });
    }
    
    const src = imageCache[imgKey];
    const mimeType = src.match(/data:(image\/[^;]+)/)[1];
    const base64Data = src.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { typeId, parentId, title, attribute, contentType, content, hyperlink, order } = req.body;
    const question = await Question.create({
      id: 'q_' + Date.now(),
      typeId,
      parentId: parentId || null,
      title,
      attribute,
      contentType,
      content,
      hyperlink,
      order: order || 0
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { typeId, parentId, title, attribute, contentType, content, hyperlink, order } = req.body;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    question.typeId = typeId;
    question.parentId = parentId || null;
    question.title = title;
    question.attribute = attribute;
    question.contentType = contentType;
    question.content = content;
    question.hyperlink = hyperlink;
    question.order = order;
    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }
    await question.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;