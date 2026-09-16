# LUXIXI / 露西西个人网站

基于 Vue 3 和 Vite 的个人作品集，包含个人首页、城市数据可视化、三维人体图谱和两类浏览器游戏。项目为纯前端应用，可部署到静态网站服务；当前不包含账号系统、数据库或业务后端。

线上访问：[https://luxixi-c4g.pages.dev/](https://luxixi-c4g.pages.dev/)。部署平台：**Cloudflare Pages**。

## 作品与入口

以下地址以本地开发服务 `http://localhost:5173` 为例，实际端口以启动日志为准。

| 页面 | 路径 | 当前状态 |
| --- | --- | --- |
| 个人首页 | `/` | 个人介绍、四图放映室、互动贴纸、作品入口、联系方式 |
| 城市热力脉冲实验室 | `/works/city-heatmap` | 地图分层、指标筛选、地区档案、城市对比与 CSV 导出 |
| 灰烬钟庭 · 古堡战斗 | `/works/castle-battle` | 单人三维战斗，庭院与室内探索、教学与触屏操作 |
| 人体结构分解可视化 | `/works/anatomy-visualizer` | BodyParts3D 图谱、系统图层、结构搜索与三维观察 |
| 湖心圣殿 · 3D 建模 | `/works/lake-sanctuary` | Aurelia Sanctuary V3、四个视角、自由观察、线框与原始渲染对照 |
| 给大脑找点麻烦 | `/works/brain-games` | 颜色判断、顺序记忆、规则反转三种挑战 |
| 虚构物种档案 / 更多正在生成 | 首页作品卡片 | 展示筹备中弹窗，尚无独立作品页面 |

首页锚点：`/#about`（保持好奇）、`/#visual-gallery`（脑内放映室）、`/#work`（作品集）、`/#contact`（联系方式）。

## 快速开始

### 环境

- Node.js：当前 Vite 要求 `^20.19.0 || >=22.12.0`。
- npm：使用仓库的 `package-lock.json` 安装锁定依赖。
- 浏览器：建议近期版本 Chrome 或 Edge；三维作品需要 WebGL，人体图谱还使用浏览器 gzip 解压能力。
- 普通运行不需要 Blender 或 Python；它们仅用于古堡素材处理。

在项目根目录运行：

```powershell
npm ci
.\node_modules\.bin\vite.cmd --host 127.0.0.1 --port 5173 --strictPort
```

访问 [本地首页](http://localhost:5173/)。端口已被占用时，先确认已有服务是否属于本项目，或换一个空闲端口；不要只根据 HTTP 200 判断加载的是最新代码。

也可使用 `npm run dev`。若 Codex 沙箱中的 npm 报 `EPERM: operation not permitted, lstat 'C:\Users\1'`，已有依赖时改用上述本地 Vite 命令，不要递归修改用户目录权限。

### 构建与预览

```powershell
.\node_modules\.bin\vite.cmd build
.\node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 4173 --strictPort
```

构建产物位于 `dist/`，预览入口为 [http://localhost:4173/](http://localhost:4173/)。不要直接双击 `index.html` 运行，模型和地图资源需要通过 HTTP 加载。

## 功能说明

### 首页与联系方式

- 黑底、网格、轨道和互动贴纸组成个人作品集首页；支持鼠标视差、贴纸状态切换、滚动出现和作品导航。
- 桌面首屏背景全宽，顶部内容最大宽度为 1480px；“保持好奇”、作品集、联系区及页脚最大宽度为 1180px。窄屏使用响应式布局。
- About 与 Works 之间新增“脑内放映室”：桌面全宽图片带、手机单图滑动，支持加载圆点、滚动渐入及非循环切换。
- “作品集”采用错位字形、描边字和手绘下划线；“保持联系”采用奶白文字与淡紫纸片，独眼小怪支持悬停及点击打招呼。
- 联系方式支持复制；留言表单仅供前端预览，不发送、不保存留言。
- 筹备中的作品使用弹窗说明，支持关闭后恢复焦点。

详细布局、交互、素材与验证记录见 [首页视觉与轮播说明](docs/home-visual-gallery.md)。

### 城市热力脉冲实验室

- 提供人口、经济规模、旅游热度和住房价格四类指标，支持热力/气泡展示、筛选、城市排行、对比及 CSV 导出。
- 点击省份查看地域档案；支持搜索定位、缩放、拖动、双指缩放、全屏和地图复位，放大后按视野加载下级边界。
- 37 个城市指标样本是静态演示数据，不代表实时或官方统计。新增地理节点没有指标时不会参与统计或导出。
- 台湾下级边界资源缺失时显示缺失状态，保留省级底图和已有演示样本。

详细数据口径、地理来源和历史验证记录见 [城市实验室文档](docs/city-heat-pulse.md)。

### 灰烬钟庭 · 古堡战斗

- Vue 提供界面，Three.js 渲染场景，Rapier 处理碰撞；包含钟庭花园和王庭大殿两个可往返区域。
- 提供六步新手引导、攻击、冲刺、闪避、跳跃、治疗、敌人锁定和暂停；击败全部 12 名敌人后通关。
- 桌面使用键鼠，移动端提供摇杆、视角拖动和动作按钮；支持画质和音效切换。
- 战斗进度保存在当前页面内存中，刷新或重新进入会重开；本地存储的教学完成标记不是游戏存档。

完整操作、模型导出、场景说明和验证脚本见 [古堡作品文档](game-tools/castle-battle/README.md)。

### 人体结构分解可视化

- 使用 BodyParts3D 4.0 成年男性参考模型，包含 2,234 个源网格与 3,432 个命名 FMA 概念；这些数量不是器官或骨骼数量。
- 支持全身、骨骼、脏器、神经预设，以及系统显隐、点击选取、隔离与聚焦结构。
- 可按英文名称、FMA 编号及已配置的中文名称/别名搜索；提供实体、X 光、线框显示，分解、剖切、视角切换、自动旋转和视图导出。
- 用于教育展示，不包含患者数据，不用于临床测量。

素材说明见 [人体图谱 README](public/assets/anatomy/README.md)，许可与改编信息见 [ATTRIBUTION](public/assets/anatomy/ATTRIBUTION.md)。

### 湖心圣殿 · 3D 建模

湖心圣殿的模型来源、导出方式与实时材质适配说明见 [三维作品文档](docs/lake-sanctuary.md)。

### 给大脑找点麻烦

- 颜色别骗人：识别实际字色，避免受文字含义干扰。
- 记忆闪回：观察序列并按顺序复原。
- 规则反转：根据同向/反向规则选择箭头方向。
- 各挑战提供练习与正式模式，支持键盘或鼠标/触屏；XState 管理游戏状态。
- 最佳成绩保存在浏览器 `localStorage`，不上传服务器；切换到后台会中断本局，练习不更新正式成绩。
- 结果用于娱乐，不提供智力判断或人群百分位。

规则、存储格式和历史验证记录见 [认知小游戏文档](docs/brain-games.md)。

## 技术与目录

主要技术：Vue 3、Vue Router 4、Vite 8、Three.js、Rapier、XState 5 和 Lucide 图标。依赖的实际版本以锁文件为准。古堡和认知小游戏页面按需加载，人体场景模块动态加载。

```text
src/
  main.js                         应用启动
  App.vue                         路由出口
  router.js                       页面路由与返回导航
  style.css                       首页及共享样式
  brain.css                       认知小游戏样式
  components/
    HomePage.vue                  首页与作品入口
    VisualGallery.vue             脑内放映室四图轮播
    ContactSection.vue            联系方式与留言预览
    ComingSoonDialog.vue          筹备中作品弹窗
    CityHeatmap.vue               城市实验室
    AnatomyVisualizer.vue         人体图谱页面
    CastleBattle.vue              古堡游戏页面与 HUD
    BrainGames.vue                认知小游戏
    anatomy/                      人体索引、搜索及三维场景
    cityHeatmap/                  省份档案
  game/castle/                    战斗、场景、角色、音效与防坠落逻辑
  assets/                         省级边界和下级地理索引
public/assets/
  visual-gallery/                 四幅 WebP 视觉作品
  stickers/                       首页 SVG 贴纸
  city-heatmap/                   按需加载的地区边界与来源说明
  anatomy/                       图谱索引、gzip 模型分块与许可
  castle-battle/                  GLB 模型、本地 Draco 解码器
game-tools/                       素材处理与作品验证工具
docs/                             作品说明
output/playwright/                本地浏览器验证脚本及记录
```

`game-tools/` 包含古堡导出/验证工具和地图刷新脚本。`dist/` 与 `node_modules/` 不纳入版本控制。

## 验证方式

基础构建检查：

```powershell
.\node_modules\.bin\vite.cmd build
```

古堡防坠落逻辑测试：

```powershell
node --test game-tools/castle-battle/safety.test.mjs
```

项目尚未提供统一的 `npm test`、lint 或全站端到端命令。已有浏览器脚本分布在 `game-tools/castle-battle/` 和 `output/playwright/`；使用前检查脚本入口、所需浏览器工具及端口，部分历史脚本使用 5180 或 5186，并非当前服务地址。

页面调整建议核验桌面和移动端布局、路由直达与刷新、返回导航、控制台错误，以及相关作品的关键交互。构建通过不等同于浏览器视觉或所有设备性能通过；作品文档中的验收结果属于当时版本的记录。

## 静态部署

当前项目使用 **Cloudflare Pages** 部署，线上地址为 [https://luxixi-c4g.pages.dev/](https://luxixi-c4g.pages.dev/)。本地预览地址仅用于开发验收；线上效果以 Cloudflare Pages 完成部署后的版本为准。

完整发布 `dist/`，默认部署在域名根目录。Vue Router 使用 History 模式，服务端须将页面路径回退到 `index.html`，否则刷新 `/works/*` 会返回 404。

Nginx 示例：

```nginx
server {
    listen 80;
    root /var/www/luxixi/dist;
    index index.html;

    location /assets/ {
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- 确保 JSON、SVG、GLB、gzip 分块和 Draco 解码器完整发布，`.wasm` 使用正确 MIME 类型（通常为 `application/wasm`）。
- 不要把缺失的资源请求重写成 HTML，否则模型或地图解析会失败。
- 当前资源和部分页面链接使用绝对路径；子目录部署需要同时检查 Vite `base`、路由和静态资源引用。
- 生产资源更新应同步处理缓存；页面看不到修改时先核对服务目录、实际端口及网络响应，再判断缓存问题。

## 已知限制与素材来源

- 三维资源和部分脚本较大，构建存在超过 500 kB 的 chunk 提示；首次加载与运行帧率取决于网络、设备和图形环境。
- 当前没有后端留言、账户同步、云存档或多人联机；也没有打包为离线 PWA。
- 地图素材来源和采集说明见 [地理资源署名](public/assets/city-heatmap/ATTRIBUTION.md)。
- 人体数据采用 BodyParts3D 的 CC BY 4.0 许可，发布时保留来源和改编说明。
- 古堡模型来源、导出过程及室内设计参考见 [古堡作品文档](game-tools/castle-battle/README.md)，素材记录见 [manifest.json](game-tools/castle-battle/manifest.json)。
- 后续可补充筹备中作品、作品缩略图与职责说明，并按上线需求完善分享元信息、性能和可访问性检查。
