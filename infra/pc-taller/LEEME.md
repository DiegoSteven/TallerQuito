# Copia de respaldos en la PC del taller

Copia de la información **dentro del taller**, descargada **directo del servidor**. No usa ningún servicio en la nube,
así que no hay nada que pagar ni límites que vigilar.

```
Servidor (respaldo cada 6 h) ──── SFTP cifrado, solo lectura ────► PC del taller (07:00 · 13:00 · 19:00)
```

## Seguridad

- En el servidor, la PC entra con el usuario **`respaldos`**, que:
  - **solo puede leer** los respaldos (no puede borrarlos ni modificarlos);
  - no tiene consola ni ve el resto del servidor;
  - entra con una **llave** propia de esta PC, sin contraseña que se pueda robar.
- En la PC, la carpeta `C:\RespaldosTaller` y la llave quedan solo para el usuario de la PC y los administradores.

## Instalación (una sola vez)

1. Copie esta carpeta `pc-taller` a la PC, por ejemplo a `C:\Taller\pc-taller`.
2. Descargue **rclone para Windows** (https://rclone.org/downloads/ → *Windows, Intel/AMD 64 bit*). Es gratis.
   Deje `rclone.exe` dentro de esa carpeta.
3. Abra PowerShell **con el usuario que usa la PC** y ejecute:
   ```powershell
   cd C:\Taller\pc-taller
   powershell -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Servidor app.tecnicentrosanchez.com
   ```
4. El instalador muestra una **llave pública** y el comando exacto para el servidor. En el VPS ejecute:
   ```bash
   sudo bash infra/servidor-respaldos.sh "ssh-ed25519 AAAA... pc-taller-..."
   ```
   Vuelva a la PC y presione **Enter**. El instalador crea la tarea **"Respaldo Taller Sanchez"** y hace la primera copia.

## Cómo funciona

- **3 veces al día** (07:00, 13:00 y 19:00). Si la PC estaba apagada, la copia corre apenas se prenda.
- Solo baja lo nuevo y **nunca borra** de esta PC lo que se borre en el servidor.
- Guarda los diarios de los **últimos 90 días**. Los semanales y mensuales se guardan siempre.
- **Aviso en el escritorio:** si no puede conectarse con el servidor, o si el respaldo más nuevo tiene más de 36 h
  (el servidor dejó de respaldar), aparece **`ALERTA - RESPALDO DEL TALLER.txt`**. Se borra solo cuando vuelve a funcionar.
- El historial queda en `C:\RespaldosTaller\registro.log`.

## Restaurar desde esta PC (si el servidor se perdió)

1. Levante el sistema en un servidor nuevo (ver el README principal).
2. Suba el respaldo más reciente de `C:\RespaldosTaller\diarios\` y restáurelo:
   ```bash
   scp taller_AAAA-MM-DD_HHMM.dump usuario@servidor:/srv/respaldos/datos/restaurar/
   docker compose exec backup restore.sh /backups/restaurar/taller_AAAA-MM-DD_HHMM.dump
   docker compose cp /srv/respaldos/datos/fotos/. api:/app/uploads/   # fotos de la landing (subir antes la carpeta fotos)
   docker compose restart api
   ```

> Recomendado: una vez al mes, copiar `C:\RespaldosTaller` a un disco externo **cifrado** (BitLocker To Go)
> y guardarlo fuera del taller. Así hay una copia aunque se pierda la PC (robo, incendio).
>
> Los respaldos tienen datos personales de los clientes (Ley Orgánica de Protección de Datos Personales):
> no los copie a memorias USB sin cifrar ni los envíe por correo o WhatsApp.
