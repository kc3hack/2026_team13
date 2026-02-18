import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { FilmInventory, FilmType } from '../types';

export interface Photo {
  id: number;
  uri: string;
}

// v11+ は openDatabaseAsync/openDatabaseSync が提供される
const db: SQLiteDatabase = openDatabaseSync('mydb.db');

// テーブル初期化
export const initDb = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT);
    CREATE TABLE IF NOT EXISTS film_inventory (
      type TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 3種のフィルム行が存在しなければ初期挿入
  await db.runAsync(
    `INSERT OR IGNORE INTO film_inventory (type, count) VALUES ('mono', 0), ('vivid', 0), ('retro', 0);`
  );
};

// ===== Photos =====

// レコード追加
export const addPhoto = async (uri: string): Promise<number> => {
  const result = await db.runAsync('INSERT INTO photos (uri) values (?);', [uri]);
  return result.lastInsertRowId;
};

// 全件取得
export const fetchPhotos = async (): Promise<Photo[]> => {
  return db.getAllAsync<Photo>('SELECT * FROM photos;');
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
      inventory[row.type as FilmType] = row.count;
    }
  }
  return inventory;
};

/** 指定フィルムを count 本追加（デフォルト1本） */
export const addFilm = async (type: FilmType, count: number = 1): Promise<FilmInventory> => {
  await db.runAsync(
    'UPDATE film_inventory SET count = count + ? WHERE type = ?;',
    [count, type]
  );
  return getFilmInventory();
};

/** 指定フィルムを1本消費。成功なら true、在庫不足なら false */
export const consumeFilm = async (type: FilmType): Promise<boolean> => {
  const result = await db.runAsync(
    'UPDATE film_inventory SET count = count - 1 WHERE type = ? AND count > 0;',
    [type]
  );
  return result.changes > 0;
};