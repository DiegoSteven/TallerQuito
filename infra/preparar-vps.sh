#!/usr/bin/env bash
# Prepara un VPS nuevo (Ubuntu 24.04 / 22.04, InterServer) para el sistema del taller. Se ejecuta UNA vez, como root.
#
#   Uso:  bash preparar-vps.sh "<llave pública de Diego>" "<llave pública del CI (GitHub Actions)>"
#
# Deja:
#   - usuario "deploy" (Docker y sudo) que entra SOLO con llave; root y contraseñas quedan desactivados por SSH;
#   - firewall: solo 22 (SSH), 80 y 443;
#   - Docker + Docker Compose (repositorio oficial), con límite de tamaño de logs;
#   - 2 GB de swap, zona horaria de Ecuador, actualizaciones de seguridad automáticas y fail2ban;
#   - carpetas ~/taller (sistema) y /srv/respaldos (respaldos, ver infra/servidor-respaldos.sh).
#
# ⚠ Antes de cerrar la sesión de root, compruebe en OTRA terminal que entra con:  ssh deploy@<ip>
set -euo pipefail

LLAVE_ADMIN="${1:?Falta la llave pública de quien administra (ssh-ed25519 AAAA...)}"
LLAVE_CI="${2:?Falta la llave pública del CI (ssh-ed25519 AAAA...)}"
for llave in "$LLAVE_ADMIN" "$LLAVE_CI"; do
  case "$llave" in ssh-ed25519\ *|ssh-rsa\ *) ;; *) echo "Eso no parece una llave pública SSH: $llave"; exit 1 ;; esac
done
if [ "$(id -u)" -ne 0 ]; then echo "Ejecútelo como root"; exit 1; fi

echo "▶ Sistema al día"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q ca-certificates curl ufw fail2ban unattended-upgrades
timedatectl set-timezone America/Guayaquil

echo "▶ Docker (repositorio oficial)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Logs de contenedores con tope (si no, pueden llenar el disco de 40 GB con los meses).
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker

echo "▶ Usuario deploy"
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
# sudo sin contraseña: root queda bloqueado por SSH y deploy no tiene contraseña. Estar en el grupo docker
# ya equivale a ser root, así que esto no agrega riesgo; lo importante es que la llave de deploy esté bien guardada.
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-deploy
chmod 440 /etc/sudoers.d/90-deploy
visudo -cf /etc/sudoers.d/90-deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n%s\n' "$LLAVE_ADMIN" "$LLAVE_CI" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
install -d -o deploy -g deploy /home/deploy/taller

echo "▶ SSH: solo con llave, sin root"
cat > /etc/ssh/sshd_config.d/00-taller.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 4
EOF
sshd -t
systemctl reload ssh

echo "▶ Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "▶ Swap de 2 GB"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-taller.conf
fi

echo "▶ Seguridad automática"
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "▶ Carpeta de respaldos"
install -d -m 755 /srv/respaldos
install -d -m 750 /srv/respaldos/datos

echo
echo "✔ VPS listo. Siguiente:"
echo "  1) En OTRA terminal, compruebe:  ssh deploy@$(hostname -I | awk '{print $1}')"
echo "  2) Cree /home/deploy/taller/.env a partir de .env.example (ver README → Primer despliegue)."
echo "  3) Active el despliegue en GitHub (variable DESPLIEGUE_ACTIVO=true) y haga push a main."
