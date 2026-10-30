@echo off
setlocal

echo === CMMS Libre: construyendo CMMSLibre.exe ===

echo.
echo [1/5] Compilando el frontend (npm run build)...
pushd frontend
call npm install || goto :error
call npm run build || goto :error
popd

echo.
echo [2/5] Preparando el entorno virtual del backend...
pushd backend
if not exist .venv (
    python -m venv .venv || goto :error
)
call .venv\Scripts\pip install --quiet --upgrade pip || goto :error
call .venv\Scripts\pip install --quiet -r requirements.txt waitress pyinstaller || goto :error

echo.
echo [3/5] Recolectando estaticos (admin, DRF)...
call .venv\Scripts\python manage.py collectstatic --noinput || goto :error

echo.
echo [4/5] Empaquetando con PyInstaller (puede tardar varios minutos)...
call .venv\Scripts\python -m PyInstaller --onefile --name CMMSLibre iniciar.py ^
  --collect-all django ^
  --collect-all rest_framework ^
  --collect-all django_filters ^
  --collect-all corsheaders ^
  --collect-submodules apps ^
  --add-data "apps;apps" ^
  --add-data "..\frontend\dist;frontend_dist" ^
  --add-data "staticfiles;static_collected" ^
  --noconfirm || goto :error

popd

echo.
echo [5/5] Listo: backend\dist\CMMSLibre.exe
echo Doble clic para ejecutarlo; la primera vez carga los usuarios de demostracion
echo (admin/admin12345, planificador1/demo12345, etc. - ver README.md).
goto :eof

:error
echo.
echo Fallo la construccion. Revisa el mensaje de error de arriba.
exit /b 1
