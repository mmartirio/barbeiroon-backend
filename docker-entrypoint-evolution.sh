#!/bin/sh
export CONFIG_SESSION_PHONE_VERSION="2.3000.1039994644"
echo "[Evolution Entrypoint] WhatsApp version: $CONFIG_SESSION_PHONE_VERSION"

cd /evolution
exec /bin/bash -c ". ./Docker/scripts/deploy_database.sh && npm run start:prod"
