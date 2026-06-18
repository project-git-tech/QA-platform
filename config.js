/**
 * 前端配置文件
 * 双平台架构：
 *   前端静态页面 → GitHub Pages
 *   后端 API → EdgeOne Pages
 */

// 静态数据路径（同源，GitHub Pages）
const DATA_BASE = './data';

// 后端 API 地址（EdgeOne Pages）
const API_BASE = 'https://qa-platform-x2ufkzoj.edgeone.cool/api';

// 导出配置（供其他脚本使用）
window.DATA_BASE = DATA_BASE;
window.API_BASE = API_BASE;

console.log('[config] DATA_BASE:', DATA_BASE, '| API_BASE:', API_BASE);
