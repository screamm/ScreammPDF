// renderer.js
document.addEventListener('DOMContentLoaded', () => {
  // Hämta DOM-element
  const openPdfBtn = document.getElementById('openPdfBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');
  const updatePreviewBtn = document.getElementById('updatePreviewBtn');
  const textPreview = document.getElementById('textPreview');
  const fileInfo = document.getElementById('fileInfo');
  const statusMessage = document.getElementById('statusMessage');
  const customEncodingInput = document.getElementById('customEncoding');
  const previewOverlay = document.getElementById('previewOverlay');
  
  // Textförstorings-knappar
  const zoomInBtn = document.querySelector('.utility-button:first-child');
  const zoomOutBtn = document.querySelector('.utility-button:last-child');
  
  // Radioknappar och checkboxar för formatering
  const formatRadios = document.querySelectorAll('input[name="format"]');
  const encodingRadios = document.querySelectorAll('input[name="encoding"]');
  const optionTrim = document.getElementById('optionTrim');
  const optionNormalize = document.getElementById('optionNormalize');
  const optionLowercase = document.getElementById('optionLowercase');
  const optionUppercase = document.getElementById('optionUppercase');
  const encodingCustomRadio = document.getElementById('encodingCustom');
  
  let extractedText = '';
  let currentFilePath = '';
  let fontSize = 14; // Basstorlek för text i pixlar
  
  // Säkerställ att overlay är dolt vid start
  previewOverlay.classList.remove('active');
  previewOverlay.style.display = 'none';
  
  // Initialisera gränssnittet
  function initializeUI() {
    console.log('Initialiserar UI');
    
    // Sätt startstorlek på texten
    textPreview.style.fontSize = `${fontSize}px`;
    
    // Säkerställ att overlay är helt dolt vid start
    previewOverlay.classList.remove('active');
    previewOverlay.style.display = 'none';
    previewOverlay.style.pointerEvents = 'none';
    previewOverlay.style.visibility = 'hidden';
    
    console.log('Overlay inställningar vid start:', {
      display: previewOverlay.style.display,
      pointerEvents: previewOverlay.style.pointerEvents,
      visibility: previewOverlay.style.visibility,
      hasActiveClass: previewOverlay.classList.contains('active')
    });
    
    // Inaktivera knappar som kräver data
    copyTextBtn.disabled = true;
    updatePreviewBtn.disabled = true;
    
    // Förbättra klickbarhet för alla radioknappar och checkboxar
    setupDirectClicks();
    
    // Lägg till diagnostisk klick-händelselyssnare för felsökning
    document.body.addEventListener('click', (e) => {
      console.log('Klick på:', e.target, e.target.tagName, 'Position:', e.clientX, e.clientY);
      
      // Kontrollera om klick blockeras
      if (e.target.tagName === 'BODY') {
        console.warn('Klick på body - möjligen blockerat av overlay');
        
        // Kontrollera om overlay är synligt
        const overlayStyle = window.getComputedStyle(previewOverlay);
        console.log('Overlay status vid klick:', {
          display: overlayStyle.display,
          pointerEvents: overlayStyle.pointerEvents,
          visibility: overlayStyle.visibility,
          opacity: overlayStyle.opacity,
          hasActiveClass: previewOverlay.classList.contains('active')
        });
      }
    });
  }
  
  // Funktion för att förbättra klickbarhet genom direkta eventlyssnare
  function setupDirectClicks() {
    // Förbättra alla option-items genom att lägga till direkta eventlyssnare
    const optionItems = document.querySelectorAll('.option-item');
    console.log(`Konfigurerar direktklick för ${optionItems.length} alternativposters`);
    
    optionItems.forEach(item => {
      // Hitta radio/checkbox input och label
      const input = item.querySelector('input[type="radio"], input[type="checkbox"]');
      const label = item.querySelector('label');
      
      if (input && label) {
        console.log(`Konfigurerar klicklyssnare för ${input.id}`);
        
        // Lägg till klicklyssnare direkt på hela option-item
        item.addEventListener('click', (e) => {
          console.log(`Klick på option-item för ${input.id}`);
          
          // Exkludera klick på input själv (för att undvika dubbla triggers)
          if (e.target !== input) {
            if (input.type === 'radio') {
              input.checked = true;
              console.log(`Radio ${input.id} satt till checked via direktklick`);
            } else {
              input.checked = !input.checked;
              console.log(`Checkbox ${input.id} växlad till ${input.checked} via direktklick`);
            }
            
            // Manuellt trigga ändrings-event
            const event = new Event('change');
            input.dispatchEvent(event);
          }
        });
        
        // Gör label klickbar genom att explicit ansluta det till input
        label.addEventListener('click', (e) => {
          console.log(`Klick på label för ${input.id}`);
          e.preventDefault(); // Förhindra standardbeteende
          
          if (input.type === 'radio') {
            input.checked = true;
          } else {
            input.checked = !input.checked;
          }
          
          // Manuellt trigga ändrings-event
          const event = new Event('change');
          input.dispatchEvent(event);
          
          // Stoppa händelsefortplantning för att förhindra dubbla triggers
          e.stopPropagation();
        });
      }
    });
  }
  
  // Kör initialisering
  initializeUI();
  
  // Hjälpfunktion för att diagnostisera elementöverlappning (z-index problem)
  function debugElementAtPosition(x, y) {
    console.log('Debug element på position:', x, y);
    let elements = [];
    
    // Hitta alla element på positionen
    const elementsAtPoint = document.elementsFromPoint(x, y);
    
    // Visa information om dessa element
    elementsAtPoint.forEach((element, index) => {
      const style = window.getComputedStyle(element);
      elements.push({
        index: index,
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        zIndex: style.zIndex,
        position: style.position,
        display: style.display,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity
      });
    });
    
    console.table(elements);
    return elements;
  }
  
  // Lägg till speciell debug-knapp
  document.addEventListener('keydown', (e) => {
    // När användaren trycker Ctrl+Alt+D
    if (e.ctrlKey && e.altKey && e.key === 'd') {
      console.log('-- Debug-läge aktiverat --');
      
      // Lägg till klicklyssnare för att debugga
      const debugClickHandler = (e) => {
        console.log('DEBUG-klick på position:', e.clientX, e.clientY);
        const elements = debugElementAtPosition(e.clientX, e.clientY);
        
        // Kontrollera om det finns något element som kan blockera klick
        const possibleBlockers = elements.filter(el => 
          el.pointerEvents !== 'none' && 
          el.visibility !== 'hidden' && 
          el.display !== 'none' && 
          parseFloat(el.opacity) > 0
        );
        
        if (possibleBlockers.length > 1) {
          console.warn('Möjliga blockerande element:', possibleBlockers);
        }
        
        // Ta bort lyssnaren efter ett klick
        document.removeEventListener('click', debugClickHandler);
        console.log('-- Debug-läge avslutat --');
      };
      
      document.addEventListener('click', debugClickHandler);
    }
  });
  
  // Visa laddningsanimation
  function showLoading(show = true) {
    console.log('showLoading:', show);
    if (show) {
      // Först sätt display style
      previewOverlay.style.display = 'flex';
      // Använd setTimeout för att tillåta browser repaint innan active-klassen läggs till
      setTimeout(() => {
        previewOverlay.classList.add('active');
        console.log('Overlay aktiverad, pointer-events bör vara auto');
      }, 10);
    } else {
      // Först ta bort active class (som har pointer-events: auto)
      previewOverlay.classList.remove('active');
      console.log('Overlay inaktiverad, pointer-events bör vara none');
      // Vänta på att övergången är klar innan vi döljer elementet helt
      setTimeout(() => {
        previewOverlay.style.display = 'none';
        console.log('Overlay dold, display: none');
        
        // Säkerställ att pointer-events faktiskt är none
        previewOverlay.style.pointerEvents = 'none';
        
        // Dubbelkoll att overlay är korrekt dold
        if (window.getComputedStyle(previewOverlay).display !== 'none') {
          console.warn('Overlay är inte korrekt dold, tvingar display: none');
          previewOverlay.style.display = 'none';
        }
      }, 300); // Samma tid som övergången
    }
  }
  
  // Visa statustmeddelande
  function showStatus(message, isError = false) {
    const icon = isError ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-check-circle"></i>';
    statusMessage.innerHTML = icon + ' ' + message;
    statusMessage.classList.add('status-visible');
    
    if (isError) {
      statusMessage.classList.add('status-error');
      statusMessage.classList.remove('status-success');
    } else {
      statusMessage.classList.add('status-success');
      statusMessage.classList.remove('status-error');
    }
    
    setTimeout(() => {
      statusMessage.classList.remove('status-visible');
    }, 3000);
  }
  
  // Justera textstorlek
  function adjustFontSize(increase = true) {
    if (increase) {
      fontSize = Math.min(fontSize + 2, 24); // Max 24px
    } else {
      fontSize = Math.max(fontSize - 2, 10); // Min 10px
    }
    textPreview.style.fontSize = `${fontSize}px`;
  }
  
  // Zooma in-knapp
  zoomInBtn.addEventListener('click', () => {
    adjustFontSize(true);
  });
  
  // Zooma ut-knapp
  zoomOutBtn.addEventListener('click', () => {
    adjustFontSize(false);
  });
  
  // Aktivera/inaktivera anpassad kodningsinmatning
  encodingCustomRadio.addEventListener('change', () => {
    customEncodingInput.disabled = !encodingCustomRadio.checked;
    if (encodingCustomRadio.checked) {
      customEncodingInput.focus();
    }
  });
  
  // Förhindra att flera textbehandlingsalternativ är valda samtidigt
  optionLowercase.addEventListener('change', () => {
    if (optionLowercase.checked) {
      optionUppercase.checked = false;
    }
    updatePreview();
  });
  
  optionUppercase.addEventListener('change', () => {
    if (optionUppercase.checked) {
      optionLowercase.checked = false;
    }
    updatePreview();
  });
  
  // Uppdatera förhandsgranskning när alternativ ändras
  formatRadios.forEach(radio => {
    radio.addEventListener('change', updatePreview);
  });
  
  encodingRadios.forEach(radio => {
    radio.addEventListener('change', updatePreview);
  });
  
  optionTrim.addEventListener('change', updatePreview);
  optionNormalize.addEventListener('change', updatePreview);
  customEncodingInput.addEventListener('input', updatePreview);
  
  // Öppna PDF
  openPdfBtn.addEventListener('click', async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog();
      
      if (filePath) {
        currentFilePath = filePath;
        
        // Uppdatera filinfo
        const fileName = filePath.split('\\').pop().split('/').pop();
        fileInfo.innerHTML = `<i class="fas fa-file-pdf file-info-icon"></i><span>Fil: ${fileName}</span>`;
        
        // Visa laddningsanimation
        showLoading(true);
        textPreview.textContent = 'Hämtar text från PDF...';
        
        // Extrahera text från PDF
        const text = await window.electronAPI.extractPdfText(filePath);
        
        // Dölj laddningsanimation
        showLoading(false);
        
        if (text) {
          extractedText = text;
          updatePreview();
          copyTextBtn.disabled = false;
          updatePreviewBtn.disabled = false;
          showStatus('PDF-text har extraherats framgångsrikt!');
        } else {
          textPreview.textContent = 'Kunde inte extrahera text från PDF-filen.';
          copyTextBtn.disabled = true;
          updatePreviewBtn.disabled = true;
          showStatus('Kunde inte extrahera text från PDF-filen.', true);
        }
      }
    } catch (error) {
      showLoading(false);
      console.error('Fel vid öppning av PDF:', error);
      showStatus('Ett fel inträffade: ' + error.message, true);
    }
  });
  
  // Uppdatera förhandsgranskningen
  function updatePreview() {
    if (!extractedText) return;
    
    // Visa laddningsanimation för komplexa operationer
    if (extractedText.length > 10000) {
      showLoading(true);
      
      // Använd setTimeout för att låta UI uppdateras innan tung beräkning
      setTimeout(() => {
        processAndDisplayText();
        showLoading(false);
      }, 50);
    } else {
      processAndDisplayText();
    }
  }
  
  // Bearbeta och visa text
  function processAndDisplayText() {
    // Hämta valda alternativ
    const formatOption = document.querySelector('input[name="format"]:checked').value;
    const encodingOption = document.querySelector('input[name="encoding"]:checked').value;
    
    // Tillämpa textbehandling
    let processedText = extractedText;
    
    if (optionTrim.checked) {
      processedText = processedText.trim();
    }
    
    if (optionNormalize.checked) {
      processedText = processedText.replace(/\s+/g, ' ');
    }
    
    if (optionLowercase.checked) {
      processedText = processedText.toLowerCase();
    }
    
    if (optionUppercase.checked) {
      processedText = processedText.toUpperCase();
    }
    
    // Formatera texten enligt valt alternativ
    let formattedText = processedText;
    let useInnerHTML = false; // Standardinställning för att använda textContent
    
    switch (formatOption) {
      case 'oneline':
        // Ta bort radbrytningar
        formattedText = processedText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        break;
        
      case 'markdown':
        // Formatera som markdown codeblock
        formattedText = '```\n' + processedText + '\n```';
        break;
        
      case 'html':
        // Formatera som HTML
        formattedText = processedText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>');
        formattedText = '<pre>' + formattedText + '</pre>';
        useInnerHTML = true;
        break;
        
      case 'json':
        // Formatera som JSON
        try {
          formattedText = JSON.stringify({ 
            content: processedText,
            metadata: {
              processed: true,
              timestamp: new Date().toISOString(),
              format: 'json'
            }
          }, null, 2);
        } catch (err) {
          formattedText = JSON.stringify({ content: processedText });
          console.error('Fel vid JSON-formatering:', err);
        }
        break;
        
      case 'plain':
      default:
        // Förbättrad formatering med HTML för att bevara textstrukturen
        // men med visuella förbättringar
        
        // Kapsla in metadata, sidnumrering och textinnehåll med bättre formatering
        useInnerHTML = true;
        
        // Rensa HTML-specialtecken först för säkerhet
        let safeText = processedText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        
        // Extrahera och formatera metadata om den finns
        const metadataMatch = safeText.match(/^(Titel:.+?\nAntal sidor:.+?)(?:\n\n|\n)([\s\S]+)$/);
        let metadata = '';
        let mainContent = safeText;
        
        if (metadataMatch) {
          metadata = `<div class="metadata">${metadataMatch[1].replace(/\n/g, '<br>')}</div>`;
          mainContent = metadataMatch[2];
        }
        
        // Konvertera sidmarkörer till formaterade div-element
        mainContent = mainContent.replace(/--- Sida (\d+) ---/g, 
          '<div class="page-marker">Sida $1</div>');
        
        // Formatera stycken (identifieras av dubbla radbrytningar)
        mainContent = mainContent
          .split(/\n\n+/)
          .map(paragraph => {
            // Hoppa över om det är ett tomt stycke
            if (!paragraph.trim()) return '';
            
            // Kontrollera om stycket redan är en sidmarkör
            if (paragraph.includes('class="page-marker"')) {
              return paragraph;
            }
            
            // För vanliga stycken, bevara interna radbrytningar
            return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
          })
          .join('\n');
        
        formattedText = metadata + mainContent;
        break;
    }
    
    // Visa förhandsgranskning
    if (useInnerHTML) {
      textPreview.innerHTML = formattedText;
    } else {
      textPreview.textContent = formattedText;
    }
  }
  
  // Knapp för att uppdatera förhandsgranskning
  updatePreviewBtn.addEventListener('click', () => {
    updatePreview();
    showStatus('Förhandsgranskning uppdaterad!');
  });
  
  // Kopiera text med valt format
  copyTextBtn.addEventListener('click', () => {
    // Använd texten från förhandsgranskningen
    const textToCopy = textPreview.textContent;
    
    // Kopiera till urklipp
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showStatus('Text kopierad till urklipp!');
        
        // Visuell feedback på knappen
        copyTextBtn.classList.add('success-flash');
        setTimeout(() => {
          copyTextBtn.classList.remove('success-flash');
        }, 300);
      })
      .catch(err => {
        console.error('Kunde inte kopiera text: ', err);
        showStatus('Kunde inte kopiera text till urklipp.', true);
      });
  });
});
  