import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';

export interface Photo {
  id: number;
  uri: string;
}

// v11+ は openDatabaseAsync/openDatabaseSync が提供される
const db: SQLiteDatabase = openDatabaseSync('mydb.db');

// テーブル初期化
// 旧来の `db.transaction` は廃止されており、代わりに execAsync/runAsync 等を利用します。
export const initDb = async (): Promise<void> => {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT);'
  );
};

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