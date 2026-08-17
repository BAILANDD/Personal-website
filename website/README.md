# Personal Studio Website

一个轻量静态个人网站模板，适合先搭建“个人IP展示底座”。

## 目录

- `index.html`: 页面结构与内容
- `styles.css`: 视觉样式与响应式布局
- `main.js`: 页面动效与导航高亮

## 本地预览

在当前目录运行：

```bash
cd website
python3 -m http.server 5173
```

然后访问：<http://localhost:5173>

## 你优先要改的内容

1. `index.html` 中的姓名、邮箱、社交账号、微信
2. `PROJECTS` 区块中每个项目的真实链接和说明
3. `ABOUT` 区块中的一句话定位

## 下一步可扩展

1. 接入真实作品视频缩略图
2. 增加中英双语切换
3. 绑定自定义域名并部署到 Vercel 或 Netlify
