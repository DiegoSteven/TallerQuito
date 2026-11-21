# Copia de los respaldos del sistema del taller a ESTA PC (segunda copia, fuera del servidor).
#
# Descarga DIRECTO DEL SERVIDOR (SFTP cifrado, usuario de solo lectura) los respaldos que se hacen cada 6 h.
# No usa ningun servicio en la nube.
#  - Usa "copy": nunca borra nada de esta PC, aunque se borre en el servidor.
#  - Guarda los diarios de los ultimos 90 dias; semanales y mensuales se guardan siempre.
#  - Si algo falla, o si el respaldo mas nuevo es viejo, deja un aviso en el ESCRITORIO.
#
# Lo ejecuta solo la tarea programada (ver instalar-tarea.ps1). Para probarlo a mano:
#   powershell -ExecutionPolicy Bypass -File .\copiar-respaldos.ps1

param(
  [string]$Destino = 'C:\RespaldosTaller',
  [string]$Remoto = 'vps:/datos',
  [string]$Rclone = (Join-Path $PSScriptRoot 'rclone.exe'),
  [string]$Config = (Join-Path $PSScriptRoot 'rclone.conf'),
  # Si el respaldo mas reciente tiene mas horas que esto, el servidor no esta respaldando: se avisa.
  [int]$HorasMaximas = 36,
  [int]$DiasDiarios = 90,
  [string]$ArchivoAlerta = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'ALERTA - RESPALDO DEL TALLER.txt')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$registro = Join-Path $Destino 'registro.log'

function Escribir([string]$mensaje) {
  $linea = "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $mensaje"
  Add-Content -Path $registro -Value $linea -Encoding UTF8
  Write-Host $linea
}

try {
  if (-not (Test-Path $Rclone)) { throw "No se encuentra rclone.exe en $Rclone" }
  if (-not (Test-Path $Config)) { throw "No se encuentra la configuracion $Config" }

  Escribir 'Descargando respaldos desde el servidor...'
  & $Rclone --config $Config copy $Remoto $Destino --exclude 'registro.log' --log-level NOTICE
  if ($LASTEXITCODE -ne 0) { throw "No se pudo conectar con el servidor (codigo $LASTEXITCODE). Revise internet; si sigue, el servidor puede estar caido." }

  $ultimo = Get-ChildItem -Path $Destino -Recurse -Filter 'taller_*.dump' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $ultimo) { throw 'No hay ningun respaldo en la copia local.' }

  $horas = [int]((Get-Date) - $ultimo.LastWriteTime).TotalHours
  if ($horas -gt $HorasMaximas) {
    throw "El respaldo mas reciente ($($ultimo.Name)) tiene $horas horas. El servidor no esta respaldando: avise a soporte."
  }

  # Diarios viejos: se borran solo los de esta PC (semanales y mensuales se conservan siempre).
  $carpetaDiarios = Join-Path $Destino 'diarios'
  if (Test-Path $carpetaDiarios) {
    Get-ChildItem -Path $carpetaDiarios -Filter '*.dump' |
      Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$DiasDiarios) } |
      Remove-Item -Force
  }

  $total = (Get-ChildItem -Path $Destino -Recurse -Filter '*.dump').Count
  Escribir "OK: copia al dia. Mas reciente: $($ultimo.Name) (hace $horas h). Respaldos en esta PC: $total."
  if (Test-Path $ArchivoAlerta) { Remove-Item $ArchivoAlerta -Force }
  exit 0
}
catch {
  $error1 = $_.Exception.Message
  Escribir "ERROR: $error1"
  @(
    'ATENCION: la copia de seguridad del sistema del taller NO se pudo actualizar.',
    '',
    "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "Motivo: $error1",
    '',
    'Que hacer: verifique que la PC tenga internet. Si el aviso sigue al dia siguiente, avise a soporte.',
    "Detalle: $registro",
    '',
    'Este archivo se borra solo cuando la copia vuelve a funcionar.'
  ) | Set-Content -Path $ArchivoAlerta -Encoding UTF8
  exit 1
}
