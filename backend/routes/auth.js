/**
 * 飞书 OAuth 2.0 认证路由
 * 
 * 实现功能：
 * 1. /login - 发起飞书授权（重定向到飞书登录页）
 * 2. /callback - 处理OAuth回调（换取token、获取用户信息）
 * 3. /me - 获取当前登录状态
 * 4. /logout - 登出
 */

const express = require('express');
const axios = require('axios');
const feishuConfig = require('../config/feishu');

const router = express.Router();

/**
 * API 1: 发起飞书登录
 * 
 * 生成飞书授权URL并重定向用户
 * 前端调用：window.location = '/api/auth/login'
 */
router.get('/login', (req, res) => {
  const { appId, redirectUri } = feishuConfig;
  
  // 构建飞书授权URL
  const authUrl = `${feishuConfig.apiBase}/authen/v1/authorize?` +
    `app_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('[Auth] 重定向到飞书授权页面:', authUrl);
  res.redirect(authUrl);
});

/**
 * API 2: 处理OAuth回调
 * 
 * 飞书授权后会回调此地址，携带 authorization_code
 * 流程：code → access_token → 用户信息 → 存入session
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
    
    // Step 3: 存入 session（不存数据库）
    req.session.feishuUser = {
      // 基本信息
      name: userInfo.name,
      avatar: userInfo.avatar_url,
      email: userInfo.email || '',
      mobile: userInfo.mobile || '',
      
      // 飞书凭证（用于后续API调用）
      accessToken: access_token,
      tokenExpiresAt: Date.now() + (expires_in * 1000),
      
      // 登录时间
      loginTime: new Date().toISOString()
    };
    
    console.log('[Auth] 用户登录成功:', userInfo.name);
    
    // 重定向回前端首页
    // 开发环境重定向到 http://localhost:3000（或前端单独的端口）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(frontendUrl);
    
  } catch (error) {
    console.error('[Auth] OAuth回调处理失败:', error.message);
    
    // 错误时重定向到首页，并带上错误信息（可选）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * API 3: 获取当前登录状态
 * 
 * 前端页面加载时调用，用于显示登录状态
 * 返回值示例：
 *   已登录: { loggedIn: true, user: { name, avatar, email }, isAdmin: true/false }
 *   未登录: { loggedIn: false }
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.feishuUser) {
    const user = req.session.feishuUser;
    
    // 检查token是否过期（可选优化）
    const isExpired = Date.now() > user.tokenExpiresAt;
    
    if (isExpired) {
      // Token已过期，清除session
      delete req.session.feishuUser;
      return res.json({ 
        loggedIn: false,
        message: '登录已过期，请重新登录'
      });
    }
    
    // 判断是否为管理员（根据飞书账号白名单）
    const adminUsers = feishuConfig.adminUsers || [];
    const isAdmin = adminUsers.includes(user.name);
    
    // 返回安全信息（隐藏敏感字段如accessToken）
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
 * 
 * 清除服务端session
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
      res.clearCookie('connect.sid'); // 清除session cookie
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
 * 
 * 检查当前登录用户是否为管理员（根据飞书账号白名单）
 * 前端调用：fetch('/api/auth/admin-check')
 * 返回值示例：
 *   已登录管理员: { isAdmin: true, user: { name, avatar } }
 *   已登录非管理员: { isAdmin: false, user: { name, avatar } }
 *   未登录: { isAdmin: false, message: '未登录' }
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
 * API 5: 获取服务台跳转链接
 * 
 * 为已登录用户生成飞书服务台的跳转URL
 * 支持两种模式：
 *   1. 客户端优先: 尝试使用 feishu:// URL Scheme（体验最佳）
 *   2. 网页降级: 如果客户端不可用，降级到网页版飞书
 * 
 * 前端调用示例:
 *   fetch('/api/auth/service-desk-url')
 *     .then(res => res.json())
 *     .then(data => {
 *       if (data.primaryUrl) window.location.href = data.primaryUrl;
 *       else if (data.fallbackUrl) window.open(data.fallbackUrl);
 *     });
 */
router.get('/service-desk-url', (req, res) => {
  // 检查是否已登录
  if (!req.session || !req.session.feishuUser) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '请先登录后才能访问服务台'
    });
  }

  const user = req.session.feishuUser;
  const chatId = feishuConfig.serviceDeskChatId;

  // 方案A: URL Scheme - 直接打开飞书客户端的特定会话
  // 格式: feishu://open_chat?chat_id=xxx
  const primaryUrl = `feishu://open_chat?chat_id=${chatId}`;

  // 方案B: 网页版降级 - 如果用户未安装飞书客户端
  // 直接打开网页版飞书的messenger
  const fallbackUrl = 'https://www.feishu.cn/messenger';

  console.log('[Auth-ServiceDesk] 用户', user.name, '请求访问服务台');

  res.json({
    success: true,
    data: {
      // 主要链接（尝试打开飞书客户端）
      primaryUrl: primaryUrl,
      
      // 备用链接（网页版飞书）
      fallbackUrl: fallbackUrl,
      
      // 服务台信息
      serviceDesk: {
        name: 'MTDS服务台',
        chatId: chatId
      },
      
      // 用户上下文（可用于后续增强功能）
      userContext: {
        name: user.name,
        loginTime: user.loginTime
      }
    },
    
    // 使用说明
    usage: {
      step1: '优先尝试 primaryUrl (feishu:// URL Scheme)',
      step2: '如果失败或超时(3秒)，使用 fallbackUrl 打开网页版',
      tip: '建议前端实现自动降级逻辑'
    }
  });
});

/**
 * API 6 (增强版): 发送消息卡片到服务台并跳转
 * 
 * 功能说明：
 * 1. 调用飞书API向服务台会话发送一条结构化消息卡片
 * 2. 消息卡片包含用户身份信息和上下文
 * 3. 然后执行跳转到服务台对话
 * 
 * 相比普通跳转的优势：
 * ✅ 服务台客服可以立即看到用户来源和需求
 * ✅ 可以携带用户当前浏览的问题上下文
 * ✅ 提供快捷操作按钮提升效率
 * 
 * 需要的权限：
 * - im:message:send_as_bot (以机器人身份发送消息)
 * - im:message (读取/发送消息)
 * 
 * 前端调用示例：
 *   fetch('/api/auth/service-desk-with-context', {
 *     method: 'POST',
 *     body: JSON.stringify({
 *       context: {
 *         currentQuestion: '衣柜材质选择',
 *         currentPage: '/questions?type=product'
 *       }
 *     })
 *   })
 */
router.post('/service-desk-with-context', async (req, res) => {
  try {
    // Step 1: 验证登录状态
    if (!req.session || !req.session.feishuUser) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '请先登录后才能访问服务台'
      });
    }

    const user = req.session.feishuUser;
    const chatId = feishuConfig.serviceDeskChatId;
    
    // Step 2: 获取用户提供的上下文信息（可选）
    const { context = {} } = req.body;
    
    console.log('[Auth-ServiceDesk-Enhanced] 用户', user.name, '请求智能服务台跳转');
    console.log('[Auth-ServiceDesk-Enhanced] 用户上下文:', context);

    // Step 3: 构建消息卡片内容
    const messageCard = buildServiceDeskMessageCard(user, context);
    
    let messageSent = false;
    let messageId = null;

    // Step 4: 尝试发送消息卡片到飞书服务台
    try {
      // 注意：这里需要使用 tenant_access_token 或 user_access_token
      // 当前我们存储的是 user_access_token，但发送机器人消息通常需要 tenant_access_token
      // 这是一个简化的实现，实际生产环境可能需要调整认证方式
      
      const messageResponse = await axios.post(
        `${feishuConfig.apiBase}/im/v1/messages?receive_id_type=chat_id`,
        {
          receive_id: chatId,
          msg_type: "interactive",
          content: JSON.stringify(messageCard)
        },
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (messageResponse.data.code === 0) {
        messageSent = true;
        messageId = messageResponse.data.data.message_id;
        console.log('[Auth-ServiceDesk-Enhanced] 消息卡片发送成功, ID:', messageId);
      } else {
        console.warn('[Auth-ServiceDesk-Enhanced] 消息卡片发送失败:', messageResponse.data.msg);
      }
      
    } catch (error) {
      console.warn('[Auth-ServiceDesk-Enhanced] 发送消息异常:', error.message);
      console.warn('[Auth-ServiceDesk-Enhanced] 这可能是正常的(测试环境token无效), 将继续执行跳转');
      
      // 在开发环境中，如果发送失败不阻止跳转流程
      if (process.env.NODE_ENV === 'production') {
        throw error; // 生产环境应该抛出错误
      }
      // 开发环境继续执行，仅记录警告
    }

    // Step 5: 返回跳转URL（与普通跳转相同）
    const primaryUrl = `feishu://open_chat?chat_id=${chatId}`;
    const fallbackUrl = 'https://www.feishu.cn/messenger';

    res.json({
      success: true,
      data: {
        // 跳转链接（与普通版本相同）
        primaryUrl: primaryUrl,
        fallbackUrl: fallbackUrl,
        
        // 服务台信息
        serviceDesk: {
          name: 'MTDS服务台',
          chatId: chatId
        },
        
        // 消息卡片状态
        messageCard: {
          sent: messageSent,
          messageId: messageId,
          content: messageCard  // 返回卡片内容供前端展示（可选）
        },
        
        // 用户上下文
        userContext: {
          name: user.name,
          loginTime: user.loginTime,
          ...context
        }
      },
      
      // 使用提示
      usage: {
        tip: messageSent 
          ? '已向服务台发送您的咨询信息，客服将更快响应' 
          : '正在打开服务台（消息功能需要配置机器人权限）',
        nextStep: '点击确认后跳转到服务台对话'
      }
    });

  } catch (error) {
    console.error('[Auth-ServiceDesk-Enhanced] 处理失败:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务台跳转准备失败，请稍后重试'
    });
  }
});

/**
 * 辅助函数：构建服务台消息卡片
 * 
 * 创建一个结构化的飞书消息卡片，包含：
 * - 用户基本信息
 * - 来源系统标识
 * - 问题上下文（如果有）
 * - 时间戳
 */
function buildServiceDeskMessageCard(user, context) {
  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 构建问题上下文部分（可选）
  let contextSection = '';
  if (context.currentQuestion) {
    contextSection = `
      {
        "tag": "div",
        "text": {
          "tag": "lark_md",
          "content": "**📍 当前浏览：** ${context.currentQuestion}"
        }
      }
    `;
  }

  if (context.currentPage) {
    contextSection += `,
      {
        "tag": "div",
        "text": {
          "tag": "plain_text",
          "content": "页面路径: ${context.currentPage}"
        }
      }
    `;
  }

  // 完整的消息卡片JSON
  const card = {
    config: {
      wide_screen_mode: true
    },
    header: {
      title: {
        tag: "plain_text",
        content: "📨 来自 QAUI答疑系统的新咨询"
      },
      template: "blue"
    },
    elements: [
      // 用户信息区域
      {
        tag: "div",
        fields: [
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: `**用户姓名：** ${user.name}`
            }
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: `**咨询时间：** ${timestamp}`
            }
          }
        ]
      },
      
      // 分隔线
      { tag: "hr" },
      
      // 来源信息
      {
        tag: "note",
        elements: [
          {
            tag: "plain_text",
            content: "💡 该用户通过QAUI智能客服系统发起咨询"
          }
        ]
      },

      // 动态上下文部分（如果有）
      ...(contextSection ? [JSON.parse(`[${contextSection}]`)] : []),

      // 分隔线
      { tag: "hr" },

      // 快捷操作提示
      {
        tag: "note",
        elements: [
          {
            tag: "plain_text",
            content: "✅ 建议优先响应用户需求，提供专业解答"
          }
        ]
      }
    ]
  };

  return card;
}

/**
 * [开发测试用] 创建模拟登录Session
 * 
 * 仅用于开发环境测试，生产环境应删除此接口
 * 调用方式: GET /api/auth/test-login
 */
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-login', (req, res) => {
    // 创建模拟的飞书用户数据
    req.session.feishuUser = {
      name: '测试用户',
      avatar: 'https://via.placeholder.com/60/3370ff/ffffff?text=Test',
      email: 'test@example.com',
      mobile: '13800138000',
      
      // 模拟的飞书凭证
      accessToken: 'mock_access_token_for_testing_' + Date.now(),
      tokenExpiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2小时后过期
      
      // 登录时间
      loginTime: new Date().toISOString()
    };
    
    console.log('[Auth-Test] 创建模拟登录Session成功');
    res.json({
      success: true,
      message: '模拟登录成功（仅用于开发测试）',
      user: {
        name: req.session.feishuUser.name,
        avatar: req.session.feishuUser.avatar
      }
    });
  });
}

module.exports = router;
