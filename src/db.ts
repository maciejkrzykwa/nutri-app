import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('nutri.db');  // Promise<SQLiteDatabase> :contentReference[oaicite:0]{index=0}

export async function init() {
  const db = await dbPromise;
  await db.execAsync(`CREATE TABLE IF NOT EXISTS meals (
    id         INTEGER PRIMARY KEY NOT NULL,
    name       TEXT   NOT NULL,
    protein    REAL   NOT NULL,
    fat        REAL   NOT NULL,
    carbs      REAL   NOT NULL,
    multiplier REAL   NOT NULL DEFAULT 1,
    date       TEXT   NOT NULL
  );`);
  await initProducts();
}

export async function addMeal(
  name: string,
  protein: number,
  fat: number,
  carbs: number,
  dateIso: string,
  multiplier = 1
) {
  const db = await dbPromise;
  await db.runAsync(                               // nowe API :contentReference[oaicite:1]{index=1}
    'INSERT INTO meals (name, protein, fat, carbs, multiplier, date) VALUES (?,?,?,?,?,?)',
    name, protein, fat, carbs, multiplier, dateIso
  );
}

export async function getMealsByDate(dateIso: string) {
  const db = await dbPromise;
  return db.getAllAsync<{
    id: number; name: string; protein: number; fat: number; carbs: number; multiplier: number;
  }>('SELECT * FROM meals WHERE date = ? ORDER BY id DESC', [dateIso]);
}

export async function updateMultiplier(id: number, mul: number) {
  const db = await dbPromise;
  await db.runAsync('UPDATE meals SET multiplier = ? WHERE id = ?', mul, id);
}

export async function deleteMeal(id: number) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM meals WHERE id = ?', id);
}

export async function getTotals(dateIso: string) {
  const db = await dbPromise;
  return db.getFirstAsync<{ protein: number; fat: number; carbs: number; kcal: number }>(`
    SELECT
      IFNULL(SUM(protein * multiplier), 0)                   AS protein,
      IFNULL(SUM(fat     * multiplier), 0)                   AS fat,
      IFNULL(SUM(carbs   * multiplier), 0)                   AS carbs,
      IFNULL(SUM((protein*4 + fat*9 + carbs*4) * multiplier),0) AS kcal
    FROM meals
    WHERE date = ?`, [dateIso]);
}

export async function initProducts() {
  const db = await dbPromise;
  await db.execAsync(`CREATE TABLE IF NOT EXISTS products (
    id      INTEGER PRIMARY KEY NOT NULL,
    name    TEXT   NOT NULL UNIQUE,
    protein REAL   NOT NULL,
    fat     REAL   NOT NULL,
    carbs   REAL   NOT NULL
  );`);

  /* seed demo danych – tylko gdy pusta tabela */
  const count = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM products;');
  if (count?.c === 0) {
    await db.runAsync(
      `INSERT INTO products (name, protein, fat, carbs) VALUES
        ('100g Rice',     3, 0.1, 27),
        ('100g Chicken', 31, 4,   0 );`
    );
  }
}

/* helpers */
export async function getAllProducts() {
  const db = await dbPromise;
  return db.getAllAsync<{ id:number; name:string; protein:number; fat:number; carbs:number }>(
    'SELECT * FROM products ORDER BY name;'
  );
}

export async function addProduct(
  name: string, protein: number, fat: number, carbs: number
) {
  const db = await dbPromise;
  await db.runAsync(
    'INSERT INTO products (name, protein, fat, carbs) VALUES (?,?,?,?)',
    name, protein, fat, carbs
  );
}
