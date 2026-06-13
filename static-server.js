// 极简静态文件服务器 - 不重写URL，保留所有查询参数
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var PORT = 8080;
var ROOT = __dirname;

var MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

http.createServer(function(req, res) {
    var parsedUrl = url.parse(req.url);
    var pathname = parsedUrl.pathname;

    // 日志：显示完整URL（包括查询参数）
    console.log('[REQ] ' + req.method + ' ' + req.url);

    // 安全检查：防止路径穿越
    if (pathname.indexOf('..') !== -1) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // 解析文件路径
    var filePath = path.join(ROOT, pathname);

    // 如果是目录，默认返回 index.html
    if (pathname.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
    }

    // 如果文件不存在，尝试加 .html 后缀
    if (!fs.existsSync(filePath)) {
        var withHtml = filePath + '.html';
        if (fs.existsSync(withHtml)) {
            filePath = withHtml;
        } else {
            res.writeHead(404);
            res.end('Not Found: ' + pathname);
            return;
        }
    }

    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, function(err, data) {
        if (err) {
            res.writeHead(500);
            res.end('Server Error');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(data);
    });
}).listen(PORT, '127.0.0.1', function() {
    console.log('[OK] 静态服务器运行在 http://localhost:' + PORT);
    console.log('[OK] 查询参数将被完整保留，不会被重写');
});
