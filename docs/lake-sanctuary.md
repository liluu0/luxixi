# 湖心圣殿 · 三维作品

入口：`/works/lake-sanctuary`，从首页第三张作品卡片进入。独立展示用户完成的 Aurelia Sanctuary V3 模型，不包含战斗或角色控制。页面和 Three.js 查看器按路由加载，首页只读取配套预览图。

## 浏览

- 鼠标拖动旋转、滚轮缩放、右键拖动平移；触屏单指旋转、双指缩放和平移。
- 湖畔全景、西侧回廊、中央庭园、鎏金穹顶四个预设视角。
- 自动环绕、线框、视角复位、全屏（浏览器支持时）和原始渲染图对照。
- 加载进度、失败重试和渲染图降级；离开页面时中止请求并释放图形资源。
- 默认静止展示；系统减少动态效果偏好会禁用视角补间动画。

## 资源与导出

源文件：`D:/myProject/web/sanctuary/delivery/aurelia_sanctuary_v3.blend`。不修改、保存或分发源文件。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python game-tools/lake-sanctuary/export_scene.py -- 'D:/myProject/web/sanctuary/delivery/aurelia_sanctuary_v3.blend'
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python game-tools/lake-sanctuary/render_preview.py -- 'D:/myProject/web/sanctuary/delivery/aurelia_sanctuary_v3.blend'
```

产物：`public/assets/lake-sanctuary/aurelia-sanctuary-v3.glb`，约 5.67 MB。`manifest.json` 记录源文件 SHA-256、相机、网格与面数、适配方式。导出脚本同步更新 `src/components/sanctuary/modelVersion.json`，模型和图片请求携带源文件版本，避免缓存旧资产。随源文件后续更新，数量和大小可能变化。

本次导出遵循源场景的渲染可见性，排除隐藏的旧植物对象及集合。7,802 个可见网格按材质合并为 23 个网格，不做几何减面；保留 756,887 个 Blender 多边形（glTF 会三角化，因此不等于渲染三角形数量）。删除一个极远湖面四边形，避免 Draco 在超大坐标范围内量化时损失近处精度。

复用现有 `public/assets/castle-battle/draco/` 解码器，不新增生产依赖；静态部署必须保留此目录。

`preview.png` 根据最新源文件的主相机重新进行 Cycles 渲染（1200 × 800、24 采样、降噪），用于卡片、加载背景及原始渲染对照；来源校验值见 `preview-manifest.json`。网页不会实时计算 Blender 离线渲染。导出模型与渲染预览均读取临时快照，不会保存或覆盖原 `.blend`。

## 视觉与性能边界

GLB 保留基础色、粗糙度、金属度和发光。Blender 的程序化噪声与凹凸纹理未烘焙，体积雾和原灯光由网页环境光、方向光、静态阴影及距离雾替代。网页实时画面不与 Cycles 渲染逐像素一致。

像素比限制为 1.5，阴影仅对静态场景更新一次，静止画面按需绘制，后台标签暂停绘制。仍需支持 WebGL 2 的现代浏览器，首次解码和线框显示对低性能设备有额外开销。

History 路由部署需要将 `/works/*` 回退到 `index.html`，资源缺失不应回退成 HTML。
