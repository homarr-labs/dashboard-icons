#!/usr/bin/env bash
set -Eeuo pipefail

# Keep the existing deployment behavior when a terminal or supervisor hangs up.
trap '' HUP

pids=()
service_mode="${SERVICE_MODE:-all}"
if [[ "$service_mode" != "all" && "$service_mode" != "web" && "$service_mode" != "backend" ]]; then
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

if [[ "$service_mode" != "web" ]]; then
	expected_version="$(node -p 'require("/pb/pocketbase-release.json").version')"
	actual_version="$(/pb/pocketbase --version)"
	if [[ "$actual_version" != "pocketbase version $expected_version" ]]; then
		echo "PocketBase version mismatch: expected $expected_version, got $actual_version" >&2
		exit 1
	fi
	required_migration="$(< /pb/required-migration)"
	if [[ ! -f "/pb/pb_migrations/$required_migration" ]]; then
		echo "Required PocketBase migration is missing: $required_migration. Check migration mounts." >&2
		exit 1
	fi
	pocketbase_args=(--dir=/pb/pb_data --hooksDir=/pb/pb_hooks --migrationsDir=/pb/pb_migrations --automigrate=false --dev=false)
	echo "Applying PocketBase $expected_version migrations from /pb/pb_migrations"
	/pb/pocketbase migrate up "${pocketbase_args[@]}"
	if [[ "$service_mode" == "backend" ]]; then
		exec /pb/pocketbase serve --http=0.0.0.0:8090 "${pocketbase_args[@]}"
	fi
	/pb/pocketbase serve --http=127.0.0.1:8090 "${pocketbase_args[@]}" &
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
