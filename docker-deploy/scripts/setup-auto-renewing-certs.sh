enable_https="$(. "./.env"; echo "$VITE_HTTPS" | tr -dc "a-zA-Z")"
if [[ ${enable_https} == "true" ]] || [[ ${enable_https} == "True" ]] || [[ ${enable_https} == "TRUE" ]]
then
  sudo apt-get update &&
  sudo apt-get install cron &&
  echo "----------------------------------------------------------------------------------------------" &&
  echo "Now you must add this string-command in your crontab to auto executing it each 1 month. Command:" &&
  echo "" &&
  echo "0 0 1 * * cd $(pwd) && make renew-certs >> ./certbot-renew.log" &&
  echo "" &&
  echo "Copy that command and [press Enter]. Then add this string in end of opened file." &&
  read ENTER &&
  crontab -e &&
  echo "✅ Auto renewing certificates sets up successfully" ||
  echo "❌ Errors when setting up auto renewing certificates"
else
  echo "⚠️ HTTPS not enabled in .env and auto renewing certificates not started"
fi
