const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const axios = require('axios');
const https = require('https');

// GitHub API 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// GitHub Pages 基础 URL
const PAGES_BASE = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}`;

// 创建忽略 SSL 验证的 axios 实例
const githubAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// 内存存储（不落盘）
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'));
        }
    }
});

/**
 * 通过 GitHub API 上传图片到 images/ 目录
 */
async function uploadToGitHub(filePath, content, message) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    const body = {
        message: message,
        content: content,  // 已是 base64
        branch: GITHUB_BRANCH
    };

    const putRes = await githubAxios.put(url, body, {
        headers: { ...headers, 'Content-Type': 'application/json' }
    });

    return putRes.data;
}

router.post('/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请选择要上传的图片' });
        }

        // 压缩图片：最大宽度 1200px，质量 70%，转为 WebP 格式
        let compressedBuffer;
        try {
            const image = await Jimp.read(req.file.buffer);
            const maxWidth = 1200;
            if (image.bitmap.width > maxWidth) {
                image.resize(maxWidth, Jimp.AUTO);
            }
            image.quality(70);
            compressedBuffer = await image.getBufferAsync(Jimp.MIME_WEBP);
        } catch (e) {
            // 压缩失败，使用原始文件
            compressedBuffer = req.file.buffer;
        }

        // 生成文件名
        const filename = `img_${Date.now()}.webp`;
        const githubPath = `images/${filename}`;
        const base64Content = compressedBuffer.toString('base64');

        // 检查 GitHub 配置
        if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
            // 降级：返回 base64 dataUrl（兼容旧逻辑）
            const dataUrl = `data:image/webp;base64,${base64Content}`;
            return res.json({
                success: true,
                url: dataUrl,
                dataUrl: dataUrl,
                warning: 'GitHub 未配置，使用 base64 内联'
            });
        }

        // 上传到 GitHub
        await uploadToGitHub(
            githubPath,
            base64Content,
            `chore(images): upload ${filename}`
        );

        // 返回 GitHub Pages URL
        const imageUrl = `${PAGES_BASE}/images/${filename}`;

        res.json({
            success: true,
            url: imageUrl,
            dataUrl: imageUrl,  // 兼容前端 dataUrl 字段
            sizeKB: (compressedBuffer.length / 1024).toFixed(1)
        });
    } catch (error) {
        console.error('图片上传失败:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
