/**
 * 前端配置文件
 * 静态数据从同源 data/ 目录读取
 * 图片仍走 Render API（阶段1）
 */

// 静态数据路径（同源）
const DATA_BASE = './data';

// 后端 API 地址（仅用于图片懒加载和管理后台）
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''  // 本地开发使用相对路径（后端在本地 3000 端口）
    : 'https://qa-platform-1-zat2.onrender.com';  // 生产环境使用 Render 后端

// 导出配置（供其他脚本使用）
window.DATA_BASE = DATA_BASE;
window.API_BASE = API_BASE;

console.log('[config] DATA_BASE:', DATA_BASE, '| API_BASE:', API_BASE);
