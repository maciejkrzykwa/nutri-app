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
  }>('SELECT * FROM meals WHERE date = ? ORDER BY id ASC', [dateIso]);
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
        ('Pierś z kurczaka',21.5,1.3,0.0),
        ('Udo z kurczaka',16.8,10.2,0.0),
        ('Karkówka',16.1,22.8,0.0),
        ('Schab',21.0,7.0,0.0),
        ('Boczek',11.1,47.0,0.0),
        ('Łosoś',19.9,13.6,0.0),
        ('Wątróbka',19.4,5.2,2.0),
        ('Szynka wieprz.',18.0,16.0,0.0),
        ('Tuńczyk',22.0,1.0,0.0),
        ('Mleko 2%',3.0,2.0,4.3),
        ('Jajko (60g)',7.8,6.6,0.6),
        ('Miód',0.3,0.0,80.0),
        ('Ser twar. Poltlusty',18.7,4.7,3.7),
        ('Ryż brązowy',8.6,1.9,74.0),
        ('Ryż biały',7.9,0.9,79.0),
        ('Orzechy laskowe',15.0,62.0,17.0),
        ('Avocado',2.0,15.3,7.1),
        ('Banan',1.0,0.3,21.8),
        ('Jabłko',0.4,0.4,10.1),
        ('Mutant mass',20.0,6.2,67.5),
        ('Oliwa',0.0,91.6,0.0),
        ('Brokuł',2.8,0.4,6.6),
        ('Jogurt naturalny',4.9,3.0,4.2),
        ('Serek wiejski',12.0,6.0,2.5),
        ('Mak. jajeczny',12.1,1.9,72.2),
        ('Chleb zwykly(mieszany)',5.4,1.1,52.2),
        ('Ziemniaki',1.9,0.1,16.8),
        ('Burak',1.8,0.1,7.3),
        ('Marchew',1.0,0.2,9.1),
        ('Pomidor',0.9,0.2,2.4),
        ('Szpinak',2.8,0.4,3.4),
        ('Por',1.6,0.3,8.0)
        ;`
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

export async function deleteProduct(id: number) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}
