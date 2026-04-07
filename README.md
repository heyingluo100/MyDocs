# 个人文档库

个人文档存档网站，支持 Markdown 文章 + 附件文件管理，内置 6 层内容保护机制。

## 技术栈

- **框架**：Vue 3 + Composition API + `<script setup>`
- **构建**：Vite 8
- **样式**：Tailwind CSS 4.x（`@theme` 颜色系统）
- **路由**：Vue Router 5（Hash 模式）
- **Markdown**：markdown-it + gray-matter
- **Word 转换**：mammoth.js（DOCX → HTML）+ word-extractor（DOC → 文本）
- **部署**：GitHub Pages / Vercel（纯静态）

## 快速启动

### Windows
双击 `start.bat` 即可自动安装依赖并启动。

### 命令行
```bash
npm install
npm run dev
```

## 目录结构

```
├── content/                   # ← 文件夹即标签，拖入文件即发布
│   ├── 工作/                  #    标签「工作」
│   │   └── 报告.docx          #    Word 自动转网页
│   ├── 技术笔记/              #    标签「技术笔记」
│   │   └── Vue3笔记.md        #    Markdown 也支持
│   └── 公告/
│       └── 欢迎.md
├── src/                       # 源码
├── scripts/build-content.js   # 内容构建脚本
└── public/                    # 静态资源
```

## 如何添加文档

**3 步搞定：**

1. 在 `content/` 下创建文件夹（文件夹名 = 分类标签）
2. 把 `.docx` 或 `.md` 文件拖进去
3. 运行 `npm run build`

支持的文件类型：
- `.docx` — Word 文档，构建时自动转为网页，精确保留空行
- `.doc` — 旧版 Word 97-2003 文档
- `.md` — Markdown 文件
- `.txt` — 纯文本文件，内容直接渲染
- `.pdf` — 自动复制到公开目录，提供在线预览

运行 `npm run dev` 或 `npm run build` 时会自动扫描并生成索引。

## 构建部署

```bash
npm run build
```

输出到 `dist/` 目录，可直接部署到任何静态托管服务。

## 内容保护

6 层防护机制：
1. CSS 禁止文字选择和拖拽
2. JS 拦截右键、复制、DevTools 快捷键
3. Canvas 动态水印覆盖
4. DevTools 检测 + debugger 陷阱
5. 内容 Base64 编码 + robots.txt 禁爬
6. 标签页切换内容模糊
