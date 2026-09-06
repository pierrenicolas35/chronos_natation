const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://qzorukvpcqeithoxenjh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6b3J1a3ZwY3FlaXRob3hlbmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDgxNDIsImV4cCI6MjEwNDI4NDE0Mn0.ui2G5T83WeAK4X6CioAykjyTNOex5m8Y2w5EBQ9SlWs';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_URL = 'https://script.google.com/macros/s/AKfycbztHZN9MYMTGxApYM-NV3SlqJeXFZUdVTHH_LRATjSqYk9_yFEHbcn8yPwL0Y5Bh1D6/exec';

const nageurs = ['Thomas', 'Elisa'];
const distances = ['50m', '100m', '200m', '400m', '800m', '1500m'];
const nages = ['Nage Libre', 'Dos', 'Brasse', 'Papillon', '4 Nages'];

async function fetchFromGoogleSheet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchFromGoogleSheet(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', err => reject(err));
  });
}

async function migrate() {
  for (const nageur of nageurs) {
    for (const distance of distances) {
      for (const nage of nages) {
        const epreuve = `${distance} ${nage}`;
        const url = `${API_URL}?action=getHistorique&nageur=${encodeURIComponent(nageur)}&epreuve=${encodeURIComponent(epreuve)}`;
        try {
          const res = await fetchFromGoogleSheet(url);
          if (res.status === 'success' && res.data && res.data.length > 0) {
            const rows = res.data.map(item => {
              const [day, month, year] = item.dateAffichage.split('/');
              return {
                nageur: nageur,
                epreuve: epreuve,
                bassin: item.bassin,
                date: `${year}-${month}-${day}`,
                temps_texte: item.tempsTexte,
                secondes: item.secondes
              };
            });
            const { error } = await supabase.from('performances').insert(rows);
            if (error) {
              console.error("Error inserting data:", error);
            } else {
              console.log(`Inserted ${rows.length} rows for ${nageur} ${epreuve}`);
            }
          }
        } catch (e) {
          console.error(`Error processing ${nageur} ${epreuve}:`, e);
        }
      }
    }
  }
}

migrate();
