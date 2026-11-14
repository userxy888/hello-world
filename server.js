/**
 * 我的第一个 AI 开发的网站 —— Node.js 原生实现
 * 不依赖任何第三方库，直接 `node server.js` 即可运行
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 端口：优先读环境变量 PORT，默认 3000
const PORT = Number(process.env.PORT) || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');

// 简易 MIME 类型表
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * 工具函数：把服务器时间格式化成友好的中文格式
 * 例：2026-11-14 星期六 15:30:05（Asia/Shanghai）
 */
function formatServerTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    datetime: `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`,
    weekday: get('weekday'),
    timezone: 'Asia/Shanghai (UTC+8)',
    timestamp: date.getTime(),
    iso: date.toISOString()
  };
}

/**
 * 工具函数：按文件扩展名返回 Content-Type
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * 工具函数：读取 public 目录下的静态文件
 * 带路径穿越防护，禁止访问 public 目录以外的内容
 */
function serveStaticFile(res, relativePath) {
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendNotFound(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Content-Length': data.length,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/**
 * 工具函数：发送 JSON 响应
 */
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

/**
 * 工具函数：404
 */
function sendNotFound(res) {
  const body = '<h1 style="font-family:sans-serif">404 页面不存在</h1>';
  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 记录访问日志，方便观察请求
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 只接受 GET / HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  // 解析 URL，去掉查询字符串和 hash
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // 路由 1：首页
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(res, 'index.html');
    return;
  }

  // 路由 2：时间接口（页面每秒调用一次，实现时间实时刷新）
  if (pathname === '/api/time') {
    sendJson(res, 200, formatServerTime());
    return;
  }

  // 路由 3：健康检查
  if (pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version
    });
    return;
  }

  // 路由 4：其余走 public 静态资源
  serveStaticFile(res, pathname);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅ 服务已启动');
  console.log(`  🌐 本地访问： http://localhost:${PORT}`);
  console.log(`  🕐 服务器时间： ${formatServerTime().datetime}（${formatServerTime().weekday}）`);
  console.log('  按 Ctrl + C 停止服务');
  console.log('');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务...');
  server.close(() => process.exit(0));
});
