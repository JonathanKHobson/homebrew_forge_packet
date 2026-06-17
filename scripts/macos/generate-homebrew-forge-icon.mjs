import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from '../../packages/forge/node_modules/pngjs/lib/png.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const outputPath = process.argv[2] ? resolve(process.argv[2]) : resolve(repoRoot, 'assets/app-icons/homebrew-forge-icon-1024.png');
const sourcePath = resolve(repoRoot, 'assets/app-icons/homebrew-forge-icon-source.png');
const size = 1024;
const scale = 2;
const canvasSize = size * scale;
const png = new PNG({ width: canvasSize, height: canvasSize });

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= canvasSize || y >= canvasSize) return;
  const index = (Math.floor(y) * canvasSize + Math.floor(x)) * 4;
  const alpha = clamp(color[3] ?? 255);
  const inv = 255 - alpha;
  png.data[index] = clamp((color[0] * alpha + png.data[index] * inv) / 255);
  png.data[index + 1] = clamp((color[1] * alpha + png.data[index + 1] * inv) / 255);
  png.data[index + 2] = clamp((color[2] * alpha + png.data[index + 2] * inv) / 255);
  png.data[index + 3] = clamp(alpha + (png.data[index + 3] * inv) / 255);
}

function colorAt(image, x, y) {
  const index = (y * image.width + x) * 4;
  return [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3] ?? 255];
}

function colorDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function backgroundColor(image) {
  const samples = [
    colorAt(image, 0, 0),
    colorAt(image, image.width - 1, 0),
    colorAt(image, 0, image.height - 1),
    colorAt(image, image.width - 1, image.height - 1)
  ];
  return samples.reduce((acc, sample) => [acc[0] + sample[0] / samples.length, acc[1] + sample[1] / samples.length, acc[2] + sample[2] / samples.length, 255], [0, 0, 0, 255]);
}

function matteAlpha(color, background) {
  const distance = colorDistance(color, background);
  const brightNeutral = color[0] > 236 && color[1] > 236 && color[2] > 236 && Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2]) < 18;
  if (distance < 12 || brightNeutral) return 0;
  if (distance < 62) return (distance - 12) / 50;
  return 1;
}

function findContentBounds(image, background) {
  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const color = colorAt(image, x, y);
      if (matteAlpha(color, background) > 0.18) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX >= maxX || minY >= maxY) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }
  const padding = 0;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(image.width - 1, maxX + padding);
  maxY = Math.min(image.height - 1, maxY + padding);
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const boxSize = Math.max(boxWidth, boxHeight);
  minX = Math.max(0, Math.round(minX - (boxSize - boxWidth) / 2));
  minY = Math.max(0, Math.round(minY - (boxSize - boxHeight) / 2));
  return {
    x: minX,
    y: minY,
    width: Math.min(boxSize, image.width - minX),
    height: Math.min(boxSize, image.height - minY)
  };
}

function roundedMaskAlpha(x, y, width, height, radius) {
  const cornerX = x < radius ? radius : x > width - radius ? width - radius : null;
  const cornerY = y < radius ? radius : y > height - radius ? height - radius : null;
  if (cornerX === null || cornerY === null) return 1;
  const distance = Math.hypot(x - cornerX, y - cornerY);
  if (distance <= radius - 1.5) return 1;
  if (distance >= radius + 1.5) return 0;
  return (radius + 1.5 - distance) / 3;
}

function sampleBilinear(image, x, y) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(image.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(image.height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const c00 = colorAt(image, x0, y0);
  const c10 = colorAt(image, x1, y0);
  const c01 = colorAt(image, x0, y1);
  const c11 = colorAt(image, x1, y1);
  return [0, 1, 2, 3].map((channel) => {
    const top = c00[channel] * (1 - tx) + c10[channel] * tx;
    const bottom = c01[channel] * (1 - tx) + c11[channel] * tx;
    return top * (1 - ty) + bottom * ty;
  });
}

function isBackgroundLike(image, index, background) {
  const color = [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3] ?? 255];
  const brightNeutral = color[0] > 228 && color[1] > 228 && color[2] > 228 && Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2]) < 28;
  return colorDistance(color, background) < 76 || brightNeutral;
}

function removeConnectedMatte(image, background) {
  const visited = new Uint8Array(image.width * image.height);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const offset = y * image.width + x;
    if (visited[offset]) return;
    const index = offset * 4;
    if (!isBackgroundLike(image, index, background)) return;
    visited[offset] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < image.width; x++) {
    push(x, 0);
    push(x, image.height - 1);
  }
  for (let y = 0; y < image.height; y++) {
    push(0, y);
    push(image.width - 1, y);
  }

  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = y * image.width + x;
      if (visited[offset]) {
        image.data[offset * 4 + 3] = 0;
      }
    }
  }
}

function prepareSourceIcon() {
  const source = PNG.sync.read(readFileSync(sourcePath));
  const background = backgroundColor(source);
  const bounds = findContentBounds(source, background);
  const out = new PNG({ width: size, height: size });
  const radius = 228;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sourceX = bounds.x + ((x + 0.5) / size) * bounds.width;
      const sourceY = bounds.y + ((y + 0.5) / size) * bounds.height;
      const color = sampleBilinear(source, sourceX, sourceY);
      const alpha = roundedMaskAlpha(x + 0.5, y + 0.5, size, size, radius);
      const index = (y * size + x) * 4;
      out.data[index] = clamp(color[0]);
      out.data[index + 1] = clamp(color[1]);
      out.data[index + 2] = clamp(color[2]);
      out.data[index + 3] = clamp((color[3] ?? 255) * alpha);
    }
  }
  removeConnectedMatte(out, background);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, PNG.sync.write(out));
  console.log(outputPath);
}

if (existsSync(sourcePath)) {
  prepareSourceIcon();
  process.exit(0);
}

function fillRoundedRect(x, y, w, h, r, color) {
  const sx = Math.floor(x * scale);
  const sy = Math.floor(y * scale);
  const sw = Math.floor(w * scale);
  const sh = Math.floor(h * scale);
  const sr = r * scale;
  for (let py = sy; py < sy + sh; py++) {
    for (let px = sx; px < sx + sw; px++) {
      const dx = Math.max(sx + sr - px, 0, px - (sx + sw - sr));
      const dy = Math.max(sy + sr - py, 0, py - (sy + sh - sr));
      if (dx * dx + dy * dy <= sr * sr) {
        setPixel(px, py, color);
      }
    }
  }
}

function fillCircle(cx, cy, radius, color) {
  const scx = cx * scale;
  const scy = cy * scale;
  const sr = radius * scale;
  const minX = Math.floor(scx - sr);
  const maxX = Math.ceil(scx + sr);
  const minY = Math.floor(scy - sr);
  const maxY = Math.ceil(scy + sr);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - scx, y - scy);
      if (d <= sr) {
        const edge = clamp((sr - d) / (2 * scale), 0, 1);
        setPixel(x, y, [color[0], color[1], color[2], (color[3] ?? 255) * edge]);
      }
    }
  }
}

function fillPolygon(points, color) {
  const scaled = points.map(([x, y]) => [x * scale, y * scale]);
  const minY = Math.floor(Math.min(...scaled.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...scaled.map((p) => p[1])));
  for (let y = minY; y <= maxY; y++) {
    const nodes = [];
    for (let i = 0, j = scaled.length - 1; i < scaled.length; j = i++) {
      const [xi, yi] = scaled[i];
      const [xj, yj] = scaled[j];
      if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
        nodes.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i < nodes.length; i += 2) {
      const start = Math.floor(nodes[i]);
      const end = Math.ceil(nodes[i + 1]);
      for (let x = start; x <= end; x++) {
        setPixel(x, y, color);
      }
    }
  }
}

function strokeLine(x1, y1, x2, y2, width, color) {
  const sx1 = x1 * scale;
  const sy1 = y1 * scale;
  const sx2 = x2 * scale;
  const sy2 = y2 * scale;
  const steps = Math.ceil(Math.hypot(sx2 - sx1, sy2 - sy1));
  const radius = (width * scale) / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(steps, 1);
    fillCircle((sx1 + (sx2 - sx1) * t) / scale, (sy1 + (sy2 - sy1) * t) / scale, radius / scale, color);
  }
}

function strokeArc(cx, cy, radius, start, end, width, color) {
  const steps = 220;
  for (let i = 0; i <= steps; i++) {
    const t = start + ((end - start) * i) / steps;
    fillCircle(cx + Math.cos(t) * radius, cy + Math.sin(t) * radius, width / 2, color);
  }
}

function drawBackground() {
  const center = canvasSize / 2;
  const maxDistance = Math.hypot(center, center);
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const nx = x / canvasSize;
      const ny = y / canvasSize;
      const d = Math.hypot(x - center, y - center) / maxDistance;
      const warm = Math.max(0, 1 - Math.hypot(nx - 0.56, ny - 0.34) * 2.2);
      const teal = Math.max(0, 1 - Math.hypot(nx - 0.28, ny - 0.82) * 2.4);
      const vignette = 1 - d * 0.68;
      const noise = (((x * 13 + y * 17) % 29) - 14) * 0.7;
      setPixel(x, y, [
        18 * vignette + 34 * warm + 4 * teal + noise,
        23 * vignette + 22 * warm + 20 * teal + noise,
        32 * vignette + 4 * warm + 32 * teal + noise,
        255
      ]);
    }
  }
  fillRoundedRect(30, 30, 964, 964, 214, [255, 255, 255, 10]);
  fillRoundedRect(46, 46, 932, 932, 198, [5, 8, 14, 82]);
}

function drawIcon() {
  fillCircle(512, 520, 382, [241, 169, 70, 38]);
  fillCircle(512, 518, 258, [255, 204, 112, 42]);
  strokeArc(512, 532, 332, Math.PI * 0.08, Math.PI * 0.92, 10, [210, 167, 92, 160]);
  strokeArc(512, 532, 298, Math.PI * 1.12, Math.PI * 1.88, 7, [80, 198, 190, 110]);

  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 - Math.PI / 2;
    const r1 = i % 3 === 0 ? 350 : 362;
    const r2 = i % 3 === 0 ? 392 : 382;
    strokeLine(
      512 + Math.cos(angle) * r1,
      532 + Math.sin(angle) * r1,
      512 + Math.cos(angle) * r2,
      532 + Math.sin(angle) * r2,
      i % 3 === 0 ? 7 : 4,
      [225, 186, 113, i % 3 === 0 ? 128 : 76]
    );
  }

  fillPolygon(
    [
      [306, 405],
      [718, 405],
      [684, 720],
      [340, 720]
    ],
    [14, 19, 30, 230]
  );
  fillPolygon(
    [
      [348, 438],
      [676, 438],
      [648, 686],
      [374, 686]
    ],
    [26, 36, 50, 245]
  );
  fillRoundedRect(360, 442, 304, 224, 34, [33, 47, 66, 230]);
  fillRoundedRect(382, 464, 260, 180, 24, [16, 23, 35, 170]);

  fillPolygon(
    [
      [316, 650],
      [708, 650],
      [746, 724],
      [278, 724]
    ],
    [206, 152, 72, 240]
  );
  fillPolygon(
    [
      [334, 664],
      [690, 664],
      [710, 700],
      [314, 700]
    ],
    [246, 197, 103, 215]
  );
  fillRoundedRect(252, 704, 520, 86, 34, [47, 36, 27, 245]);
  fillRoundedRect(292, 724, 440, 36, 18, [235, 171, 76, 180]);

  fillPolygon(
    [
      [492, 274],
      [552, 274],
      [600, 358],
      [522, 440],
      [444, 358]
    ],
    [244, 187, 86, 220]
  );
  fillPolygon(
    [
      [512, 306],
      [562, 360],
      [512, 416],
      [462, 360]
    ],
    [255, 224, 132, 205]
  );
  fillCircle(512, 360, 76, [255, 210, 112, 70]);

  strokeLine(414, 312, 278, 196, 34, [219, 166, 81, 230]);
  strokeLine(436, 288, 330, 198, 14, [255, 219, 132, 170]);
  fillRoundedRect(250, 156, 142, 92, 28, [37, 48, 62, 245]);
  fillRoundedRect(272, 174, 98, 44, 16, [238, 184, 87, 205]);

  strokeLine(610, 322, 732, 220, 16, [91, 209, 196, 130]);
  strokeLine(626, 338, 758, 424, 10, [138, 102, 217, 110]);
  fillCircle(736, 220, 18, [99, 221, 209, 160]);
  fillCircle(760, 426, 14, [155, 120, 237, 140]);
}

function downsample() {
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const totals = [0, 0, 0, 0];
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          const source = ((y * scale + oy) * canvasSize + (x * scale + ox)) * 4;
          totals[0] += png.data[source];
          totals[1] += png.data[source + 1];
          totals[2] += png.data[source + 2];
          totals[3] += png.data[source + 3];
        }
      }
      const target = (y * size + x) * 4;
      out.data[target] = totals[0] / 4;
      out.data[target + 1] = totals[1] / 4;
      out.data[target + 2] = totals[2] / 4;
      out.data[target + 3] = totals[3] / 4;
    }
  }
  return out;
}

drawBackground();
drawIcon();

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, PNG.sync.write(downsample()));
console.log(outputPath);
