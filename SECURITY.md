# Security Notes

- Worker 必须使用 `WORKER_SHARED_SECRET`。
- 不要直接把 Browser Worker 裸露在公网。
- 推荐 VPN / Tailscale / 内网 / TLS reverse proxy。
- 不保存用户账号密码。
- Persistent Browser Profile 本身属于敏感登录状态，应限制文件系统权限并做好磁盘加密/备份策略。
- 登录与验证仅通过目标站点自己的真实浏览器页面人工完成。
- 不实现验证码绕过、2FA 绕过、自动验证码抓取或 rate-limit 绕过。
