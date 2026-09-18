#!/usr/bin/env bash
set -Eeuo pipefail

# Keep the existing deployment behavior when a terminal or supervisor hangs up.
trap '' HUP

pids=()
service_mode="${SERVICE_MODE:-all}"
if [[ "$service_mode" != "all" && "$service_mode" != "web" ]]; then
	echo "Unsupported SERVICE_MODE: $service_mode" >&2
	exit 1
fi

shutdown() {
	trap '' TERM INT
	if ((${#pids[@]})); then
		kill -TERM "${pids[@]}" 2>/dev/null || true
		wait "${pids[@]}" 2>/dev/null || true
	fi
}
trap 'shutdown; exit 0' TERM INT
trap shutdown EXIT

if [[ "$service_mode" == "all" ]]; then
	/pb/pocketbase serve --http=127.0.0.1:8090 --dir=/pb/pb_data \
		--hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations &
	pids+=("$!")

	# Migrations must finish before the frontend can query the database.
	ready=false
	for ((attempt=0; attempt<60; attempt++)); do
		if curl --fail --silent http://127.0.0.1:8090/api/health >/dev/null; then
			ready=true
			break
		fi
		if ! kill -0 "${pids[0]}" 2>/dev/null; then
			echo 'PocketBase exited during startup' >&2
			exit 1
		fi
		sleep 1
	done
	if [[ "$ready" != true ]]; then
		echo 'PocketBase did not become ready within 60 seconds' >&2
		exit 1
	fi
fi

node /app/server.js &
pids+=("$!")
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
pids+=("$!")

# Any service exiting stops the whole container so a restart policy can recover it.
set +e
wait -n "${pids[@]}"
status=$?
if ((status == 0)); then status=1; fi
exit "$status"
