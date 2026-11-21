#!/usr/bin/env bash
# Prepara en el VPS el acceso para que la PC del taller descargue los respaldos (sin nube).
#
#   Uso (en el VPS, como root, una sola vez):
#     sudo bash infra/servidor-respaldos.sh "ssh-ed25519 AAAA... pc-taller"
#   (la llave pública la muestra infra/pc-taller/instalar-tarea.ps1 en la PC)
#
# Crea el usuario "respaldos" que:
#   - solo puede usar SFTP (no tiene consola ni puede ejecutar comandos),
#   - queda encerrado en /srv/respaldos (no ve el resto del servidor),
#   - solo puede LEER (internal-sftp -R): no puede borrar ni modificar respaldos,
#   - entra únicamente con la llave de la PC (sin contraseña).
set -euo pipefail

LLAVE="${1:?Pegue la llave pública de la PC del taller entre comillas}"
JAULA=/srv/respaldos
DATOS="$JAULA/datos"   # = BACKUP_DIR en el .env: aquí escribe el contenedor de respaldos

if [ "$(id -u)" -ne 0 ]; then echo "Ejecútelo con sudo"; exit 1; fi
case "$LLAVE" in ssh-ed25519\ *|ssh-rsa\ *) ;; *) echo "Eso no parece una llave pública SSH"; exit 1 ;; esac

id respaldos >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home-dir "$JAULA" respaldos

# La jaula de SSH tiene que ser de root y sin permiso de escritura para nadie más.
mkdir -p "$DATOS"
chown root:root "$JAULA" && chmod 755 "$JAULA"
chown root:respaldos "$DATOS" && chmod 750 "$DATOS"

install -d -m 755 /etc/ssh/llaves
echo "$LLAVE" > /etc/ssh/llaves/respaldos
chmod 644 /etc/ssh/llaves/respaldos

cat > /etc/ssh/sshd_config.d/respaldos.conf <<'EOF'
# Usuario de la PC del taller: solo descarga respaldos (SFTP de solo lectura, encerrado).
Match User respaldos
  ChrootDirectory /srv/respaldos
  ForceCommand internal-sftp -R
  AuthorizedKeysFile /etc/ssh/llaves/respaldos
  PasswordAuthentication no
  AllowTcpForwarding no
  X11Forwarding no
  PermitTTY no
EOF

sshd -t
systemctl reload ssh
echo "✔ Listo. La PC del taller ya puede descargar los respaldos de $DATOS (solo lectura)."
echo "  Recuerde en el .env:  BACKUP_DIR=$DATOS   y luego: docker compose up -d backup"
