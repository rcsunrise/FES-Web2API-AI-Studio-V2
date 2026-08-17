# AI Studio 开发指令

读取整个代码库后继续开发 `FES Web2API V2`。

硬性约束：

1. 不调用 OpenAI 官方模型 API。
2. 不调用 Gemini 官方模型 API。
3. Web 能力通过独立 Browser Worker 执行。
4. 账号密码不进入 FES 数据库。
5. 验证码、2FA、Passkey 必须由用户在目标网站真实浏览器中人工完成。
6. 不实现 CAPTCHA 绕过、2FA 绕过、自动验证码读取、风控绕过或限额规避。
7. 每个账号拥有独立 Persistent Browser Profile。
8. Control Plane 与 Browser Worker 保持解耦。
9. 当前核心 API 保持：
   - GET /v1/accounts
   - POST /v1/accounts
   - PATCH /v1/accounts/:id
   - POST /v1/accounts/:id/login/start
   - POST /v1/accounts/:id/login/check
   - POST /v1/accounts/:id/login/close
   - GET /v1/capabilities
   - GET /v1/models
   - POST /v1/chat/completions
   - POST /v1/images/generations
10. 不要删除现有 AccountStatus：
   - HEALTHY
   - BUSY
   - NEEDS_LOGIN
   - NEEDS_VERIFICATION
   - LOGIN_WINDOW_OPEN
   - COOLDOWN
   - ERROR
   - DISABLED

第一阶段任务：

A. 完成 build validation
B. 修复 TypeScript 错误
C. 确保 account create/update 持久化
D. 确保 login/start 在 Browser Worker 所在机器打开 headed Chromium
E. 确保 login/check 正确更新状态
F. 不自动提交账号密码和验证码
G. 输出 Validation Report

完成后停止，等待下一条指令。
