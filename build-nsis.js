const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const AdmZip = require('adm-zip');

console.log('🚀 Startar NSIS bygglösning för ScreammPDF...');

// Sökvägar
const distDir = path.join(__dirname, 'dist');
const portableDir = path.join(distDir, 'portable');
const electronDir = path.join(distDir, 'electron');
const releasePath = path.join(distDir, 'release');
const nsisDir = path.join(distDir, 'nsis');
const appVersion = packageJson.version;
const nsisOutputFile = path.join(releasePath, `ScreammPDF_${appVersion}_Portable_Installer.exe`);

// Skapa mappar
[distDir, portableDir, electronDir, releasePath, nsisDir].forEach(dir => {
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
    `@echo off\r\necho Startar ScreammPDF...\r\n.\\..\\electron\\ScreammPDF.exe "%~dp0"\r\npause\r\n`
  );
  
  // Skapa en README-fil
  fs.writeFileSync(
    path.join(portableDir, 'README.txt'),
    `ScreammPDF Portabel Version ${appVersion}
==============================

Tack för att du använder ScreammPDF! Detta är den portabla versionen som inte kräver installation.

För att starta programmet:
1. Klicka på ScreammPDF.bat

Copyright © 2025 ScreammPDF
`
  );

  // Skapa NSIS-skript
  console.log('📝 Skapar NSIS-skript...');
  const nsisScript = path.join(nsisDir, 'portable.nsi');
  fs.writeFileSync(nsisScript, `
; ScreammPDF SFX NSIS-skript
; Författad av autobyggskript

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Allmän konfiguration
Name "ScreammPDF ${appVersion} Portabel"
OutFile "${nsisOutputFile}"
Unicode true
SetCompressor /SOLID lzma
RequestExecutionLevel user

; Standarddestination (temporär mapp)
InstallDir "$TEMP\\ScreammPDF_Portable"

; Gränssnittskomponenter
!define MUI_ICON "${path.join(__dirname, 'resources', 'app-icon.ico').replace(/\\/g, '\\\\')}"
!define MUI_WELCOMEPAGE_TITLE "ScreammPDF ${appVersion} Portabel"
!define MUI_WELCOMEPAGE_TEXT "Välkommen till ScreammPDF - ett elegant verktyg för att extrahera och formatera text från PDF-filer.$\\r$\\n$\\r$\\nDetta självuppackande arkiv kommer att packa upp den portabla versionen av ScreammPDF till en plats du väljer och ge dig alternativet att köra programmet omedelbart.$\\r$\\n$\\r$\\nKlicka på 'Nästa' för att fortsätta."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Välj en mapp där du vill packa upp ScreammPDF. Du kan sedan köra programmet direkt därifrån utan installation."
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Uppackning slutförd"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Alla filer har packats upp."
!define MUI_FINISHPAGE_TITLE "ScreammPDF är klar att använda"
!define MUI_FINISHPAGE_TEXT "ScreammPDF har packats upp till den valda platsen. Du kan nu köra programmet."
!define MUI_FINISHPAGE_RUN "$INSTDIR\\start.bat"
!define MUI_FINISHPAGE_RUN_TEXT "Starta ScreammPDF nu"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Visa README-filen"

; Sidsekvens
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Språk
!insertmacro MUI_LANGUAGE "Swedish"

; Installationsavsnitt
Section "Packa upp" SecUnpack
  SetOutPath "$INSTDIR"
  
  ; Skapa en startfil i roten
  FileOpen $9 "$INSTDIR\\start.bat" w
  FileWrite $9 "@echo off$\\r$\\n"
  FileWrite $9 "echo Startar ScreammPDF...$\\r$\\n"
  FileWrite $9 "cd .\\\\ScreammPDF$\\r$\\n"
  FileWrite $9 "..\\\\electron\\\\ScreammPDF.exe .$\\r$\\n"
  FileWrite $9 "exit$\\r$\\n"
  FileClose $9
  
  ; Kopiera README
  File "/oname=$INSTDIR\\README.txt" "${path.join(portableDir, 'README.txt').replace(/\\/g, '\\\\')}"
  
  ; Skapa app-mappen och kopiera filer
  CreateDirectory "$INSTDIR\\ScreammPDF"
  CreateDirectory "$INSTDIR\\electron"
  
  ; Kopiera applikationsfiler
  SetOutPath "$INSTDIR\\ScreammPDF"
  File /r "${portableDir.replace(/\\/g, '\\\\')}\\*.*"
  
  ; Kopiera Electron
  SetOutPath "$INSTDIR\\electron"
  File /r "${electronDir.replace(/\\/g, '\\\\')}\\*.*"
  
  ; Skriv uppackningsinformation
  WriteUninstaller "$INSTDIR\\unpack_info.txt"
SectionEnd

  `);

  // Skapa ikon för applikationen om den inte finns
  const iconPath = path.join(__dirname, 'resources', 'app-icon.ico');
  if (!fs.existsSync(iconPath)) {
    console.log('⚠️ Ingen applikationsikon hittades, skapar en standard-ikon...');
    fs.copyFileSync(
      path.join(electronDir, 'resources', 'default_app', 'icon.ico'), 
      iconPath
    );
  }

  // Kör NSIS om tillgängligt
  console.log('🔧 Försöker bygga med NSIS...');
  try {
    // Försök hitta NSIS
    const makensisPath = findMakeNsis();
    
    if (makensisPath) {
      console.log('✅ NSIS hittades:', makensisPath);
      execSync(`"${makensisPath}" "${nsisScript}"`, { stdio: 'inherit' });
      
      if (fs.existsSync(nsisOutputFile)) {
        console.log(`✅ NSIS-installer skapad: ${nsisOutputFile}`);
      } else {
        throw new Error('NSIS genererade ingen output-fil');
      }
    } else {
      throw new Error('NSIS (makensis.exe) hittades inte på systemet');
    }
  } catch (nsisError) {
    console.error('⚠️ Kunde inte skapa NSIS-installer:', nsisError.message);
    console.log('📦 Skapar vanlig zip-fil istället...');
    
    // Fallback: Skapa vanlig zip-fil
    const zipOutputFile = path.join(releasePath, `ScreammPDF_${appVersion}_Portable.zip`);
    const appZip = new AdmZip();
    
    // Skapa startfil för huvudmappen
    const tempDir = path.join(distDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(tempDir, 'ScreammPDF.bat'),
      `@echo off\r\ncd "%~dp0\\ScreammPDF"\r\necho Startar ScreammPDF...\r\n.\\..\\electron\\ScreammPDF.exe .\r\n`
    );
    
    fs.writeFileSync(
      path.join(tempDir, 'README.txt'),
      `ScreammPDF Portabel Version ${appVersion}
==============================

Tack för att du använder ScreammPDF! Detta är den portabla versionen som inte kräver installation.

Instruktioner:
1. Packa upp hela ZIP-arkivet till valfri plats på din dator
2. Kör ScreammPDF.bat för att starta programmet

Copyright © 2025 ScreammPDF
`
    );
    
    // Skapa zipfilen med alla nödvändiga filer
    appZip.addLocalFile(path.join(tempDir, 'ScreammPDF.bat'));
    appZip.addLocalFile(path.join(tempDir, 'README.txt'));
    addFolderToZip(appZip, portableDir, 'ScreammPDF');
    addFolderToZip(appZip, electronDir, 'electron');
    
    // Spara zipfilen
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

// Hjälpfunktion för att hitta makensis.exe
function findMakeNsis() {
  const possiblePaths = [
    'C:\\Program Files\\NSIS\\makensis.exe',
    'C:\\Program Files (x86)\\NSIS\\makensis.exe'
  ];
  
  for (const nsisPath of possiblePaths) {
    if (fs.existsSync(nsisPath)) {
      return nsisPath;
    }
  }
  
  return null;
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