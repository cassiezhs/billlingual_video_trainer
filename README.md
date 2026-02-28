# 双语视频训练器 (Bilingual Video Trainer)

一个用于上传英文视频、逐句练习听力和翻译的Web应用。

## 功能特性

- 📹 上传英文视频文件
- 🎤 自动提取音频并转录为带时间戳的句子
- 🌐 可选的中文翻译
- ▶️ 逐句播放控制
- 🔁 A-B循环播放
- ⚡ 播放速度控制
- ⭐ 收藏重要句子

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Prisma + SQLite
- **视频处理**: Python + ffmpeg
- **转录**: OpenAI Whisper API (可选，支持模拟模式)

## 系统要求

- Node.js 18+ 
- Python 3.8+
- ffmpeg
- npm 或 yarn

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置以下变量：

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-api-key-here"  # 可选，不设置将使用模拟转录/翻译
```

### 3. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. 安装 ffmpeg

#### Windows

1. 下载 ffmpeg: https://ffmpeg.org/download.html
2. 解压到某个目录（如 `C:\ffmpeg`）
3. 将 `C:\ffmpeg\bin` 添加到系统 PATH 环境变量

验证安装：
```bash
ffmpeg -version
```

#### macOS

使用 Homebrew:
```bash
brew install ffmpeg
```

验证安装：
```bash
ffmpeg -version
```

### 5. 设置 Python 环境（可选，用于视频处理）

Python 脚本会自动运行，但如果你想手动测试：

```bash
cd worker
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install requests  # 如果使用 OpenAI API
```

## 运行项目

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产模式

```bash
npm run build
npm start
```

## 项目结构

```
双语App/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── videos/        # 视频相关 API
│   │   └── sentences/     # 句子相关 API
│   ├── videos/[id]/       # 视频详情页
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── globals.css        # 全局样式
├── worker/                # Python 工作脚本
│   └── process_video.py   # 视频处理脚本
├── prisma/                # Prisma 配置
│   └── schema.prisma      # 数据库模型
├── storage/               # 文件存储
│   ├── videos/           # 视频文件
│   └── audio/            # 音频文件
└── lib/                   # 工具库
    └── prisma.ts         # Prisma 客户端
```

## API 端点

- `POST /api/videos/upload` - 上传视频
- `GET /api/videos/[id]` - 获取视频信息
- `GET /api/videos/[id]/file` - 获取视频文件
- `GET /api/videos/[id]/sentences` - 获取句子列表
- `POST /api/videos/[id]/translate` - 翻译句子
- `POST /api/sentences/[id]/star` - 切换收藏状态

## 使用说明

1. **上传视频**: 在首页选择并上传英文视频文件
2. **等待处理**: 系统会自动提取音频、转录并分割为句子
3. **查看句子**: 处理完成后，在视频页面查看所有句子
4. **逐句播放**: 点击句子可跳转到对应时间点并播放
5. **A-B循环**: 启用A-B循环后，播放到句子结束会自动循环
6. **调整速度**: 使用速度选择器调整播放速度
7. **翻译**: 点击"翻译为中文"按钮翻译所有未翻译的句子
8. **收藏**: 点击星号收藏重要句子

## 注意事项

- 视频文件存储在 `./storage/videos/` 目录
- 音频文件存储在 `./storage/audio/` 目录
- 如果没有设置 `OPENAI_API_KEY`，系统会使用模拟数据，功能仍然可用
- 确保 `storage` 目录有写入权限
- 大文件上传可能需要调整 `next.config.js` 中的 `bodySizeLimit`

## 故障排除

### ffmpeg 未找到

确保 ffmpeg 已安装并在 PATH 中。Windows 用户需要重启终端或重启计算机使 PATH 生效。

### Python 脚本执行失败

检查 Python 版本（需要 3.8+）：
```bash
python --version
```

### 数据库错误

重置数据库：
```bash
rm prisma/dev.db
npm run prisma:migrate
```

### 上传失败

检查文件大小限制和 `storage` 目录权限。

## 许可证

MIT
