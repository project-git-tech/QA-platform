# 前后端分离部署指南

## 架构说明

- **前端**：GitHub Pages（静态文件托管）
- **后端**：Render平台（Express API服务）
- **数据库**：Supabase PostgreSQL（云端数据库）

---

## 一、部署后端到Render

### 步骤1：更新Render环境变量

1. 登录Render Dashboard：https://dashboard.render.com
2. 选择您的服务：`qa-platform-1`
3. 进入"Environment"标签
4. 添加以下环境变量：

```
DATABASE_URL=postgresql://postgres:RM7XAiHEFEDtfke@db.arbrtcqvuffbmblowkrt.supabase.co:5432/postgres
SESSION_SECRET=qa-platform-secret-key-2024
NODE_ENV=production
```

5. 点击"Save Changes"
6. Render会自动重新部署服务

### 步骤2：验证后端部署

访问以下接口验证：

```
https://qa-platform-1-zat2.onrender.com/api/types
https://qa-platform-1-zat2.onrender.com/api/questions
```

---

## 二、部署前端到GitHub Pages

### 步骤1：更新GitHub仓库

1. 提交代码更改：

```bash
git add .
git commit -m "前后端分离部署配置"
git push origin main
```

### 步骤2：启用GitHub Pages

1. 访问GitHub仓库：https://github.com/yourusername/qa-platform
2. 进入"Settings" → "Pages"
3. Source: 选择"GitHub Actions"
4. 保存设置

### 步骤3：等待自动部署

GitHub Actions会自动触发部署流程：

1. 进入"Actions"标签
2. 查看"Deploy to GitHub Pages"工作流
3. 等待部署完成（通常1-2分钟）

### 步骤4：访问前端

部署完成后，访问：

```
https://yourusername.github.io/qa-platform/
```

---

## 三、更新CORS配置

部署完成后，需要更新后端CORS配置：

1. 打开`backend/app.js`
2. 更新`corsOptions.origin`数组：

```javascript
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://qa-platform-1-zat2.onrender.com',
        'https://yourusername.github.io',  // 替换为您的GitHub用户名
        'https://yourusername.github.io/qa-platform'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
```

3. 提交更改并推送：
```bash
git add backend/app.js
git commit -m "更新CORS配置支持GitHub Pages"
git push origin main
```

4. Render会自动重新部署

---

## 四、设置预热策略

参考`docs/warmup-strategy.md`文档，使用UptimeRobot等服务预热Render平台。

---

## 五、验证部署

### 测试前端加载

访问GitHub Pages前端：

```
https://yourusername.github.io/qa-platform/index.html
https://yourusername.github.io/qa-platform/subquestion.html
```

### 测试API调用

在浏览器控制台查看网络请求：

1. 打开开发者工具（F12）
2. 进入"Network"标签
3. 观察API请求：
   - URL应指向：`https://qa-platform-1-zat2.onrender.com/api/...`
   - 响应时间应小于1秒（预热后）
   - 无CORS错误

---

## 六、常见问题

### 问题1：CORS错误

**症状**：
```
Access to fetch at 'https://qa-platform-1-zat2.onrender.com/api/types' 
from origin 'https://yourusername.github.io' has been blocked by CORS policy
```

**解决**：
- 检查`backend/app.js`中的CORS配置
- 确保GitHub Pages地址已添加到`origin`数组
- 重新部署后端服务

### 问题2：API请求失败

**症状**：
- 前端无法加载数据
- 控制台显示"Failed to fetch"

**解决**：
- 检查Render服务状态（是否正常运行）
- 检查环境变量配置（DATABASE_URL是否正确）
- 检查Supabase数据库连接

### 问题3：GitHub Pages部署失败

**症状**：
- Actions工作流失败
- 前端无法访问

**解决**：
- 检查`.github/workflows/deploy.yml`文件
- 检查GitHub Pages设置（Source是否为GitHub Actions）
- 查看Actions日志排查错误

### 问题4：图片无法显示

**症状**：
- 文章中的图片无法加载

**解决**：
- 图片存储在后端服务器
- 需要确保后端服务正常运行
- 检查图片URL是否正确指向Render地址

---

## 七、性能优化建议

### 前端优化

1. **启用浏览器缓存**
   - 静态文件（HTML/CSS/JS）可缓存
   - 减少重复加载

2. **压缩静态文件**
   - 使用工具压缩HTML/CSS/JS
   - 减少文件大小

### 后端优化

1. **数据库连接池**
   - 已配置连接池（max: 5）
   - 避免频繁建立连接

2. **预热策略**
   - 使用UptimeRobot保持服务活跃
   - 避免冷启动延迟

---

## 八、成本估算

- GitHub Pages：免费
- Render免费版：免费（有冷启动）
- Supabase：免费（500MB存储）
- UptimeRobot：免费

**总成本：0元**

---

## 九、后续维护

### 更新前端代码

```bash
git add .
git commit -m "更新前端功能"
git push origin main
```

GitHub Actions会自动部署前端。

### 更新后端代码

```bash
git add backend/
git commit -m "更新后端API"
git push origin main
```

Render会自动部署后端。

### 更新数据库配置

在Render Dashboard中修改环境变量，服务会自动重启。

---

## 总结

前后端分离部署可以显著提升前端加载速度，GitHub Pages提供全球CDN加速。通过预热策略解决冷启动问题，确保用户访问体验流畅。