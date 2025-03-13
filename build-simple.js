const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const AdmZip = require('adm-zip');

console.log('🚀 Startar enkel bygglösning för ScreammPDF...');

// Skapa utgångsmapp
const distDir = path.join(__dirname, 'dist');
const portableDir = path.join(distDir, 'portable');
const electronDir = path.join(distDir, 'electron');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (!fs.existsSync(portableDir)) {
  fs.mkdirSync(portableDir, { recursive: true });
} else {
  // Rensa mappen innan
  console.log('🧹 Rensar tidigare byggfiler...');
  fs.readdirSync(portableDir).forEach(file => {
    const filePath = path.join(portableDir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  });
}

if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

try {
  // Hämta Electron direkt utan att packa
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
    console.log(`🔄 Packar upp Electron från ${zipPath}...`);
    try {
      // Installera adm-zip om det behövs
      if (!fs.existsSync(path.join('node_modules', 'adm-zip'))) {
        execSync('npm install adm-zip --no-save', { stdio: 'inherit' });
      }
      
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(electronDir, true);
      console.log('✅ Electron uppackad!');
      
      // Byt namn på electron.exe till ScreammPDF.exe
      console.log('✏️ Byter namn på körbar fil till ScreammPDF.exe...');
      const electronExePath = path.join(electronDir, 'electron.exe');
      const renamePath = path.join(electronDir, 'ScreammPDF.exe');
      if (fs.existsSync(electronExePath)) {
        fs.renameSync(electronExePath, renamePath);
      } else {
        console.warn('⚠️ Kunde inte hitta electron.exe för namnbyte');
      }
      
    } catch (err) {
      console.error('❌ Kunde inte packa upp Electron:', err);
      // Försök med PowerShell som fallback
      try {
        const psCommand = `Expand-Archive -Path "${zipPath}" -DestinationPath "${electronDir}" -Force`;
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        console.log('✅ Electron uppackad via PowerShell!');
      } catch (psErr) {
        console.error('❌ Kunde inte packa upp Electron med PowerShell heller:', psErr);
        throw new Error('Kunde inte packa upp Electron-filen');
      }
    }
  } else {
    console.error(`❌ Kunde inte hitta ${zipPath}`);
    throw new Error('Electron zip-filen hittades inte');
  }

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
      fs.copyFileSync(file, path.join(portableDir, file));
    }
  });

  // Kopiera node_modules (minimalt)
  console.log('📚 Kopierar nödvändiga bibliotek...');
  try {
    execSync('npm install --production --ignore-scripts', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ Vissa beroenden kunde inte installeras, fortsätter ändå...');
  }
  
  if (fs.existsSync('node_modules')) {
    const targetNodeModules = path.join(portableDir, 'node_modules');
    if (!fs.existsSync(targetNodeModules)) {
      fs.mkdirSync(targetNodeModules, { recursive: true });
    }
    
    // Kopiera bara nödvändiga node_modules-paket
    const dependencies = Object.keys(packageJson.dependencies || {});
    dependencies.forEach(dep => {
      const depPath = path.join('node_modules', dep);
      const targetPath = path.join(targetNodeModules, dep);
      
      if (fs.existsSync(depPath) && fs.lstatSync(depPath).isDirectory()) {
        // Rekursiv kopiering av katalog utan att använda symlinks
        copyFolderSync(depPath, targetPath);
      }
    });
  }

  // Skapa körbar fil
  console.log('📝 Skapar körbar fil...');
  fs.writeFileSync(
    path.join(distDir, 'ScreammPDF.bat'),
    `@echo off\r\ncd "%~dp0\\portable"\r\n"%~dp0\\electron\\ScreammPDF.exe" "%~dp0\\portable"\r\n`
  );

  console.log('✅ Byggnation klar! Portabel version skapad i dist-mappen.');
  console.log('🚀 Kör ScreammPDF.bat i dist-mappen för att starta applikationen');
} catch (error) {
  console.error('❌ Fel vid byggnation:', error);
  process.exit(1);
}

// Hjälpfunktion för att kopiera mappar rekursivt utan symlinks
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
    // Ignorera symlinks helt
  });
} 