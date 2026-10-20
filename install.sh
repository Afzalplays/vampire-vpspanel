#!/usr/bin/env bash
set -Eeuo pipefail

# VampireVPSPanel installer for fresh Debian 12/13 and Ubuntu 22.04/24.04.
# Installs the web application only. Hypervisor provisioning, SMTP delivery,
# licensing and expiry enforcement require their corresponding services/adapters
# to be implemented and configured; this installer does not pretend otherwise.

APP_NAME="vampire-vpspanel"
APP_DIR="${APP_DIR:-/opt/vampire-vpspanel}"
APP_USER="${APP_USER:-vampirevps}"
REPO_URL="${REPO_URL:-https://github.com/Afzalplays/vampire-vpspanel.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-}"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
die() { red "ERROR: $*"; exit 1; }
need_root() { [[ "${EUID}" -eq 0 ]] || die "Run as root: sudo bash install.sh"; }
need_root

if [[ ! -f /etc/os-release ]]; then die "Cannot identify OS. Supported: Debian/Ubuntu."; fi
. /etc/os-release
case "${ID:-}" in
  debian|ubuntu) ;;
  *) die "Unsupported OS: ${ID:-unknown}. Use Debian or Ubuntu."; ;;
esac

if [[ -e "$APP_DIR" && ! -d "$APP_DIR/.git" ]]; then
  die "$APP_DIR exists but is not a Git checkout. Set APP_DIR to another path or back it up first."
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git nginx openssl build-essential python3 make g++

# Install a maintained Node.js 22 runtime if one is not already available.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
[[ "$node_major" -ge 22 ]] || die "Node.js 22 or newer is required; found $(node --version)."

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --create-home --shell /usr/sbin/nologin "$APP_USER"
fi
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
[[ -f package.json ]] || die "package.json not found in repository root."
[[ -f apps/web/package.json ]] || die "apps/web/package.json not found."

# Keep production secrets and user data out of the Git checkout.
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR/data"
if [[ ! -f "$APP_DIR/.env.production" ]]; then
  session_secret="$(openssl rand -hex 48)"
  cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV=production
SESSION_SECRET=$session_secret
PORT=$PORT
HOSTNAME=127.0.0.1
EOF
  chmod 600 "$APP_DIR/.env.production"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env.production"
fi

npm install --include=dev
npm run build
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/.env.production"

cat > /etc/systemd/system/vampire-vpspanel.service <<EOF
[Unit]
Description=VampireVPSPanel web application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env.production
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm --workspace apps/web run start
Restart=on-failure
RestartSec=5
TimeoutStartSec=120
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$APP_DIR/data $APP_DIR/.next $APP_DIR/apps/web/.next
UMask=0027

[Install]
WantedBy=multi-user.target
EOF

server_name="$DOMAIN"
if [[ -z "$server_name" ]]; then server_name="_"; fi
cat > /etc/nginx/sites-available/vampire-vpspanel <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $server_name;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/vampire-vpspanel /etc/nginx/sites-enabled/vampire-vpspanel
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now vampire-vpspanel
systemctl enable --now nginx
systemctl reload nginx

green "VampireVPSPanel web app installed."
printf '\n'
printf 'App directory: %s\n' "$APP_DIR"
printf 'Service:       systemctl status vampire-vpspanel\n'
printf 'Logs:          journalctl -u vampire-vpspanel -f\n'
printf 'URL:           http://%s\n' "${DOMAIN:-SERVER-IP}"
printf '\n'
printf 'Next steps:\n'
printf '  1. Point your domain DNS A/AAAA record to this server.\n'
printf '  2. For public use, configure HTTPS before creating the administrator.\n'
printf '  3. Open /setup once to create the initial administrator; setup locks after first user.\n'
printf '  4. Back up %s/data and keep .env.production private.\n' "$APP_DIR"
printf '\n'
red "Important: this installs the current web application, not a completed hypervisor platform."
red "Do not expose it to production customers until VM orchestration, email, licensing, expiry jobs, and security tests are implemented."
