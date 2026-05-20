cp --no-clobber .env.example .env &&
echo "" &&
echo "Edit .env file." &&
echo "Write right VITE_DEPLOY_HOSTNAME without https:// and url paths!" &&
echo "If you want to serve only HTTP without HTTPS, set VITE_HTTPS=false and remove DEPLOY_NGINX_PORT_HTTPS" &&
echo "Be careful that your subdomains docker-containers must uses external networks with names specified in PROXY_<*>_NETWORK_NAME" &&
echo "[press Enter...]" &&
read ENTER &&
nano .env
