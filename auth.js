/**
 * 飞书登录统一模块
 * 
 * 功能：
 * 1. 检查登录状态（带5秒超时降级）
 * 2. 渲染登录UI（头像+下拉菜单）
 * 3. 发起登录/登出
 * 4. 管理员权限判断
 * 
 * 使用方式：
 *   <div id="auth-container"></div>
 *   <script src="auth.js"></script>
 *   <script>Auth.init('auth-container');</script>
 */

const Auth = {
  // 当前用户状态
  user: null,
  isAdmin: false,
  
  // API基础地址
  API_BASE: (window.API_BASE !== undefined ? window.API_BASE : '') + '/api/auth',
  
  // 超时时间（毫秒）
  TIMEOUT: 5000,
  
  /**
   * 初始化登录模块
   * @param {string} containerId - UI容器元素ID
   */
  async init(containerId) {
    try {
      const status = await this._checkStatus();
      this.user = status.loggedIn ? status.user : null;
      this.isAdmin = status.isAdmin || false;
      this._render(containerId);
    } catch (error) {
      console.warn('[Auth] 初始化失败，降级为未登录状态:', error.message);
      this.user = null;
      this.isAdmin = false;
      this._render(containerId);
    }
  },
  
  /**
   * 检查登录状态（带超时降级）
   * @returns {Promise<Object>} 登录状态
   */
  async _checkStatus() {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout')), this.TIMEOUT);
    });
    
    const result = await Promise.race([
      fetch(`${this.API_BASE}/me`, { credentials: 'include' }),
      timeoutPromise
    ]);
    
    return await result.json();
  },
  
  /**
   * 发起飞书登录
   */
  login() {
    window.location.href = `${this.API_BASE}/login`;
  },
  
  /**
   * 登出
   */
  async logout() {
    try {
      await fetch(`${this.API_BASE}/logout`, { 
        method: 'POST',
        credentials: 'include'
      });
      this.user = null;
      this.isAdmin = false;
      this._renderCurrentContainer();
    } catch (error) {
      console.error('[Auth] 登出失败:', error);
      alert('登出失败，请重试');
    }
  },
  
  /**
   * 获取当前用户
   */
  getUser() {
    return this.user;
  },
  
  /**
   * 判断是否为管理员
   */
  isAdminUser() {
    return this.isAdmin;
  },
  
  /**
   * 渲染登录UI
   * @param {string} containerId - 容器元素ID
   */
  _render(containerId) {
    this._currentContainerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[Auth] 容器元素不存在:', containerId);
      return;
    }
    
    if (this.user) {
      container.innerHTML = this._renderLoggedInHTML();
      this._bindLoggedInEvents(container);
    } else {
      container.innerHTML = this._renderLoggedOutHTML();
      this._bindLoggedOutEvents(container);
    }
  },
  
  /**
   * 重新渲染当前容器
   */
  _renderCurrentContainer() {
    if (this._currentContainerId) {
      this._render(this._currentContainerId);
    }
  },
  
  /**
   * 渲染未登录状态HTML
   */
  _renderLoggedOutHTML() {
    return `
      <button class="auth-login-btn" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>飞书登录</span>
      </button>
    `;
  },
  
  /**
   * 渲染已登录状态HTML（头像+下拉菜单）
   */
  _renderLoggedInHTML() {
    const avatar = this.user.avatar || '';
    const name = this.user.name || '未知用户';
    const email = this.user.email || '';
    const adminBadge = this.isAdmin ? '<span class="auth-admin-badge">管理员</span>' : '';
    const adminLink = this.isAdmin ? '<a href="admin.html" class="auth-dropdown-item"><i class="ri-settings-3-line"></i> 后台管理</a>' : '';
    
    return `
      <div class="auth-user-wrapper">
        <button class="auth-user-btn" type="button">
          <img src="${avatar}" alt="${name}" class="auth-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="auth-avatar-fallback" style="display:none">${name.charAt(0)}</div>
          <svg class="auth-dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="auth-dropdown">
          <div class="auth-dropdown-header">
            <img src="${avatar}" alt="${name}" class="auth-dropdown-avatar" onerror="this.style.display='none'">
            <div class="auth-dropdown-userinfo">
              <div class="auth-dropdown-name">${name} ${adminBadge}</div>
              <div class="auth-dropdown-email">${email}</div>
            </div>
          </div>
          <div class="auth-dropdown-divider"></div>
          ${adminLink}
          <button class="auth-dropdown-item auth-logout-btn" type="button">
            <i class="ri-logout-circle-line"></i> 退出登录
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * 绑定未登录状态事件
   */
  _bindLoggedOutEvents(container) {
    const loginBtn = container.querySelector('.auth-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.login());
    }
  },
  
  /**
   * 绑定已登录状态事件
   */
  _bindLoggedInEvents(container) {
    // 下拉菜单切换
    const userBtn = container.querySelector('.auth-user-btn');
    const dropdown = container.querySelector('.auth-dropdown');
    
    if (userBtn && dropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('auth-dropdown-show');
      });
      
      // 点击外部关闭下拉菜单
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          dropdown.classList.remove('auth-dropdown-show');
        }
      });
    }
    
    // 登出按钮
    const logoutBtn = container.querySelector('.auth-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },
  
  /**
   * 注入CSS样式（仅注入一次）
   */
  _injectStyles() {
    if (document.getElementById('auth-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'auth-styles';
    style.textContent = `
      /* 登录按钮 */
      .auth-login-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #3370ff 0%, #165dff 100%);
        color: white;
        border: none;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(51, 112, 255, 0.3);
      }
      .auth-login-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(51, 112, 255, 0.4);
      }
      .auth-login-btn:active {
        transform: translateY(0);
      }
      
      /* 用户头像区域 */
      .auth-user-wrapper {
        position: relative;
      }
      .auth-user-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px 4px 4px;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(15, 23, 42, 0.1);
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .auth-user-btn:hover {
        background: white;
        border-color: #3B82F6;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      }
      .auth-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      .auth-avatar-fallback {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3370ff 0%, #165dff 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
      }
      .auth-dropdown-arrow {
        color: #64748B;
        transition: transform 0.2s ease;
      }
      .auth-user-btn:hover .auth-dropdown-arrow {
        color: #3B82F6;
      }
      
      /* 下拉菜单 */
      .auth-dropdown {
        display: none;
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 220px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(15, 23, 42, 0.08);
        z-index: 1000;
        overflow: hidden;
      }
      .auth-dropdown-show {
        display: block;
        animation: auth-dropdown-fade 0.15s ease;
      }
      @keyframes auth-dropdown-fade {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* 下拉菜单头部 */
      .auth-dropdown-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%);
      }
      .auth-dropdown-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .auth-dropdown-userinfo {
        flex: 1;
        min-width: 0;
      }
      .auth-dropdown-name {
        font-size: 14px;
        font-weight: 600;
        color: #1E293B;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .auth-dropdown-email {
        font-size: 12px;
        color: #64748B;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .auth-admin-badge {
        display: inline-block;
        padding: 1px 6px;
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        color: white;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
      }
      
      /* 分隔线 */
      .auth-dropdown-divider {
        height: 1px;
        background: #E2E8F0;
      }
      
      /* 下拉菜单项 */
      .auth-dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        width: 100%;
        background: none;
        border: none;
        font-size: 14px;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;
        text-decoration: none;
      }
      .auth-dropdown-item:hover {
        background: #F1F5F9;
        color: #1E293B;
      }
      .auth-dropdown-item i {
        font-size: 18px;
        color: #64748B;
      }
      .auth-logout-btn:hover {
        color: #EF4444;
      }
      .auth-logout-btn:hover i {
        color: #EF4444;
      }
      
      /* 响应式 */
      @media (max-width: 640px) {
        .auth-login-btn span {
          display: none;
        }
        .auth-login-btn {
          padding: 8px 12px;
          border-radius: 50%;
        }
        .auth-dropdown {
          min-width: 200px;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

// 自动注入样式
Auth._injectStyles();

// 暴露到全局
window.Auth = Auth;
