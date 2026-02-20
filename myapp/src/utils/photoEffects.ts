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

const buildDigitalGlyph = (segments: SegmentKey[]): string[] => {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => '0'));

  const fillHorizontal = (rowIndex: number) => {
    for (let columnIndex = 1; columnIndex <= 3; columnIndex += 1) {
      grid[rowIndex][columnIndex] = '1';
    }
  };

  const fillVertical = (columnIndex: number, fromRow: number, toRow: number) => {
    for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
      grid[rowIndex][columnIndex] = '1';
    }
  };

  for (const segment of segments) {
    if (segment === 'a') {
      fillHorizontal(0);
    } else if (segment === 'b') {
      fillVertical(4, 1, 2);
    } else if (segment === 'c') {
      fillVertical(4, 4, 5);
    } else if (segment === 'd') {
      fillHorizontal(6);
    } else if (segment === 'e') {
      fillVertical(0, 4, 5);
    } else if (segment === 'f') {
      fillVertical(0, 1, 2);
    } else if (segment === 'g') {
      fillHorizontal(3);
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
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
};

const DATE_STAMP_CORE_COLOR = { red: 255, green: 176, blue: 76 };
const DATE_STAMP_GLOW_INNER = { red: 255, green: 140, blue: 56 };
const DATE_STAMP_GLOW_OUTER = { red: 150, green: 68, blue: 18 };
const DATE_STAMP_SHADOW = { red: 8, green: 4, blue: 2 };

const formatDateStamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}/${month}/${day}`;
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
  const glyphWidth = 5;
  const glyphHeight = 7;
  const charSpacing = Math.max(2, Math.floor(scale * 1.35));
  const margin = Math.max(14, scale * 7);
  const textWidth = stampText.length * glyphWidth * scale + (stampText.length - 1) * charSpacing;
  const textHeight = glyphHeight * scale;
  const startX = Math.max(0, width - margin - textWidth);
  const startY = Math.max(0, height - margin - textHeight);
  const chars = Array.from(stampText);
  const projectionSlope = Math.max(1, Math.floor(scale * 0.45));
  const glowRadius = Math.max(2, Math.floor(scale * 1.05));
  const outlineRadius = Math.max(1, Math.floor(scale * 0.45));

  let cursorX = startX;

  for (let charIndex = 0; charIndex < chars.length; charIndex += 1) {
    const char = chars[charIndex];
    const glyph = DIGIT_GLYPHS[char];
    if (!glyph) {
      cursorX += glyphWidth * scale + charSpacing;
      continue;
    }

    const offsetY = Math.floor(((chars.length - 1 - charIndex) * projectionSlope) / chars.length);
    const wobbleY = ((charIndex + 1) * 37) % 3 === 0 ? 1 : 0;
    const charBaseY = startY + offsetY + wobbleY;

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
                  blendPixel(data, width, height, currentX + dx, currentY + dy, DATE_STAMP_GLOW_INNER, 0.24);
                } else {
                  blendPixel(data, width, height, currentX + dx, currentY + dy, DATE_STAMP_GLOW_OUTER, 0.12);
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

            const densityDrop = (gx + gy + sx + sy + charIndex * 3) % 31 === 0;
            if (!densityDrop) {
              blendPixel(data, width, height, currentX, currentY, DATE_STAMP_CORE_COLOR, 0.92);
            }
          }
        }
      }
    }

    cursorX += glyphWidth * scale + charSpacing;
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

export const applyFilmEffectToPhoto = async (
  uri: string,
  effectType: RewardFilmType | null,
  options?: {
    shouldCancel?: () => boolean;
  },
): Promise<string> => {
  const shouldApplyFilter = effectType === 'mono' || effectType === 'vivid' || effectType === 'retro';

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
