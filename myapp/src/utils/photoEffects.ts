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
const MAX_PROCESS_WIDTH = 1280;

type SegmentKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const DIGITAL_GLYPH_WIDTH = 7;
const DIGITAL_GLYPH_HEIGHT = 11;

const buildDigitalGlyph = (segments: SegmentKey[]): string[] => {
  const grid = Array.from({ length: DIGITAL_GLYPH_HEIGHT }, () => Array.from({ length: DIGITAL_GLYPH_WIDTH }, () => '0'));

  const fillRect = (left: number, top: number, right: number, bottom: number) => {
    const clampedLeft = Math.max(0, left);
    const clampedTop = Math.max(0, top);
    const clampedRight = Math.min(DIGITAL_GLYPH_WIDTH - 1, right);
    const clampedBottom = Math.min(DIGITAL_GLYPH_HEIGHT - 1, bottom);

    for (let y = clampedTop; y <= clampedBottom; y += 1) {
      for (let x = clampedLeft; x <= clampedRight; x += 1) {
        grid[y][x] = '1';
      }
    }
  };

  for (const segment of segments) {
    if (segment === 'a') {
      fillRect(2, 0, 4, 0);
    } else if (segment === 'b') {
      fillRect(6, 2, 6, 4);
    } else if (segment === 'c') {
      fillRect(6, 7, 6, 9);
    } else if (segment === 'd') {
      fillRect(2, 10, 4, 10);
    } else if (segment === 'e') {
      fillRect(0, 7, 0, 9);
    } else if (segment === 'f') {
      fillRect(0, 2, 0, 4);
    } else if (segment === 'g') {
      fillRect(2, 5, 4, 5);
    }
  }

  return grid.map((row) => row.join(''));
};

const DIGIT_GLYPHS: Record<string, string[]> = {
  '0': buildDigitalGlyph(['a', 'b', 'c', 'd', 'e', 'f']),
  '1': buildDigitalGlyph(['b', 'c']),
  '2': buildDigitalGlyph(['a', 'b', 'd', 'e', 'g']),
  '3': buildDigitalGlyph(['a', 'b', 'c', 'd', 'g']),
  '4': buildDigitalGlyph(['b', 'c', 'f', 'g']),
  '5': buildDigitalGlyph(['a', 'c', 'd', 'f', 'g']),
  '6': buildDigitalGlyph(['a', 'c', 'd', 'e', 'f', 'g']),
  '7': buildDigitalGlyph(['a', 'b', 'c']),
  '8': buildDigitalGlyph(['a', 'b', 'c', 'd', 'e', 'f', 'g']),
  '9': buildDigitalGlyph(['a', 'b', 'c', 'd', 'f', 'g']),
  "'": [
    '0000000',
    '0001100',
    '0001100',
    '0001000',
    '0000000',
    '0000000',
    '0000000',
    '0000000',
    '0000000',
    '0000000',
    '0000000',
  ],
  '/': [
    '0000000',
    '0000001',
    '0000011',
    '0000110',
    '0001100',
    '0011000',
    '0110000',
    '1100000',
    '1000000',
    '0000000',
    '0000000',
  ],
};

const DATE_STAMP_CORE_COLOR = { red: 255, green: 176, blue: 76 };
const DATE_STAMP_GLOW_INNER = { red: 255, green: 140, blue: 56 };
const DATE_STAMP_GLOW_OUTER = { red: 150, green: 68, blue: 18 };
const DATE_STAMP_SHADOW = { red: 8, green: 4, blue: 2 };

const formatDateStamp = (date: Date): string => {
  const shortYear = `${date.getFullYear() % 100}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `''${shortYear}${month}${day}`;
};

const drawPixel = (
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: { red: number; green: number; blue: number },
) => {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const index = (y * width + x) * 4;
  data[index] = color.red;
  data[index + 1] = color.green;
  data[index + 2] = color.blue;
  data[index + 3] = 255;
};

const blendPixel = (
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  color: { red: number; green: number; blue: number },
  alpha: number,
) => {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  if (clampedAlpha === 0) {
    return;
  }

  const index = (y * width + x) * 4;
  const baseRed = data[index];
  const baseGreen = data[index + 1];
  const baseBlue = data[index + 2];

  data[index] = clamp(baseRed * (1 - clampedAlpha) + color.red * clampedAlpha);
  data[index + 1] = clamp(baseGreen * (1 - clampedAlpha) + color.green * clampedAlpha);
  data[index + 2] = clamp(baseBlue * (1 - clampedAlpha) + color.blue * clampedAlpha);
  data[index + 3] = 255;
};

const drawDateStamp = (
  data: Uint8Array,
  width: number,
  height: number,
  date: Date,
) => {
  const stampText = formatDateStamp(date);
  const scale = Math.max(2, Math.min(7, Math.floor(width / 260)));
  const glyphWidth = DIGITAL_GLYPH_WIDTH;
  const glyphHeight = DIGITAL_GLYPH_HEIGHT;
  const baseCharSpacing = Math.max(2, Math.floor(scale * 1.2));
  const apostrophePairSpacing = 0;
  const apostropheToYearSpacing = Math.max(1, Math.floor(scale * 0.2));
  const dateGroupSpacing = baseCharSpacing + Math.max(3, Math.floor(scale * 1.9));
  const margin = Math.max(14, scale * 7);
  const chars = Array.from(stampText);
  const getInterCharSpacing = (currentChar: string, nextChar: string | undefined, index: number): number => {
    if (!nextChar) {
      return 0;
    }

    if (index === 0 && currentChar === '\'' && nextChar === '\'') {
      return apostrophePairSpacing;
    }

    if (index === 1 && currentChar === '\'' && /\d/.test(nextChar)) {
      return apostropheToYearSpacing;
    }

    if (index === 3 || index === 5) {
      return dateGroupSpacing;
    }

    return baseCharSpacing;
  };
  const textWidth = chars.reduce((total, char, index) => {
    const nextChar = chars[index + 1];
    return total + glyphWidth * scale + getInterCharSpacing(char, nextChar, index);
  }, 0);
  const textHeight = glyphHeight * scale;
  const startX = Math.max(0, width - margin - textWidth);
  const startY = Math.max(0, height - margin - textHeight);
  const glowRadius = Math.max(1, Math.floor(scale * 0.75));
  const outlineRadius = Math.max(1, Math.floor(scale * 0.45));

  let cursorX = startX;

  for (let charIndex = 0; charIndex < chars.length; charIndex += 1) {
    const char = chars[charIndex];
    const nextChar = chars[charIndex + 1];
    const glyph = DIGIT_GLYPHS[char];
    if (!glyph) {
      cursorX += glyphWidth * scale + getInterCharSpacing(char, nextChar, charIndex);
      continue;
    }

    const charBaseY = startY;

    for (let gy = 0; gy < glyph.length; gy += 1) {
      const row = glyph[gy];
      for (let gx = 0; gx < row.length; gx += 1) {
        if (row[gx] !== '1') {
          continue;
        }

        const pixelX = cursorX + gx * scale;
        const pixelY = charBaseY + gy * scale;

        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const currentX = pixelX + sx;
            const currentY = pixelY + sy;

            for (let dy = -glowRadius; dy <= glowRadius; dy += 1) {
              for (let dx = -glowRadius; dx <= glowRadius; dx += 1) {
                const distance = Math.abs(dx) + Math.abs(dy);
                if (distance > glowRadius + 1) {
                  continue;
                }

                if (distance <= Math.max(1, Math.floor(glowRadius / 2))) {
                  blendPixel(data, width, height, currentX + dx, currentY + dy, DATE_STAMP_GLOW_INNER, 0.16);
                } else {
                  blendPixel(data, width, height, currentX + dx, currentY + dy, DATE_STAMP_GLOW_OUTER, 0.08);
                }
              }
            }

            for (let oy = -outlineRadius; oy <= outlineRadius; oy += 1) {
              for (let ox = -outlineRadius; ox <= outlineRadius; ox += 1) {
                if (ox === 0 && oy === 0) {
                  continue;
                }
                blendPixel(data, width, height, currentX + ox, currentY + oy, DATE_STAMP_SHADOW, 0.64);
              }
            }

            blendPixel(data, width, height, currentX + 2, currentY + 2, DATE_STAMP_SHADOW, 0.42);

            blendPixel(data, width, height, currentX, currentY, DATE_STAMP_CORE_COLOR, 0.92);
          }
        }
      }
    }

    cursorX += glyphWidth * scale + getInterCharSpacing(char, nextChar, charIndex);
  }
};

const yieldToMainThread = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const normalizeBase64Payload = (rawBase64: string): string => {
  const trimmed = rawBase64.trim();
  const commaIndex = trimmed.indexOf(',');
  const payload = commaIndex >= 0 ? trimmed.slice(commaIndex + 1) : trimmed;
  const standardBase64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = standardBase64.length % 4;

  if (padLength === 0) {
    return standardBase64;
  }

  return standardBase64.padEnd(standardBase64.length + (4 - padLength), '=');
};

const applyMonoFilter = async (data: Uint8Array, shouldCancel?: () => boolean): Promise<boolean> => {
  const contrast = 1.22;

  let processedPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (shouldCancel?.()) {
      return false;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const contrastedGray = (luminance - 128) * contrast + 128;
    const gray = clamp(contrastedGray);

    data[index] = gray;
    data[index + 1] = gray;
    data[index + 2] = gray;

    processedPixels += 1;
    if (processedPixels % YIELD_EVERY_PIXELS === 0) {
      await yieldToMainThread();
    }
  }

  return true;
};

const applyVividFilter = async (data: Uint8Array, shouldCancel?: () => boolean): Promise<boolean> => {
  const saturation = 1.35;
  const contrast = 1.1;
  const brightness = 1.03;
  let processedPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (shouldCancel?.()) {
      return false;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

    const saturatedR = luminance + (red - luminance) * saturation;
    const saturatedG = luminance + (green - luminance) * saturation;
    const saturatedB = luminance + (blue - luminance) * saturation;

    const contrastedR = ((saturatedR - 128) * contrast + 128) * brightness;
    const contrastedG = ((saturatedG - 128) * contrast + 128) * brightness;
    const contrastedB = ((saturatedB - 128) * contrast + 128) * brightness;

    data[index] = clamp(contrastedR);
    data[index + 1] = clamp(contrastedG);
    data[index + 2] = clamp(contrastedB);

    processedPixels += 1;
    if (processedPixels % YIELD_EVERY_PIXELS === 0) {
      await yieldToMainThread();
    }
  }

  return true;
};

const applyRetroFilter = async (data: Uint8Array, shouldCancel?: () => boolean): Promise<boolean> => {
  const saturation = 0.72;
  const contrast = 0.92;
  const brightness = 1.04;
  let processedPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (shouldCancel?.()) {
      return false;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    const sepiaR = red * 0.393 + green * 0.769 + blue * 0.189;
    const sepiaG = red * 0.349 + green * 0.686 + blue * 0.168;
    const sepiaB = red * 0.272 + green * 0.534 + blue * 0.131;

    const luminance = 0.299 * sepiaR + 0.587 * sepiaG + 0.114 * sepiaB;

    const saturatedR = luminance + (sepiaR - luminance) * saturation;
    const saturatedG = luminance + (sepiaG - luminance) * saturation;
    const saturatedB = luminance + (sepiaB - luminance) * saturation;

    const contrastedR = ((saturatedR - 128) * contrast + 128) * brightness;
    const contrastedG = ((saturatedG - 128) * contrast + 128) * brightness;
    const contrastedB = ((saturatedB - 128) * contrast + 128) * brightness;

    data[index] = clamp(contrastedR + 8);
    data[index + 1] = clamp(contrastedG + 4);
    data[index + 2] = clamp(contrastedB - 6);

    processedPixels += 1;
    if (processedPixels % YIELD_EVERY_PIXELS === 0) {
      await yieldToMainThread();
    }
  }

  return true;
};

const applyDisposableFilter = async (
  data: Uint8Array,
  width: number,
  height: number,
  shouldCancel?: () => boolean,
): Promise<boolean> => {
  const saturation = 0.84;
  const contrast = 0.95;
  const brightness = 1.02;
  const vignetteStrength = 0.52;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  let processedPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (shouldCancel?.()) {
      return false;
    }

    const pixelIndex = index / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

    let nextRed = luminance + (red - luminance) * saturation;
    let nextGreen = luminance + (green - luminance) * saturation;
    let nextBlue = luminance + (blue - luminance) * saturation;

    const horizontalShift = ((x - centerX) / Math.max(1, width)) * 26;
    nextRed += horizontalShift + 10;
    nextGreen += 2;
    nextBlue -= horizontalShift + 10;

    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const vignette = 1 - vignetteStrength * ((distance / Math.max(1, maxDistance)) ** 2);

    nextRed = ((nextRed - 128) * contrast + 128) * brightness * vignette;
    nextGreen = ((nextGreen - 128) * contrast + 128) * brightness * vignette;
    nextBlue = ((nextBlue - 128) * contrast + 128) * brightness * vignette;

    const grainCellX = Math.floor(x / 4);
    const grainCellY = Math.floor(y / 4);
    const grainSeed = (grainCellX * 13 + grainCellY * 17) % 29;
    const grain = (grainSeed - 14) * 3.4;

    data[index] = clamp(nextRed + grain);
    data[index + 1] = clamp(nextGreen + grain * 0.85);
    data[index + 2] = clamp(nextBlue + grain * 0.7);

    processedPixels += 1;
    if (processedPixels % YIELD_EVERY_PIXELS === 0) {
      await yieldToMainThread();
    }
  }

  return true;
};

const applySoftFilter = async (
  data: Uint8Array,
  width: number,
  height: number,
  shouldCancel?: () => boolean,
): Promise<boolean> => {
  const saturation = 0.78;
  const contrast = 0.8;
  const brightness = 1.13;
  let processedPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (shouldCancel?.()) {
      return false;
    }

    const pixelIndex = index / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;

    const saturatedR = luminance + (red - luminance) * saturation;
    const saturatedG = luminance + (green - luminance) * saturation;
    const saturatedB = luminance + (blue - luminance) * saturation;

    const warmLift = 12;
    let nextRed = ((saturatedR - 128) * contrast + 128) * brightness + warmLift;
    let nextGreen = ((saturatedG - 128) * contrast + 128) * brightness + 3;
    let nextBlue = ((saturatedB - 128) * contrast + 128) * brightness - 2;

    const hash = (x * 19 + y * 23) % 4;
    if (hash <= 2) {
      nextRed = (nextRed * 3 + nextGreen) / 4;
      nextGreen = (nextGreen * 3 + nextBlue) / 4;
      nextBlue = (nextBlue * 3 + nextGreen) / 4;
    }

    data[index] = clamp(nextRed);
    data[index + 1] = clamp(nextGreen);
    data[index + 2] = clamp(nextBlue);

    processedPixels += 1;
    if (processedPixels % YIELD_EVERY_PIXELS === 0) {
      await yieldToMainThread();
    }
  }

  return true;
};

export const applyFilmEffectToPhoto = async (
  uri: string,
  effectType: RewardFilmType | null,
  options?: {
    shouldCancel?: () => boolean;
  },
): Promise<string> => {
  const shouldApplyFilter = effectType === 'mono' || effectType === 'vivid' || effectType === 'retro' || effectType === 'disposable' || effectType === 'soft';

  try {
    const normalizeActions: ImageManipulator.Action[] = [{ resize: { width: MAX_PROCESS_WIDTH } }];

    if (options?.shouldCancel?.()) {
      return uri;
    }

    const normalized = await ImageManipulator.manipulateAsync(
      uri,
      normalizeActions,
      {
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.95,
        base64: true,
      },
    );

    if (options?.shouldCancel?.()) {
      return uri;
    }

    if (!normalized.base64) {
      return uri;
    }

    const normalizedBase64 = normalizeBase64Payload(normalized.base64);
    let decoded = jpeg.decode(toByteArray(normalizedBase64), { useTArray: true });
    if (!decoded?.data || !decoded.width || !decoded.height) {
      decoded = jpeg.decode(toByteArray(normalized.base64), { useTArray: true });
    }
    if (!decoded?.data || !decoded.width || !decoded.height) {
      return uri;
    }

    if (options?.shouldCancel?.()) {
      return uri;
    }
    const pixelData = decoded.data;

    let processed = true;
    if (shouldApplyFilter) {
      if (effectType === 'mono') {
        processed = await applyMonoFilter(pixelData, options?.shouldCancel);
      } else if (effectType === 'vivid') {
        processed = await applyVividFilter(pixelData, options?.shouldCancel);
      } else if (effectType === 'soft') {
        processed = await applySoftFilter(pixelData, decoded.width, decoded.height, options?.shouldCancel);
      } else if (effectType === 'disposable') {
        processed = await applyDisposableFilter(pixelData, decoded.width, decoded.height, options?.shouldCancel);
      } else {
        processed = await applyRetroFilter(pixelData, options?.shouldCancel);
      }
    }

    if (!processed || options?.shouldCancel?.()) {
      return uri;
    }

    drawDateStamp(pixelData, decoded.width, decoded.height, new Date());

    const encoded = jpeg.encode(
      {
        data: pixelData,
        width: decoded.width,
        height: decoded.height,
      },
      96,
    );

    if (options?.shouldCancel?.()) {
      return uri;
    }

    const outputBase64 = fromByteArray(encoded.data);
    const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

    if (!basePath) {
      return uri;
    }

    const targetDir = `${basePath}developed/`;
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });

    const outputLabel = shouldApplyFilter ? effectType : 'dated';
    const outputUri = `${targetDir}${Date.now()}_${outputLabel}.jpg`;
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return outputUri;
  } catch (error) {
    console.log('failed to apply film effect', error);
    return uri;
  }
};
