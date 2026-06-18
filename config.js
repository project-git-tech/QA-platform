/**
 * 前端配置文件
 * 静态数据从同源 data/ 目录读取
 * EdgeOne Pages 同源部署，API 走相对路径
 */

// 静态数据路径（同源）
const DATA_BASE = './data';

// 后端 API 地址
// EdgeOne Pages 同源部署：前端和 API 在同一域名下，使用相对路径
// 本地开发：后端在 localhost:3000，也使用相对路径
const API_BASE = '';

// 导出配置（供其他脚本使用）
window.DATA_BASE = DATA_BASE;
window.API_BASE = API_BASE;

console.log('[config] DATA_BASE:', DATA_BASE, '| API_BASE:', API_BASE);
