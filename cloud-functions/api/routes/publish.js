import { Router } from 'express';
import axios from 'axios';
import https from 'https';
import { QuestionType, Question, HotQuestion, ServiceDesk } from '../models/index.js';

const router = Router();

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'project-git-tech';
const GITHUB_REPO = process.env.GITHUB_REPO || 'qaui-frontend';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubApi = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
  headers: {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// 发布数据到前端仓库
router.post('/', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN 未配置' });
    }

    // 从数据库获取所有数据
    const [types, questions, hotQuestions, serviceDesks] = await Promise.all([
      QuestionType.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] }),
      Question.findAll({
        order: [['order', 'ASC'], ['id', 'ASC']],
        include: [{ model: QuestionType, as: 'type', attributes: ['id', 'name'] }]
      }),
      HotQuestion.findAll({
        order: [['order', 'ASC'], ['id', 'ASC']],
        include: [{ model: Question, as: 'question', attributes: ['id', 'title'] }]
      }),
      ServiceDesk.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] })
    ]);

    // 序列化数据
    const data = {
      types: types.map(t => t.toJSON()),
      questions: questions.map(q => q.toJSON()),
      hotQuestions: hotQuestions.map(h => h.toJSON()),
      serviceDesks: serviceDesks.map(s => s.toJSON()),
      updatedAt: new Date().toISOString()
    };

    // 发布到 GitHub
    const files = [
      { path: 'data/types.json', content: JSON.stringify(data.types, null, 2) },
      { path: 'data/questions.json', content: JSON.stringify(data.questions, null, 2) },
      { path: 'data/hot-questions.json', content: JSON.stringify(data.hotQuestions, null, 2) },
      { path: 'data/service-desks.json', content: JSON.stringify(data.serviceDesks, null, 2) },
      { path: 'data/meta.json', content: JSON.stringify({ updatedAt: data.updatedAt }, null, 2) }
    ];

    const results = [];
    for (const file of files) {
      try {
        // 尝试获取现有文件的 SHA（用于更新）
        let sha = null;
        try {
          const { data: existingFile } = await githubApi.get(
            `/contents/${file.path}?ref=${GITHUB_BRANCH}`
          );
          sha = existingFile.sha;
        } catch (e) {
          // 文件不存在，创建新文件
        }

        // 创建或更新文件
        const payload = {
          message: `publish: update ${file.path}`,
          branch: GITHUB_BRANCH,
          content: Buffer.from(file.content).toString('base64')
        };
        if (sha) payload.sha = sha;

        const response = await githubApi.put(`/contents/${file.path}`, payload);
        results.push({ path: file.path, sha: response.data.content.sha });
      } catch (err) {
        console.error(`[Publish] 发布 ${file.path} 失败:`, err.message);
        results.push({ path: file.path, error: err.message });
      }
    }

    res.json({
      message: '发布完成',
      updatedAt: data.updatedAt,
      results
    });
  } catch (err) {
    console.error('[Publish] 发布失败:', err.message);
    res.status(500).json({ error: '发布失败: ' + err.message });
  }
});

// 检查发布配置
router.get('/config-check', (req, res) => {
  res.json({
    githubToken: GITHUB_TOKEN ? '已配置' : '未配置',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH
  });
});

export default router;
