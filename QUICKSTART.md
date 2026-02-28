# 快速启动指南

## 1. 安装依赖

```bash
npm install
```

## 2. 设置环境变量

创建 `.env` 文件（复制自 `.env.example`）：

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

编辑 `.env` 文件，如果需要使用 OpenAI API，添加你的 API 密钥：

```
OPENAI_API_KEY="your-api-key-here"
```

## 3. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
```

## 4. 安装 ffmpeg

### Windows
1. 下载: https://ffmpeg.org/download.html
2. 解压到 `C:\ffmpeg`
3. 添加 `C:\ffmpeg\bin` 到系统 PATH
4. 重启终端或计算机

验证：
```bash
ffmpeg -version
```

### macOS
```bash
brew install ffmpeg
```

验证：
```bash
ffmpeg -version
```

## 5. 安装 Python 依赖（可选）

如果使用 OpenAI API：

```bash
cd worker
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 使用流程

1. 在首页上传英文视频文件
2. 等待系统处理（提取音频、转录、分割句子）
3. 在视频页面查看句子列表
4. 点击句子跳转播放
5. 启用 A-B 循环进行重复练习
6. 调整播放速度
7. 点击"翻译为中文"获取翻译
8. 收藏重要句子

## 故障排除

### Python 脚本无法执行
- 确保 Python 3.8+ 已安装
- Windows: 使用 `python` 命令
- macOS/Linux: 使用 `python3` 命令

### ffmpeg 未找到
- 检查 PATH 环境变量
- Windows: 重启终端或计算机
- 验证: `ffmpeg -version`

### 数据库错误
```bash
# 重置数据库
rm prisma/dev.db
npm run prisma:migrate
```

### 上传失败
- 检查文件大小（默认限制 100MB，可在 `next.config.js` 调整）
- 确保 `storage` 目录有写入权限
