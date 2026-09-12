# MAMORI 日语海报与产品介绍长图

制作日期：2026-09-11。产品原型：v0.2.2。

## 交付文件

- `ikeda-ja.png`：大阪府池田市地震，3840 × 2160。
- `wakayama-ja.png`：和歌山火山情境，3840 × 2160；明确标为虚构演练。
- `iwate-ja.png`：岩手县沿岸地震与海啸，3840 × 2160。
- `product-long-ja.png`：日语产品介绍长图，2400 × 9292。
- `product-long-zh.png`：中文产品介绍长图，2400 × 9174。
- 对应 HTML 是可继续编辑的排版源文件。产品 HTML 具有页内导航和手机适配。
- `screens/` 保留原始 Ink 渲染截图，包括中、日文避难地点候选及导航交接页。
- `runtime/` 保留独立演练渲染器与演练数据，不改动产品源代码。

## 画面来源与演练边界

本套材料没有使用图片生成功能，也没有重新绘制或翻译覆盖产品截图。页面来自原项目 `agent/pages/` 下的五个 `.ink` 文件，经 Ink 预览运行时实际绘制后截图。

日语灾害海报与日语长图使用原生 `ja` 界面；中文长图使用原生 `zh` 界面。海报保留四个状态：日常首页、灾害首页、灾害通报、行动指南。灾害首页截图通过演练适配器暂停自动跳转，以展示中间状态。

所在地、天气、通报及避难地点由隔离的演练适配器提供。避难地页通过实际点击“GPS 查询附近”和“查看导航方式”获取；GPS 响应为测试坐标，没有采集真实 GPS。地点 A/B、距离、海拔均为虚构展示数据，不能用于避难。

导航画面为当前产品实际实现的“目的地信息与导航启动方式”页，不是地图路线或导航已经启动的证明。自动启动导航尚未接通。英语唤醒指令保留产品原始显示。

和歌山情境为用户指定的虚构演练；和歌山县及周边无活火山，本图不代表当地真实风险。当前原型生产灾害服务未接通；眼镜真机、后台通知可靠性仍需验证；不是秒级紧急地震速報。

## 检查记录

- `qa-export.json`：五张成品均完成浏览器导出，图片全部加载，无文字横向溢出。
- `qa-mobile.json`：中、日文长页在 390 px 宽度下无横向溢出，“避难地”入口跳转正确。
- `qa-native-source.json`：10 个独立运行时中的五个 Ink 页面均与原项目 SHA-256 一致。
- 成品已逐张视觉检查，包括日语避难地与导航区段。

## 预览与重新制作

在本目录启动静态服务器，然后打开 `index.html`：

```sh
python3 -m http.server 8792
```

项目根目录的制作脚本依次为：

1. `scripts/build-ja-ink-runtime.py`
2. `scripts/build-shelter-demo-runtime.py`
3. 本目录 `capture-screens.mjs`、`capture-shelters.mjs`（使用 ego-browser；需替换为当前任务空间 ID，并按照脚本所需的初始页面状态执行）。
4. `scripts/build-ja-materials.py`
5. `scripts/build-product-long.py`

演练灾害首页使用原产品的新鲜度判断；重新拍摄前先重建 runtime，以刷新训练时间。产品截图保留原始 480 × 352 逻辑画布比例，最终海报仅在排版中等比缩放。

## 官方背景资料

- [气象厅：海啸信息](https://www.jma.go.jp/jma/kishou/know/jishin/joho/tsunamiinfo.html)
- [国土地理院：指定紧急避难场所](https://www.gsi.go.jp/bousaichiri/hinanbasho)
- [和歌山地方气象台资料](https://www.data.jma.go.jp/wakayama/bousai/paper/wakayama_jishin/2406.pdf)
