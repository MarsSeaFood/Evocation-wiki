# 通用卡牌 Wiki 框架

这个目录现在可以作为其他卡牌游戏 Wiki 的静态模板使用。

## 核心文件

- `index.html`：前台 Wiki 页面
- `admin.html`：配置管理页面
- `styles.css`：统一样式
- `app.js`：前台读取 CSV、配置和 changelog
- `admin.js`：管理页生成配置文件
- `cards.csv`：卡牌数据源
- `site-config.json`：站点名称、字段表头和显示规则
- `scripts/build-changelog.mjs`：GitHub Action 自动生成 changelog
- `.github/workflows/deploy-pages.yml`：GitHub Pages 自动部署

## 换成其他卡牌游戏

1. 替换 `cards.csv`
2. 打开 `admin.html`
3. 修改网页名称
4. 修改每个属性对应的 CSV 表头
5. 设置字段是否显示在卡片、详情页、搜索中
6. 下载新的 `site-config.json`
7. 上传 `cards.csv` 和 `site-config.json` 到 GitHub 仓库根目录

## 字段角色

- `id`：唯一 ID，用于识别同一张卡牌
- `primaryName`：主名称，中文模式优先显示
- `secondaryName`：副名称，英文模式优先显示
- `body`：主要正文内容，例如效果文本
- `meta`：普通属性，例如稀有度、阵营、费用

## Changelog

GitHub Action 会对比每次提交前后的 `cards.csv`，生成 `changelog.json`。

前台的“下载 CSV”按钮会导出三列：

- `修改时间`
- `原文内容`
- `修改后内容`

新增卡牌时，原文内容为空；删除卡牌时，修改后内容为空；修改卡牌时，每个变化字段单独一行。
