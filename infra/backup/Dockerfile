# Respaldos automáticos: pg_dump cada 6 h, verificado. La PC del taller los descarga por SFTP.
FROM postgres:16-alpine
RUN apk add --no-cache tzdata bash
COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
