# 飞书登录功能设计方案

> **文档版本**: v1.0  
> **创建日期**: 2026-06-18  
> **适用系统**: QAUI 答疑系统  

---

## 目录

1. [项目现状分析](#1-项目现状分析)
2. [需求概述](#2-需求概述)
3. [技术方案](#3-技术方案)
4. [界面设计](#4-界面设计)
5. [性能优化策略](#5-性能优化策略)
6. [安全性考虑](#6-安全性考虑)
7. [实施步骤](#7-实施步骤)
8. [管理员操作清单](#8-管理员操作清单)

---

## 1. 项目现状分析

### 1.1 当前架构

```
┌─────────────────┐     ┌─────────────────┐
│   前端页面层     │     │   后端API层      │
│                 │     │                 │
│ index.html      │────▶│ /api/auth/login │
│ subquestion.html│     │ /api/auth/me    │
│ solution.html   │     │ /api/auth/logout│
│ admin.html      │     │                 │
└─────────────────┘     └─────────────────┘
```

### 1.2 已有能力

| 能力 | 状态 | 说明 |
|------|------|------|
| 飞书OAuth 2.0后端 | ✅ 已完成 | 完整的登录/回调/登出逻辑 |
| 飞书开放平台配置 | ✅ 已配置 | App ID: `cli_a97ad490803d5bd3` |
| Session管理 | ✅ 已配置 | express-session |
| 测试登录页面 | ✅ 已完成 | test-login.html |
| 管理员验证 | ❌ 未实现 | 需要新增 |
| 前端登录UI | ❌ 未集成 | 需要添加到所有页面 |

### 1.3 数据加载机制

前端通过 `DataStore` 模块加载静态JSON文件：
- `types.json` - 问题类型
- `questions.json` - 问题数据
- `hot.json` - 热门问题

使用 `Promise.all` 并行加载，响应速度极快（毫秒级）。

---

## 2. 需求概述

### 2.1 功能需求

| 需求 | 描述 |
|------|------|
| 登录状态展示 | 在所有页面头部显示登录状态（头像+下拉菜单） |
| 飞书登录 | 点击登录按钮跳转到飞书授权页面 |
| 登出功能 | 点击登出按钮清除Session |
| 管理员验证 | 后台管理页面仅管理员可访问 |
| 管理员识别 | 通过配置文件中的飞书账号白名单判断 |

### 2.2 性能需求

| 指标 | 要求 |
|------|------|
| 页面首屏加载时间 | ≤ 1.5秒 |
| 登录状态显示延迟 | ≤ 0.5秒（超时后降级） |
| API超时时间 | 5秒 |

### 2.3 非功能需求

- 登录状态与静态数据加载并行执行，互不阻塞
- 网络异常时优雅降级为未登录状态
- 跨域Session正确传递

---

## 3. 技术方案

### 3.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     前端页面层                           │
│  index.html │ subquestion.html │ solution.html │ admin   │
├─────────────────────────────────────────────────────────┤
│                     公共模块层                           │
│           auth.js (统一登录状态管理)                     │
│           ├── initAuth()        # 初始化登录状态         │
│           ├── checkAuth()       # 检查登录状态           │
│           ├── handleLogin()     # 发起登录              │
│           ├── handleLogout()    # 登出                  │
│           ├── renderAuthUI()    # 渲染登录UI            │
│           └── isAdmin()         # 判断管理员            │
├─────────────────────────────────────────────────────────┤
│                     后端API层                            │
│  /api/auth/me            # 获取登录状态                 │
│  /api/auth/login         # 发起飞书授权                 │
│  /api/auth/callback      # OAuth回调                   │
│  /api/auth/logout        # 登出                        │
│  /api/auth/admin-check   # 管理员验证(新增)             │
├─────────────────────────────────────────────────────────┤
│                     配置层                               │
│  config/feishu.js → 添加管理员飞书账号白名单              │
└─────────────────────────────────────────────────────────┘
```

### 3.2 新增文件

| 文件 | 用途 | 大小预估 |
|------|------|----------|
| `auth.js` | 前端登录模块 | ~2KB |

### 3.3 修改文件

| 文件 | 修改内容 | 修改量 |
|------|----------|--------|
| `index.html` | 添加登录UI容器和引用auth.js | 小 |
| `subquestion.html` | 添加登录UI容器和引用auth.js | 小 |
| `solution.html` | 添加登录UI容器和引用auth.js | 小 |
| `admin.html` | 添加登录验证逻辑和引用auth.js | 中 |
| `backend/config/feishu.js` | 添加管理员飞书账号白名单配置 | 小 |
| `backend/routes/auth.js` | 新增管理员验证接口 | 中 |

### 3.4 核心逻辑设计

#### 3.4.1 auth.js 模块

```javascript
// 核心接口
const Auth = {
  // 初始化：并行检查登录状态（带超时）
  init: async function(containerId) { ... },
  
  // 检查登录状态（内部方法）
  _checkStatus: async function() { ... },
  
  // 渲染登录UI
  render: function(containerId, user) { ... },
  
  // 发起登录
  login: function() { ... },
  
  // 登出
  logout: function() { ... },
  
  // 获取当前用户
  getUser: function() { ... },
  
  // 判断是否为管理员
  isAdmin: function() { ... }
};
```

#### 3.4.2 性能优化关键点

```javascript
// 并行加载策略
Promise.all([
  DataStore.load(),      // 加载静态数据（极快，毫秒级）
  Auth._checkStatus()    // 检查登录状态（带5秒超时）
]).then(([data, auth]) => {
  // 两者都完成后渲染页面
  renderCategories(data.questionTypes);
  Auth.render('auth-container', auth.user);
});
```

#### 3.4.3 超时降级机制

```javascript
// 登录状态检查（带超时）
async function _checkStatus() {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Auth timeout')), 5000);
  });
  
  try {
    const result = await Promise.race([
      fetch('/api/auth/me', { credentials: 'include' }),
      timeoutPromise
    ]);
    return await result.json();
  } catch (error) {
    // 超时或网络错误，降级为未登录状态
    console.warn('Auth check failed:', error.message);
    return { loggedIn: false };
  }
}
```

#### 3.4.4 管理员验证接口（后端新增）

```javascript
// backend/routes/auth.js
router.get('/admin-check', (req, res) => {
  if (!req.session?.feishuUser) {
    return res.json({ isAdmin: false, message: '未登录' });
  }
  
  const userEmail = req.session.feishuUser.email;
  const userName = req.session.feishuUser.name;
  const adminUsers = feishuConfig.adminUsers || [];
  const isAdmin = adminUsers.includes(userName);
  
  res.json({
    isAdmin: isAdmin,
    user: {
      name: req.session.feishuUser.name,
      email: userEmail
    }
  });
});
```

---

## 4. 界面设计

### 4.1 未登录状态

```
┌───────────────────────────────────────────────────────┐
│ [Logo]                          [🚀 使用飞书账号登录] │
└───────────────────────────────────────────────────────┘
```

### 4.2 已登录状态（普通用户）

```
┌───────────────────────────────────────────────────────┐
│ [Logo]                          [头像 ▼]             │
│                                                    │
│                              ┌──────────────────┐   │
│                              │ 👤 张三           │   │
│                              │ 📧 zhang@xxx.com │   │
│                              │ ──────────────── │   │
│                              │ 🚪 退出登录       │   │
│                              └──────────────────┘   │
└───────────────────────────────────────────────────────┘
```

### 4.3 已登录状态（管理员）

```
┌───────────────────────────────────────────────────────┐
│ [Logo]                          [头像 ▼]             │
│                                                    │
│                              ┌──────────────────┐   │
│                              │ 👤 张三           │   │
│                              │ 📧 admin@xxx.com │   │
│                              │ 🔧 管理员         │   │
│                              │ ──────────────── │   │
│                              │ ⚙️ 后台管理       │   │
│                              │ 🚪 退出登录       │   │
│                              └──────────────────┘   │
└───────────────────────────────────────────────────────┘
```

### 4.4 后台页面未登录状态

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│              🔒 请先登录后再访问后台管理                 │
│                                                       │
│              [🚀 使用飞书账号登录]                      │
│                                                       │
│              返回首页                                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 4.5 后台页面权限不足

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│              ⚠️ 您没有权限访问此页面                    │
│                                                       │
│              请联系管理员获取权限                       │
│                                                       │
│              返回首页                                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 5. 性能优化策略

### 5.1 关键优化点

| 优化项 | 策略 | 预期效果 |
|--------|------|----------|
| 静态数据预加载 | 使用 `<link rel="preload">` 标签 | JSON加载提前完成 |
| 登录状态并行检查 | `Promise.all` 与数据加载并行 | 不增加首屏时间 |
| API超时降级 | 5秒超时，失败后降级为未登录 | 避免长时间等待 |
| Session Cookie优化 | 设置合理的 `maxAge` | 减少重复登录 |
| 前端缓存用户状态 | 登录状态存储在内存中 | 避免重复调用API |

### 5.2 加载时序图

```
用户打开页面
    │
    ├─► [并行] 预加载JSON文件 ──► 加载完成 ──► 渲染问题分类
    │
    └─► [并行] 检查登录状态 ──► 加载完成 ──► 渲染登录UI
         │                              │
         └─► 超时(5s) ──► 降级为未登录 ──┘
```

### 5.3 性能指标预估

| 场景 | 预估时间 |
|------|----------|
| 静态数据加载 | ≤ 100ms |
| 登录状态检查（正常） | ≤ 300ms |
| 登录状态检查（超时） | 5000ms → 降级 |
| 首屏完整渲染 | ≤ 1.5s |

---

## 6. 安全性考虑

### 6.1 安全措施

| 措施 | 说明 |
|------|------|
| 管理员验证在后端 | 前端仅展示结果，不做权限判断 |
| Session存储在服务端 | 防止前端篡改登录状态 |
| HTTPS传输 | 生产环境必须启用 |
| HttpOnly Cookie | 防止XSS攻击窃取Cookie |
| SameSite Cookie | 防止CSRF攻击 |
| API访问控制 | 关键API验证Session |

### 6.2 生产环境安全配置

```javascript
// backend/app.js - Session配置
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // 生产环境必须为true
    httpOnly: true,      // 防止XSS
    sameSite: 'lax',     // 防止CSRF
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

---

## 7. 实施步骤

### 阶段1：后端准备

| 步骤 | 内容 | 负责人 |
|------|------|--------|
| 1.1 | 在 `config/feishu.js` 添加管理员飞书账号白名单 | 开发者 |
| 1.2 | 在 `routes/auth.js` 新增 `/api/auth/admin-check` 接口 | 开发者 |
| 1.3 | 确保CORS配置正确（允许携带Cookie） | 开发者 |

### 阶段2：前端开发

| 步骤 | 内容 | 负责人 |
|------|------|--------|
| 2.1 | 创建 `auth.js` 统一登录模块 | 开发者 |
| 2.2 | 修改 `index.html` 添加登录UI | 开发者 |
| 2.3 | 修改 `subquestion.html` 添加登录UI | 开发者 |
| 2.4 | 修改 `solution.html` 添加登录UI | 开发者 |
| 2.5 | 修改 `admin.html` 添加登录验证 | 开发者 |

### 阶段3：测试验证

| 步骤 | 内容 | 负责人 |
|------|------|--------|
| 3.1 | 测试登录流程（飞书OAuth） | 测试人员 |
| 3.2 | 测试登出流程 | 测试人员 |
| 3.3 | 测试管理员权限验证 | 测试人员 |
| 3.4 | 测试页面响应速度 | 测试人员 |
| 3.5 | 测试网络异常降级 | 测试人员 |

### 阶段4：部署上线

| 步骤 | 内容 | 负责人 |
|------|------|--------|
| 4.1 | 申请飞书开放平台权限 | 管理员 |
| 4.2 | 发布飞书应用为正式版 | 管理员 |
| 4.3 | 配置生产环境重定向URL | 管理员 |
| 4.4 | 部署代码到生产环境 | 开发者 |

---

## 8. 管理员操作清单

### 8.1 飞书开放平台操作

| 操作 | 步骤 |
|------|------|
| 登录 | 访问 https://open.feishu.cn |
| 找到应用 | 搜索 App ID: `cli_a97ad490803d5bd3` |
| 申请权限 | 在"权限管理"中申请以下权限：<br>- `authen:user_id:readonly`（必需）<br>- `authen:user_email:readonly`（推荐） |
| 添加重定向URL | 在"安全设置"中添加生产环境URL：<br>- `https://yourdomain.com/api/auth/callback` |
| 发布应用 | 将应用升级为正式版 |

### 8.2 配置管理员飞书账号

在后端配置文件 `backend/config/feishu.js` 中添加：

```javascript
// 管理员飞书账号白名单（用户名）
adminUsers: [
  '张三',
  '李四',
  '管理员姓名'
]
```

### 8.3 环境变量配置

创建 `.env` 文件（不要提交到Git）：

```env
FEISHU_APP_ID=cli_a97ad490803d5bd3
FEISHU_APP_SECRET=your-app-secret
FEISHU_REDIRECT_URI=https://yourdomain.com/api/auth/callback
SESSION_SECRET=your-strong-random-secret
NODE_ENV=production
```

---

## 附录：API接口清单

### 核心接口

| 方法 | 路径 | 功能 | 认证要求 |
|------|------|------|----------|
| GET | `/api/auth/me` | 获取登录状态 | 无需登录 |
| GET | `/api/auth/login` | 跳转飞书授权 | 无需登录 |
| GET | `/api/auth/callback` | OAuth回调 | 无需登录 |
| POST | `/api/auth/logout` | 登出 | 需要登录 |
| GET | `/api/auth/admin-check` | 管理员验证 | 需要登录 |

### 响应格式

```json
// GET /api/auth/me
{
  "loggedIn": true,
  "user": {
    "name": "张三",
    "avatar": "https://...",
    "email": "zhang@company.com",
    "loginTime": "2026-06-18T10:00:00Z"
  }
}

// GET /api/auth/admin-check
{
  "isAdmin": true,
  "user": {
    "name": "张三",
    "email": "admin@company.com"
  }
}
```

---

**文档结束**  
*版本: v1.0*  
*最后更新: 2026-06-18*
