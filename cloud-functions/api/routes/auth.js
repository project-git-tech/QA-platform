import { Router } from 'express';
import axios from 'axios';
import feishuConfig from '../config/feishu.js';

const router = Router();

// 飞书登录
router.get('/login', (req, res) => {
  const authUrl = `${feishuConfig.apiBase}/authen/v1/authorize?` +
    `app_id=${feishuConfig.appId}&redirect_uri=${encodeURIComponent(feishuConfig.redirectUri)}&state=login`;
  res.redirect(authUrl);
});

// 飞书回调
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: '缺少授权码' });
  }

  try {
    // Step 1: 获取 app_access_token
    const tokenResponse = await axios.post(
      `${feishuConfig.apiBase}/auth/v3/app_access_token/internal`,
      {
        app_id: feishuConfig.appId,
        app_secret: feishuConfig.appSecret
      }
    );

    const appAccessToken = tokenResponse.data.app_access_token;
    if (!appAccessToken) {
      throw new Error('获取app_access_token失败');
    }

    // Step 2: 用 code 换取 user_access_token
    const tokenData = await axios.post(
      `${feishuConfig.apiBase}/authen/v1/oidc/access_token`,
      {
        grant_type: 'authorization_code',
        code: code
      },
      {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (tokenData.data.code !== 0) {
      throw new Error(`获取token失败: ${tokenData.data.msg}`);
    }

    const { access_token, expires_in } = tokenData.data.data;
    console.log('[Auth] 成功获取access_token');

    // Step 3: 用 access_token 获取用户信息
    const userResponse = await axios.get(
      `${feishuConfig.apiBase}/authen/v1/user_info`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );

    const userData = userResponse.data;
    if (userData.code !== 0) {
      throw new Error(`获取用户信息失败: ${userData.msg}`);
    }

    const user = userData.data;
    console.log('[Auth] 用户登录成功:', user.name);

    // 保存用户信息到 session
    req.session.user = {
      name: user.name,
      userId: user.user_id,
      avatar: user.avatar_url,
      isAdmin: feishuConfig.adminUsers.includes(user.name)
    };

    // 重定向回前端首页
    const frontendUrl = process.env.FRONTEND_URL || '/';
    res.redirect(frontendUrl);
  } catch (err) {
    console.error('[Auth] 登录失败:', err.message);
    res.status(500).json({ error: '登录失败: ' + err.message });
  }
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: '未登录' });
  }
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: '已登出' });
});

export default router;
