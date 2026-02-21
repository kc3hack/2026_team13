import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { FilmInventory, FilmType, PhotoRecord, RewardFilmType } from '../types';

export type Photo = PhotoRecord;
export type PhotoStatus = 'undeveloped' | 'developing' | 'developed';
export interface PhotoWithFilmName extends PhotoRecord {
  film_name: string | null;
}

// v11+ は openDatabaseAsync/openDatabaseSync が提供される
let dbPromise: Promise<SQLiteDatabase> | null = null;
let isDatabaseInitialized = false;
let databaseInitPromise: Promise<void> | null = null;

const getDb = async (): Promise<SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('mydb.db').catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
};

const resetDatabaseState = (): void => {
  dbPromise = null;
  databaseInitPromise = null;
  isDatabaseInitialized = false;
};

const isRecoverableNativeDbError = (error: unknown): boolean => {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  return (
    message.includes('NativeDatabase.prepareAsync')
    || message.includes('NativeDatabase.execAsync')
    || message.includes('NullPointerException')
  );
};

const withDatabaseRetry = async <T>(operation: (db: SQLiteDatabase) => Promise<T>): Promise<T> => {
  await initDatabase();

  try {
    const db = await getDb();
    return await operation(db);
  } catch (error) {
    if (!isRecoverableNativeDbError(error)) {
      throw error;
    }

    console.warn('[sqlite] recoverable native DB error. retrying once...', error);
    resetDatabaseState();
    await initDatabase();
    const db = await getDb();
    return operation(db);
  }
};

const ensureFilmsSeeded = async (db: SQLiteDatabase): Promise<void> => {
  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS films (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      effect_type TEXT NOT NULL
    );`
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO films (id, name, description, effect_type) VALUES
      (11, 'Mono', 'モノクロームの静かなトーン', 'mono'),
      (12, 'Vivid', '鮮やかで力強い色彩', 'vivid'),
      (13, 'Retro', 'ノスタルジックな褪せた風合い', 'retro'),
      (14, 'Disposable', '使い捨てカメラ風のラフな質感', 'disposable'),
      (15, 'Soft', 'やわらかい光と落ち着いたトーン', 'soft');`
  );
};

const initializeDatabaseInternal = async (): Promise<void> => {
  const db = await getDb();

  await ensureFilmsSeeded(db);

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      film_id INTEGER,
      status TEXT NOT NULL DEFAULT 'undeveloped',
      developing_started_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (film_id) REFERENCES films (id)
    );`
  );

  await db.runAsync(
    `CREATE TABLE IF NOT EXISTS film_inventory (
      type TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );`
  );

  const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photos);');
  const hasFilmId = photoColumns.some((column) => column.name === 'film_id');
  const hasStatus = photoColumns.some((column) => column.name === 'status');
  const hasDevelopingStartedAt = photoColumns.some((column) => column.name === 'developing_started_at');
  const hasCreatedAt = photoColumns.some((column) => column.name === 'created_at');

  if (!hasFilmId) {
    await db.runAsync('ALTER TABLE photos ADD COLUMN film_id INTEGER;');
  }
  if (!hasStatus) {
    await db.runAsync("ALTER TABLE photos ADD COLUMN status TEXT NOT NULL DEFAULT 'undeveloped';");
  }
  if (!hasDevelopingStartedAt) {
    await db.runAsync('ALTER TABLE photos ADD COLUMN developing_started_at DATETIME;');
  }
  if (!hasCreatedAt) {
    try {
      await db.runAsync('ALTER TABLE photos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;');
    } catch {
      await db.runAsync('ALTER TABLE photos ADD COLUMN created_at DATETIME;');
    }
  }

  await db.runAsync("UPDATE photos SET created_at = datetime('now', 'localtime') WHERE created_at IS NULL OR created_at = ''; ");
  await db.runAsync('UPDATE photos SET film_id = 11 WHERE film_id IS NULL;');

  await ensureFilmsSeeded(db);

  // フィルム行が存在しなければ初期挿入
  await db.runAsync(
    `INSERT OR IGNORE INTO film_inventory (type, count) VALUES ('mono', 0), ('vivid', 0), ('retro', 0), ('disposable', 0), ('soft', 0);`
  );
};

// テーブル初期化
export const initDatabase = async (): Promise<void> => {
  if (isDatabaseInitialized) {
    return;
  }

  if (!databaseInitPromise) {
    databaseInitPromise = (async () => {
      await initializeDatabaseInternal();
      isDatabaseInitialized = true;
    })().finally(() => {
      if (!isDatabaseInitialized) {
        databaseInitPromise = null;
      }
    });
  }

  await databaseInitPromise;
};

export const initDb = initDatabase;

export const getAllFilms = async (): Promise<FilmType[]> => {
  return withDatabaseRetry((db) => db.getAllAsync<FilmType>('SELECT id, name, description, effect_type FROM films ORDER BY id ASC;'));
};

// ===== Photos =====

// レコード追加
export const addPhoto = async (
  uri: string,
  filmId: number,
  status: PhotoStatus = 'undeveloped',
): Promise<number> => {
  const result = await withDatabaseRetry((db) => db.runAsync(
    "INSERT INTO photos (uri, film_id, status, created_at, developing_started_at) VALUES (?, ?, ?, datetime('now', 'localtime'), NULL);",
    [uri, filmId, status],
  ));
  return result.lastInsertRowId;
};

export const getPhotosByStatus = async (status: PhotoStatus): Promise<PhotoWithFilmName[]> => {
  return withDatabaseRetry((db) => db.getAllAsync<PhotoWithFilmName>(
    `SELECT
      p.id,
      p.uri,
      COALESCE(p.film_id, 11) AS film_id,
      p.status,
      p.developing_started_at,
      COALESCE(p.created_at, datetime('now', 'localtime')) AS created_at,
      f.name AS film_name
    FROM photos p
    LEFT JOIN films f ON p.film_id = f.id
    WHERE p.status = ?
    ORDER BY datetime(p.created_at) DESC, p.id DESC;`,
    [status],
  ));
};

export const updatePhotoStatus = async (id: number, status: PhotoStatus): Promise<void> => {
  await withDatabaseRetry((db) => db.runAsync(
    'UPDATE photos SET status = ?, developing_started_at = CASE WHEN ? = \'developing\' THEN datetime(\'now\', \'localtime\') ELSE NULL END WHERE id = ?;',
    [status, status, id],
  ).then(() => undefined));
};

const getIdsWithDevelopingCapacity = async (ids: number[], capacity: number): Promise<number[]> => {
  if (capacity <= 0 || ids.length === 0) {
    return [];
  }

  const orderedUniqueIds = ids.filter((id, index) => ids.indexOf(id) === index);
  return orderedUniqueIds.slice(0, capacity);
};

const buildInPlaceholders = (count: number): string => new Array(count).fill('?').join(', ');

export const countDevelopingPhotos = async (): Promise<number> => {
  const row = await withDatabaseRetry((db) => db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM photos WHERE status = 'developing';",
  ));
  return row?.count ?? 0;
};

export const countPendingPhotos = async (): Promise<number> => {
  const row = await withDatabaseRetry((db) => db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM photos WHERE status IN ('undeveloped', 'developing');",
  ));
  return row?.count ?? 0;
};

export const getUndevelopedPhotosOldest = async (limit: number): Promise<PhotoWithFilmName[]> => {
  return withDatabaseRetry((db) => db.getAllAsync<PhotoWithFilmName>(
    `SELECT
      p.id,
      p.uri,
      COALESCE(p.film_id, 11) AS film_id,
      p.status,
      p.developing_started_at,
      COALESCE(p.created_at, datetime('now', 'localtime')) AS created_at,
      f.name AS film_name
    FROM photos p
    LEFT JOIN films f ON p.film_id = f.id
    WHERE p.status = 'undeveloped'
    ORDER BY datetime(p.created_at) ASC, p.id ASC
    LIMIT ?;`,
    [Math.max(0, limit)],
  ));
};

export const startDeveloping = async (ids: number[]): Promise<number[]> => {
  const currentDevelopingCount = await countDevelopingPhotos();
  const capacity = Math.max(0, 5 - currentDevelopingCount);
  const startIds = await getIdsWithDevelopingCapacity(ids, capacity);

  if (startIds.length === 0) {
    return [];
  }

  const placeholders = buildInPlaceholders(startIds.length);
  await withDatabaseRetry((db) => db.runAsync(
    `UPDATE photos
      SET status = 'developing',
          developing_started_at = datetime('now', 'localtime')
      WHERE id IN (${placeholders})
      AND status = 'undeveloped';`,
    startIds,
  ).then(() => undefined));

  return startIds;
};

export const startDevelopingSession = async (ids: number[]): Promise<number[]> => {
  return startDeveloping(ids);
};

export const getDevelopingPhotos = async (): Promise<PhotoWithFilmName[]> => {
  return withDatabaseRetry((db) => db.getAllAsync<PhotoWithFilmName>(
    `SELECT
      p.id,
      p.uri,
      COALESCE(p.film_id, 11) AS film_id,
      p.status,
      p.developing_started_at,
      COALESCE(p.created_at, datetime('now', 'localtime')) AS created_at,
      f.name AS film_name
    FROM photos p
    LEFT JOIN films f ON p.film_id = f.id
    WHERE p.status = 'developing'
    ORDER BY datetime(COALESCE(p.developing_started_at, p.created_at)) ASC, p.id ASC;`,
  ));
};

export const completeDevelopingSession = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const placeholders = buildInPlaceholders(ids.length);
  await withDatabaseRetry((db) => db.runAsync(
    `UPDATE photos
      SET status = 'developed', developing_started_at = NULL
      WHERE id IN (${placeholders})
      AND status = 'developing';`,
    ids,
  ).then(() => undefined));
};

export const failDevelopingSession = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const placeholders = buildInPlaceholders(ids.length);
  await withDatabaseRetry((db) => db.runAsync(
    `UPDATE photos
      SET status = 'undeveloped', developing_started_at = NULL
      WHERE id IN (${placeholders})
      AND status = 'developing';`,
    ids,
  ).then(() => undefined));
};

export const updatePhotoUri = async (id: number, uri: string): Promise<void> => {
  await withDatabaseRetry((db) => db.runAsync('UPDATE photos SET uri = ? WHERE id = ?;', [uri, id]).then(() => undefined));
};

export const getFilmEffectTypeById = async (filmId: number): Promise<RewardFilmType | null> => {
  const row = await withDatabaseRetry((db) => db.getFirstAsync<{ effect_type: string | null; name: string | null }>(
    'SELECT effect_type, name FROM films WHERE id = ?;',
    [filmId],
  ));

  const effect = row?.effect_type?.toLowerCase();
  if (effect === 'mono' || effect === 'vivid' || effect === 'retro') {
    return effect;
  }

  const filmName = row?.name?.toLowerCase() ?? '';
  if (filmName.includes('mono')) {
    return 'mono';
  }
  if (filmName.includes('vivid')) {
    return 'vivid';
  }
  if (filmName.includes('retro') || filmName.includes('vintage')) {
    return 'retro';
  }

  if (filmId === 1 || filmId === 11) {
    return 'mono';
  }
  if (filmId === 2 || filmId === 12) {
    return 'vivid';
  }
  if (filmId === 3 || filmId === 13) {
    return 'retro';
  }

  return 'mono';
};

// 全件取得
export const fetchPhotos = async (): Promise<Photo[]> => {
  return withDatabaseRetry((db) => db.getAllAsync<Photo>(
    'SELECT id, uri, film_id, status, created_at FROM photos ORDER BY datetime(created_at) DESC, id DESC;'
  ));
};

// レコード削除
export const deletePhoto = async (id: number): Promise<void> => {
  await withDatabaseRetry((db) => db.runAsync('DELETE FROM photos WHERE id = ?;', [id]).then(() => undefined));
};

// ===== Film Inventory =====

/** フィルム在庫を全種取得 */
export const getFilmInventory = async (): Promise<FilmInventory> => {
  const rows = await withDatabaseRetry((db) => db.getAllAsync<{ type: string; count: number }>(
    'SELECT type, count FROM film_inventory;'
  ));
  const inventory: FilmInventory = { mono: 0, vivid: 0, retro: 0};
  for (const row of rows) {
    if (row.type in inventory) {
      inventory[row.type as RewardFilmType] = row.count;
    }
  }
  return inventory;
};

/** 指定フィルムを count 本追加（デフォルト1本） */
export const addFilm = async (type: RewardFilmType, count: number = 1): Promise<FilmInventory> => {
  await withDatabaseRetry((db) => db.runAsync(
    'UPDATE film_inventory SET count = count + ? WHERE type = ?;',
    [count, type]
  ).then(() => undefined));
  return getFilmInventory();
};

/** 指定フィルムを1本消費。成功なら true、在庫不足なら false */
export const consumeFilm = async (type: RewardFilmType): Promise<boolean> => {
  const result = await withDatabaseRetry((db) => db.runAsync(
    'UPDATE film_inventory SET count = count - 1 WHERE type = ? AND count > 0;',
    [type]
  ));
  return result.changes > 0;
};