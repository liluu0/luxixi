# 人体图谱后台预取与缓存

人体模型包含 15 个 gzip 分块，约 32.96 MB（解压约 59.55 MB），另有 atlas.json 索引。模型精度、结构和渲染功能不变。

## 首页后台准备

首页 load 完成后等待至少 1.5 秒，在浏览器空闲时开始下载索引，再依次下载模型分块；每块之间留出间隔，后台并发为 1，Fetch priority 为 low（浏览器可能不支持此提示）。首页不解压模型、不创建 Three.js 场景。

标签页隐藏、放映室图片加载时推迟后续请求。浏览器声明省流量或 2G/3G 时跳过自动预取；不支持网络信息 API 时采用默认策略。带宽仍共享，已启动的单个下载不因滚动而中断，不能保证零竞争。

离开首页取消后续预取；正在下载的一块继续完成，人体页面复用同一请求。进入人体页面后保留原有三路并发下载，其余已缓存分块直接读取。首次直接打开作品且没有缓存时仍须下载完整数据；预取并不减少总数据量。

## 持久缓存

通过浏览器 Cache Storage 保存完整响应，缓存名为 `luxixi-anatomy-<版本>`。索引和每块模型的 URL 均包含内容 SHA-256 派生版本。跨页面、刷新及再次访问可复用；更新模型后使用新版本并清理此功能自己的旧缓存。

缓存存储不可用或容量不足时回退为普通 HTTP 加载，不阻止展示。缓存可能被浏览器清理，因此不是离线可用承诺。响应长度检查拦截不完整数据，失败请求不写缓存，后续可重试。请求取消只取消当前等待者，不破坏共享下载。

修改 `public/assets/anatomy/atlas.json` 或任意模型分块后，必须执行：

```powershell
python game-tools/anatomy/cache-manifest.py
```

生成 `src/components/anatomy/cacheManifest.json` 并与模型文件一同部署。版本化应用缓存无需修改 Cloudflare 控制台或设置未版本化文件为 immutable。

## 验证

```powershell
node --test game-tools/anatomy/model-cache.test.mjs
.\node_modules\.bin\vite.cmd build
```

测试覆盖下载合并、取消隔离、跨模块实例持久缓存命中、存储不可用降级和错误响应重试。
