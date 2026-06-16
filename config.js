/**
 * 前端配置文件
 * 用于前后端分离部署
 */

// API基础地址配置
// 开发环境：空字符串（相对路径）
// 生产环境：Render后端地址
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''  // 本地开发使用相对路径
    : 'https://qa-platform-1-zat2.onrender.com';  // 生产环境使用Render后端

// 导出配置（供其他脚本使用）
window.API_BASE = API_BASE;

console.log('[config] API_BASE:', API_BASE);