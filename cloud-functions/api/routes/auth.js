/**
 * 飞书 OAuth 2.0 认证路由（适配 EdgeOne Pages）
 */
const express = require('express');
const axios = require('axios');
const feishuConfig = require('../config/feishu');

const router = express.Router();

/**
 * API 1: 发起飞书登录
 */
router.get('/login', (req, res) => {
  const { appId, redirectUri } = feishuConfig;

  const authUrl = `${feishuConfig.apiBase}/authen/v1/authorize?` +
    `app_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log('[Auth] 重定向到飞书授权页面:', authUrl);
  res.redirect(authUrl);
});

/**
 * API 2: 处理OAuth回调
 */
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      console.error('[Auth] 回调缺少code参数');
      return res.status(400).json({
        success: false,
        message: '授权失败：缺少授权码'
      });
    }

    console.log('[Auth] 收到授权码:', code);

    // Step 1: 用 authorization_code 换取 user_access_token
    const tokenResponse = await axios.post(
      `${feishuConfig.apiBase}/authen/v1/access_token`,
      {
        grant_type: 'authorization_code',
        code: code
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const tokenData = tokenResponse.data;

    if (tokenData.code !== 0) {
      throw new Error(`获取token失败: ${tokenData.msg}`);
    }

    const { access_token, expires_in } = tokenData.data;
    console.log('[Auth] 成功获取access_token');

    // Step 2: 用 access_token 获取用户信息
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

    const userInfo = userData.data;
    console.log('[Auth] 获取用户信息成功:', userInfo.name);

    // Step 3: 存入 session
    req.session.feishuUser = {
      name: userInfo.name,
      avatar: userInfo.avatar_url,
      email: userInfo.email || '',
      mobile: userInfo.mobile || '',
      accessToken: access_token,
      tokenExpiresAt: Date.now() + (expires_in * 1000),
      loginTime: new Date().toISOString()
    };

    console.log('[Auth] 用户登录成功:', userInfo.name);

    // 重定向回前端首页
    const frontendUrl = process.env.FRONTEND_URL || '/';
    res.redirect(frontendUrl);

  } catch (error) {
    console.error('[Auth] OAuth回调处理失败:', error.message);

    const frontendUrl = process.env.FRONTEND_URL || '/';
    res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * API 3: 获取当前登录状态
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.feishuUser) {
    const user = req.session.feishuUser;

    const isExpired = Date.now() > user.tokenExpiresAt;

    if (isExpired) {
      delete req.session.feishuUser;
      return res.json({
        loggedIn: false,
        message: '登录已过期，请重新登录'
      });
    }

    const adminUsers = feishuConfig.adminUsers || [];
    const isAdmin = adminUsers.includes(user.name);

    const safeUser = {
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      loginTime: user.loginTime
    };

    res.json({
      loggedIn: true,
      user: safeUser,
      isAdmin: isAdmin
    });
  } else {
    res.json({
      loggedIn: false
    });
  }
});

/**
 * API 4: 登出
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    const userName = req.session.feishuUser?.name || '未知用户';
    req.session.destroy((err) => {
      if (err) {
        console.error('[Auth] 登出失败:', err);
        return res.status(500).json({
          success: false,
          message: '登出失败'
        });
      }
      console.log('[Auth] 用户已登出:', userName);
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: '已成功登出'
      });
    });
  } else {
    res.json({
      success: true,
      message: '未登录状态'
    });
  }
});

/**
 * API 5: 管理员权限验证
 */
router.get('/admin-check', (req, res) => {
  if (!req.session || !req.session.feishuUser) {
    return res.json({
      isAdmin: false,
      message: '未登录'
    });
  }

  const user = req.session.feishuUser;
  const adminUsers = feishuConfig.adminUsers || [];
  const isAdmin = adminUsers.includes(user.name);

  console.log('[Auth-Admin] 用户', user.name, '管理员验证:', isAdmin ? '通过' : '拒绝');

  res.json({
    isAdmin: isAdmin,
    user: {
      name: user.name,
      avatar: user.avatar
    }
  });
});

/**
 * API 6: 获取服务台跳转链接
 */
router.get('/service-desk-url', (req, res) => {
  if (!req.session || !req.session.feishuUser) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '请先登录后才能访问服务台'
    });
  }

  const user = req.session.feishuUser;
  const chatId = feishuConfig.serviceDeskChatId;

  const primaryUrl = `feishu://open_chat?chat_id=${chatId}`;
  const fallbackUrl = 'https://www.feishu.cn/messenger';

  console.log('[Auth-ServiceDesk] 用户', user.name, '请求访问服务台');

  res.json({
    success: true,
    data: {
      primaryUrl: primaryUrl,
      fallbackUrl: fallbackUrl,
      serviceDesk: {
        name: 'MTDS服务台',
        chatId: chatId
      },
      userContext: {
        name: user.name,
        loginTime: user.loginTime
      }
    },
    usage: {
      step1: '优先尝试 primaryUrl (feishu:// URL Scheme)',
      step2: '如果失败或超时(3秒)，使用 fallbackUrl 打开网页版',
      tip: '建议前端实现自动降级逻辑'
    }
  });
});

module.exports = router;
