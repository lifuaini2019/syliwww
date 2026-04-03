# 上院李十七世族谱 - 网页端

上院李十七世族谱的网页端版本，支持PC和H5移动端访问。

## 功能特性

### 通用功能
- 📱 响应式设计，支持PC和移动端
- 🔐 用户登录认证
- 👥 人员信息查看
- 🌳 世系图浏览
- 🏛️ 宝塔树形体展示

### 管理员功能
- 👤 人员管理（增删改查）
- 📸 照片管理
- 📥 数据导入导出
- 💾 数据备份
- 🔑 权限管理

### 普通用户功能
- 👁️ 查看族谱总览
- 👤 查看和编辑自己的信息
- 🌳 浏览世系图和宝塔树

## 技术栈

- HTML5
- CSS3 (响应式设计)
- JavaScript (ES6+)
- Font Awesome 图标

## 部署方式

### GitHub Pages
1. Fork 或克隆此仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择 main 分支作为源

### Cloudflare Pages
1. 登录 Cloudflare Dashboard
2. 创建 Pages 项目
3. 连接 GitHub 仓库
4. 部署设置保持默认即可

## 配置说明

修改 `js/api.js` 中的 API 地址：

```javascript
const API_CONFIG = {
    baseURL: 'https://your-api-domain.workers.dev'
};
```

## 目录结构

```
.
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── api.js          # API 接口封装
│   └── app.js          # 应用逻辑
└── README.md           # 说明文档
```

## 使用说明

1. 使用手机号登录
2. 管理员可以管理所有人员信息
3. 普通用户只能查看和编辑自己的信息
4. 支持头像上传和照片管理

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

MIT License
