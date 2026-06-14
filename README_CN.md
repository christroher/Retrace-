# <img src="icons/icon48.png" width="28"> Retrace — 重新定义浏览器历史

> 一个优雅的 Chrome 侧边栏扩展，将浏览历史变成可搜索的时间轴。

[![Chrome 扩展](https://img.shields.io/badge/Chrome%20扩展-v1.0-blue)](https://developer.chrome.com/docs/extensions/)
[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-green.svg)](LICENSE)
[![版本](https://img.shields.io/badge/版本-1.0.0-orange)]()

<p align="center">
  <img src="icons/icon128.png" width="100" alt="Retrace 图标">
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>中文</strong>
</p>

---

## ✨ 功能特性

### 🕐 **时间轴视图**
- 按日期分组的浏览历史，带有粘性日期标题
- 平滑无限滚动浏览历史时间轴
- 快捷筛选：今天、本周、本月

### 🔍 **正则搜索**
- 使用 JavaScript 正则表达式搜索标题或网址
- 智能降级：无效正则 → 普通文本搜索
- 无结果时自动扩展搜索范围

### 📅 **日历筛选**
- 点击选择日期范围
- 可视化高亮选中区域
- 双箭头快速切换年份

### 🎨 **优雅设计**
- **莫兰迪色系** — 低饱和度、柔和舒适的配色
- **域名哈希颜色** — 每个域名自动生成独特颜色
- **跟随系统主题** — 自动适配深色/浅色模式
- 简洁的卡片布局，极简的界面

### ⌨️ **快捷键**
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+R` | 打开/关闭侧边栏 |
| `Ctrl+F` / `/` | 聚焦搜索框 |
| `Esc` | 清空搜索 / 关闭日历 |
| `J` / `K` | 上下滚动 |
| `Alt+D` | 删除悬停的条目 |
| `Alt+C` | 复制网址 |
| `Alt+F` | 同域名历史 |

### 🔄 **撤销系统**
- 栈式撤销已删除的项目
- 3.5 秒 Toast 提示，显示剩余条数
- 支持批量恢复

### 📊 **智能特性**
- **懒加载 Favicon** — 滚动时按需加载，提升性能
- **200 条渲染限制** — 重度用户可点击"显示全部"
- **状态持久化** — 筛选状态在关闭/重开面板后保留

---

## 📸 截图

<p align="center">
  <em>时间轴视图，带日期标题</em>
  <br>
  <em>支持正则的搜索功能</em>
  <br>
  <em>日历日期范围选择器</em>
</p>

---

## 🚀 安装方法

### 从源码安装（开发者模式）

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/retrace.git
   cd retrace
   ```

2. **打开 Chrome 扩展管理**
   - 地址栏输入 `chrome://extensions/`
   - 开启右上角 **开发者模式**

3. **加载扩展**
   - 点击 **加载已解压的扩展程序**
   - 选择 `retrace` 文件夹

4. **固定扩展**
   - 点击工具栏的拼图图标
   - 固定 "Retrace" 方便快速访问

5. **打开侧边栏**
   - 点击扩展图标，或
   - 使用快捷键 `Ctrl+Shift+H`

---

## 💡 使用方法

### 基本导航
1. 点击工具栏中的扩展图标
2. 侧边栏在浏览器右侧打开
3. 滚动浏览历史时间轴
4. 点击任意条目在新标签页打开

### 正则搜索示例
```
# 查找所有 GitHub 页面
github\.com

# 查找 YouTube 视频
youtube\.com/watch

# 查找特定域名
(amazon|ebay)\.com

# 不区分大小写搜索
/github/i
```

### 日期筛选
- **快捷筛选**：点击"今天"、"本周"或"本月"
- **自定义范围**：点击日历图标 → 选择开始日期 → 选择结束日期
- **清除筛选**：点击日历中的"清除"按钮

---

## 🛠️ 开发

### 技术栈
- **Chrome Extension Manifest V3**
- **Side Panel API** — 持久化侧边栏
- **Chrome History API** — 获取历史数据
- **原生 JavaScript** — 无框架、无依赖
- **CSS 变量** — 主题切换

### 项目结构
```
retrace/
├── manifest.json        # 扩展配置
├── background.js        # Service Worker
├── sidebar.html         # 侧边栏 UI
├── sidebar.css          # 样式文件
├── sidebar.js           # 核心逻辑
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 核心设计决策
- **零外部依赖** — 轻量且快速
- **懒加载** — Favicon 按需获取
- **防抖搜索** — 流畅的输入体验
- **状态持久化** — chrome.storage.local 存储筛选状态

---

## 🎨 设计理念

**Retrace** 采用**莫兰迪色系** — 低饱和度、柔和的色调，长时间使用也不会视觉疲劳。

### 配色系统
- **主色调**：鼠尾草灰绿 (#7d8f7d / #8fa88f)
- **Favicon 颜色**：基于域名哈希的 12 种莫兰迪色
- **主题**：自动跟随系统深色/浅色模式

### 字体
- **品牌**：Plus Jakarta Sans
- **内容**：DM Sans

---

## 📋 更新日志

### v1.0.0 (初始版本)
- ✅ 时间轴视图，按日期分组
- ✅ 正则搜索（标题 + 网址）
- ✅ 日历日期范围选择器
- ✅ 快捷键支持
- ✅ 栈式撤销系统
- ✅ 莫兰迪色系配色
- ✅ 跟随系统主题
- ✅ 懒加载 Favicon

---

## 🤝 贡献

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m '添加某个功能'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 🙏 致谢

- 灵感来自现代时间轴 UI 设计
- 基于 Chrome 扩展最佳实践构建
- 莫兰迪色系带来视觉舒适体验

---

<p align="center">
  用 ❤️ 打造更好的浏览历史体验
</p>
