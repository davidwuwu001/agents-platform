# 汤仔智能体聚合平台

这是一个集成多种大型语言模型(LLM)的智能体聚合平台，同时包含一个专门的知识库查询助手（汤仔助手）。

## 主要功能

### 智能体聚合平台
- 支持多种AI模型接入（如OpenAI、Azure、Anthropic Claude等）
- 管理员模式可添加、编辑和删除智能体
- 支持Markdown渲染和代码高亮显示
- 可导出对话内容到Word文档
- 完全响应式设计，自适应各种设备（桌面、平板、手机）
- 智能横幅显示控制，在选择智能体后自动隐藏

### 汤仔知识库助手
- 连接企业级知识库服务（火山引擎）
- 支持流式输出（逐字显示回复）
- 支持多轮对话，保持完整上下文
- 用户友好的设置界面
- 本地存储对话历史和设置

## 项目结构

```
/
├── index.html          # 主平台首页
├── style.css           # 主样式表
├── agents.json         # 智能体配置数据
├── favicon.ico         # 网站图标
├── tangzai.jpg         # 汤仔助手头像
├── js/                 # JavaScript模块文件夹
│   ├── app.js          # 应用入口模块
│   ├── agent-service.js # 智能体服务模块
│   ├── api-service.js  # API调用服务模块
│   ├── chat-service.js # 聊天服务模块
│   ├── export-service.js # 导出服务模块 
│   ├── message-handler.js # 消息显示模块
│   ├── storage-service.js # 存储服务模块
│   ├── layout-manager.js # 布局管理模块
│   ├── docx.js         # Word文档生成库
│   ├── FileSaver.min.js # 文件保存库
│   └── markdown-to-word.js # Markdown转Word库
├── tangzai_assistant/  # 汤仔助手文件夹
│   ├── tangzai.html    # 汤仔助手页面
│   ├── tangzai.css     # 汤仔助手样式表
│   └── tangzai.js      # 汤仔助手脚本
├── backups/            # 自动备份文件夹
├── faq.html            # 常见问题解答页面
├── markdown-to-word-demo.html # 转Word演示页面
├── markdown-to-word-readme.md # 转Word使用说明
├── start.html          # 启动指南页面
├── start.bat           # Windows启动脚本
├── start.sh            # Linux/Mac启动脚本
└── restart-server.sh   # 服务器重启脚本
```

## 模块说明

### 核心模块
- **app.js**: 应用入口模块，负责初始化和协调各个服务模块
- **agent-service.js**: 智能体服务模块，负责智能体的管理、加载和保存
- **api-service.js**: API服务模块，负责所有API调用和响应处理
- **chat-service.js**: 聊天服务模块，负责聊天历史管理和消息交互
- **export-service.js**: 导出服务模块，负责Word文档导出相关功能
- **message-handler.js**: 消息处理模块，负责所有消息的显示与处理
- **storage-service.js**: 存储服务模块，负责本地存储与数据持久化
- **layout-manager.js**: 布局管理模块，负责界面布局的调整与优化

### 第三方库
- **docx.js**: Word文档生成库
- **FileSaver.min.js**: 文件保存库
- **markdown-to-word.js**: Markdown转Word功能库

## 使用方法

### 快速启动

1. 在Windows上，双击`start.bat`文件
2. 在Mac或Linux上，运行`./start.sh`文件
3. 或手动启动Python的HTTP服务器：
   ```
   python -m http.server
   ```
4. 打开浏览器访问`http://localhost:8000`即可使用

### 使用智能体平台

1. 从下拉菜单中选择一个智能体
2. 在输入框中输入您的问题，点击发送
3. 查看AI回复，支持Markdown和代码高亮
4. 可随时清除聊天记录或导出对话内容

### 管理员功能

1. 点击页面底部的"管理员模式"按钮
2. 添加、编辑或删除智能体
3. 配置API地址、密钥、模型名称和系统提示词

### 汤仔知识库助手使用说明

1. 点击主页上方的"汤仔智能助手"或导航到`/tangzai_assistant/tangzai.html`
2. 点击设置按钮，配置API密钥和服务ID
3. 在输入框中输入您的问题，点击发送
4. 系统会自动调用知识库服务查询相关信息并实时回复

## 技术特性

- 模块化架构设计，每个模块具有单一职责
- 纯前端实现，无需后端服务器
- 响应式布局，完美适配各种屏幕尺寸
- 使用localStorage存储设置和聊天历史
- 使用fetch API安全调用外部服务
- 支持现代浏览器的SSE（Server-Sent Events）流式处理
- 使用JavaScript动态加载和管理智能体

## 注意事项

- 知识库服务需要单独部署并配置代理服务解决CORS问题
- 使用前请确保已正确配置API密钥和服务地址
- 首次使用需在管理员模式下添加至少一个智能体
- 如遇问题，请查看FAQ页面或联系管理员

## 浏览器兼容性

- Chrome 88+
- Firefox 90+
- Safari 14+
- Edge 88+
- 移动端浏览器（iOS Safari、Android Chrome）
