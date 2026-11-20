# Respaldos automáticos: pg_dump diario + copia cifrada fuera del servidor con rclone.
FROM postgres:16-alpine
RUN apk add --no-cache rclone tzdata bash
COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
