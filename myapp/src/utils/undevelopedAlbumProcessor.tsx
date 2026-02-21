import { applyUndevelopedPreviewEffect, getUndevelopedPreviewUriByPhotoId } from './photoEffects';
import {
  countUnprocessedUndevelopedAlbumPhotos,
  getPhotosByStatus,
  initDatabase,
  PhotoWithFilmName,
  replaceUndevelopedAlbumPhotos,
  UndevelopedAlbumReplacementRow,
} from './sqlite';

export interface RebuildUndevelopedAlbumResult {
  totalUndeveloped: number;
  processedCount: number;
  replacedCount: number;
  failedCount: number;
}

export const hasUnprocessedUndevelopedPhotos = async (): Promise<boolean> => {
  await initDatabase();
  const count = await countUnprocessedUndevelopedAlbumPhotos();
  return count > 0;
};

export const getUndevelopedPhotosFromDirectory = async (): Promise<PhotoWithFilmName[]> => {
  await initDatabase();
  const undevelopedPhotos = await getPhotosByStatus('undeveloped');

  const resolved = await Promise.all(
    undevelopedPhotos.map(async (photo) => {
      const previewUri = await getUndevelopedPreviewUriByPhotoId(photo.id);
      return {
        ...photo,
        uri: previewUri ?? photo.uri,
      };
    }),
  );

  return resolved;
};

export const rebuildUndevelopedAlbumWithProcessing = async (): Promise<RebuildUndevelopedAlbumResult> => {
  await initDatabase();

  const undevelopedPhotos = await getPhotosByStatus('undeveloped');
  const replacementRows: UndevelopedAlbumReplacementRow[] = [];

  let processedCount = 0;
  let failedCount = 0;

  for (const photo of undevelopedPhotos) {
    let nextUri = photo.uri;
    let wasProcessed = false;

    try {
      const processedUri = await applyUndevelopedPreviewEffect(photo.uri, {
        outputFileName: `${photo.id}_undeveloped.jpg`,
      });
      if (processedUri !== photo.uri) {
        processedCount += 1;
        wasProcessed = true;
      }
      nextUri = processedUri;
    } catch {
      failedCount += 1;
    }

    replacementRows.push({
      photoId: photo.id,
      uri: nextUri,
      filmId: photo.film_id,
      status: 'undeveloped',
      createdAt: photo.created_at,
      isProcessed: wasProcessed,
    });
  }

  await replaceUndevelopedAlbumPhotos(replacementRows);

  return {
    totalUndeveloped: undevelopedPhotos.length,
    processedCount,
    replacedCount: replacementRows.length,
    failedCount,
  };
};
