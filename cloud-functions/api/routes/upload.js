import { Router } from 'express';
import axios from 'axios';
import https from 'https';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// 上传图片到 GitHub 仓库
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN 未配置' });
    }

    const { buffer, originalname, mimetype } = req.file;

    // 生成文件名：时间戳 + 原始文件名
    const timestamp = Date.now();
    const ext = originalname.split('.').pop();
    const filename = `${timestamp}.${ext}`;
    const githubPath = `images/${filename}`;

    // 上传到 GitHub
    const response = await githubApi.put(`/contents/${githubPath}`, {
      message: `upload image: ${filename}`,
      branch: GITHUB_BRANCH,
      content: buffer.toString('base64')
    });

    // 返回图片 URL（通过 GitHub Pages 访问）
    const imageUrl = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/${githubPath}`;

    res.json({
      url: imageUrl,
      filename: filename,
      path: githubPath,
      sha: response.data.content.sha
    });
  } catch (err) {
    console.error('[Upload] 上传图片失败:', err.response?.data || err.message);
    res.status(500).json({ error: '上传图片失败: ' + (err.response?.data?.message || err.message) });
  }
});

// 删除 GitHub 仓库中的图片
router.delete('/:filename', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN 未配置' });
    }

    const { filename } = req.params;
    const githubPath = `images/${filename}`;

    // 先获取文件的 SHA
    const { data: fileData } = await githubApi.get(`/contents/${githubPath}?ref=${GITHUB_BRANCH}`);

    // 删除文件
    await githubApi.delete(`/contents/${githubPath}`, {
      data: {
        message: `delete image: ${filename}`,
        branch: GITHUB_BRANCH,
        sha: fileData.sha
      }
    });

    res.json({ message: '图片删除成功' });
  } catch (err) {
    console.error('[Upload] 删除图片失败:', err.response?.data || err.message);
    res.status(500).json({ error: '删除图片失败: ' + (err.response?.data?.message || err.message) });
  }
});

export default router;
