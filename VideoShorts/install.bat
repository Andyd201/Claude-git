@echo off
echo =========================================
echo   VideoShorts - Installation
echo =========================================
echo.

REM Verifier Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
    echo Telecharge Python sur https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verifier ffmpeg
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ATTENTION] ffmpeg n'est pas trouve dans le PATH.
    echo.
    echo Installe ffmpeg :
    echo   1. Telecharge sur https://www.gyan.dev/ffmpeg/builds/
    echo   2. Extrais dans C:\ffmpeg
    echo   3. Ajoute C:\ffmpeg\bin au PATH Windows
    echo.
    pause
)

echo [1/2] Installation des dependances Python...
pip install -r requirements.txt

echo.
echo [2/2] Telechargement du modele Whisper (base ~140MB)...
python -c "import whisper; whisper.load_model('base'); print('Modele Whisper OK')"

echo.
echo =========================================
echo   Installation terminee !
echo   Lance l'app avec : run.bat
echo =========================================
pause
