import express from 'express';
import cors from 'cors';
import pool from './db.js'; // Importing the updated db.js

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Root Route (Fixes "Cannot GET /")
app.get('/', (req, res) => {
    res.send('Welcome to the Non-Residential Buildings API');
});

// ✅ Get all properties
app.get('/properties', async (req, res) => {
  try {
    const { propertyTypes, owner, category, subcategory } = req.query;

    // Static list uses propertyTypes
    if (propertyTypes) {
      const types = propertyTypes.split(',').map(t => t.trim());
      const result = await pool.query(
        'SELECT * FROM valuation_layout WHERE property_type = ANY($1)',
        [types]
      );
      return res.json(result.rows);
    }

    // Dynamic list uses owner + category + subcategory
    if (owner && category && subcategory) {
      const owners = owner.split(',').map(o => o.trim());
      const categories = category.split(',').map(c => c.trim());
      const subcategories = subcategory.split(',').map(s => s.trim());

      const result = await pool.query(
        `SELECT * FROM valuation_layout 
         WHERE owner = ANY($1) AND category = ANY($2) AND subcategory = ANY($3)`,
        [owners, categories, subcategories]
      );
      return res.json(result.rows);
    }

    // Fallback for owner-only (when no categories/subcategories exist)
    if (owner && !category && !subcategory) {
      const owners = owner.split(',').map(o => o.trim());
      const result = await pool.query(
        `SELECT * FROM valuation_layout 
         WHERE owner = ANY($1)`,
        [owners]
      );
      return res.json(result.rows);
    }

    res.json([]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});



// ✅ Search properties by owner or street
app.get('/properties/search', async (req, res) => {
    const { query } = req.query;
    // console.log('Search query:', query);  // Log the query to check if it is being received

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM valuation_layout 
             WHERE title_by_document ILIKE $1 OR street ILIKE $1 OR project ILIKE $1 
             OR city ILIKE $1 OR valuation_category ILIKE $1 OR property_type ILIKE $1 
             OR property_use_type ILIKE $1 OR special_co ILIKE $1`,
            [`%${query}%`]
        );
       // console.log('Search results:', result.rows);  // Log the results returned from the database
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// ✅ Get specific column dynamically
app.get('/properties/:column', async (req, res) => {
    const { column } = req.params;
    
    try {
        const result = await pool.query(`SELECT DISTINCT ${column} FROM valuation_layout`);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.get('/grouped-layers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT owner, category, subcategory
      FROM valuation_layout
      WHERE owner IS NOT NULL
    `);

    const grouped = {};

    result.rows.forEach(row => {
      const owner = row.owner.trim();
      const category = row.category?.trim();
      const subcategory = row.subcategory?.trim();

      if (!grouped[owner]) grouped[owner] = {};

      if (category && subcategory) {
        if (!grouped[owner][category]) grouped[owner][category] = new Set();
        grouped[owner][category].add(subcategory);
      }
    });

    const response = Object.entries(grouped).map(([owner, categories]) => ({
      owner,
      categories: Object.entries(categories).map(([category, subSet]) => ({
        category,
        subcategories: Array.from(subSet)
      }))
    }));

    res.json(response);
  } catch (err) {
    console.error("Error in /grouped-layers:", err.message);
    res.status(500).send('Server Error');
  }
});




// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
