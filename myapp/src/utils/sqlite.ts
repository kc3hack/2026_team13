import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { FilmInventory, FilmType, PhotoRecord, RewardFilmType } from '../types';

export type Photo = PhotoRecord;

// v11+ は openDatabaseAsync/openDatabaseSync が提供される
const db: SQLiteDatabase = openDatabaseSync('mydb.db');

const ensureFilmsSeeded = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS films (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      effect_type TEXT NOT NULL
    );
  `);

  await db.runAsync(
    `INSERT OR IGNORE INTO films (id, name, description, effect_type) VALUES
      (1, 'Standard', 'ナチュラルな色味の標準フィルム', 'standard'),
      (2, 'Monochrome', '落ち着いたモノクロ表現', 'monochrome'),
      (3, 'Vintage', 'やわらかい退色感を持つレトロ表現', 'vintage'),
      (11, 'Mono', 'モノクロームの静かなトーン', 'mono'),
      (12, 'Vivid', '鮮やかで力強い色彩', 'vivid'),
      (13, 'Retro', 'ノスタルジックな褪せた風合い', 'retro');`
  );
};

// テーブル初期化
export const initDatabase = async (): Promise<void> => {
  await ensureFilmsSeeded();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      film_id INTEGER,
      status TEXT NOT NULL DEFAULT 'undeveloped',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (film_id) REFERENCES films (id)
    );

    CREATE TABLE IF NOT EXISTS film_inventory (
      type TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);

  const photoColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(photos);');
  const hasFilmId = photoColumns.some((column) => column.name === 'film_id');
  const hasStatus = photoColumns.some((column) => column.name === 'status');
  const hasCreatedAt = photoColumns.some((column) => column.name === 'created_at');

  if (!hasFilmId) {
    await db.runAsync('ALTER TABLE photos ADD COLUMN film_id INTEGER;');
  }
  if (!hasStatus) {
    await db.runAsync("ALTER TABLE photos ADD COLUMN status TEXT NOT NULL DEFAULT 'undeveloped';");
  }
  if (!hasCreatedAt) {
    try {
      await db.runAsync('ALTER TABLE photos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;');
    } catch {
      await db.runAsync('ALTER TABLE photos ADD COLUMN created_at DATETIME;');
    }
  }

  await ensureFilmsSeeded();

  // 3種のフィルム行が存在しなければ初期挿入
  await db.runAsync(
    `INSERT OR IGNORE INTO film_inventory (type, count) VALUES ('mono', 0), ('vivid', 0), ('retro', 0);`
  );
};

export const initDb = initDatabase;

export const getAllFilms = async (): Promise<FilmType[]> => {
  await ensureFilmsSeeded();
  return db.getAllAsync<FilmType>('SELECT id, name, description, effect_type FROM films ORDER BY id ASC;');
};

// ===== Photos =====

// レコード追加
export const addPhoto = async (
  uri: string,
  filmId: number,
  status: 'undeveloped' | 'developed' = 'undeveloped',
): Promise<number> => {
  const result = await db.runAsync(
    'INSERT INTO photos (uri, film_id, status) VALUES (?, ?, ?);',
    [uri, filmId, status],
  );
  return result.lastInsertRowId;
};

export const getPhotosByStatus = async (status: 'undeveloped' | 'developed'): Promise<PhotoRecord[]> => {
  return db.getAllAsync<PhotoRecord>(
    'SELECT id, uri, film_id, status, created_at FROM photos WHERE status = ? ORDER BY datetime(created_at) DESC, id DESC;',
    [status],
  );
};

export const updatePhotoStatus = async (id: number, status: 'undeveloped' | 'developed'): Promise<void> => {
  await db.runAsync('UPDATE photos SET status = ? WHERE id = ?;', [status, id]);
};

// 全件取得
export const fetchPhotos = async (): Promise<Photo[]> => {
  return db.getAllAsync<Photo>(
    'SELECT id, uri, film_id, status, created_at FROM photos ORDER BY datetime(created_at) DESC, id DESC;'
  );
};

// レコード削除
export const deletePhoto = async (id: number): Promise<void> => {
  await db.runAsync('DELETE FROM photos WHERE id = ?;', [id]);
};

// ===== Film Inventory =====

/** フィルム在庫を全種取得 */
export const getFilmInventory = async (): Promise<FilmInventory> => {
  const rows = await db.getAllAsync<{ type: string; count: number }>(
    'SELECT type, count FROM film_inventory;'
  );
  const inventory: FilmInventory = { mono: 0, vivid: 0, retro: 0 };
  for (const row of rows) {
    if (row.type in inventory) {
      inventory[row.type as RewardFilmType] = row.count;
    }
  }
  return inventory;
};

/** 指定フィルムを count 本追加（デフォルト1本） */
export const addFilm = async (type: RewardFilmType, count: number = 1): Promise<FilmInventory> => {
  await db.runAsync(
    'UPDATE film_inventory SET count = count + ? WHERE type = ?;',
    [count, type]
  );
  return getFilmInventory();
};

/** 指定フィルムを1本消費。成功なら true、在庫不足なら false */
export const consumeFilm = async (type: RewardFilmType): Promise<boolean> => {
  const result = await db.runAsync(
    'UPDATE film_inventory SET count = count - 1 WHERE type = ? AND count > 0;',
    [type]
  );
  return result.changes > 0;
};