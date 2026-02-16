import pool from './db.js';

async function checkData() {
  try {
    console.log('=== Data Analysis ===\n');

    // 1. propertyTypes filter (1-ci sorğu)
    const types = [
      'Investment Property',
      'Qeyri-yaşayış binası',
      'Qeyri-yaşayış sahəsi',
      'Mənzil',
      'Çoxmərtəbəli yaşayış bina',
      'Fərdi yaşayış evi',
      'Bağ evi',
      'Torpaq sahəsi',
      'Əmlak kompleksi',
      'Otel'
    ];
    const result1 = await pool.query(
      'SELECT COUNT(*) FROM all_properties WHERE property_type = ANY($1)',
      [types]
    );
    console.log('1. propertyTypes filter count:', result1.rows[0].count);

    // 2. owner + category + subcategory filter (2-ci sorğu)
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

    const result2 = await pool.query(
      'SELECT COUNT(*) FROM all_properties WHERE owner = ANY($1) AND category = ANY($2) AND subcategory = ANY($3)',
      [owners, categories, subcategories]
    );
    console.log('2. owner + category + subcategory filter count:', result2.rows[0].count);

    // 3. Yalnız owner filter
    const result3 = await pool.query(
      'SELECT COUNT(*) FROM all_properties WHERE owner = ANY($1)',
      [owners]
    );
    console.log('3. Only owner filter count:', result3.rows[0].count);

    // 4. Example GIS LLC-də category və ya subcategory NULL/empty olanlar
    const result4 = await pool.query(
      `SELECT COUNT(*) FROM all_properties 
       WHERE owner = ANY($1) 
       AND (category IS NULL OR subcategory IS NULL OR category = '' OR subcategory = '')`,
      [owners]
    );
    console.log('4. Example GIS LLC with NULL/empty category or subcategory:', result4.rows[0].count);

    // 5. Example GIS LLC-də category və subcategory dolu olanlar
    const result5 = await pool.query(
      `SELECT COUNT(*) FROM all_properties 
       WHERE owner = ANY($1) 
       AND category IS NOT NULL AND subcategory IS NOT NULL 
       AND category != '' AND subcategory != ''`,
      [owners]
    );
    console.log('5. Example GIS LLC with valid category AND subcategory:', result5.rows[0].count);

    // 6. Fərq
    console.log('\n=== Analysis ===');
    console.log('Difference (1 - 2):', parseInt(result1.rows[0].count) - parseInt(result2.rows[0].count));
    console.log('Difference (3 - 2):', parseInt(result3.rows[0].count) - parseInt(result2.rows[0].count));

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkData();

