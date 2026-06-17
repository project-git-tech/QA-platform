const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');
const { QuestionType, Question, HotQuestion, ServiceDesk } = require('../models');

// 创建忽略 SSL 验证的 axios 实例（用于解决某些网络环境的证书问题）
const githubAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

// GitHub API 配置
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;     // fine-grained PAT
const GITHUB_OWNER = process.env.GITHUB_OWNER;     // 仓库所有者
const GITHUB_REPO = process.env.GITHUB_REPO;       // 前端仓库名，如 qaui-frontend
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// 简单的发布防抖：1 分钟内最多 1 次
let lastPublishTime = 0;
const PUBLISH_DEBOUNCE_MS = 60 * 1000;

/**
 * 通过 GitHub API 创建/更新文件
 * PUT /repos/{owner}/{repo}/contents/{path}
 */
async function updateGitHubFile(filePath, content, message) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    // 获取当前文件 sha（若存在，更新时需要带上）
    let sha = null;
    try {
        const getRes = await githubAxios.get(url, {
            params: { ref: GITHUB_BRANCH },
            headers
        });
        sha = getRes.data.sha;
    } catch (e) {
        // 文件不存在，sha 保持 null（创建新文件）
    }

    // 写入文件
    const body = {
        message: message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await githubAxios.put(url, body, {
        headers: { ...headers, 'Content-Type': 'application/json' }
    });

    return putRes.data;
}

/**
 * GET /api/publish/status
 * 检查发布功能配置状态
 */
router.get('/status', async (req, res) => {
    const configured = !!(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);
    res.json({
        configured,
        repo: configured ? `${GITHUB_OWNER}/${GITHUB_REPO}` : null,
        branch: GITHUB_BRANCH,
        message: configured ? '发布功能已配置' : '发布功能未配置（缺少 GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO 环境变量）'
    });
});

/**
 * POST /api/publish
 * 序列化数据库内容到前端仓库的 data/ 目录
 */
router.post('/', async (req, res) => {
    try {
        // 防抖检查
        const now = Date.now();
        if (now - lastPublishTime < PUBLISH_DEBOUNCE_MS) {
            const waitSec = Math.ceil((PUBLISH_DEBOUNCE_MS - (now - lastPublishTime)) / 1000);
            return res.status(429).json({
                success: false,
                error: `发布过于频繁，请 ${waitSec} 秒后重试`
            });
        }

        // 检查配置
        if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
            return res.status(500).json({
                success: false,
                error: 'GitHub 配置缺失（GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO）'
            });
        }

        const timestamp = new Date().toISOString();
        const results = [];

        // 1. 序列化 types
        const types = await QuestionType.findAll({
            order: [['order', 'ASC']]
        });
        await updateGitHubFile(
            'data/types.json',
            JSON.stringify(types, null, 2),
            `chore(data): update types at ${timestamp}`
        );
        results.push({ file: 'data/types.json', count: types.length });

        // 2. 序列化 questions（含 content，供文章页使用）
        const questions = await Question.findAll({
            order: [['order', 'ASC']]
        });
        await updateGitHubFile(
            'data/questions.json',
            JSON.stringify(questions, null, 2),
            `chore(data): update questions at ${timestamp}`
        );
        results.push({ file: 'data/questions.json', count: questions.length });

        // 3. 序列化 hot questions
        const hotQuestions = await HotQuestion.findAll({
            where: { status: true },
            order: [['order', 'ASC']]
        });
        await updateGitHubFile(
            'data/hot.json',
            JSON.stringify(hotQuestions, null, 2),
            `chore(data): update hot questions at ${timestamp}`
        );
        results.push({ file: 'data/hot.json', count: hotQuestions.length });

        // 4. 序列化 service desk
        let serviceDesk = await ServiceDesk.findByPk('service_desk_config');
        const serviceDeskData = serviceDesk ? { url: serviceDesk.url } : { url: '' };
        await updateGitHubFile(
            'data/service-desk.json',
            JSON.stringify(serviceDeskData, null, 2),
            `chore(data): update service desk at ${timestamp}`
        );
        results.push({ file: 'data/service-desk.json', count: 1 });

        // 5. 写入发布元信息
        const meta = {
            publishedAt: timestamp,
            publishedBy: 'admin',
            version: Date.now(),
            stats: {
                types: types.length,
                questions: questions.length,
                hotQuestions: hotQuestions.length
            }
        };
        await updateGitHubFile(
            'data/meta.json',
            JSON.stringify(meta, null, 2),
            `chore(data): update meta at ${timestamp}`
        );

        // 更新防抖时间
        lastPublishTime = Date.now();

        res.json({
            success: true,
            message: '发布成功，GitHub Pages 将在 1-2 分钟内更新',
            publishedAt: timestamp,
            files: results,
            repo: `${GITHUB_OWNER}/${GITHUB_REPO}`,
            branch: GITHUB_BRANCH
        });

    } catch (error) {
        console.error('发布失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
