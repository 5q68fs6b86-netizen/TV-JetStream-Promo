# TV · JetStream 宣传片（Apple 风格 · 4K60 · Remotion）

[wobuhui666/TV](https://github.com/wobuhui666/TV) 的宣传片工程：**64 秒 · 3840×2160 · 60 fps**，Remotion 渲染，GitHub Actions 全流程出片。

成片见 [Releases](../../releases/latest)：`TV-JetStream-Promo-4K60.mp4`（母版）/ `TV-JetStream-Promo-1080p60.mp4` / `cover-4k.jpg`。

## 剪辑

Apple 发布会式的视觉语言：纯黑舞台、Inter Display + MiSans 大字号、每个镜头只讲一件事，渐变色只用于关键词。

| 时间 | 段落 |
| --- | --- |
| 0–8 s | 黑底标语「看电视。」「可以更好看。」→ 悬浮超薄电视亮屏，播放实机首页 |
| 8–10 s | 「JetStream」渐变字标 |
| 10–28 s | 一个连续镜头：全屏拉远到悬浮电视，依次是主视觉、首页海报墙、详情页、追更日历；屏幕光晕随画面变色 |
| 28–36 s | 宽银幕电影镜头 → 实机全屏播放与控制栏 |
| 36–40 s | 四个大数字功能卡片 |
| 40–48 s | 直播、主题色左右分屏 |
| 48–54 s | 跟着鼓点硬切的界面蒙太奇 |
| 54–64 s | 音乐留白半秒 →「这，就是 JetStream。」→ 图标与片尾 |

配乐为原创合成（`scripts/make_music.py`，钢琴 + 轻快鼓点，120 BPM，镜头切点与重拍对齐）。

## 采集：不补帧的 60 fps 实录

模拟器的 `screenrecord` 在软件渲染下只有约 5–16 fps，用插帧补到 60 fps 会在文字和海报切换处产生重影。本工程改为**从源头放慢**：

1. `capture.yml` 下载 wobuhui666/TV **最新 Release APK**，在 Actions 的 Android 14 模拟器（1920×1080，zh-CN）中安装；`capture/demo_server.py` 提供演示片库（CatVod CMS 接口 + M3U 直播 + Range 视频服务）。
2. `capture/driver.py`（`film5` 阶段）把系统动画时长放大 **12 倍**，所有按键间隔同步放大 12 倍，分段 `screenrecord`（每段 < 180 s）。首页主视觉在获得焦点时暂停轮播（其 7 s 计时器不受动画倍率影响）；直播频道用静帧视频，播放器在暂停状态下操作，避免背景视频被快进。
3. `scripts/process_clips.py` 只做 `setpts=PTS/12` 加速和 `fps=60` 取帧/重复帧，**不做任何运动插值**——成片中每一帧都是设备真实渲染的画面。处理后运动段的有效帧率约 55–200 fps。
4. `assets.yml` 打包素材（`assets-pack`），`render.yml` 用 Remotion `--scale=2` 分片并行渲染 4K60，再拼接混音并发布 Release。

本地预览：`npm ci && npx remotion studio src/index.ts`（先把 `assets-pack.tar` 解压到仓库根目录）。

## 结构

- `src/Root.tsx` 时间线；`src/scenes.tsx` 各段落；`src/lib.tsx` 字体、动效、悬浮电视与图标（由 `ic_launcher_foreground.xml` 矢量重建为圆角方形）
- `capture/` 模拟器采集；`scripts/process_clips.py` 素材处理；`scripts/assemble_assets.py` 素材打包

## 素材与版权

- 应用界面：wobuhui666/TV 最新 Release 实录。首页推荐、海报与演职员信息为应用内 TMDB 数据的实时显示，版权归各自权利人。
- 演示播放内容：Sintel、Tears of Steel、Big Buck Bunny、Spring、Cosmos Laundromat、Elephants Dream、Sprite Fright、Caminandes —— © Blender Foundation / Blender Studio，[CC BY](https://creativecommons.org/licenses/by/4.0/)。
- 字体：MiSans（随应用分发）、Inter Display（SIL OFL 1.1）。配乐：原创合成。
- 应用不提供影视资源。
