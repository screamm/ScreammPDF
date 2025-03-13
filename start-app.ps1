# PowerShell-skript för att starta ScreammPDF-appen
# Detta löser problemet med att köra kommandot "cd dist && ScreammPDF.bat" i PowerShell
# som inte stöder && som kommandoseparator

Write-Host "Startar ScreammPDF..." -ForegroundColor Cyan

# Gå till dist-mappen
Push-Location -Path "dist"

try {
    # Kör bat-filen
    Write-Host "Kör ScreammPDF.bat..." -ForegroundColor Green
    & .\ScreammPDF.bat
}
catch {
    Write-Host "Ett fel uppstod: $_" -ForegroundColor Red
}
finally {
    # Återgå till ursprunglig mapp
    Pop-Location
}

Write-Host "Skriptet har slutförts" -ForegroundColor Cyan 