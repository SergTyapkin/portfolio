cat ./docker-deploy/docker-compose.template.yaml > ./docker-deploy/docker-compose.yaml
final_networks_string="
networks:
  default:
"
proxy_services_count=$(. "./.env"; echo "$PROXY_SERVICES_COUNT" | tr -dc "0-9")
for proxy_num in $(seq 1 $proxy_services_count); do
  # Add "networks" to docker-compose.yaml
  proxy_network_var_name="PROXY_${proxy_num}_NETWORK_NAME"
  proxy_network_var_is_external_name="PROXY_${proxy_num}_NETWORK_IS_EXTERNAL"
  proxy_network_name=$(. "./.env"; eval "echo \${${proxy_network_var_name}} | tr -dc \"a-zA-Z._-\"" )
  proxy_network_is_external=$(. "./.env"; eval "echo \${${proxy_network_var_is_external_name}} | tr -dc \"a-zA-Z\"" )
  if [[ -z ${proxy_network_name} ]]; then continue; fi

  echo "- Added docker network with name: ${proxy_network_name}"

  echo "      - ${proxy_network_name}" >> ./docker-deploy/docker-compose.yaml;
  final_networks_string="${final_networks_string}  ${proxy_network_name}:
    name: ${proxy_network_name}
"
  if [[ $proxy_network_is_external == "true" ]] || [[ $proxy_network_is_external == "True" ]] || [[ $proxy_network_is_external == "TRUE" ]]
  then
    echo "Network is external"
    final_networks_string="${final_networks_string}    external: true
"
  fi
done
echo "${final_networks_string}" >> ./docker-deploy/docker-compose.yaml


# ---- Remove HTTPS or HTTPS args in docker-compose.yml
enable_https="$(. "./.env"; echo "$VITE_HTTPS" | tr -dc "a-zA-Z")"
if [[ $enable_https == "true" ]] || [[ $enable_https == "True" ]] || [[ $enable_https == "TRUE" ]]
then
  echo "✅🔒 Docker-compose sets up to HTTPS configuration (VITE_HTTPS=true in .env)"
else
  echo "✅ Docker-compose sets up without HTTPS configuration (VITE_HTTPS=false in .env)"
  # Remove ports "433:433" in docker-compose.yaml
  sed -i -e '46d' ./docker-deploy/docker-compose.yaml
fi
