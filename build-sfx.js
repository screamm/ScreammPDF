const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const AdmZip = require('adm-zip');

console.log('🚀 Startar SFX-bygglösning för ScreammPDF...');

// Sökvägar
const distDir = path.join(__dirname, 'dist');
const portableDir = path.join(distDir, 'portable');
const electronDir = path.join(distDir, 'electron');
const releasePath = path.join(distDir, 'release');
const appVersion = packageJson.version;
const sfxOutputFile = path.join(releasePath, `ScreammPDF_${appVersion}_Portable.exe`);

// Skapa mappar
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

if (!fs.existsSync(releasePath)) {
  fs.mkdirSync(releasePath, { recursive: true });
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

  // Kopiera node_modules
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
        copyFolderSync(depPath, targetPath);
      }
    });
  }

  // Skapa startfil
  console.log('📝 Skapar startfil...');
  fs.writeFileSync(
    path.join(portableDir, 'start.bat'),
    `@echo off\r\necho Startar ScreammPDF...\r\n.\\..\\electron\\ScreammPDF.exe "%~dp0"\r\n`
  );
  
  // Skapa en README-fil för portabel version
  fs.writeFileSync(
    path.join(portableDir, 'README.txt'),
    `ScreammPDF Portabel Version ${appVersion}
==============================

Tack för att du använder ScreammPDF! Detta är den portabla versionen som inte kräver installation.

För att starta programmet:
1. Klicka på start.bat i denna mapp
2. Eller kör ScreammPDF.bat i huvudmappen

Obs: Behåll mapphierarkin intakt för att programmet ska fungera korrekt.

Copyrght © 2025 ScreammPDF
`
  );

  console.log('📦 Skapar själv-extraherande arkiv...');
  
  try {
    // Försök hitta 7-Zip
    let sevenZipPath = '';
    const possiblePaths = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe'
    ];
    
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        sevenZipPath = path;
        break;
      }
    }
    
    if (sevenZipPath) {
      console.log('✅ 7-Zip hittades:', sevenZipPath);
      
      // Skapa konfigurationsfiler för SFX
      const sfxConfigPath = path.join(distDir, 'sfx_config.txt');
      fs.writeFileSync(sfxConfigPath, 
        `;!@Install@!UTF-8!
Title="ScreammPDF ${appVersion} Portabel"
BeginPrompt="Vill du packa upp och starta ScreammPDF?"
Progress="ja"
RunProgram="start.bat"
;!@InstallEnd@!`
      );
      
      // Skapa temporär zip-fil
      const tempZipPath = path.join(distDir, 'temp.zip');
      console.log('📦 Skapar zip-fil av applikationen...');
      
      // Använda adm-zip för att skapa zip
      const tempZip = new AdmZip();
      addFolderToZip(tempZip, portableDir, '');
      addFolderToZip(tempZip, electronDir, 'electron');
      tempZip.writeZip(tempZipPath);
      
      // Skapa SFX med 7-Zip
      console.log('🔧 Skapar själv-extraherande EXE...');
      const sfxStub = path.join(__dirname, 'resources', '7zSD.sfx');
      
      if (!fs.existsSync(sfxStub)) {
        // Ladda ner SFX stub om den inte finns
        console.log('📥 Laddar ner SFX-stub...');
        fs.mkdirSync(path.join(__dirname, 'resources'), { recursive: true });
        execSync(`"${sevenZipPath}" x -o"${path.join(__dirname, 'resources')}" "${sevenZipPath.replace('7z.exe', '7z.sfx')}"`, 
          { stdio: 'inherit' });
      }
      
      if (fs.existsSync(sfxStub)) {
        // Kombinera SFX, config och zip för att skapa själv-extraherande exe
        const allData = Buffer.concat([
          fs.readFileSync(sfxStub),
          fs.readFileSync(sfxConfigPath),
          fs.readFileSync(tempZipPath)
        ]);
        
        fs.writeFileSync(sfxOutputFile, allData);
        console.log(`✅ Själv-extraherande EXE skapad: ${sfxOutputFile}`);
        
        // Ta bort temporära filer
        fs.unlinkSync(tempZipPath);
        fs.unlinkSync(sfxConfigPath);
      } else {
        throw new Error('Kunde inte hitta eller skapa SFX-stub');
      }
    } else {
      throw new Error('7-Zip hittades inte på systemet');
    }
  } catch (sfxError) {
    console.error('⚠️ Kunde inte skapa själv-extraherande arkiv:', sfxError.message);
    console.log('📦 Skapar vanlig zip-fil istället...');
    
    // Fallback: Skapa vanlig zip-fil med adm-zip
    const zipOutputFile = path.join(releasePath, `ScreammPDF_${appVersion}_Portable.zip`);
    const appZip = new AdmZip();
    
    addFolderToZip(appZip, portableDir, 'ScreammPDF');
    addFolderToZip(appZip, electronDir, 'ScreammPDF/electron');
    
    // Skapa startfil för huvudmappen
    const tempDir = path.join(distDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(tempDir, 'ScreammPDF.bat'),
      `@echo off\r\ncd "%~dp0\\ScreammPDF"\r\necho Startar ScreammPDF...\r\n.\\electron\\ScreammPDF.exe "%~dp0\\ScreammPDF"\r\n`
    );
    
    fs.writeFileSync(
      path.join(tempDir, 'README.txt'),
      `ScreammPDF Portabel Version ${appVersion}
==============================

Tack för att du använder ScreammPDF! Detta är den portabla versionen som inte kräver installation.

Instruktioner:
1. Packa upp hela ZIP-arkivet till valfri plats på din dator
2. Kör ScreammPDF.bat för att starta programmet

Obs: Behåll mapphierarkin intakt för att programmet ska fungera korrekt.

Copyright © 2025 ScreammPDF
`
    );
    
    // Lägg till filerna i roten av zip-filen
    appZip.addLocalFile(path.join(tempDir, 'ScreammPDF.bat'));
    appZip.addLocalFile(path.join(tempDir, 'README.txt'));
    
    // Spara zip-filen
    appZip.writeZip(zipOutputFile);
    console.log(`✅ Portabel ZIP-fil skapad: ${zipOutputFile}`);
    
    // Ta bort temporär mapp
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('✅ Byggnation slutförd!');
  console.log(`📄 Distributionspaket finns i: ${releasePath}`);
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
    // Ignorera symlinks helt
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