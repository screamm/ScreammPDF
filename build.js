const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Startar ScreammPDF byggsprocessen...');
console.log('📂 Förbereder byggmiljön...');

// Skapa byggmappen om den inte finns
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Rensa tidigare byggfiler
  console.log('🧹 Rensar tidigare byggfiler...');
  if (fs.existsSync(path.join(distDir, 'win-unpacked'))) {
    try {
      execSync('rmdir /s /q "dist\\win-unpacked"', { stdio: 'inherit' });
    } catch (err) {
      console.warn('⚠️ Kunde inte ta bort tidigare win-unpacked mapp, fortsätter ändå...');
    }
  }

  // Kör electron-builder med extra flaggor för att undvika symlink-problem
  console.log('🔧 Bygger applikationen...');
  execSync('npx electron-builder --win portable --config electron-builder.yml --dir', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false', // Undvik code signing som kan orsaka problem
      ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES: 'true',
      ELECTRON_CACHE: path.join(__dirname, '.cache', 'electron'),
      ELECTRON_BUILDER_CACHE: path.join(__dirname, '.cache', 'electron-builder')
    }
  });

  // Kopiera applikationsfiler istället för att skapa symboliska länkar
  console.log('📦 Paketerar applikationen...');
  execSync('npx electron-builder --win portable --config electron-builder.yml --publish never', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES: 'true'
    }
  });

  console.log('✅ Byggnadsprocessen slutförd!');
  console.log('📄 Byggnadsresultat finns i dist-mappen.');

} catch (error) {
  console.error('❌ Ett fel uppstod under byggnadsprocessen:');
  console.error(error);
  process.exit(1);
} 