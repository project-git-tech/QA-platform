#!/usr/bin/env node

/**
 * Render预热脚本
 * 每5分钟访问API接口，避免冷启动
 */

const https = require('https');

// Render API地址
const API_URL = 'https://qa-platform-1-zat2.onrender.com/api/types';

// 预热函数
async function warmup() {
  console.log(`[${new Date().toISOString()}] 开始预热...`);

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    console.log(`[${new Date().toISOString()}] 预热成功`);
    console.log(`响应状态: ${response.status}`);
    console.log(`响应数据: ${JSON.stringify(data).substring(0, 100)}...`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] 预热失败:`, error.message);
  }
}

// 每5分钟执行一次预热
console.log('Render预热脚本启动');
console.log(`预热地址: ${API_URL}`);
console.log(`预热间隔: 5分钟`);

// 立即执行一次预热
warmup();

// 设置定时器，每5分钟执行一次
setInterval(warmup, 5 * 60 * 1000);

console.log('预热脚本已启动，按Ctrl+C停止');