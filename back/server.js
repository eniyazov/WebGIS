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
        if (req.query.propertyTypes) {
            const types = req.query.propertyTypes.split(',');
            // Query to return only rows with property_t in the provided list
            const result = await pool.query(
            'SELECT * FROM non_residental_buildings WHERE property_t = ANY($1)',
            [types]
            );
            res.json(result.rows);
            } else {
                // Return an empty array if no propertyTypes parameter is provided
                res.json([]);
                }
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
            `SELECT * FROM non_residental_buildings 
             WHERE property_n ILIKE $1 OR street ILIKE $1 OR project ILIKE $1 
             OR city ILIKE $1 OR valuation_ ILIKE $1 OR property_t ILIKE $1 
             OR property_u ILIKE $1 OR special_co ILIKE $1`,
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
        const result = await pool.query(`SELECT DISTINCT ${column} FROM non_residental_buildings`);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
