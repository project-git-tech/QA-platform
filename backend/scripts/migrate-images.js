/**
 * 数据迁移脚本：将数据库中的 base64 图片迁移到 GitHub 仓库
 *
 * 用法：
 *   cd backend
 *   node scripts/migrate-images.js
 *
 * 功能：
 *   1. 读取 Image 表中所有图片
 *   2. 上传到 qaui-frontend/images/ 目录
 *   3. 更新 Question.content 中的 img-lazy-placeholder 为 <img> 标签
 *   4. 删除 Image 表中的旧数据
 */

const axios = require('axios');
const https = require('https');
const { Question, Image, sequelize } = require('../models');

// GitHub API 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const PAGES_BASE = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}`;

const githubAxios = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function uploadToGitHub(filePath, base64Content, message) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    const body = {
        message: message,
        content: base64Content,
        branch: GITHUB_BRANCH
    };

    const putRes = await githubAxios.put(url, body, {
        headers: { ...headers, 'Content-Type': 'application/json' }
    });

    return putRes.data;
}

async function migrateImages() {
    console.log('=== 图片迁移脚本启动 ===');
    console.log(`GitHub 仓库: ${GITHUB_OWNER}/${GITHUB_REPO}`);
    console.log(`Pages URL: ${PAGES_BASE}`);
    console.log('');

    // 检查配置
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.error('错误: 缺少 GitHub 环境变量 (GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO)');
        process.exit(1);
    }

    // 1. 读取所有图片
    const images = await Image.findAll();
    console.log(`找到 ${images.length} 张图片需要迁移`);

    if (images.length === 0) {
        console.log('没有图片需要迁移，退出');
        process.exit(0);
    }

    // 2. 上传每张图片到 GitHub
    const imageMap = {};  // imgKey -> pagesUrl
    for (const img of images) {
        try {
            // 从 dataUrl 提取 base64 数据
            const dataUrl = img.imageData;
            const mimeTypeMatch = dataUrl.match(/data:(image\/[^;]+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
            const ext = mimeType.split('/')[1] || 'png';
            const base64Data = dataUrl.split(',')[1];

            const filename = `${img.id}.${ext}`;
            const githubPath = `images/${filename}`;

            console.log(`上传: ${img.id} -> ${githubPath} (${(base64Data.length * 0.75 / 1024).toFixed(1)}KB)`);

            await uploadToGitHub(githubPath, base64Data, `chore(images): migrate ${img.id}`);
            imageMap[img.id] = `${PAGES_BASE}/images/${filename}`;
            console.log(`  -> ${imageMap[img.id]}`);
        } catch (error) {
            console.error(`  上传失败: ${img.id}`, error.message);
        }
    }

    console.log(`\n成功迁移 ${Object.keys(imageMap).length}/${images.length} 张图片`);

    // 3. 更新 Question.content 中的占位符
    console.log('\n更新问题内容中的图片引用...');
    const questions = await Question.findAll();
    let updatedCount = 0;

    for (const q of questions) {
        if (!q.content) continue;

        let content = q.content;
        let changed = false;

        // 替换 img-lazy-placeholder 为 img 标签
        const placeholderRegex = /<div\s+class="img-lazy-placeholder"[^>]*data-img-key="([^"]+)"[^>]*><\/div>/gi;
        content = content.replace(placeholderRegex, (match, imgKey) => {
            if (imageMap[imgKey]) {
                changed = true;
                return `<img src="${imageMap[imgKey]}" style="max-width:100%;height:auto;" />`;
            }
            return match;
        });

        // 也替换带 id 的变体
        const placeholderRegex2 = /<div\s+class="img-lazy-placeholder"[^>]*id="[^"]*"[^>]*data-src="([^"]+)"[^>]*><\/div>/gi;
        content = content.replace(placeholderRegex2, (match, src) => {
            changed = true;
            return `<img src="${src}" style="max-width:100%;height:auto;" />`;
        });

        if (changed) {
            q.content = content;
            await q.save();
            updatedCount++;
            console.log(`  更新问题: ${q.id}`);
        }
    }

    console.log(`\n更新了 ${updatedCount} 个问题`);

    // 4. 清理 Image 表（可选，默认不删除）
    console.log('\n图片迁移完成！');
    console.log('Image 表数据保留作为备份，可手动清理');

    process.exit(0);
}

migrateImages().catch(err => {
    console.error('迁移失败:', err);
    process.exit(1);
});
