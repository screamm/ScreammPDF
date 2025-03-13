const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const AdmZip = require('adm-zip');

console.log('🚀 Startar ZIP-bygglösning för ScreammPDF...');

// Sökvägar
const distDir = path.join(__dirname, 'dist');
const portableDir = path.join(distDir, 'portable');
const electronDir = path.join(distDir, 'electron');
const releasePath = path.join(distDir, 'release');
const appVersion = packageJson.version;
const zipOutputFile = path.join(releasePath, `ScreammPDF_${appVersion}_Portable.zip`);

// Skapa mappar
[distDir, portableDir, electronDir, releasePath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Rensa portable-mappen
console.log('🧹 Rensar tidigare byggfiler...');
if (fs.existsSync(portableDir)) {
  fs.readdirSync(portableDir).forEach(file => {
    const filePath = path.join(portableDir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  });
}

try {
  // Hämta Electron
  console.log('📥 Laddar ner och packar upp Electron...');
  const electronVersion = '29.4.6';
  const platform = 'win32';
  const arch = 'x64';
  
  // Hämta electron från cache eller ladda ner det
  const cacheDir = path.join(require('os').homedir(), 'AppData', 'Local', 'electron', 'Cache');
  const zipFilename = `electron-v${electronVersion}-${platform}-${arch}.zip`;
  const zipPath = path.join(cacheDir, zipFilename);
  
  if (!fs.existsSync(zipPath)) {
    // Ladda ner om det inte finns i cachen
    execSync(`npx electron-download --platform=${platform} --arch=${arch} --version=${electronVersion}`, {
      stdio: 'inherit'
    });
  }
  
  if (fs.existsSync(zipPath)) {
    console.log(`🔄 Packar upp Electron...`);
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(electronDir, true);
      console.log('✅ Electron uppackad!');
    } catch (err) {
      console.error('❌ Kunde inte packa upp Electron med adm-zip, provar PowerShell...');
      try {
        const psCommand = `Expand-Archive -Path "${zipPath}" -DestinationPath "${electronDir}" -Force`;
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        console.log('✅ Electron uppackad via PowerShell!');
      } catch (psErr) {
        console.error('❌ Kunde inte packa upp Electron!');
        throw new Error('Kunde inte packa upp Electron-filen');
      }
    }
  } else {
    console.error(`❌ Kunde inte hitta ${zipPath}`);
    throw new Error('Electron zip-filen hittades inte');
  }

  // Förbered ScreammPDF-paket
  console.log('📦 Förbereder portabel ScreammPDF-paket...');
  
  // Skapa app-mapp
  const appDir = path.join(distDir, 'ScreammPDF');
  if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true, force: true });
  }
  fs.mkdirSync(appDir, { recursive: true });
  
  // Kopiera Electron-filer till app-mapp
  console.log('📂 Kopierar Electron-runtime...');
  copyFolderSync(electronDir, appDir);
  
  // Byt namn på electron.exe till ScreammPDF.exe
  console.log('✏️ Byter namn på körbar fil till ScreammPDF.exe...');
  const electronExePath = path.join(appDir, 'electron.exe');
  const renamePath = path.join(appDir, 'ScreammPDF.exe');
  if (fs.existsSync(electronExePath)) {
    fs.renameSync(electronExePath, renamePath);
  } else {
    console.warn('⚠️ Kunde inte hitta electron.exe för namnbyte');
  }
  
  // Skapa application-mapp
  const appContentDir = path.join(appDir, 'resources', 'app');
  fs.mkdirSync(appContentDir, { recursive: true });
  
  // Kopiera applikationsfiler
  console.log('📂 Kopierar applikationsfiler...');
  const filesToCopy = [
    'index.html',
    'main.js',
    'renderer.js',
    'preload.js',
    'package.json'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(appContentDir, file));
    }
  });
  
  // Kopiera node_modules
  console.log('📚 Kopierar nödvändiga bibliotek...');
  try {
    execSync('npm install --production --ignore-scripts', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ Vissa beroenden kunde inte installeras, fortsätter ändå...');
  }
  
  if (fs.existsSync('node_modules')) {
    const targetNodeModules = path.join(appContentDir, 'node_modules');
    if (!fs.existsSync(targetNodeModules)) {
      fs.mkdirSync(targetNodeModules, { recursive: true });
    }
    
    // Kopiera bara nödvändiga node_modules-paket
    const dependencies = Object.keys(packageJson.dependencies || {});
    dependencies.forEach(dep => {
      const depPath = path.join('node_modules', dep);
      const targetPath = path.join(targetNodeModules, dep);
      
      if (fs.existsSync(depPath) && fs.lstatSync(depPath).isDirectory()) {
        copyFolderSync(depPath, targetPath);
      }
    });
  }

  // Skapa startfil med referens till den omdöpta filen
  console.log('📝 Skapar startfil...');
  fs.writeFileSync(
    path.join(appDir, 'ScreammPDF.bat'),
    `@echo off
echo Startar ScreammPDF...
start "" "%~dp0\\ScreammPDF.exe"
`
  );
  
  // Skapa README-fil
  fs.writeFileSync(
    path.join(appDir, 'README.txt'),
    `ScreammPDF Portabel Version ${appVersion}
==============================

Tack för att du använder ScreammPDF! Detta är den portabla versionen som inte kräver installation.

För att starta programmet:
1. Dubbelklicka på ScreammPDF.bat
   eller
2. Kör "ScreammPDF.exe" direkt

Copyright © 2025 ScreammPDF
`
  );

  // Skapa ZIP-fil
  console.log('📦 Skapar ZIP-arkiv...');
  const appZip = new AdmZip();
  addFolderToZip(appZip, appDir, '');
  appZip.writeZip(zipOutputFile);
  
  console.log(`✅ Portabel ZIP-fil skapad: ${zipOutputFile}`);
  console.log('✅ Byggnation slutförd!');
  console.log(`📄 Distributionspaket finns i: ${releasePath}`);
  
  // Ta bort temporär mapp
  fs.rmSync(appDir, { recursive: true, force: true });
} catch (error) {
  console.error('❌ Ett fel uppstod under byggnation:');
  console.error(error);
  process.exit(1);
}

// Hjälpfunktion för rekursiv kopiering utan symlinks
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    const stats = fs.lstatSync(sourcePath);
    
    if (stats.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    } else if (stats.isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    }
  });
}

// Hjälpfunktion för att lägga till en hel mapp i en zip-fil med relativa sökvägar
function addFolderToZip(zipFile, folderPath, zipPath) {
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const entryPath = zipPath ? path.join(zipPath, file) : file;
    
    const stats = fs.lstatSync(filePath);
    
    if (stats.isFile()) {
      zipFile.addLocalFile(filePath, path.dirname(entryPath));
    } else if (stats.isDirectory()) {
      addFolderToZip(zipFile, filePath, entryPath);
    }
  });
} 