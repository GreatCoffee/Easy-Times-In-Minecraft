#!/usr/bin/env node
/**
 * ETIM 姿态离线预览器（clientpose B-1 / D-3 迭代工装）
 *
 * 用与 Minecraft 1.12.2 相同的渲染链算法离线出图：
 *   ① 第一人称格挡（ItemRenderer.renderItemInFirstPerson BLOCK 分支 + 本批 delta）
 *   ② 第三人称格挡（ModelBiped 手臂链 + LayerHeldItem + 本批 delta + ICT）
 * 出图后与 Minecraft 1.6.4 参照截图对比，收敛了再上机实测。
 *
 * 渲染链一手依据（rfg 对照树 git-workspace/etim/build/rfg/minecraft-src）：
 *   - ModelRenderer.render/postRender :123-283（枢轴 translate → rotZ → rotY → rotX）
 *   - ModelBiped 手臂枢轴 :58/:62（-5,2,0）/（5,2,0）；BLOCK 角度 :200-203
 *   - LayerHeldItem.renderHeldItem :47-66
 *   - ItemCameraTransforms.applyTransformSide :76-97（translate → quat → scale；translation /16）
 *   - RenderItem.renderItem :136-161（translate(-0.5,-0.5,-0.5) 后画 [0,1] 模型）
 *   - ItemRenderer.renderItemInFirstPerson :386-442（BLOCK 分支只调 transformSideFirstPerson）
 *
 * 用法：
 *   node pose-preview.js            # 格挡两张（third-block.png / first-block.png）
 *   node pose-preview.js --idle     # 对照：普通持剑两张（用来校准管线本身）
 *   node pose-preview.js --out DIR  # 指定输出目录
 */

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ------------------------------------------------------------------ config
const POSE = {
    // 第一人称 delta（对应 etim.cfg blockPoseTX/TY/Rot1/Rot2/Rot3；默认 = R196 字面值）
    first: { tx: -0.5, ty: 0.2, rot1: 30, rot2: -80, rot3: 60 },
    // 第三人称手持物 delta（R196 RenderPlayer:254-257，固定值）
    third: { tx: 0.05, ty: 0.0, tz: -0.1, rot1: -50, rot2: -10, rot3: -60 },
    // 第三人称手臂 BLOCK（1.12 ModelBiped:200-203 + 本批 Y 清零 = R196 ModelBiped:129）
    arm: { rotX: -0.9424779, rotY: 0.0 },
};

// 1.12 原版 item/handheld 显示变换（sword_copper.json 的 parent 链）
const ICT = {
    thirdperson_righthand: { rot: [0, -90, 55], tr: [0, 4.0, 0.5], scale: [0.85, 0.85, 0.85] },
    firstperson_righthand: { rot: [0, -90, 25], tr: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
};

const TEX = 'D:/OpenCodeWorkspace/Easy Times In Minecraft/git-workspace/etim/src/main/resources/assets/etim/textures/items/sword_copper.png';

// ------------------------------------------------------------------ mat4
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
    const o = new Array(16).fill(0);
    for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
            for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
}
const T = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const S = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
const RAD = Math.PI / 180;
function RX(d) { const r = d * RAD, c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function RY(d) { const r = d * RAD, c = Math.cos(r), s = Math.sin(r); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
function RZ(d) { const r = d * RAD, c = Math.cos(r), s = Math.sin(r); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
/** ItemCameraTransforms.makeQuaternion（:102-115）逐式照抄 */
function quatMat(rx, ry, rz) {
    const f = rx * RAD, f1 = ry * RAD, f2 = rz * RAD;
    const f3 = Math.sin(0.5 * f), f4 = Math.cos(0.5 * f);
    const f5 = Math.sin(0.5 * f1), f6 = Math.cos(0.5 * f1);
    const f7 = Math.sin(0.5 * f2), f8 = Math.cos(0.5 * f2);
    const x = f3 * f6 * f8 + f4 * f5 * f7;
    const y = f4 * f5 * f8 - f3 * f6 * f7;
    const z = f3 * f5 * f8 + f4 * f6 * f7;
    const w = f4 * f6 * f8 - f3 * f5 * f7;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    return [
        1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
        0, 0, 0, 1,
    ];
}
const xf = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
function perspective(fovyDeg, aspect, near, far) {
    const f = 1 / Math.tan((fovyDeg * Math.PI) / 360);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
}
function lookAt(eye, at, up) {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const f = norm(sub(at, eye));
    const s = norm(cross(f, up));
    const u = cross(s, f);
    return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1];
}

// ------------------------------------------------------------------ png io
function readPng(file) {
    const buf = fs.readFileSync(file);
    let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
    const idat = [];
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const data = buf.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            w = data.readUInt32BE(0); h = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9];
            if (data[12] !== 0) throw new Error('interlaced png unsupported');
        } else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
        off += 12 + len;
    }
    if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth);
    const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : -1;
    if (bpp < 0) throw new Error('colorType ' + colorType);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = w * bpp;
    const out = Buffer.alloc(w * h * 4);
    let prev = Buffer.alloc(stride);
    for (let y = 0; y < h; y++) {
        const ft = raw[y * (stride + 1)];
        const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? line[i - bpp] : 0;
            const b = prev[i];
            const c = i >= bpp ? prev[i - bpp] : 0;
            let v = line[i];
            if (ft === 1) v += a;
            else if (ft === 2) v += b;
            else if (ft === 3) v += (a + b) >> 1;
            else if (ft === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            line[i] = v & 255;
        }
        for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            if (bpp === 4) { out[o] = line[x * 4]; out[o + 1] = line[x * 4 + 1]; out[o + 2] = line[x * 4 + 2]; out[o + 3] = line[x * 4 + 3]; }
            else {
                out[o] = line[x * bpp];
                out[o + 1] = line[x * bpp + (bpp > 1 ? 1 : 0)];
                out[o + 2] = line[x * bpp + (bpp > 2 ? 2 : 0)];
                out[o + 3] = 255;
            }
        }
        prev = line;
    }
    return { w, h, data: out };
}

let CRC_TABLE = null;
function crc32(buf) {
    if (!CRC_TABLE) {
        CRC_TABLE = new Int32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            CRC_TABLE[n] = c;
        }
    }
    let crc = -1;
    for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 255] ^ (crc >>> 8);
    return crc ^ -1;
}
function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc32(body));
    return Buffer.concat([len, body, crcBuf]);
}
function writePng(file, w, h, rgba) {
    const raw = Buffer.alloc(h * (w * 4 + 1));
    for (let y = 0; y < h; y++) {
        raw[y * (w * 4 + 1)] = 0;
        rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    fs.writeFileSync(file, Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        pngChunk('IEND', Buffer.alloc(0)),
    ]));
}

// ------------------------------------------------------------------ raster
class Canvas {
    constructor(w, h) {
        this.w = w; this.h = h;
        this.color = Buffer.alloc(w * h * 4);
        this.depth = new Float32Array(w * h).fill(Infinity);
        for (let i = 0; i < w * h; i++) {
            this.color[i * 4] = 28; this.color[i * 4 + 1] = 30; this.color[i * 4 + 2] = 36; this.color[i * 4 + 3] = 255;
        }
    }
    tri(p0, p1, p2, uv0, uv1, uv2, tex, rgb) {
        const w = this.w, h = this.h;
        const minX = Math.max(0, Math.floor(Math.min(p0[0], p1[0], p2[0])));
        const maxX = Math.min(w - 1, Math.ceil(Math.max(p0[0], p1[0], p2[0])));
        const minY = Math.max(0, Math.floor(Math.min(p0[1], p1[1], p2[1])));
        const maxY = Math.min(h - 1, Math.ceil(Math.max(p0[1], p1[1], p2[1])));
        const den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1]);
        if (Math.abs(den) < 1e-9) return;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x + 0.5, py = y + 0.5;
                const a = ((p1[1] - p2[1]) * (px - p2[0]) + (p2[0] - p1[0]) * (py - p2[1])) / den;
                const b = ((p2[1] - p0[1]) * (px - p2[0]) + (p0[0] - p2[0]) * (py - p2[1])) / den;
                const c = 1 - a - b;
                if (a < -1e-6 || b < -1e-6 || c < -1e-6) continue;
                const z = a * p0[2] + b * p1[2] + c * p2[2];
                const idx = y * w + x;
                if (z >= this.depth[idx]) continue;
                let r, g, bl;
                if (uv0) {
                    const u = a * uv0[0] + b * uv1[0] + c * uv2[0];
                    const v = a * uv0[1] + b * uv1[1] + c * uv2[1];
                    const tx = Math.min(tex.w - 1, Math.max(0, Math.floor(u * tex.w)));
                    const ty = Math.min(tex.h - 1, Math.max(0, Math.floor(v * tex.h)));
                    const o = (ty * tex.w + tx) * 4;
                    if (tex.data[o + 3] < 8) continue;
                    r = tex.data[o]; g = tex.data[o + 1]; bl = tex.data[o + 2];
                } else { r = rgb[0]; g = rgb[1]; bl = rgb[2]; }
                this.depth[idx] = z;
                this.color[idx * 4] = r; this.color[idx * 4 + 1] = g; this.color[idx * 4 + 2] = bl;
            }
        }
    }
}

// ------------------------------------------------------------------ scene
const W = 1280, H = 960;

function cameraMatrix(mode) {
    const proj = perspective(70, W / H, 0.05, 100);
    // 第三人称：站在角色面前（实测该模型正面朝 +z，相机放 +z 侧）
    const view = mode === 'first' ? I4() : lookAt([0, 1.35, 3.4], [0, 1.15, 0], [0, 1, 0]);
    return mul(proj, view);
}
function project(vp, v) {
    const x = vp[0] * v[0] + vp[4] * v[1] + vp[8] * v[2] + vp[12];
    const y = vp[1] * v[0] + vp[5] * v[1] + vp[9] * v[2] + vp[13];
    const z = vp[2] * v[0] + vp[6] * v[1] + vp[10] * v[2] + vp[14];
    const w = vp[3] * v[0] + vp[7] * v[1] + vp[11] * v[2] + vp[15];
    if (w <= 0.001) return null;
    return [((x / w) * 0.5 + 0.5) * W, (1 - ((y / w) * 0.5 + 0.5)) * H, z / w];
}
function quad(canvas, vp, corners, uvs, texImg, rgb, shade) {
    const pr = corners.map((c) => project(vp, c));
    if (pr.some((p) => !p)) return;
    const col = rgb ? [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade] : null;
    canvas.tri(pr[0], pr[1], pr[2], uvs && uvs[0], uvs && uvs[1], uvs && uvs[2], texImg, col);
    canvas.tri(pr[0], pr[2], pr[3], uvs && uvs[0], uvs && uvs[2], uvs && uvs[3], texImg, col);
}

function drawBox(canvas, vp, M, box, rgb) {
    const px = 1 / 16;
    const [x0, y0, z0, x1, y1, z1] = box;
    const P = (x, y, z) => xf(M, [x * px, y * px, z * px]);
    quad(canvas, vp, [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]].map((v) => P(...v)), null, null, rgb, 1.0);
    quad(canvas, vp, [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]].map((v) => P(...v)), null, null, rgb, 0.7);
    quad(canvas, vp, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]].map((v) => P(...v)), null, null, rgb, 0.85);
    quad(canvas, vp, [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]].map((v) => P(...v)), null, null, rgb, 0.85);
    quad(canvas, vp, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]].map((v) => P(...v)), null, null, rgb, 0.95);
    quad(canvas, vp, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]].map((v) => P(...v)), null, null, rgb, 0.55);
}

/** 剑（模型空间 [0,1]²，y 向上，z=0.5 平面），M 为 renderItem 空间 */
let TEXIMG = null;
function drawSword(canvas, vp, M) {
    const z0 = 0.5, half = 0.031;
    const front = [[0, 0, z0 + half], [0, 1, z0 + half], [1, 1, z0 + half], [1, 0, z0 + half]].map((v) => xf(M, v));
    const uv = [[0, 1], [0, 0], [1, 0], [1, 1]];
    quad(canvas, vp, front, uv, TEXIMG, null, 1.0);
    const back = [[1, 0, z0 - half], [1, 1, z0 - half], [0, 1, z0 - half], [0, 0, z0 - half]].map((v) => xf(M, v));
    quad(canvas, vp, back, uv, TEXIMG, null, 0.8);
}

function applyICT(M, ict) {
    let m = mul(M, T(ict.tr[0] / 16, ict.tr[1] / 16, ict.tr[2] / 16));
    m = mul(m, quatMat(ict.rot[0], ict.rot[1], ict.rot[2]));
    m = mul(m, S(ict.scale[0], ict.scale[1], ict.scale[2]));
    return m;
}

function renderThird(outFile) {
    const canvas = new Canvas(W, H);
    const vp = cameraMatrix('third');
    const px = 1 / 16;
    // 引擎真实模型空间：y 轴朝下（头 −8..0 / 身 0..12 / 腿 12..24），
    // RendererLivingEntity 用 scale(−1,−1,1) 翻转；再上抬 1.5 格使脚落在地面。
    const root = mul(T(0, 1.5, 0), S(-1, -1, 1));

    const hair = [70, 45, 25], skin = [200, 155, 110], shirt = [0, 170, 170], pants = [55, 55, 155];
    drawBox(canvas, vp, root, [-4, -8, -4, 4, 0, 4], hair);               // 头（−8..0）
    drawBox(canvas, vp, root, [-4, 0, -2, 4, 12, 2], shirt);              // 躯干（0..12）
    // 双腿：枢轴 (±1.9, 12, 0)，box (−2,0,−2)..(2,12,2)
    drawBox(canvas, vp, mul(root, T(-1.9 * px, 12 * px, 0)), [-2, 0, -2, 2, 12, 2], pants);
    drawBox(canvas, vp, mul(root, T(1.9 * px, 12 * px, 0)), [-2, 0, -2, 2, 12, 2], pants);
    // 左臂：枢轴 (5,2,0)，box (−1,−2,−2)..(3,10,2)
    drawBox(canvas, vp, mul(root, T(5 * px, 2 * px, 0)), [-1, -2, -2, 3, 10, 2], skin);

    // 右臂 BLOCK：枢轴 (−5,2,0)，rotX(−0.9424779 rad)
    let armM = mul(root, T(-5 * px, 2 * px, 0));
    armM = mul(armM, RX((POSE.arm.rotX * 180) / Math.PI));
    drawBox(canvas, vp, armM, [-3, -2, -2, 1, 10, 2], skin);

    // LayerHeldItem（方块单位）：translate(1/16,0.125,−0.625) → RX(−90) → RY(180) → 四算子 → ICT → 居中
    let itemM = mul(armM, T(0.0625, 0.125, -0.625));
    itemM = mul(itemM, RX(LAYER[variant].rx));
    itemM = mul(itemM, RY(LAYER[variant].ry));
    const t3 = POSE.third;
    if (variant === 0) {
        itemM = mul(itemM, T(t3.tx, t3.ty, t3.tz));
        itemM = mul(itemM, RY(t3.rot1));
        itemM = mul(itemM, RX(t3.rot2));
        itemM = mul(itemM, RZ(t3.rot3));
    }
    itemM = applyICT(itemM, ICT.thirdperson_righthand);
    itemM = mul(itemM, T(-0.5, -0.5, -0.5));
    drawSword(canvas, vp, itemM);

    writePng(outFile, W, H, canvas.color);
    console.log('wrote', outFile);
}

function renderFirst(outFile) {
    const canvas = new Canvas(W, H);
    const vp = cameraMatrix('first');
    let M = T(0.56, -0.52, -0.72); // transformSideFirstPerson，equip 满
    const p1 = POSE.first;
    M = mul(M, T(p1.tx, p1.ty, 0.0));
    M = mul(M, RY(p1.rot1));
    M = mul(M, RX(p1.rot2));
    M = mul(M, RY(p1.rot3));
    M = applyICT(M, ICT.firstperson_righthand);
    M = mul(M, T(-0.5, -0.5, -0.5));
    drawSword(canvas, vp, M);
    writePng(outFile, W, H, canvas.color);
    console.log('wrote', outFile);
}

// ------------------------------------------------------------------ main
const idle = process.argv.includes('--idle');
const variant = process.argv.includes('--variant') ? parseInt(process.argv[process.argv.indexOf('--variant') + 1], 10) : 0;
if (idle) { POSE.first = { tx: 0, ty: 0, rot1: 0, rot2: 0, rot3: 0 }; POSE.arm.rotX = 0.0; }
// 标定变体：LayerHeldItem 两枚旋转的符号（-90/180 的组合）
const LAYER = {
    0: { rx: -90, ry: 180 },
    1: { rx: 90, ry: 180 },
    2: { rx: -90, ry: 0 },
    3: { rx: 90, ry: 0 },
};
const outDir = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : 'D:/OpenCodeWorkspace/Easy Times In Minecraft/git-workspace/etim/build-logs/pose';

fs.mkdirSync(outDir, { recursive: true });
TEXIMG = readPng(TEX);
renderThird(path.join(outDir, idle ? `third-idle-v${variant}.png` : 'third-block.png'));
renderFirst(path.join(outDir, idle ? `first-idle-v${variant}.png` : 'first-block.png'));
