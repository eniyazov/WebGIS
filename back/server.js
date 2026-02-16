// server.js (ESM)
import express from 'express';
import cors from 'cors';
import pool from './db.js'; // PG pool
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5010;
const IMAGES_DIR = path.join(__dirname, 'Images');

// IIS/ARR arxasında real müştəri IP/proto-nu düzgün oxumaq üçün
app.set('trust proxy', true);

// Middleware
app.use(express.json());

// CORS: prod-da domenini dəqiq yaz (məs: https://gis.example.com)
// app.use(
//   cors({
//     origin: [
//       'https://api.example.com',
//       'https://wgis.example.com',
//       'http://localhost:5173',
//       'http://localhost:4200',
//     ],
//     credentials: true,
//   })
// );


// Hər origin-i qəbul et + credentials
app.use(cors({
  origin: (origin, cb) => cb(null, true),  // gələn origin-i olduğu kimi qəbul et
  credentials: true,
}));
app.options('*', cors()); // preflight


// Healthcheck (IIS monitorinq üçün)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Root
app.get('/', (req, res) => {
  res.send('Welcome to the Non-Residential Buildings API');
});

// Get all properties (filterlər)
app.get('/properties', async (req, res) => {
  try {
    const { propertyTypes, owner, category, subcategory } = req.query;

    // propertyTypes filter - owner/category/subcategory yoxlanmır
    if (propertyTypes) {
      const types = propertyTypes.split(',').map(t => t.trim());
      const result = await pool.query(
        'SELECT * FROM all_properties WHERE TRIM(property_type) = ANY($1) and owner = \'Example GIS LLC\'',
        [types]
      );
      return res.json(result.rows);
    }

    // owner/category/subcategory dinamik filter - propertyTypes yoxlanmır
    if (owner || category || subcategory) {
      let query = 'SELECT * FROM all_properties WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (owner) {
        const owners = owner.split(',').map(o => o.trim());
        query += ` AND owner = ANY($${paramIndex})`;
        params.push(owners);
        paramIndex++;
      }

      if (category) {
        const categories = category.split(',').map(c => c.trim());
        query += ` AND category = ANY($${paramIndex})`;
        params.push(categories);
        paramIndex++;
      }

      if (subcategory) {
        const subcategories = subcategory.split(',').map(s => s.trim());
        query += ` AND subcategory = ANY($${paramIndex})`;
        params.push(subcategories);
      }

      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    // Heç bir filter göndərilməyibsə, bütün məlumatları qaytarır
    const result = await pool.query('SELECT * FROM all_properties');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /properties error:', err);
    res.status(500).send('Server Error');
  }
});

// Search
app.get('/properties/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Query parameter is required' });

  try {
    const result = await pool.query(
      `SELECT
        cip_no,
        title_by_document,
        street,
        city,
        project,
        property_type,
        category,
        subcategory,
        owner,
        special_co,
        coord_point,
        geometry_coordinates
       FROM all_properties
       WHERE title_by_document ILIKE $1 OR street ILIKE $1 OR project ILIKE $1
       OR city ILIKE $1 OR valuation_category ILIKE $1 OR property_type ILIKE $1
       OR property_use_type ILIKE $1 OR special_co ILIKE $1`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /properties/search error:', err);
    res.status(500).send('Server Error');
  }
});

// Column whitelist (SQL injection-ın qarşısı üçün)
const ALLOWED_COLUMNS = new Set([
  'title_by_document',
  'street',
  'project',
  'city',
  'valuation_category',
  'property_type',
  'property_use_type',
  'special_co',
  'owner',
  'category',
  'subcategory',
]);

// Dynamic distinct column (whitelist ilə)
app.get('/properties/:column', async (req, res) => {
  const { column } = req.params;
  if (!ALLOWED_COLUMNS.has(column)) {
    return res.status(400).json({ error: 'Invalid column' });
  }

  try {
    const result = await pool.query(`SELECT DISTINCT ${column} FROM all_properties`);
    res.json(result.rows);
  } catch (err) {
    console.error(`GET /properties/${column} error:`, err);
    res.status(500).send('Server Error');
  }
});

// Grouped layers
app.get('/grouped-layers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT owner, category, subcategory
      FROM all_properties
      WHERE owner IS NOT NULL
    `);

    const grouped = {};
    for (const row of result.rows) {
      const owner = (row.owner || '').trim();
      const category = (row.category || '').trim();
      const subcategory = (row.subcategory || '').trim();
      if (!owner) continue;

      if (!grouped[owner]) grouped[owner] = {};
      if (category && subcategory) {
        if (!grouped[owner][category]) grouped[owner][category] = new Set();
        grouped[owner][category].add(subcategory);
      }
    }

    const response = Object.entries(grouped).map(([owner, categories]) => ({
      owner,
      categories: Object.entries(categories).map(([category, subSet]) => ({
        category,
        subcategories: Array.from(subSet),
      })),
    }));

    res.json(response);
  } catch (err) {
    console.error('GET /grouped-layers error:', err);
    res.status(500).send('Server Error');
  }
});

app.get('/images/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;

    if (!/^\d+$/.test(buildingId)) {
      return res.status(400).json({ error: 'Invalid building ID format' });
    }

    const buildingImageDir = path.join(IMAGES_DIR, buildingId);

    if (!fs.existsSync(buildingImageDir)) {
      return res.status(404).json({ error: 'Building images not found' });
    }

    const files = fs.readdirSync(buildingImageDir);

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    const imageUrls = imageFiles.map(file => ({
      filename: file,
      url: `/images/${buildingId}/${file}`
    }));

    res.json({
      buildingId,
      totalImages: imageUrls.length,
      images: imageUrls
    });
  } catch (err) {
    console.error('GET /images/:buildingId error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/images/:buildingId/:filename', (req, res) => {
  try {
    const { buildingId, filename } = req.params;

    if (!/^\d+$/.test(buildingId)) {
      return res.status(400).json({ error: 'Invalid building ID format' });
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(IMAGES_DIR, buildingId, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const realPath = fs.realpathSync(filePath);
    const realImagesDir = fs.realpathSync(IMAGES_DIR);
    if (!realPath.startsWith(realImagesDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('GET /images/:buildingId/:filename error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.use(express.static(IMAGES_DIR));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Start server — yalnız loopback-də dinlə (IIS ARR üçün təhlükəsizdir)
const HOST = '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown (opsional)
process.on('SIGINT', async () => {
  try {
    await pool.end();
  } finally {
    process.exit(0);
  }
});
