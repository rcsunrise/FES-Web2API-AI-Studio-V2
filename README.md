# FES Web2API AI Studio V2

这是上一版的重新设计版，重点补上：

- Web 账号管理
- 后台新增/编辑账号
- 「打开登录窗口」
- 「打开验证窗口」同一流程
- 人工输入账号、密码
- 人工完成短信/邮箱验证码、Authenticator、Passkey、2FA
- 登录状态检测
- `NEEDS_LOGIN`
- `NEEDS_VERIFICATION`
- `LOGIN_WINDOW_OPEN`
- `HEALTHY`
- Browser Profile 持久化
- 多账号能力路由
- Web 对话 API
- Web 生图 API

## 核心原则

**FES 不保存账号密码。**

密码、验证码、二次验证只在目标网站自己的真实浏览器页面完成。

本项目不会实现：

- CAPTCHA 绕过
- 2FA 绕过
- 自动读取验证码并代填
- 自动批量注册账号
- Rate-limit / 风控绕过
- 私有 Web 接口重放

## 架构

```text
AI Studio / React Admin
        |
        v
FES Control Plane :8787
        |
        v
Browser Worker :9797
        |
        +-- Persistent Profile: chatgpt-web-01
        +-- Persistent Profile: gemini-web-01
        |
        +-- 登录/验证码时：headed Chromium
        +-- 正常任务时：headless/headed Chromium
```

## 为什么 Browser Worker 要独立

需要验证码时，必须在 **Browser Worker 所在机器** 打开真实浏览器窗口。

因此推荐：

```text
AI Studio / Cloud
    = 控制台 + Control Plane

你自己的电脑 / Windows VM / Linux Desktop VM
    = Browser Worker + 浏览器 Profile
```

如果 Browser Worker 在没有桌面的纯云容器中，用户看不到登录窗口。
远程登录 UI 可在下一阶段使用 noVNC / browser streaming 实现。

## 启动

```bash
cp .env.example .env
npm install
npx playwright install chromium
```

终端 1：

```bash
npm run worker
```

终端 2：

```bash
npm run dev
```

访问：

```text
http://localhost:5173
```

## 第一次登录

后台找到账号，例如：

```text
ChatGPT Web 01
状态：NEEDS_LOGIN
```

点击：

```text
打开登录窗口
```

Browser Worker 所在机器弹出 Chromium。

你自己：

```text
输入账号
输入密码
输入短信/邮箱验证码
完成 Authenticator / Passkey / Google 手机确认
```

完成后回到 FES 后台点击：

```text
检查登录状态
```

成功后变成：

```text
HEALTHY
```

浏览器 Profile 保存在：

```text
worker-data/profiles/<account-id>
```

## 状态

```text
HEALTHY
BUSY
NEEDS_LOGIN
NEEDS_VERIFICATION
LOGIN_WINDOW_OPEN
COOLDOWN
ERROR
DISABLED
```

## API

### 账号

```text
GET    /v1/accounts
POST   /v1/accounts
PATCH  /v1/accounts/:id
POST   /v1/accounts/:id/login/start
POST   /v1/accounts/:id/login/check
POST   /v1/accounts/:id/login/close
```

### 能力

```text
GET /v1/capabilities
GET /v1/models
```

### Web 对话

```text
POST /v1/chat/completions
```

### Web 生图

```text
POST /v1/images/generations
```

## DOM Selector

Web 页面会变化，所以 V2 没有把某个平台当前的 DOM 结构永久硬编码到核心里。

账号配置支持：

```text
selectors.input
selectors.submit
selectors.response
selectors.image
selectors.loggedIn
selectors.verification
```

对于正式运行：

1. 打开登录窗口
2. 登录
3. 用浏览器开发者工具检查目标元素
4. 配置稳定 selector
5. 再进行 API 调用

通用 Adapter 只负责可见页面交互，不调用模型官方 API。

## AI Studio 推荐部署

AI Studio 放：

- React 控制台
- Express Control Plane
- Capability Router

Browser Worker 放：

- 你自己的电脑
- 带桌面的 VM
- 持久磁盘服务器

`.env` 中：

```env
BROWSER_WORKER_URL=http://你的worker地址:9797
WORKER_SHARED_SECRET=一段强随机字符串
```

不要把 Worker 9797 直接无鉴权暴露在公网。
建议通过 VPN、Tailscale、内网或反向代理 TLS 保护。

## 下一阶段 V2.1

- WebUI Selector Inspector
- 自动识别登录页/验证页的更可靠规则
- SSE 流式对话
- Supabase Task Log
- Supabase Storage
- retry + cooldown + health score
- 图片编辑上传
- Worker 多节点注册
- 远程浏览器 noVNC / browser streaming
