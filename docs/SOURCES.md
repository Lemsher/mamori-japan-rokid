# 官方资料与实现对应

核对日期：2026-09-11。Rokid 文档采用公开 `0.17.0 / v0.17.0` 版本；不依赖搜索摘要来猜测 API。`reference/` 是本地研究快照，交付源码压缩包不包含这些完整文档。

| 官方来源 | 在本项目中的用途 |
| --- | --- |
| [Rokid AIUI](https://js.rokid.com/) | Open Agent Format、`AGENTS.md`、`app.json`、`.ink` 四区块、页面数据绑定及生命周期 |
| [AI 开发指南](https://js.rokid.com/AIUI/guide/quickstart/ai-dev?version=0.17.0) | 官方 `aiui-dev` Skill 的原生布局、语法、能力使用说明 |
| [只读卡片与全屏目标](https://js.rokid.com/AIUI/framework/open-agent-format/target?version=0.17.0) | target 与交互能力有区别；Studio 可在 `_current` 下通过 `setInteractive` 开启交互，因此不再按 target 隐藏控件 |
| [单色视觉规范](https://js.rokid.com/AIUI/design/visual/monochrome?version=0.17.0) | 480×352、黑底单绿色、token、描边与文字层级 |
| [HTTP 网络使用](https://js.rokid.com/AIUI/guide/basic/network/usage?version=0.17.0) | HTTPS 服务与域名配置边界 |
| [LanguageModel](https://js.rokid.com/AIUI/api/ai/language-model?version=0.17.0) | availability/create/prompt/destroy；本项目进一步限制为枚举分类 |
| [语音识别](https://js.rokid.com/AIUI/api/ai/speech-recognition?version=0.17.0)、[语音播报](https://js.rokid.com/AIUI/api/ai/speech-synthesis?version=0.17.0) | 原生能力检测、用户触发；日语支持保留实机验证门槛 |
| [Navigator / 定位入口](https://js.rokid.com/AIUI/api/navigator?version=0.17.0) | `navigator.geolocation`，权限和实际能力由宿主提供 |
| [Studio 官方操作指南](https://openrokid.csdn.net/6a9a124a790f037e6e388dab.html) | 本地目录导入、真机模拟和效果预览；另现场核对公开 Studio JS 中的画布、镜腿及 ASR 模拟实现 |
| [GSI 市町村代码](https://maps.gsi.go.jp/js/muni.js)、[官方项目中的地址转换说明](https://github.com/gsi-cyberjapan/gsimaps/issues/29) | 定位转 JIS 代码，再映射 JMA 候选；服务不保证持续提供，须保留手动入口。政令市分区不能机械拼接代码 |
| [通知下发](https://js.rokid.com/AIUI/cloud/notifications?version=0.17.0) | 服务端 Bearer SK、message/account/agent、页面参数、业务成功条件 |
| [AIX CLI](https://js.rokid.com/AIUI/guide/bundle/cli?version=0.17.0) | 官方打包、查看包内容、生成 Ink HTML 预览 |
| [JMA XML PULL](https://xml.kishou.go.jp/xmlpull.html) | extra/regular/eqvol 高频及长周期订阅、缓存策略、时延和完整性边界 |
| [2026 新防灾气象信息](https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/)、[技术资料](https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/tech-info/index.html) | 2026-05-29 开始的新制名称和等级；VPWW55–61 与旧 VPWW53 兼容 |
| [JMA 地区代码表](https://www.jma.go.jp/bosai/common/const/area.json) | class20 → class15 → class10 → office 精确代码链，保存为 `data/areas.json` |
| [紧急地震速报行动指南](https://www.jma.go.jp/jma/kishou/know/jishin/eew/koudou/koudou.html) | 摇晃中先护身，不等待网络；并非提供 EEW 接入 |
| [海啸防灾](https://www.jma.go.jp/jma/kishou/know/jishin/tsunami_bosai/index.html) | 沿岸强烈/长时间摇晃后的避难、海啸反复到达、解除前不返回 |
| [土砂灾害信息](https://www.jma.go.jp/jma/kishou/know/bosai/doshakeikai.html) | 远离陡坡溪谷、早期避难、室外危险时的相对避险 |
| [喷发速報与行动](https://www.jma.go.jp/jma/kishou/know/kazan/funkasokuho/funkasokuho_toha.html) | 火山管制、保护头部、避难壕/坚固建筑与现场指示 |
| [内阁府避难信息指南](https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/index.html) | 等级 3/4/5 的行动意义与不可等待等级 5；具体场景仍需地方政府指示 |
| [灾害地图门户](https://disaportal.gsi.go.jp/) | 按所在地和灾种确认风险，不伪造路线或避难所开放状态 |
| [消防厅 119](https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html) | 急救、火警和救援信息入口 |

## 公开电文夹具

- `tests/fixtures/jma-landslide-20260911.xml`：[2026-09-11 VPWW56 山梨县电文](https://www.data.jma.go.jp/developer/xml/data/20260911022049_0_VPWW56_190000.xml)。用同一正文测试大月市等级 2、山梨市解除状态和其他市町村不匹配，不能将其当作之后日期的实时警报。
- `tests/fixtures/jma-forecast-20260911.xml`：2026-09-11 的 VPFD51 东京地区天气预报，用于固定回归测试。实际服务只通过官方当前 feed 发现和读取最新公开电文。

全国通报栏仍是发布记录。v0.2.0另行解析VXSE53市町村实测震度、VTSE41确认沿岸、VFVO50対象市町村等。只在地域、发布类型、时效和阈值匹配时触发前台提示；仍不具备完整持续有效性和解除闭环。

## v0.2.0 新增数据

- [日本邮便UTF-8邮编数据](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)：2026-08-31版本，2026-09-11下载；120,717个唯一邮编、1,892个JIS市町村组。原始来源与SHA见data/postal-source.json，scripts/build-postcodes.py可重建。不是门牌级坐标。
- [JMA海啸预报区与市町村关系](https://www.jma.go.jp/jma/kishou/know/jishin/joho/tsunami-yohoku.html)：66个沿岸名称和对应范围说明；本版要求手动确认沿岸，不推断邮编所在岸段。
- [GSI指定紧急避难场所](https://www.gsi.go.jp/bousaichiri/hinanbasho)、[图层目录](https://maps.gsi.go.jp/development/ichiran.html)：skhb01–08 GeoJSON，保留灾种适用标记、名称、地址、注意事项。指定紧急避难场所与指定避难所不同，收录不表示现在开放。
- [GSI海拔API](https://maps.gsi.go.jp/development/elevation_s.html)：海啸列表前三处尝试读取地面海拔。DEM不是建筑避难楼层的高度，不能单独证明安全。
- tests/fixtures/jma-quake-20260911.xml：[2026-09-11地震](https://www.data.jma.go.jp/developer/xml/data/20260911011033_0_VXSE53_270000.xml)，10:07JST熊本地方，宇土市震度1、M2.8，属于震后实测。
- tests/fixtures/jma-volcano-20260911.xml：[2026-09-08西之岛火山警报](https://www.data.jma.go.jp/developer/xml/data/20260908020012_0_VFVO50_010000.xml)，文件名是取得日；实际发布时间以电文为准。火口周边危险不自动改写成数字等级。
- 海啸到达时间和解除测试使用明确标记的合成XML夹具，未当作真实灾害。浏览器新预警跳转测试同样为本地演练，不发送通知。
- [Rokid官方Glasses FAQ](https://global.rokid.com/pages/faq)、[AI导航说明](https://global.rokid.com/en-jp/blogs/academy-glasses/3-3-ai-navigation)：手机连接和Hi Rokid导航交互依据，不等于存在第三方AIUI自动导航API。

实测旧bosai/warning JSON停在2026-05-28，因此原生端不使用该旧URL判断当前预警。配置服务前仅直接读当前forecast JSON；气象预警由后端读取当前XML。

## 0.2.2 地区排序与当日数字天气

- [总务省统计局：2024年10月1日都道府县人口，第2表](https://www.stat.go.jp/data/jinsui/2024np/zuhyou/05k2024-2.xlsx)：使用E列男女总人口，原表单位千人，转换为人数。`data/prefecture-population.json` 保存47条原值、日期和口径。45个都府县名称入口按所在都府县总人口排序，13个以“地方”结尾的入口末置并保留地域代码顺序。鹿儿岛入口的排序依据是全县总人口，不将其冒充“除奄美外”预报区人口；地方分区未编造人口数。
- [JMA 东京府县天气预报JSON](https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json)：示例抓取为2026-09-11 11:00发布，东京日间最高21℃、12–18时降水概率60%。此处是历史验证样本，不是用户所在地或永远有效的天气。应用按所选officeCode实时请求。
- [JMA 预报区与代表地点映射](https://www.jma.go.jp/bosai/forecast/const/forecast_area.json)：`data/forecast-stations.json` 与生成模块保存官方映射；逐一匹配所选forecastCode和对应amedas站号，不取整份预报里的第一个站点充当所有地区气温。
- [JMA 地域时系列预报说明](https://www.jma.go.jp/jma/kishou/know/kurashi/jikeiretsu.html)：预报温度属于区域内特定地点。首页标为“日间最高”，不是用户实时体感或实测温度。降水概率来自对应区域6小时时段，标明时间范围，不称全天概率。

天气按JST日期匹配；不把明日数据、过期缓存、缺失字段当作今天。11时预报中重复的00时温度不解析成当日最低温，仅使用当日09时对应的日间最高预报槽。
