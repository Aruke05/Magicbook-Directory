# Magicbook Directory

个人使用的 AI 提示词管理与生成平台。模板可以定义任意数量的输入字段和自动映射字段，并使用变量和条件块组织提示词内容。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS、CSS Variables、Radix UI
- React Hook Form、Zod
- Drizzle ORM、better-sqlite3
- pnpm

## 本地启动

```bash
pnpm install
cp .env.example .env.local
pnpm db:setup
pnpm dev
```

打开 `http://localhost:3000`。

请在 `.env.local` 中设置实际管理员账号、密码和随机 Session Secret。管理员凭据只在服务端读取，不会进入浏览器 JavaScript。

## 环境变量

```env
ADMIN_USERNAME=管理员账号
ADMIN_PASSWORD=管理员密码
SESSION_SECRET=至少32位的不可预测随机字符串
DATABASE_PATH=./data/magicbook.db
```

本地数据库文件不会提交到 Git。迁移文件位于 `drizzle/`，初始化命令会创建“对接上游”示例模板。

## 常用命令

```bash
pnpm db:generate  # 根据 Schema 生成迁移
pnpm db:migrate   # 执行迁移
pnpm db:seed      # 初始化示例数据
pnpm lint         # 代码规范检查
pnpm build        # 生产构建
```

## 登录与 Session

每次登录都会创建独立的服务端 Session，因此多台设备可以同时在线。Session 不设置应用级过期时间，退出登录只注销当前设备。浏览器 Cookie 使用 HttpOnly、SameSite=Lax，并在生产 HTTPS 环境启用 Secure。
