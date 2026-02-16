import pool from './db.js';

async function testFilters() {
  try {
    console.log('=== Testing Filters ===\n');

    const owners = ['Example GIS LLC'];
    const categories = [
      'Office', 'Retail', 'Hotel', 'Residential', 'Pitstop',
      'Mixed', 'Parking', 'Land', 'Single'
    ];
    const subcategories = [
      'Building', 'Unit', 'Street Retail', 'Hotel', 'Apartments',
      'Single Family Houses', 'Pitstop', 'Mixed use', 'Parking space',
      'Parking Building', 'Land', 'Residential', 'Office', 'Warehouse', 'residential'
    ];

    // Test 1: Yalnız owner (YENİ KOD)
    let query1 = 'SELECT * FROM all_properties WHERE 1=1';
    const params1 = [];
    let paramIndex1 = 1;
    
    query1 += ` AND owner = ANY($${paramIndex1})`;
    params1.push(owners);
    
    const result1 = await pool.query(query1, params1);
    console.log('1. Only owner filter (NEW CODE):', result1.rows.length);

    // Test 2: owner + category + subcategory (YENİ KOD)
    let query2 = 'SELECT * FROM all_properties WHERE 1=1';
    const params2 = [];
    let paramIndex2 = 1;
    
    query2 += ` AND owner = ANY($${paramIndex2})`;
    params2.push(owners);
    paramIndex2++;
    
    query2 += ` AND category = ANY($${paramIndex2})`;
    params2.push(categories);
    paramIndex2++;
    
    query2 += ` AND subcategory = ANY($${paramIndex2})`;
    params2.push(subcategories);
    
    const result2 = await pool.query(query2, params2);
    console.log('2. owner + category + subcategory filter (NEW CODE):', result2.rows.length);

    // Test 3: Yalnız category (YENİ KOD)
    let query3 = 'SELECT * FROM all_properties WHERE 1=1';
    const params3 = [];
    let paramIndex3 = 1;
    
    query3 += ` AND category = ANY($${paramIndex3})`;
    params3.push(categories);
    
    const result3 = await pool.query(query3, params3);
    console.log('3. Only category filter (NEW CODE):', result3.rows.length);

    // Test 4: Yalnız subcategory (YENİ KOD)
    let query4 = 'SELECT * FROM all_properties WHERE 1=1';
    const params4 = [];
    let paramIndex4 = 1;
    
    query4 += ` AND subcategory = ANY($${paramIndex4})`;
    params4.push(subcategories);
    
    const result4 = await pool.query(query4, params4);
    console.log('4. Only subcategory filter (NEW CODE):', result4.rows.length);

    console.log('\n=== Conclusion ===');
    console.log('✅ Only owner filter should return ALL Example GIS properties (including NULL category/subcategory)');
    console.log('✅ owner + category + subcategory should return ONLY properties with valid category AND subcategory');

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testFilters();

