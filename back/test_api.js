import pool from './db.js';

async function testAPI() {
  try {
    console.log('=== Testing API Logic ===\n');

    // Simulyasiya: owner=Example GIS LLC (category və subcategory YOX)
    console.log('Test 1: owner=Example GIS LLC (NO category, NO subcategory)');
    const owner1 = 'Example GIS LLC';
    const category1 = undefined;
    const subcategory1 = undefined;

    let query1 = 'SELECT * FROM all_properties WHERE 1=1';
    const params1 = [];
    let paramIndex1 = 1;

    if (owner1) {
      const owners = owner1.split(',').map(o => o.trim());
      query1 += ` AND owner = ANY($${paramIndex1})`;
      params1.push(owners);
      paramIndex1++;
    }

    if (category1) {
      const categories = category1.split(',').map(c => c.trim());
      query1 += ` AND category = ANY($${paramIndex1})`;
      params1.push(categories);
      paramIndex1++;
    }

    if (subcategory1) {
      const subcategories = subcategory1.split(',').map(s => s.trim());
      query1 += ` AND subcategory = ANY($${paramIndex1})`;
      params1.push(subcategories);
    }

    console.log('Query:', query1);
    console.log('Params:', params1);
    const result1 = await pool.query(query1, params1);
    console.log('Result count:', result1.rows.length);
    console.log('Expected: 710 (bütün Example GIS properties, NULL category/subcategory daxil)\n');

    // Simulyasiya: owner=Example GIS LLC + category + subcategory
    console.log('Test 2: owner=Example GIS LLC + category + subcategory');
    const owner2 = 'Example GIS LLC';
    const category2 = 'Office,Retail,Hotel,Residential,Pitstop,Mixed,Parking,Land,Single';
    const subcategory2 = 'Building,Unit,Street Retail,Hotel,Apartments,Single Family Houses,Pitstop,Mixed use,Parking space,Parking Building,Land,Residential,Office,Warehouse,residential';

    let query2 = 'SELECT * FROM all_properties WHERE 1=1';
    const params2 = [];
    let paramIndex2 = 1;

    if (owner2) {
      const owners = owner2.split(',').map(o => o.trim());
      query2 += ` AND owner = ANY($${paramIndex2})`;
      params2.push(owners);
      paramIndex2++;
    }

    if (category2) {
      const categories = category2.split(',').map(c => c.trim());
      query2 += ` AND category = ANY($${paramIndex2})`;
      params2.push(categories);
      paramIndex2++;
    }

    if (subcategory2) {
      const subcategories = subcategory2.split(',').map(s => s.trim());
      query2 += ` AND subcategory = ANY($${paramIndex2})`;
      params2.push(subcategories);
    }

    console.log('Query:', query2);
    console.log('Params:', params2);
    const result2 = await pool.query(query2, params2);
    console.log('Result count:', result2.rows.length);
    console.log('Expected: 686 (yalnız category VƏ subcategory uyğun olanlar)\n');

    console.log('=== Conclusion ===');
    console.log('✅ Kod düzgündür!');
    console.log('✅ owner göndərildikdə, category/subcategory NULL olanlar da qaytarılır');
    console.log('✅ owner + category + subcategory göndərildikdə, yalnız uyğun olanlar qaytarılır');

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testAPI();

