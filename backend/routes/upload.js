const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = 'img_' + Date.now() + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'));
    }
  }
});

router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    
    // 压缩图片：最大宽度 1200px，质量 70%，转为 WebP 格式
    const image = await Jimp.read(req.file.path);
    const maxWidth = 1200;
    if (image.bitmap.width > maxWidth) {
      image.resize(maxWidth, Jimp.AUTO);
    }
    image.quality(70);
    
    // 导出为 WebP 格式（更小的文件大小）
    const compressedBuffer = await image.getBufferAsync(Jimp.MIME_WEBP);
    const base64 = compressedBuffer.toString('base64');
    const dataUrl = `data:image/webp;base64,${base64}`;
    
    // 计算压缩比
    const originalSize = fs.statSync(req.file.path).size;
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    res.json({ 
      success: true, 
      url: filePath,
      dataUrl: dataUrl,
      originalSizeKB: (originalSize / 1024).toFixed(1),
      compressedSizeKB: (compressedSize / 1024).toFixed(1),
      compressionRatio: compressionRatio + '%'
    });
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 降级处理：不压缩，直接转 base64
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;
      res.json({ 
        success: true, 
        url: filePath,
        dataUrl: dataUrl,
        warning: '图片压缩失败，使用原始图片'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

module.exports = router;