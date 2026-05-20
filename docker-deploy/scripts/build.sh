enable_https="$(. "./.env"; echo "$VITE_HTTPS" | tr -dc "a-zA-Z")" &&

cd ./docker-deploy &&
docker compose --env-file ../.env --progress=plain build --build-arg ENABLE_HTTPS="${enable_https}" nginx &&
echo "✅ Docker image built" ||
echo "❌ Errors when building docker image"
