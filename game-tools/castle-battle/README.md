# 灰烬钟庭 · 古堡战斗小游戏

本作品是 luxixi 作品集的第二个作品，入口路由为 `/works/castle-battle`。从作品集中的“古堡战斗小游戏”卡片进入，游戏使用独立的 `CastleBattle.vue` 组件，不嵌入首页内容。

## 运行方式

这是纯前端、单人、本地计算的浏览器游戏：Vue 负责页面和 HUD，Three.js 负责三维画面，Rapier 负责角色及场景碰撞。无账号、数据库、多人联机或后端接口。游戏状态保存在当前页面内存中，刷新页面或退出后重新进入会开始新的一局。

女性主角艾莉娅可以在钟庭花园与王庭大殿之间往返。庭院有 8 名守卫，室内有 4 名近卫；击败全部 12 名敌人后显示“通关成功”，也可继续探索。生命耗尽后可以重试。

首次进入默认开启 6 步新手引导：实际完成移动、转镜头、攻击、闪避、锁定和进门。教学期间守卫静止且不造成伤害；完成后才开始计时和战斗。可以跳过教学，也可以从操作手册重新开始教学。完成标记仅保存在当前浏览器的 localStorage，不包含游戏存档。

庭院右前方的蓝色拱门连接王庭大殿，靠近后按 `F` 或点击交互按钮进入；室内入口门同样可以返回庭院。切换区域保留敌人血量和玩家状态。完整地板碰撞、空气墙和每次物理更新后的边界校正共同防止角色掉落。

室内升级版已通过本地 Chrome / Playwright 的六步教学、真实战斗击败全部 12 名守卫、通关后往返探索、操作手册暂停和贴墙镜头检查。Rapier 防坠落测试覆盖庭院与室内的连续冲刺、闪避方向及异常位置。验证脚本与截图保留在本目录和 `output/playwright/`；这些结果不代表所有实体手机的性能测试。

验证脚本位于本目录的 `verify-upgrade.js`、`verify-desktop.js`、`verify-mobile.js`、`verify-render.js`、`verify-help-mobile.js`，可用 Playwright CLI 的 `run-code --filename=...` 执行；桌面和引导脚本默认使用开发服务端口 5186。`verify-render.js` 检查当前已打开场景；可在室内外各执行一次。脚本只读取开发模式快照，战斗操作通过真实键鼠和触控事件执行。防坠落测试使用 `node --test game-tools/castle-battle/safety.test.mjs`。

浏览器需要启用 WebGL。建议使用近期版本的 Chrome 或 Edge，移动端可使用页面内的触屏操作。游戏及素材通过 HTTP 加载，不要直接双击 `index.html` 使用 `file://` 运行。

## 本地开发与构建

当前 Vite 的 Node.js 要求为 `^20.19.0 || >=22.12.0`。首次准备项目时安装依赖：

```powershell
cd D:\myProject\web\luxixi
npm ci
```

启动开发服务：

```powershell
.\node_modules\.bin\vite.cmd --host 127.0.0.1 --port 5173 --strictPort
```

打开 `http://localhost:5173/works/castle-battle`。端口被占用时，换一个空闲端口重新启动，并使用相应网址。

构建与本地预览：

```powershell
.\node_modules\.bin\vite.cmd build
.\node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 4173 --strictPort
```

构建产物位于 `dist/`。按照项目 `AGENTS.md`，若 Codex 环境中的 `npm` 命令报 `EPERM: operation not permitted, lstat 'C:\Users\1'`，不要修改用户目录权限；已有依赖时使用上面的项目本地 Vite 命令。

## 静态部署

将完整 `dist/` 部署到静态 Web 服务即可，不需要启动游戏后端。当前 App 使用浏览器 History API 和以 `/works/...` 开头的路由，默认按域名根目录部署。

服务端必须将不存在的页面路径回退到 `index.html`，否则直接访问或刷新 `/works/castle-battle` 会返回 404。Nginx 示例：

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

静态平台可使用等效的 SPA rewrite 规则。需同时发布 GLB、Draco JavaScript 和 WASM 文件，确保服务器正确提供 `.wasm`，通常 MIME 类型为 `application/wasm`。游戏资源本地托管，运行时不依赖模型或解码器 CDN。

若改为 `/portfolio/` 等子目录部署，除 Vite `base` 外，还需同步调整 App 和作品卡片的绝对路由；当前配置不应直接假定支持任意子目录。

## 操作

### 键盘与鼠标

| 操作 | 输入 |
| --- | --- |
| 移动 | `W/A/S/D` 或方向键 |
| 转动视角 | 在游戏场景中按住鼠标右键拖动 |
| 攻击 | 鼠标左键、空格、`J`，或 HUD 中的双剑按钮 |
| 连续攻击 | 在游戏场景中按住鼠标左键或空格；受体力和动作状态限制 |
| 冲刺 | 移动时按住 `Shift` |
| 闪避 | `C`、`Alt` 或 HUD 中的脚印按钮 |
| 跳跃 | `V` 或向上箭头按钮；每次消耗 12 体力，落地后才能再次起跳 |
| 治疗 | `E` 或药瓶按钮 |
| 锁定/取消锁定敌人 | `Q` 或准星按钮 |
| 进入/离开大殿 | 靠近门后按 `F` 或点击门前提示 |
| 操作手册 | `H` 或右上角帮助按钮 |
| 暂停/继续 | `Esc`、`P` 或右上角暂停/继续按钮 |
| 失败或胜利后重试 | `R` 或“再次挑战”按钮 |

游戏默认不锁定鼠标，HUD 按钮可直接点击。锁定敌人后，镜头会跟随目标。治疗最多携带 3 瓶，攻击、冲刺和闪避会消耗体力；体力会在动作间隙恢复。音效在开始游戏后由浏览器音频系统启用。

### 触屏

- 左下摇杆控制移动。
- 在屏幕右侧的场景区域拖动调整视角。
- 右下双剑、脚印、药瓶和准星分别对应攻击、闪避、治疗及锁定。
- 向上箭头按钮用于跳跃，可配合摇杆控制空中方向；空中不能再次起跳或闪避。
- 支持摇杆、视角和动作按钮的多指操作。
- 右上角可暂停、切换音效和画质；左上角返回作品集。

触屏控件也会在较窄的浏览器窗口中显示。画质提供“均衡”和“精细”，主要调整渲染分辨率上限；低性能设备优先使用“均衡”。全屏按钮的可用性取决于浏览器支持，窄屏下隐藏。

## 代码与素材

| 路径 | 用途 |
| --- | --- |
| `src/components/CastleBattle.vue` | 独立游戏页面、HUD、菜单及触屏输入 |
| `src/game/castle/game.js` | 游戏循环、战斗、敌人行为、角色碰撞及输入 |
| `src/game/castle/environment.js` | GLB 加载、材质处理、灯光和场景碰撞面 |
| `src/game/castle/interior.js` | 王庭大殿、前厅、侧廊、家具、灯光和碰撞体 |
| `src/game/castle/entrance.js` | 庭院入口的拱门、门扇和蓝色灯光 |
| `src/game/castle/safety.js` | 每次物理更新后的防坠落和边界校正 |
| `src/game/castle/actors.js` | 女性主角、守卫及程序化角色动画 |
| `src/game/castle/actorTextures.js` | 角色盔甲、皮革、链甲与织物纹理 |
| `src/game/castle/audio.js` | 浏览器内合成音效 |
| `src/game/castle/level.json` | 战斗区域、玩家及守卫出生点 |
| `public/assets/castle-battle/castle-sanctuary-lite.glb` | 约 2.5 MB 的 Draco 压缩古堡模型 |
| `public/assets/castle-battle/draco/` | 本地 Draco 解码器及 WASM 文件 |
| `game-tools/castle-battle/export_scene.py` | Blender 模型减面与 GLB 导出脚本 |
| `game-tools/castle-battle/manifest.json` | 模型来源、数量和坐标信息 |
| `game-tools/castle-battle/surface-probe.json` | 场景表面高度检查记录 |

古堡 GLB 来源于同一工作区的 `D:\myProject\web\sanctuary\delivery\aurelia_rebuilt.blend`。导出包含城堡、岛屿、桥梁和山体几何，并进行减面与 Draco 压缩。网页运行只需要导出的 GLB，不需要安装 Blender。

需要重新导出时，在保持 `web/luxixi` 与 `web/sanctuary` 相邻目录的前提下运行：

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python '.\game-tools\castle-battle\export_scene.py'
```

导出脚本不保存或覆盖来源 `.blend`，会更新 GLB 和 `manifest.json`。GLB 不包含 Blender 灯光、相机和纯体积雾对象；Blender 程序化材质通过材质颜色及网页着色处理重建，湖水、灯光和碰撞面由网页场景模块提供。

模型采用 glTF/Three.js 的右手 Y 轴向上坐标，Blender `(x, y, z)` 转换为 `(x, z, -y)`。岛屿平台约位于 `Y=10`；玩家出生点 `[0, 10.52, 11]` 表示脚底位置，实际角色碰撞体中心有额外高度偏移。

## 室内参考

室内是原创的哥特式游戏空间。高厅、彩窗与挂毯的配置参考 [Historic Royal Palaces 的 Hampton Court Great Hall](https://www.hrp.org.uk/hampton-court-palace/whats-on/great-hall/)，王座与生活陈设参考 [English Heritage 的 Dover Castle Great Tower](https://www.english-heritage.org.uk/visit/places/dover-castle/)。这些网页只用于建筑布局学习，没有将其照片或商业游戏素材打包到项目。

## 当前边界

- 这是风格化暗黑奇幻的浏览器单关卡作品，不是《艾尔登法环》的素材复用，也不承诺商业 3A 游戏的画质、动画或玩法规模。
- 可探索区域包括钟庭花园以及经过设计的王庭大殿、前厅与两侧廊。它们通过门口交互切换，保留战斗进度；并非整座外观模型的每一个塔楼和桥梁都能进入。
- 角色及动作由代码制作，不包含动作捕捉动画或角色编辑器。
- 首次加载需要下载模型与解码器；这是静态单机网页，不是已打包的离线 PWA。
- 实际帧率受设备、屏幕像素密度和浏览器图形环境影响。
