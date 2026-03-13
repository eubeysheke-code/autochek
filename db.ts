import Database from 'better-sqlite3';

const db = new Database('autocheck.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL, -- 'CLIENT', 'INSPECTOR', 'ADMIN'
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    vin TEXT UNIQUE NOT NULL,
    license_plate TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    inspector_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'
    inspection_address TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inspection_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    result TEXT NOT NULL, -- 'GREEN', 'YELLOW', 'RED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    value INTEGER NOT NULL, -- 0 (pass), or score value (e.g., 2, 3, 4)
    is_critical BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (inspection_id) REFERENCES inspection_results(id)
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (inspection_id) REFERENCES inspection_results(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspection_results(id)
  );
`);

export default db;
