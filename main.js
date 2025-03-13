// main.js
const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

let mainWindow;

function createWindow() {
  // Hämta skärmens dimensioner
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Beräkna fönstrets dimensioner baserat på användarens önskemål
  const windowWidth = Math.round(screenWidth * 0.65);  // 65% av skärmbredden
  const windowHeight = Math.round(screenHeight * 0.95); // 95% av skärmhöjden
  
  // Centrera fönstret
  const xPos = Math.round((screenWidth - windowWidth) / 2);
  const yPos = Math.round((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: xPos,
    y: yPos,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#f7f9fc',
    title: 'ScreammPDF'
    // icon: path.join(__dirname, 'assets/icon.png') // Kommenterat tills vi har en ikon
  });

  mainWindow.loadFile('index.html');
  
  // Visa fönstret när innehållet har laddats för att undvika flimmer
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Loggmeddelande om fönsterstorlek för felsökning
    const currentSize = mainWindow.getSize();
    console.log(`Fönsterstorlek: ${currentSize[0]}x${currentSize[1]}`);
    console.log(`Skärmstorlek: ${screenWidth}x${screenHeight}`);
    console.log(`Uppskattat: ${windowWidth}x${windowHeight} (${Math.round(windowWidth/screenWidth*100)}% x ${Math.round(windowHeight/screenHeight*100)}%)`);
  });
  
  // Uncommenta för att öppna DevTools under utveckling
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Hantera öppning av PDF-filer
ipcMain.handle('open-file-dialog', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Välj PDF-fil',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      return null;
    }
    
    return filePaths[0];
  } catch (error) {
    console.error('Fel vid öppning av fildialogruta:', error);
    return null;
  }
});

// Hanterare för att extrahera text från PDF-fil
ipcMain.handle('extract-pdf-text', async (event, filePath) => {
  try {
    // Kontrollera om filen existerar
    if (!fs.existsSync(filePath)) {
      throw new Error(`Filen hittas inte: ${filePath}`);
    }
    
    // Läs PDF-filen
    const dataBuffer = fs.readFileSync(filePath);
    
    // Förbättrad sidåtergivning för att bevara textstrukturen
    const options = {
      pagerender: function(pageData) {
        return new Promise((resolve, reject) => {
          try {
            // Hämta textinnehåll med positionsinformation
            const textContent = pageData.getTextContent();
            
            // Bearbeta text när den är tillgänglig
            textContent.then(function(text) {
              let pageText = '';
              let lastY = -1;
              let textItems = [];
              
              // Samla textobjekt med positionsinformation för sortering
              for (let item of text.items) {
                // Skippa tomma textobjekt
                if (!item.str.trim()) continue;
                
                textItems.push({
                  text: item.str,
                  x: item.transform[4], // x-position
                  y: item.transform[5], // y-position
                  height: item.height
                });
              }
              
              // Gruppera textobjekt efter ungefärlig y-position (samma rad)
              // Detta hjälper att bevara originalstrukturen
              let lineGroups = {};
              
              for (let item of textItems) {
                // Använd avrundat y-värde som nyckel för att gruppera rader
                // Tolerans för små avvikelser i y-position (samma textrad)
                const yKey = Math.round(item.y * 10);
                
                if (!lineGroups[yKey]) {
                  lineGroups[yKey] = [];
                }
                
                lineGroups[yKey].push(item);
              }
              
              // Sortera gruppnycklar uppifrån och ner (y-värden är från nederst upp)
              const sortedYKeys = Object.keys(lineGroups).sort((a, b) => b - a);
              
              // För varje rad, sortera textobjekt från vänster till höger och bygg text
              for (let yKey of sortedYKeys) {
                const lineItems = lineGroups[yKey];
                
                // Sortera objekt på raden från vänster till höger (x-värden)
                lineItems.sort((a, b) => a.x - b.x);
                
                // Bygg radens text
                let lineText = lineItems.map(item => item.text).join(' ');
                
                // Lägg till rad i resultatet
                pageText += lineText + '\n';
              }
              
              // Ta bort överflödiga radbrytningar
              pageText = pageText.replace(/\n{3,}/g, '\n\n');
              
              // Returnera den bearbetade texten
              resolve(pageText);
            }).catch(err => {
              reject(new Error(`Fel vid textextraktion: ${err.message}`));
            });
          } catch (err) {
            reject(new Error(`Fel vid sidåtergivning: ${err.message}`));
          }
        });
      }
    };
    
    // Extrahera text med anpassade alternativ
    const data = await pdfParse(dataBuffer, options);
    
    // Formatera titeln om tillgänglig
    let title = data.info?.Title || '';
    if (title) {
      title = `Titel: ${title}`;
    } else {
      title = `Titel: ${path.basename(filePath, '.pdf')}`;
    }
    
    // Formatera författaren om tillgänglig
    let author = data.info?.Author || '';
    if (author) {
      author = `\nFörfattare: ${author}`;
    }
    
    // Lägg till metadata och sidnumrering
    let formattedText = `${title}${author}\nAntal sidor: ${data.numpages}\n\n`;
    
    // Dela upp text i sidor för bättre läsbarhet
    const pages = data.text.split(/\f/);
    
    // Lägg till varje sida med en markör
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].trim()) {
        // Lägg till sidnummer och innehåll
        formattedText += `--- Sida ${i + 1} ---\n\n${pages[i].trim()}\n\n`;
      }
    }
    
    // Rensa överflödiga radbrytningar och mellanslag
    formattedText = formattedText
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    return formattedText;
  }
  catch (error) {
    console.error('Fel vid textextraktion:', error);
    return `Fel vid extrahering av text: ${error.message}`;
  }
});
