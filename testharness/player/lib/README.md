# player/lib/harness.js — 判窗工装底座（B-70T）

每批判窗脚本只写「判据通道 + 判臂」。起停服、props/cfg 快照还原、PIN 钉值、
日志切片、`[done]` 输出与退出码策略都在 `harness.js`，不要再逐份手抄。

## 用法

```js
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const h = H.create({
  run: RUN,
  world: 'w-b70-' + RUN + '-v1',      // 也接受 (run) => name
  bot: 'ETIM_F7',
  cfg: ['combat:blockDebugLog', 'blocks:sparkR196'], // section:key，窗口内强制 true，stop 时还原
  props: { 'allow-flight': 'true' },
  stage: {
    gamemode: 0, difficulty: 2, time: 6000, weather: 'clear',
    tp: ['12.5', '130', '10.5'],
    fill: ['fill 0 129 0 24 129 24 minecraft:stone'],
  },
});
const { cmd, mark, slice, waitRow } = h;

async function main() {
  h.stampPin();                       // 打 [PIN] 行，失败则 finish 判 pass=false
  await h.boot('b70-' + RUN + '-b1'); // 起服 + waitFor Done( ，端口最多重试 3 次
  await h.join();                     // 进 bot、op、gamerule、tp、fill
  const from = mark();
  await cmd('setblock 0 129 0 minecraft:stone', 200);
  const rows = await waitRow(/\[XxxLog\] (\S+)/, from, 6000);
  h.finish({ w1: rows.length > 0 });  // 打 [done] 并按 pass/stops 定 exit code
}
h.guard(main);                        // 异常 → stop() → exit 1
```

## 约定

- 判据通道仍由服务端写 `[XxxLog] key=value … [server]`；`waitRow` / `slice` 只读日志，不改判据语义。
- `cmd()` 自动把 `name[moisture=n]` / `name[age=n]` 转成 1.12 的 `name <meta>`。
- `stampPin()` 比对 `f7-wb-lib.js:35` 的 PIN（release 大小 + SHA-256）与 MK 计数，钉值仍只改那一处。
- `stage.rules` 覆盖默认 gamerules（默认见 `harness.js` 的 `DEFAULT_RULES`）。
- `cfg` 里的键写成 `section:key`（不写前缀默认 `blocks`）。键不在磁盘时直接写入该 section 的 `B:key=true`，起服后回读校验；回读不是 true 就硬失败，不再「按默认放行」。
- `waitRow()` 只接单个 RegExp，返回自上而下第一个命中行（多条件请自行在调用侧组合）。
- 退出口径：`pin && 全部 res 项为 true && 无非零退出` 才 exit 0，否则 exit 2；异常路径 exit 1。

## 巡检

```bash
node testharness/tools/check-harness.js         # 汇总：onHarness / ownBoot / ownCmd / offenders
node testharness/tools/check-harness.js --list  # 逐份列出仍未收编的脚本
```

存量 448 份脚本按批次逐步迁移；新批次一律从本底座起写，不再复制脚手架。
