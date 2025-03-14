# Hur man lägger till en skärmdump i README

Följ dessa steg för att ta en skärmdump av ScreammPDF-appen och lägga till den i README.md-filen.

## Steg 1: Ta en skärmdump i Windows

Det finns flera sätt att ta en skärmdump i Windows:

### Metod 1: Skärmklippsverktyget (Snipping Tool)
1. Öppna ScreammPDF-appen och se till att den visar ett exempel på extraherad text
2. Öppna Skärmklippsverktyget (sök efter "Skärmklipp" i startmenyn)
3. Klicka på "Ny" och dra musen över ScreammPDF-fönstret för att markera det
4. Spara bilden genom att klicka på diskettikonen

### Metod 2: Windows-tangenten + Shift + S
1. Öppna ScreammPDF-appen och se till att den visar ett exempel på extraherad text
2. Tryck på **Windows-tangenten + Shift + S**
3. Dra musen över ScreammPDF-fönstret för att markera det
4. Bilden kopieras till urklippet
5. Öppna Paint eller ett annat bildprogram
6. Klistra in skärmdumpen (Ctrl+V)
7. Spara bilden som PNG

### Metod 3: Alt + PrtScn
1. Öppna ScreammPDF-appen och fokusera på fönstret
2. Tryck på **Alt + PrtScn** (Print Screen)
3. Öppna Paint eller ett annat bildprogram
4. Klistra in skärmdumpen (Ctrl+V)
5. Spara bilden som PNG

## Steg 2: Spara skärmdumpen i projektet

1. Spara skärmdumpen med namnet **app-screenshot.png**
2. Kopiera filen till **resources**-mappen i ScreammPDF-projektet

## Steg 3: Redigera README.md

1. Ta bort kommentarerna i README.md som innehåller instruktioner för att lägga till skärmdumpen
2. Säkerställ att sökvägen till bilden är korrekt: `resources/app-screenshot.png`
3. Spara README.md-filen

När dessa steg är slutförda bör GitHub README visa skärmdumpen korrekt. 