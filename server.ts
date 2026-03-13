import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import https from 'https';
import db from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import PDFDocument from 'pdfkit';

const fontPath = path.join(process.cwd(), 'Roboto-Regular.ttf');

async function downloadFont() {
  if (!fs.existsSync(fontPath)) {
    console.log('Downloading font...');
    return new Promise((resolve, reject) => {
      https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf', (res) => {
        if (res.statusCode === 200) {
          const stream = fs.createWriteStream(fontPath);
          res.pipe(stream);
          stream.on('finish', () => {
            console.log('Font downloaded.');
            resolve(true);
          });
          stream.on('error', reject);
        } else {
          reject(new Error(`Failed to download font: ${res.statusCode}`));
        }
      }).on('error', reject);
    });
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-autocheck-key';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
});

async function startServer() {
  await downloadFont().catch(console.error);
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use('/uploads', express.static(uploadsDir));
  app.use('/reports', express.static(reportsDir));

  // --- AUTH MIDDLEWARE ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- API ROUTES ---
  
  // Auth
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    const role = 'INSPECTOR'; // Everyone is an inspector in this app
    try {
      const hash = bcrypt.hashSync(password, 10);
      const stmt = db.prepare('INSERT INTO users (role, name, email, password) VALUES (?, ?, ?, ?)');
      const info = stmt.run(role, name, email, hash);
      res.json({ id: info.lastInsertRowid, role, name, email });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
  });

  // Orders
  app.post('/api/orders', authenticate, (req: any, res) => {
    const { brand, model, year, vin, license_plate, inspection_address, seller_phone, preferred_time } = req.body;
    
    const insertVehicle = db.prepare('INSERT INTO vehicles (brand, model, year, vin, license_plate) VALUES (?, ?, ?, ?, ?) ON CONFLICT(vin) DO UPDATE SET brand=excluded.brand, model=excluded.model, year=excluded.year, license_plate=excluded.license_plate RETURNING id');
    const vehicle = insertVehicle.get(brand, model, year, vin, license_plate) as any;

    const insertOrder = db.prepare('INSERT INTO orders (vehicle_id, client_id, inspector_id, status, inspection_address, seller_phone, preferred_time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    // The inspector creates the order and is automatically assigned to it
    const info = insertOrder.run(vehicle.id, req.user.id, req.user.id, 'ASSIGNED', inspection_address, seller_phone, preferred_time);
    res.json({ id: info.lastInsertRowid });
  });

  app.get('/api/orders', authenticate, (req: any, res) => {
    let query = `
      SELECT o.*, v.brand, v.model, v.year, v.vin, v.license_plate, i.name as inspector_name
      FROM orders o
      JOIN vehicles v ON o.vehicle_id = v.id
      LEFT JOIN users i ON o.inspector_id = i.id
      WHERE o.inspector_id = ?
      ORDER BY o.created_at DESC
    `;
    const orders = db.prepare(query).all(req.user.id);
    res.json(orders);
  });

  app.get('/api/orders/:id', authenticate, (req: any, res) => {
    const order = db.prepare(`
      SELECT o.*, v.brand, v.model, v.year, v.vin, v.license_plate
      FROM orders o
      JOIN vehicles v ON o.vehicle_id = v.id
      WHERE o.id = ? AND o.inspector_id = ?
    `).get(req.params.id, req.user.id) as any;
    
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // Get inspection result if completed
    const result = db.prepare('SELECT * FROM inspection_results WHERE order_id = ?').get(order.id) as any;
    if (result) {
      order.result = result;
      order.result.items = db.prepare('SELECT * FROM checklist_items WHERE inspection_id = ?').all(result.id);
      order.result.photos = db.prepare('SELECT * FROM photos WHERE inspection_id = ?').all(result.id);
      order.report = db.prepare('SELECT * FROM reports WHERE inspection_id = ?').get(result.id);
    }
    
    res.json(order);
  });

  app.put('/api/orders/:id/assign', authenticate, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { inspector_id } = req.body;
    db.prepare('UPDATE orders SET inspector_id = ?, status = ? WHERE id = ?').run(inspector_id, 'ASSIGNED', req.params.id);
    res.json({ success: true });
  });

  app.put('/api/orders/:id/status', authenticate, (req: any, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/orders/:id', authenticate, (req: any, res) => {
    try {
      const orderId = req.params.id;
      
      const inspection = db.prepare('SELECT id FROM inspection_results WHERE order_id = ?').get(orderId) as any;
      if (inspection) {
        db.prepare('DELETE FROM photos WHERE inspection_id = ?').run(inspection.id);
        db.prepare('DELETE FROM checklist_items WHERE inspection_id = ?').run(inspection.id);
        db.prepare('DELETE FROM reports WHERE inspection_id = ?').run(inspection.id);
        db.prepare('DELETE FROM inspection_results WHERE id = ?').run(inspection.id);
      }
      
      const order = db.prepare('SELECT vehicle_id FROM orders WHERE id = ?').get(orderId) as any;
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      if (order && order.vehicle_id) {
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(order.vehicle_id);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Users
  app.get('/api/users/inspectors', authenticate, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const inspectors = db.prepare("SELECT id, name, email FROM users WHERE role = 'INSPECTOR'").all();
    res.json(inspectors);
  });

  // Inspections
  app.post('/api/inspections/:orderId', authenticate, upload.array('photos', 20), (req: any, res) => {
    try {
      if (req.user.role !== 'INSPECTOR') return res.status(403).json({ error: 'Forbidden' });
      
      const orderId = req.params.orderId;
      const items = JSON.parse(req.body.items); // Array of { category, item_name, value, is_critical }
      const files = req.files as Express.Multer.File[];

      // Calculate score
      let totalScore = 0;
      let hasCritical = false;

      for (const item of items) {
        if (item.value > 0) {
          totalScore += item.value;
          if (item.is_critical) {
            hasCritical = true;
          }
        }
      }

      let result = 'GREEN';
      if (hasCritical || totalScore >= 12) {
        result = 'RED';
      } else if (totalScore >= 6) {
        result = 'YELLOW';
      }

      const insertResult = db.prepare('INSERT INTO inspection_results (order_id, inspector_id, score, result) VALUES (?, ?, ?, ?)');
      const resultInfo = insertResult.run(orderId, req.user.id, totalScore, result);
      const inspectionId = resultInfo.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO checklist_items (inspection_id, category, item_name, value, is_critical) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        const stateText = item.state === 'EXCELLENT' ? 'Отличное' : item.state === 'GOOD' ? 'Хорошее' : 'Плохое';
        let tagsText = '';
        if (item.state === 'BAD' && item.selected_tags && item.selected_tags.length > 0) {
          tagsText = ` [Теги: ${item.selected_tags.join(', ')}]`;
        }
        item.final_name = `${item.item_name} (${stateText})${tagsText}`;
        insertItem.run(inspectionId, item.category, item.final_name, item.value, item.is_critical ? 1 : 0);
      }

      const insertPhoto = db.prepare('INSERT INTO photos (inspection_id, url) VALUES (?, ?)');
      for (const file of files) {
        insertPhoto.run(inspectionId, '/uploads/' + file.filename);
      }

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('COMPLETED', orderId);

      res.json({ success: true, inspectionId, result });
    } catch (err: any) {
      console.error('Inspection Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // Global error handler for API routes
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
