/**
 * server-console.js — 主 mod 工作区验证窗服务端控制面（会话七工装）
 *
 * 为什么不用 RCON：stock 1.12.2 `RConThreadClient` 在 GradleStart dev 链下每轮
 * 连接即 NPE（testharness/server/README.md 硬规则，2026-10-25），一条连接撑不住
 * auth+exec。故本窗唯一优雅通道是**控制台 stdin**（与 ETIM-Extra 项目同款模块）。
 *
 * 本模块把 `gradlew runServer` 拉起来，保留 stdin 管道，供窗口脚本按时间轴逐条
 * 下发服务器命令；同时把 gradle + 服务器输出全量 tee 到
 * `testharness/build-logs/<tag>.out`，并按行喂给监听者做判定解析。
 *
 * JDK 纪律（agents.md 条 0）：不设 JAVA_HOME、不现搜 JDK —— 由 gradle.properties
 * 的 `org.gradle.java.home` 指向的 JDK 25 决定。
 *
 * 用法：
 *   const { startServer } = require('./server-console');
 *   const srv = await startServer({ root, tag: 'w23-noextra-shield' });
 *   srv.send('say phase=A');     // 一行 = 一条服务器命令
 *   await srv.stop();            // 下发 stop 并等 Saving worlds / 进程退出
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function startServer(opts) {
  const root = opts.root;
  const tag = opts.tag || 'server';
  const outDir = path.join(root, 'testharness', 'build-logs');
  fs.mkdirSync(outDir, { recursive: true });
  const logPath = path.join(outDir, tag + '.out');
  const out = fs.createWriteStream(logPath, { flags: 'w' });

  const child = spawn('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat runServer --console=plain'], {
    cwd: root,
    env: Object.assign({}, process.env),
    windowsHide: true,
  });

  const listeners = new Set();
  const all = [];
  let tail = '';
  const feed = (chunk) => {
    out.write(chunk);
    tail += chunk.toString('utf8');
    let i;
    while ((i = tail.indexOf('\n')) >= 0) {
      const line = tail.slice(0, i).replace(/\r$/, '');
      tail = tail.slice(i + 1);
      all.push(line);
      for (const fn of listeners) {
        try { fn(line); } catch (e) { /* listener errors never kill the window */ }
      }
    }
  };
  child.stdout.on('data', feed);
  child.stderr.on('data', feed);

  let exited = false;
  let exitCode = null;
  const exitPromise = new Promise((resolve) => {
    child.on('close', (code) => { exited = true; exitCode = code; resolve(code); });
  });

  const waitFor = (re, timeoutMs, fromIndex = 0) => new Promise((resolve) => {
    for (let i = fromIndex; i < all.length; i++) {
      if (re.test(all[i])) return resolve(all[i]);
    }
    let timer = null;
    const fn = (line) => {
      if (re.test(line)) { clearTimeout(timer); listeners.delete(fn); resolve(line); }
    };
    timer = setTimeout(() => { listeners.delete(fn); resolve(null); }, timeoutMs);
    listeners.add(fn);
  });

  const send = (line) => {
    if (exited) throw new Error('server already exited (code ' + exitCode + ')');
    out.write('### [harness] > ' + line + '\n');
    child.stdin.write(line + '\n');
    return line;
  };

  const ready = waitFor(/Done \(/, 300000);

  async function stop(timeoutMs = 120000) {
    if (!exited) {
      try { send('stop'); } catch (e) { /* already gone */ }
      await Promise.race([
        waitFor(/Saving worlds/, 30000),
        exitPromise,
      ]);
    }
    await Promise.race([exitPromise, new Promise((r) => setTimeout(r, timeoutMs))]);
    out.end();
    return { exitCode, exited };
  }

  return { child, logPath, send, waitFor, stop, ready, all, exitPromise, get exited() { return exited; } };
}

module.exports = { startServer };
