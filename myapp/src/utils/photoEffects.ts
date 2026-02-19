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
  if (effectType !== 'mono' && effectType !== 'vivid' && effectType !== 'retro') {
    return uri;
  }

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
    if (effectType === 'mono') {
      processed = await applyMonoFilter(pixelData, options?.shouldCancel);
    } else if (effectType === 'vivid') {
      processed = await applyVividFilter(pixelData, options?.shouldCancel);
    } else {
      processed = await applyRetroFilter(pixelData, options?.shouldCancel);
    }

    if (!processed || options?.shouldCancel?.()) {
      return uri;
    }

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

    const outputUri = `${targetDir}${Date.now()}_${effectType}.jpg`;
    await FileSystem.writeAsStringAsync(outputUri, outputBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return outputUri;
  } catch (error) {
    console.log('failed to apply film effect', error);
    return uri;
  }
};
