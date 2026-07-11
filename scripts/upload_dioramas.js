const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
let supabaseUrl, supabaseAnonKey;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error('Error reading .env file:', e.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const mapping = {
  'Divino Salvador del Mundo': 'parque_la_familia.png',
  'Volcán de Santa Ana': 'cerro_verde.png',
  'Lago de Coatepeque': 'catedral_santa_ana.png',
  'Suchitoto': 'cuscatlan.png',
  'Playa El Tunco': 'la_libertad.png',
  'Juayúa — Ruta de las Flores': 'sonsonate.png',
  'Joya de Cerén': 'mirador_de_cristal.png',
  'Parque Nacional El Imposible': 'ahuachapan.png',
  'Bahía de Jiquilisco': 'la_paz.png',
  'Playa Las Flores': 'san_vicente.png'
};

async function uploadAndLink() {
  console.log('Starting diorama uploading and linking...');
  
  for (const [placeName, fileName] of Object.entries(mapping)) {
    const filePath = path.join(__dirname, '../assets/dioramas', fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${fileName} to bucket 'map-icons'...`);
    const { data, error: uploadError } = await supabase.storage
      .from('map-icons')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      console.error(`Failed to upload ${fileName}:`, uploadError.message);
      console.log('Ensure you have run the temporary SQL policy to allow insertion.');
      continue;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('map-icons')
      .getPublicUrl(fileName);
      
    console.log(`Public URL for ${fileName}: ${publicUrl}`);
    
    // Update places table in Supabase
    console.log(`Updating places row for "${placeName}" with map_icon_url...`);
    const { error: dbError } = await supabase
      .from('places')
      .update({ map_icon_url: publicUrl })
      .eq('name', placeName);
      
    if (dbError) {
      console.error(`Failed to update DB for "${placeName}":`, dbError.message);
    } else {
      console.log(`Successfully linked "${placeName}" with diorama URL.`);
    }
  }
  
  console.log('Diorama process finished!');
}

uploadAndLink();
