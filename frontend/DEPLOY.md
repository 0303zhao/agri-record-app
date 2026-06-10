# 农记 (AgriRecord) — 部署说明

## 项目简介

「农记」是一款**纯前端手机单机版**农业数据记录 App。

- **技术栈**：Vue 3 + Vite + TypeScript + Vant 4 + Dexie.js (IndexedDB) + PWA
- **数据存储**：所有数据保存在手机本地 IndexedDB 中（`AgriRecordDB`）
- **无后端**：不依赖任何服务器、数据库或云服务
- **离线可用**：PWA 模式下，加载一次后即使断网也能打开使用

## 为什么需要 HTTPS 才能稳定安装 PWA？

PWA 的 Service Worker 和 Web App Manifest 需要安全上下文（Secure Context）才能正常工作。

- **localhost 测试**：浏览器允许 `http://localhost` 使用 Service Worker
- **局域网访问**：`http://192.168.x.x` 不一定能触发「安装应用」提示
- **手机正式安装**：必须通过 HTTPS 访问，Chrome、Safari 才会稳定显示安装按钮

因此，将 App 部署到 Vercel / Netlify（自动提供 HTTPS 证书）是最简单的方案。

---

## 部署方式一：Vercel（推荐）

Vercel 提供免费 HTTPS 域名，适合个人项目，部署极其简单。

### 步骤

1. 注册 [Vercel](https://vercel.com) 账号（推荐用 GitHub 登录）
2. 点击「Add New → Project」
3. 导入你的 GitHub 仓库
4. 配置如下：

   | 设置 | 值 |
   |------|-----|
   | **Framework** | Vite（自动检测） |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build`（自动检测） |
   | **Output Directory** | `dist`（自动检测） |

5. 点击 Deploy

项目根目录已包含 `vercel.json`，Vercel 会自动读取配置，无需手动设置。

### 部署后

- Vercel 会自动生成 `https://xxx.vercel.app` 域名
- 手机访问该域名 → 浏览器菜单 → **添加到主屏幕**
- 桌面出现「农记」图标

---

## 部署方式二：Netlify

Netlify 同样提供免费 HTTPS，部署通过拖拽或 Git 连接即可完成。

### 步骤

1. 注册 [Netlify](https://netlify.com) 账号
2. 点击「Add new site → Import an existing project」
3. 连接 GitHub 仓库
4. 配置：

   | 设置 | 值 |
   |------|-----|
   | **Base directory** | `frontend` |
   | **Build command** | `npm run build` |
   | **Publish directory** | `dist` |

5. 点击 Deploy site

项目根目录已包含 `netlify.toml`，Netlify 会自动读取配置。

### 部署后

- Netlify 会生成 `https://xxx.netlify.app` 域名
- 手机访问 → 添加到主屏幕即可

---

## 部署方式三：GitHub Pages（备选）

GitHub Pages 也支持 HTTPS，但有额外注意事项。

### 重要提醒

- GitHub Pages 项目站点 URL 格式为 `https://用户名.github.io/仓库名/`
- 如果使用项目站点，必须修改 `vite.config.ts` 中的 `base` 配置：

  ```ts
  // vite.config.ts
  export default defineConfig({
    base: '/你的仓库名/',   // 例如 base: '/agri-record/'
    // ...其他配置
  })
  ```

- 如果使用自定义域名，`base: '/'` 即可
- PWA manifest 和 Service Worker 的路径会随 `base` 自动调整

### 步骤

```bash
# 1. 安装 gh-pages
npm install -D gh-pages

# 2. 在 package.json 添加脚本
"deploy": "npm run build && gh-pages -d dist"

# 3. 运行部署
npm run deploy
```

---

## 手机安装步骤

1. 部署完成后，用手机浏览器打开你的 HTTPS 地址（如 `https://agrirecord.vercel.app`）
2. 等待页面加载完成（Service Worker 注册需要几秒）
3. **Chrome Android**：地址栏右侧会出现「安装」图标，或菜单中的「添加到主屏幕」
4. **Safari iOS**：点击底部分享按钮 → 滑动找到「添加到主屏幕」→ 确认
5. 桌面出现「农记」绿色图标
6. 点击图标打开 App（全屏无地址栏，类似原生应用体验）

> **提示**：首次安装后，App 会缓存所有静态资源。之后即使手机断网，也能打开并使用 IndexedDB 中的本地数据。

---

## 离线测试步骤

1. 用手机浏览器访问部署地址，正常浏览一次（让 Service Worker 缓存资源）
2. 将手机设置为飞行模式（关闭 WiFi 和移动数据）
3. 从手机桌面点击「农记」图标
4. App 应能正常打开页面框架
5. 所有 IndexedDB 数据（地块、档案、记录）仍可正常读写
6. **注意**：JSON 备份导出和 Excel 导出需要联网才能下载文件，但数据本身是安全的

---

## 数据安全提醒 ⚠️

> **重要：请务必阅读以下内容！**

1. **数据保存在当前手机本地 IndexedDB**
   - 服务器只提供 App 代码（HTML/CSS/JS），不存储任何用户数据
   - 你的地块、种植档案、作业记录等全部数据仅存在于**当前手机浏览器**中

2. **数据不会自动同步到云端**
   - 本 App 没有后端，没有云同步功能
   - 每部手机的数据完全独立

3. **换手机前必须导出 JSON 备份**
   - 打开 App → 进入「导出」页面 → 点击「导出完整备份 JSON」
   - 将 JSON 文件保存到电脑或云端（微信文件传输、QQ、邮件等）
   - 新手机打开 App → 「导出」页面 → 「从 JSON 备份恢复」
   - **不导出就换手机 = 数据永久丢失**

4. **清理浏览器数据可能导致数据丢失**
   - 清理浏览器的「Cookie 和网站数据」会删除 IndexedDB
   - 卸载浏览器 App 也会删除所有数据
   - 卸载 Android 上的 PWA 快捷方式通常不会删除数据（数据在浏览器中），但不要依赖此行为

5. **建议定期备份**
   - 每次录入重要数据后，花 10 秒导出一份 JSON
   - 建议同时导出 Excel（方便在电脑查看和打印）
   - 备份文件可以保存到云盘（如百度网盘、iCloud）作为双重保险

---

## 本地开发命令

```bash
cd frontend

# 开发模式（http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

- `dev`：开发模式，支持热更新，但 PWA 功能不完全
- `build`：生成 `dist/` 目录，包含所有 PWA 相关文件
- `preview`：本地预览生产构建，可用于测试 Service Worker
