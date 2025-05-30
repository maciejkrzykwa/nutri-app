import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('nutri.db');

/* ---------- INITIAL SET-UP ---------- */
export function init(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS meals (
          id          INTEGER PRIMARY KEY NOT NULL,
          name        TEXT    NOT NULL,
          protein     REAL    NOT NULL,
          fat         REAL    NOT NULL,
          carbs       REAL    NOT NULL,
          multiplier  REAL    NOT NULL DEFAULT 1,
          date        TEXT    NOT NULL
        );`,
        [],
        () => resolve(),
        (_, err) => (reject(err), true)
      );
    });
  });
}

/* ---------- CRUD HELPERS ---------- */
export function addMeal(
  name: string,
  protein: number,
  fat: number,
  carbs: number,
  dateIso: string,
  multiplier = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO meals (name, protein, fat, carbs, multiplier, date) VALUES (?,?,?,?,?,?);',
        [name, protein, fat, carbs, multiplier, dateIso],
        () => resolve(),
        (_, err) => (reject(err), true)
      );
    });
  });
}

export function getMealsByDate(dateIso: string): Promise<
  { id: number; name: string; protein: number; fat: number; carbs: number; multiplier: number }[]
> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM meals WHERE date = ? ORDER BY id DESC;',
        [dateIso],
        (_, res) => resolve(res.rows._array as any),
        (_, err) => (reject(err), true)
      );
    });
  });
}

export function deleteMeal(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM meals WHERE id = ?;', [id], () => resolve(), (_, e) => (reject(e), true));
    });
  });
}

export function updateMultiplier(id: number, mul: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql('UPDATE meals SET multiplier = ? WHERE id = ?;', [mul, id], () => resolve(), (_, e) => (reject(e), true));
    });
  });
}

/* ---------- DAILY TOTALS (inc. kcal) ---------- */
export function getTotals(dateIso: string): Promise<{
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
}> {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT 
           IFNULL(SUM(protein * multiplier),0)          AS protein,
           IFNULL(SUM(fat     * multiplier),0)          AS fat,
           IFNULL(SUM(carbs   * multiplier),0)          AS carbs,
           IFNULL(SUM((protein*4 + fat*9 + carbs*4) * multiplier),0) AS kcal
         FROM meals
         WHERE date = ?;`,
        [dateIso],
        (_, res) => resolve(res.rows.item(0)),
        (_, err) => (reject(err), true)
      );
    });
  });
}

export default db;
