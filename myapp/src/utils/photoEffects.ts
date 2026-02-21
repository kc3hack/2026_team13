import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
import { fromByteArray, toByteArray } from 'base64-js';
import { RewardFilmType } from '../types';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const YIELD_EVERY_PIXELS = 16384;

// 画質設定
const MAX_PROCESS_WIDTH = 1024;
const JPEG_QUALITY = 85;

type SegmentKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
const DIGITAL_GLYPH_WIDTH = 7;
const DIGITAL_GLYPH_HEIGHT = 11;

// --- デジタルフォント構築 ---
const buildDigitalGlyph = (segments: SegmentKey[]): string[] => {
  const grid = Array.from({ length: DIGITAL_GLYPH_HEIGHT }, () => Array.from({ length: DIGITAL_GLYPH_WIDTH }, () => '0'));
  const fillRect = (left: number, top: number, right: number, bottom: number) => {
    for (let y = Math.max(0, top); y <= Math.min(DIGITAL_GLYPH_HEIGHT - 1, bottom); y += 1) {
      for (let x = Math.max(0, left); x <= Math.min(DIGITAL_GLYPH_WIDTH - 1, right); x += 1) {
        grid[y][x] = '1';
      }
    }
  };
  segments.forEach(s => {
    if (s === 'a') fillRect(2, 0, 4, 0); else if (s === 'b') fillRect(6, 2, 6, 4); else if (s === 'c') fillRect(6, 7, 6, 9);
    else if (s === 'd') fillRect(2, 10, 4, 10); else if (s === 'e') fillRect(0, 7, 0, 9); else if (s === 'f') fillRect(0, 2, 0, 4);
    else if (s === 'g') fillRect(2, 5, 4, 5);
  });
  return grid.map((row) => row.join(''));
};

const DIGIT_GLYPHS: Record<string, string[]> = {
  '0': buildDigitalGlyph(['a', 'b', 'c', 'd', 'e', 'f']), '1': buildDigitalGlyph(['b', 'c']),
  '2': buildDigitalGlyph(['a', 'b', 'd', 'e', 'g']), '3': buildDigitalGlyph(['a', 'b', 'c', 'd', 'g']),
  '4': buildDigitalGlyph(['b', 'c', 'f', 'g']), '5': buildDigitalGlyph(['a', 'c', 'd', 'f', 'g']),
  '6': buildDigitalGlyph(['a', 'c', 'd', 'e', 'f', 'g']), '7': buildDigitalGlyph(['a', 'b', 'c']),
  '8': buildDigitalGlyph(['a', 'b', 'c', 'd', 'e', 'f', 'g']), '9': buildDigitalGlyph(['a', 'b', 'c', 'd', 'f', 'g']),
  "'": ['0000000','0001100','0001100','0001000','0000000','0000000','0000000','0000000','0000000','0000000','0000000'],
  '/': ['0000000','0000001','0000011','0000110','0001100','0011000','0110000','1100000','1000000','0000000','0000000'],
};

// --- 日付スタンプ色設定 (★再修正: 黄色味を抑え、温かみのあるオレンジ赤に変更) ---
const DATE_STAMP_CORE_COLOR = { red: 255, green: 130, blue: 70 };  // 中心: 温かみのあるオレンジ赤
const DATE_STAMP_GLOW_INNER = { red: 255, green: 70, blue: 10 };   // 内側: 鮮やかな赤オレンジ
const DATE_STAMP_GLOW_OUTER = { red: 200, green: 40, blue: 5 };    // 外側: 深い赤オレンジ
const DATE_STAMP_SHADOW = { red: 30, green: 10, blue: 5 };         // 影: 赤黒い

const formatDateStamp = (date: Date): string => {
  const shortYear = `${date.getFullYear() % 100}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `''${shortYear}${month}${day}`;
};

const blendPixel = (data: Uint8Array, width: number, height: number, x: number, y: number, color: { red: number; green: number; blue: number }, alpha: number) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  if (clampedAlpha === 0) return;
  const index = (y * width + x) * 4;
  data[index] = clamp(data[index] * (1 - clampedAlpha) + color.red * clampedAlpha);
  data[index + 1] = clamp(data[index + 1] * (1 - clampedAlpha) + color.green * clampedAlpha);
  data[index + 2] = clamp(data[index + 2] * (1 - clampedAlpha) + color.blue * clampedAlpha);
  data[index + 3] = 255;
};

// --- 日付描画処理 ---
const drawDateStamp = (data: Uint8Array, width: number, height: number, date: Date) => {
  const stampText = formatDateStamp(date);
  const scale = Math.max(1, Math.min(5, Math.floor(width / 380)));
  const margin = Math.max(16, scale * 8); 
  
  let textWidth = 0;
  const chars = Array.from(stampText);
  chars.forEach((char, i) => {
    let spacing = Math.max(1, Math.floor(scale * 1.2));
    if (i === 0 && char === '\'' && chars[i+1] === '\'') spacing = 0;
    else if (i === 1 && char === '\'' && /\d/.test(chars[i+1])) spacing = Math.max(1, Math.floor(scale * 0.2));
    else if (i === 3 || i === 5) spacing += Math.max(2, Math.floor(scale * 1.9));
    textWidth += DIGITAL_GLYPH_WIDTH * scale + (chars[i+1] ? spacing : 0);
  });

  const startX = Math.max(0, width - margin - textWidth);
  const startY = Math.max(0, height - margin - (DIGITAL_GLYPH_HEIGHT * scale));
  
  const glowRadius = Math.max(1, Math.floor(scale * 0.4)); 

  let cursorX = startX;
  chars.forEach((char, i) => {
    const glyph = DIGIT_GLYPHS[char];
    let spacing = Math.max(1, Math.floor(scale * 1.2));
    if (i === 0 && char === '\'' && chars[i+1] === '\'') spacing = 0;
    else if (i === 1 && char === '\'' && /\d/.test(chars[i+1])) spacing = Math.max(1, Math.floor(scale * 0.2));
    else if (i === 3 || i === 5) spacing += Math.max(2, Math.floor(scale * 1.9));

    if (glyph) {
      for (let gy = 0; gy < glyph.length; gy++) {
        for (let gx = 0; gx < glyph[gy].length; gx++) {
          if (glyph[gy][gx] !== '1') continue;
          const pX = cursorX + gx * scale;
          const pY = startY + gy * scale;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const cX = pX + sx; const cY = pY + sy;
              for (let dy = -glowRadius; dy <= glowRadius; dy++) {
                for (let dx = -glowRadius; dx <= glowRadius; dx++) {
                  const dist = Math.abs(dx) + Math.abs(dy);
                  if (dist > glowRadius + 1) continue;
                  const glowAlpha = dist <= glowRadius / 2 ? 0.20 : 0.08; 
                  blendPixel(data, width, height, cX + dx, cY + dy, dist <= glowRadius / 2 ? DATE_STAMP_GLOW_INNER : DATE_STAMP_GLOW_OUTER, glowAlpha);
                }
              }
              blendPixel(data, width, height, cX + 2, cY + 2, DATE_STAMP_SHADOW, 0.5);
              blendPixel(data, width, height, cX, cY, DATE_STAMP_CORE_COLOR, 1.0);
            }
          }
        }
      }
    }
    cursorX += DIGITAL_GLYPH_WIDTH * scale + (chars[i+1] ? spacing : 0);
  });
};

const yieldToMainThread = async () => new Promise<void>(resolve => setTimeout(resolve, 0));
// 既に clamp がある前提
const buildContrastLUT = (brightness: number, contrast: number): Uint8Array => {
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    // brightness を先に掛ける（元の式に合わせる）
    const scaled = x * brightness;
    // 線形コントラスト式
    const v = (scaled - 128) * contrast + 128;
    // clamp と丸め
    lut[x] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return lut;
};
const applyUndevelopedDarkContrastFilter = async (
  data: Uint8Array,
  shouldCancel?: () => boolean
): Promise<boolean> => {
  const brightness = 0.70;
  const contrast = 70;
  const lut = buildContrastLUT(brightness, contrast);
  const len = data.length;

  // キャンセルチェックと yield の頻度は環境に合わせて調整
  let processed = 0;
  for (let i = 0; i < len; i += 4) {
    if ((processed & 0x3FF) === 0 && shouldCancel?.()) return false; // 1024ごとにチェック

    data[i]     = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
    // alpha はそのまま

    processed++;
    if ((processed % (YIELD_EVERY_PIXELS / 4)) === 0) await yieldToMainThread();
  }
  return true;
};

// 全フィルター共通ノイズ
const applyGrainNoise = async (data: Uint8Array, width: number, height: number) => {
  const noiseStrength = 12;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width; const y = Math.floor((i / 4) / width);
    const grainSeed = (x * 13 + y * 17 + (x ^ y) * 7) % 64;
    const noise = (grainSeed - 32) * (noiseStrength / 32.0);
    data[i] = clamp(data[i] + noise);
    data[i + 1] = clamp(data[i + 1] + noise);
    data[i + 2] = clamp(data[i + 2] + noise);
  }
};

// 🎞️ 1. レトロ (Retro)
const applyRetroFilter = async (data: Uint8Array, width: number, height: number, shouldCancel?: () => boolean): Promise<boolean> => {
  const contrast = 1.15; const brightness = 1.10;
  const centerX = width / 2; const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  let processedPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (shouldCancel?.()) return false;
    const x = (i / 4) % width; const y = Math.floor((i / 4) / width);
    let r = data[i] * 1.15; let g = data[i + 1] * 1.08; let b = data[i + 2] * 0.85;
    r = ((r - 128) * contrast + 128) * brightness;
    g = ((g - 128) * contrast + 128) * brightness;
    b = ((b - 128) * contrast + 128) * brightness;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    let vignette = Math.cos((dist / maxDist) * (Math.PI / 2.0));
    vignette = Math.pow(Math.max(0, vignette), 1.2); 
    vignette = vignette * 0.55 + 0.45; 
    data[i] = clamp(r * vignette);
    data[i + 1] = clamp(g * vignette * 0.95);
    data[i + 2] = clamp(b * vignette * 0.8);
    if (++processedPixels % YIELD_EVERY_PIXELS === 0) await yieldToMainThread();
  }
  return true;
};

// 🎞️ 2. ビビット (Vivid)
const applyVividFilter = async (data: Uint8Array, shouldCancel?: () => boolean): Promise<boolean> => {
  const saturation = 1.6;
  const applySCurve = (val: number) => {
    const norm = val / 255;
    const curved = norm < 0.5 ? 2 * norm * norm : 1 - 2 * (1 - norm) * (1 - norm);
    return curved * 255;
  };
  let processed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (shouldCancel?.()) return false;
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let nr = lum + (r - lum) * saturation * 1.1; 
    let ng = lum + (g - lum) * saturation * 1.0;
    let nb = lum + (b - lum) * saturation * 1.15; 
    data[i] = clamp(applySCurve(nr)); data[i + 1] = clamp(applySCurve(ng)); data[i + 2] = clamp(applySCurve(nb));
    if (++processed % YIELD_EVERY_PIXELS === 0) await yieldToMainThread();
  }
  return true;
};

// 🎞️ 3. シネマ (Cinema)
const applyCinemaFilter = async (data: Uint8Array, width: number, height: number, shouldCancel?: () => boolean): Promise<boolean> => {
  const contrast = 1.25; const tealStrength = 0.45; const orangeStrength = 0.35;
  let processed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (shouldCancel?.()) return false;
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const shadowShift = (1.0 - lum) * tealStrength * 255;
    const highlightShift = lum * orangeStrength * 255;
    let nr = r + highlightShift * 0.8 - shadowShift * 0.5;
    let ng = g + highlightShift * 0.4 + shadowShift * 0.5;
    let nb = b - highlightShift * 0.6 + shadowShift;
    nr = ((nr - 128) * contrast + 128); ng = ((ng - 128) * contrast + 128); nb = ((nb - 128) * contrast + 128);
    data[i] = clamp(nr); data[i + 1] = clamp(ng); data[i + 2] = clamp(nb);
    if (++processed % YIELD_EVERY_PIXELS === 0) await yieldToMainThread();
  }
  return true;
};

// --- メインエクスポート関数 ---
export const applyFilmEffectToPhoto = async (
  uri: string,
  effectType: RewardFilmType | null,
  options?: { shouldCancel?: () => boolean; },
): Promise<string> => {
  const targetEffects: RewardFilmType[] = ['mono', 'vivid', 'retro'];
  const shouldApplyFilter = effectType && targetEffects.includes(effectType);

  try {
    if (!shouldApplyFilter || options?.shouldCancel?.()) return uri;

    const actions: ImageManipulator.Action[] = [{ resize: { width: MAX_PROCESS_WIDTH } }];
    const normalized = await ImageManipulator.manipulateAsync(uri, actions, { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95, base64: true });
    if (!normalized.base64 || options?.shouldCancel?.()) return uri;

    const base64 = normalized.base64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    let decoded = jpeg.decode(toByteArray(paddedBase64), { useTArray: true });
    if (!decoded?.data || options?.shouldCancel?.()) return uri;

    let { data, width, height } = decoded;

    // 画像が縦長の場合、反時計回りに90度回転させて横長にする
    if (width < height) {
      const rotatedData = new Uint8Array(data.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const oldIdx = (y * width + x) * 4;
          const newX = y;
          const newY = width - 1 - x;
          const newIdx = (newY * height + newX) * 4;

          rotatedData[newIdx] = data[oldIdx];         // R
          rotatedData[newIdx + 1] = data[oldIdx + 1]; // G
          rotatedData[newIdx + 2] = data[oldIdx + 2]; // B
          rotatedData[newIdx + 3] = data[oldIdx + 3]; // A
        }
      }
      data = rotatedData;
      [width, height] = [height, width];
    }

    let processed = true;
    if (effectType === 'mono') {
      processed = await applyCinemaFilter(data, width, height, options?.shouldCancel);
    } else if (effectType === 'vivid') {
      processed = await applyVividFilter(data, options?.shouldCancel);
    } else if (effectType === 'retro') {
      processed = await applyRetroFilter(data, width, height, options?.shouldCancel);
    }

    if (!processed || options?.shouldCancel?.()) return uri;

    await applyGrainNoise(data, width, height);

    drawDateStamp(data, width, height, new Date());

    const encoded = jpeg.encode({ data, width, height }, JPEG_QUALITY);
    if (options?.shouldCancel?.()) return uri;

    const outputBase64 = fromByteArray(encoded.data);
    const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!basePath) return uri;
    const targetDir = `${basePath}developed/`;
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    const outputUri = `${targetDir}${Date.now()}_${effectType}.jpg`;
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, { encoding: 'base64' });

    return outputUri;
  } catch (error) {
    console.error('film effect failed:', error);
    return uri;
  }
};

export const applyUndevelopedPreviewEffect = async (
  uri: string,
  options?: { shouldCancel?: () => boolean; outputFileName?: string; },
): Promise<string> => {
  try {
    if (options?.shouldCancel?.()) return uri;

    const actions: ImageManipulator.Action[] = [{ resize: { width: MAX_PROCESS_WIDTH } }];
    const normalized = await ImageManipulator.manipulateAsync(uri, actions, {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.95,
      base64: true,
    });
    if (!normalized.base64 || options?.shouldCancel?.()) return uri;

    const base64 = normalized.base64.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    let decoded = jpeg.decode(toByteArray(paddedBase64), { useTArray: true });
    if (!decoded?.data || options?.shouldCancel?.()) return uri;

    let { data, width, height } = decoded;

    if (width < height) {
      const rotatedData = new Uint8Array(data.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const oldIdx = (y * width + x) * 4;
          const newX = y;
          const newY = width - 1 - x;
          const newIdx = (newY * height + newX) * 4;

          rotatedData[newIdx] = data[oldIdx];
          rotatedData[newIdx + 1] = data[oldIdx + 1];
          rotatedData[newIdx + 2] = data[oldIdx + 2];
          rotatedData[newIdx + 3] = data[oldIdx + 3];
        }
      }
      data = rotatedData;
      [width, height] = [height, width];
    }

    const processed = await applyUndevelopedDarkContrastFilter(data, options?.shouldCancel);
    if (!processed || options?.shouldCancel?.()) return uri;

    const encoded = jpeg.encode({ data, width, height }, JPEG_QUALITY);
    if (options?.shouldCancel?.()) return uri;

    const outputBase64 = fromByteArray(encoded.data);
    const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!basePath) return uri;
    const targetDir = `${basePath}undeveloped_preview/`;
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    const outputFileName = options?.outputFileName ?? `${Date.now()}_undeveloped.jpg`;
    const outputUri = `${targetDir}${outputFileName}`;
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, { encoding: 'base64' });

    return outputUri;
  } catch (error) {
    console.error('undeveloped preview effect failed:', error);
    return uri;
  }
};

export const getUndevelopedPreviewUriByPhotoId = async (photoId: number): Promise<string | null> => {
  const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!basePath) {
    return null;
  }

  const candidate = `${basePath}undeveloped_preview/${photoId}_undeveloped.jpg`;
  const info = await FileSystem.getInfoAsync(candidate);
  return info.exists ? candidate : null;
};