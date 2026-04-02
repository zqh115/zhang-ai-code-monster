# zhang-ai-code-mother

一个基于 `Spring Boot 3 + Vue 3` 的 AI 应用生成平台。用户可以通过自然语言创建应用，系统会自动选择代码生成模式，支持流式对话生成、实时预览、应用部署、代码下载，以及后台管理用户、应用和对话历史。

## 项目概览

这个仓库由两个部分组成：

- 后端：`Spring Boot 3.5`、`Java 21`、`MyBatis-Flex`、`Redis`、`LangChain4j`
- 前端：`Vue 3`、`Vite`、`TypeScript`、`Pinia`、`Ant Design Vue`

核心能力包括：

- 通过一句话需求创建应用
- AI 自动路由代码生成类型
- 流式返回生成过程（SSE）
- 生成后本地预览网页
- 一键部署应用
- 下载生成后的项目代码
- 管理端维护用户、应用、对话历史

## 主要功能

### 用户侧

- 用户注册、登录、退出登录
- 创建应用并保存初始化 Prompt
- 查看“我的应用”
- 在应用对话页持续补充需求
- 可视化编辑页面元素后继续生成
- 预览生成结果
- 下载代码压缩包
- 部署应用并获取访问地址

### 管理侧

- 用户管理
- 应用管理
- 对话历史管理
- 管理员查看应用详情

## 代码生成模式

后端会根据用户输入的初始化需求，自动在以下模式中选择：

- `html`：原生 HTML 模式
- `multi_file`：原生多文件模式
- `vue_project`：Vue 工程模式

对应枚举定义位于：

- `src/main/java/com/zqh/zhangaicodemother/model/enums/CodeGenTypeEnum.java`

## 技术栈

### 后端

- Spring Boot 3.5.11
- Java 21
- MyBatis-Flex
- MySQL
- Redis
- Spring Session
- LangChain4j
- Selenium + WebDriverManager
- Redisson
- Knife4j / OpenAPI 3
- 阿里云 OSS

### 前端

- Vue 3
- Vite 7
- TypeScript
- Pinia
- Vue Router
- Ant Design Vue
- Axios
- Markdown-It
- Highlight.js

## 项目结构

```text
.
├─ src/
│  ├─ main/
│  │  ├─ java/com/zqh/zhangaicodemother/
│  │  │  ├─ ai/                  AI 生成、路由、护栏、工具
│  │  │  ├─ controller/          接口层
│  │  │  ├─ core/                代码生成、解析、保存、流处理
│  │  │  ├─ service/             业务服务
│  │  │  ├─ mapper/              数据访问
│  │  │  ├─ model/               DTO / Entity / VO / Enum
│  │  │  ├─ config/              配置类
│  │  │  └─ ratelimter/          限流
│  │  └─ resources/
│  │     ├─ application*.yml     环境配置
│  │     ├─ mapper/              MyBatis XML
│  │     └─ prompt/              AI 系统提示词
│  └─ test/                      测试代码
├─ sql/
│  └─ create_table.sql           数据库初始化脚本
├─ tmp/                          生成代码、部署产物、临时文件
└─ zhang-ai-code-mother-frontend/
   ├─ src/
   │  ├─ pages/                  页面
   │  ├─ components/             组件
   │  ├─ router/                 路由
   │  ├─ stores/                 状态管理
   │  └─ api/                    前端接口封装
   └─ package.json
```

## 关键业务流程

### 1. 创建应用

- 前端首页输入一句话需求
- 调用 `POST /api/app/add`
- 后端根据 Prompt 自动判断代码生成类型
- 创建应用记录并返回 `appId`

### 2. 流式生成代码

- 进入应用对话页
- 调用 `GET /api/app/chat/gen/code`
- 通过 SSE 流式返回 AI 生成内容
- 后端保存对话历史，并将代码落盘到 `tmp/code_output`

### 3. 本地预览

- 前端根据应用类型拼接预览地址
- 通过 `/api/static/{deployKey 或目录}` 提供静态资源访问
- Vue 工程模式会优先访问生成项目中的 `dist/index.html`

### 4. 部署应用

- 调用 `POST /api/app/deploy`
- 普通 HTML / 多文件项目直接复制部署
- Vue 项目会先构建，再复制 `dist` 目录
- 部署结果写入 `tmp/code_deploy`

### 5. 下载代码

- 调用 `GET /api/app/download/{appId}`
- 后端将生成目录打包为 ZIP 后返回

## 本地运行

### 环境要求

- JDK `21`
- Maven `3.9+`（或直接使用项目自带 `mvnw.cmd`）
- Node.js `20.19+` 或 `22.12+`
- MySQL `8.x`
- Redis `6+`

### 1. 初始化数据库

执行：

```sql
source sql/create_table.sql;
```

默认数据库名为：

```text
zhang_ai_code_mother
```

### 2. 配置后端

后端默认配置文件：

- `src/main/resources/application.yml`
- `src/main/resources/application-local.yml`
- `src/main/resources/application-prod.yml`

项目当前依赖以下配置：

- MySQL 数据源
- Redis
- DeepSeek / OpenAI 兼容接口
- 阿里云 OSS
- 可选部署地址 `code.deploy-host`

建议你在本地启动前：

- 替换所有敏感配置为你自己的值
- 不要直接使用仓库里现有的密钥信息
- 优先改成环境变量注入

### 3. 启动后端

在项目根目录执行：

```powershell
.\mvnw.cmd spring-boot:run
```

默认启动地址：

```text
http://localhost:8123/api
```

健康检查：

```text
GET http://localhost:8123/api/health/
```

接口文档：

```text
http://localhost:8123/api/doc.html
```

### 4. 启动前端

进入前端目录：

```powershell
cd .\zhang-ai-code-mother-frontend
```

安装依赖：

```powershell
npm install
```

参考 `.env.example` 创建本地环境变量文件，例如 `.env.local`：

```env
VITE_API_BASE_URL=/api
VITE_APP_PREVIEW_BASE_URL=/api
VITE_APP_DEPLOY_BASE_URL=http://localhost
```

启动开发环境：

```powershell
npm run dev
```

前端开发服务器会通过 Vite 代理把 `/api` 转发到：

```text
http://localhost:8123
```

## 主要接口

### 用户相关

- `POST /api/user/register`
- `POST /api/user/login`
- `POST /api/user/logout`
- `GET /api/user/getCurrentUser`

### 应用相关

- `POST /api/app/add`
- `POST /api/app/update`
- `POST /api/app/delete`
- `GET /api/app/get/vo`
- `POST /api/app/my/list/page/vo`
- `POST /api/app/good/list/page/vo`
- `GET /api/app/chat/gen/code`
- `POST /api/app/deploy`
- `GET /api/app/download/{appId}`

### 对话历史

- `GET /api/chatHistory/app/{appId}`
- `POST /api/chatHistory/admin/list/page/vo`

### 管理接口

- `POST /api/app/admin/update`
- `POST /api/app/admin/delete`
- `POST /api/app/admin/list/page/vo`
- `GET /api/app/admin/get/vo`
- `POST /api/user/list/page/vo`

## 前端页面

前端主要页面位于 `zhang-ai-code-mother-frontend/src/pages`：

- `HomePage.vue`：首页，创建应用、展示我的应用和精选应用
- `app/AppChatPage.vue`：应用对话生成页，支持预览、部署、下载和可视化编辑
- `app/AppEditPage.vue`：应用信息编辑页
- `user/UserLoginPage.vue`：登录页
- `user/UserRegisterPage.vue`：注册页
- `admin/UserManagePage.vue`：用户管理
- `admin/AppManagePage.vue`：应用管理
- `admin/ChatHistoryManagePage.vue`：对话管理

## 生成与部署目录

后端常量中定义了以下目录：

- 生成代码目录：`tmp/code_output`
- 部署目录：`tmp/code_deploy`

对应定义位于：

- `src/main/java/com/zqh/zhangaicodemother/constant/AppConstant.java`

## 测试

后端测试位于：

- `src/test/java/com/zqh/zhangaicodemother`

可以按需执行：

```powershell
.\mvnw.cmd test
```

前端可执行：

```powershell
npm run build
npm run lint
```

## 补充说明

- 项目使用 `Spring Session + Redis` 保存登录态，前端请求开启了 `withCredentials`
- 代码生成接口做了按用户限流
- 项目内置了文件读取、写入、修改、删除等 AI 工具能力
- Vue 项目部署前会自动构建
- 应用部署完成后会异步生成截图并更新封面

## 适合继续完善的方向

- 将敏感配置改为环境变量或配置中心
- 补充 Docker / Docker Compose 启动方案
- 增加统一的初始化脚本
- 补齐更多单元测试与集成测试
- 为部署目录增加 Nginx 或对象存储接入方案
