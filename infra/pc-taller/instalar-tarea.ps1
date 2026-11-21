# Instala en la PC del taller la copia automatica de respaldos, descargados DIRECTO del servidor (sin nube).
# Ejecutar UNA vez, en PowerShell como el usuario que usa la PC:
#   powershell -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Servidor app.tecnicentrosanchez.com
#
# Que hace:
#  1. Crea la llave SSH de esta PC (si no existe) y la muestra para instalarla en el servidor.
#  2. Crea rclone.conf apuntando al servidor (usuario "respaldos", solo lectura).
#  3. Protege C:\RespaldosTaller (solo este usuario y Administradores: hay datos personales).
#  4. Programa la copia a las 07:00, 13:00 y 19:00; si la PC estaba apagada, corre apenas se prenda.
#  5. Hace la primera copia.

param(
  [Parameter(Mandatory = $true)][string]$Servidor,
  [string]$Destino = 'C:\RespaldosTaller'
)

$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'copiar-respaldos.ps1'
$rclone = Join-Path $PSScriptRoot 'rclone.exe'
$config = Join-Path $PSScriptRoot 'rclone.conf'
$llave = Join-Path $PSScriptRoot 'llave_respaldos'

if (-not (Test-Path $rclone)) { throw "Falta rclone.exe en $PSScriptRoot (ver LEEME.md, paso 2)." }
if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
  throw 'Falta OpenSSH (ssh-keygen). Windows 10/11: Configuracion > Aplicaciones > Caracteristicas opcionales > Cliente OpenSSH.'
}

# 1. Llave SSH propia de esta PC (sin contrasena, para que la tarea corra sola). Solo este usuario puede leerla.
if (-not (Test-Path $llave)) {
  & ssh-keygen -t ed25519 -N '""' -C "pc-taller-$env:COMPUTERNAME" -f $llave | Out-Null
  & icacls $llave /inheritance:r /grant:r "$($env:USERNAME):F" | Out-Null
}

# 2. Configuracion de rclone apuntando al servidor.
@(
  '[vps]',
  'type = sftp',
  "host = $Servidor",
  'user = respaldos',
  "key_file = $llave",
  'shell_type = none',
  'disable_hashcheck = true'
) | Set-Content -Path $config -Encoding ASCII

Write-Host ''
Write-Host '=== Llave publica de esta PC ===' -ForegroundColor Yellow
Get-Content "$llave.pub"
Write-Host ''
Write-Host 'En el SERVIDOR ejecute (una sola vez):' -ForegroundColor Yellow
Write-Host "  sudo bash infra/servidor-respaldos.sh `"$((Get-Content "$llave.pub").Trim())`""
Write-Host ''
Read-Host 'Cuando lo haya ejecutado en el servidor, presione Enter para continuar'

# 3. Carpeta protegida: sin herencia, solo el usuario actual y Administradores (SID: sirve en Windows en espanol o ingles).
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
& icacls $Destino /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" '*S-1-5-32-544:(OI)(CI)F' | Out-Null

# 4. Tarea programada: 3 veces al dia (los respaldos del servidor se hacen a las 00, 06, 12 y 18 h).
$accion = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -Destino `"$Destino`""
$cuando = @('07:00', '13:00', '19:00') | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
$opciones = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$quien = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
Register-ScheduledTask -TaskName 'Respaldo Taller Sanchez' -Action $accion -Trigger $cuando -Settings $opciones `
  -Principal $quien -Description 'Copia los respaldos del sistema del taller desde el servidor (SFTP, solo lectura).' -Force | Out-Null

# 5. Primera copia.
Write-Host 'Tarea instalada. Haciendo la primera copia...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Destino $Destino
if ($LASTEXITCODE -eq 0) { Write-Host "Listo: los respaldos estan en $Destino" -ForegroundColor Green }
else { Write-Host 'La primera copia fallo: revise el aviso en el escritorio y C:\RespaldosTaller\registro.log' -ForegroundColor Red }
