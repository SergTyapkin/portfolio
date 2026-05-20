enable_https="$(. "../.env"; echo "$VITE_HTTPS" | tr -dc "a-zA-Z")"
if [[ ${enable_https} == "true" ]] || [[ ${enable_https} == "True" ]] || [[ ${enable_https} == "TRUE" ]]
then
  cd docker-deploy &&
  docker compose --env-file ../.env down &&
  docker compose --env-file ../.env up -d nginx-certbot &&
  docker compose --env-file ../.env run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d "$(. "../.env"; echo "$VITE_DEPLOY_HOSTNAME")" &&
  sudo chmod ugo+rwx -R ./certbot/ &&
  echo "✅ Certificates generated successfully" ||
  echo "❌ Errors when generation certificates"
else
  echo "ℹ️ HTTPS not enabled in .env and SSL certificates not needed"
fi;
