# TV · JetStream 宣传片（4K60 · Remotion）

[wobuhui666/TV](https://github.com/wobuhui666/TV) 的宣传片工程：**64 秒 · 3840×2160 · 60 fps**，Remotion 渲染，GitHub Actions 全流程出片。

成片见 [Releases](../../releases)（最新：[v2.1-apple](../../releases/tag/v2.1-apple)，Apple 风格）（`TV-JetStream-Promo-4K60.mp4` / `TV-JetStream-Promo-1080p60.mp4` / `cover-4k.jpg`）。

## 流程

| 步骤 | Workflow | 说明 |
| --- | --- | --- |
| 1. 实录界面 | `capture.yml` | 下载 wobuhui666/TV **最新 Release APK**，在 Actions 的 Android 14 模拟器（1920×1080，zh-CN）里安装；`capture/demo_server.py` 提供演示片库（CatVod CMS 接口 + M3U 直播 + Range 视频服务）；`capture/driver.py` 通过 adb + uiautomator 自动操作首页、详情、追更日历、片库、搜索、全屏播放、OSD 抽屉、直播、主题与浅色模式，并 `screenrecord` 录屏 + 截图。录制时动画时长放大 4 倍、按键间隔同步放大。 |
| 2. 处理素材 | `assets.yml` | 录屏加速 4 倍还原真实节奏，`minterpolate` 运动补偿补帧到 60 fps；挑选截图、按 UI 树坐标裁出海报；打包为 `assets-pack` 预发布。 |
| 3. 渲染 | `render.yml` | Remotion `--scale=2` 渲染 4K60，分片并行，再无损拼接并混入配乐，发布 Release。 |

本地预览：`npm ci && npx remotion studio src/index.ts`（需先把 `assets-pack.tar` 解压到仓库根目录）。

## 结构

- `src/Root.tsx` 时间线（120 BPM，镜头切换卡在配乐重拍：8s / 16s / 28s / 44s / 50s / 58s）
- `src/scenes.tsx` 七个段落：片头 → 主视觉 → 浏览 → 影院播放 → 直播 → 片库墙 → 片尾
- `src/lib.tsx` 动效、Logo（由 `ic_launcher_foreground.xml` 矢量重建）、颗粒与氛围层
- `scripts/make_music.py` 原创合成配乐（numpy 加法合成，64 秒，48 kHz）
- `capture/` 模拟器采集；`scripts/process_clips.py` 补帧；`scripts/assemble_assets.py` 素材打包

## 素材与版权

- 应用界面：wobuhui666/TV 最新 Release 实录。首页推荐、海报与演职员信息为应用内 TMDB 数据的实时显示，版权归各自权利人。
- 演示播放内容：Sintel、Tears of Steel、Big Buck Bunny、Spring、Cosmos Laundromat、Elephants Dream、Sprite Fright、Caminandes —— © Blender Foundation / Blender Studio，[CC BY](https://creativecommons.org/licenses/by/4.0/)。
- 字体：MiSans（随应用分发）。配乐：原创合成。
- 应用不提供影视资源。
