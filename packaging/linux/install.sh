#!/bin/sh
# Installs Arvudoro for the current user, no root needed. The folder stays
# writable, so the in-app updater can replace it:
#
#   curl -fsSL https://raw.githubusercontent.com/samoaste/arvudoro/main/packaging/linux/install.sh | sh
#
# Files: ~/.local/opt/arvudoro, ~/.local/bin/arvudoro and the menu entry.
# Run it again to update; remove with:  sh install.sh --uninstall
set -eu

REPO=samoaste/arvudoro
APP_ID=com.arvucore.arvudoro
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
DEST="$HOME/.local/opt/arvudoro"
BIN="$HOME/.local/bin"
DESKTOP="$DATA/applications/$APP_ID.desktop"

say() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

if [ "${1:-}" = "--uninstall" ]; then
  rm -rf "$DEST" "$BIN/arvudoro" "$DESKTOP"
  say "Arvudoro removed (settings and stats stay in your home folder)"
  exit 0
fi

[ "$(uname -s)" = Linux ] || die "this script is for Linux; get the other builds at https://github.com/$REPO/releases/latest"
case "$(uname -m)" in
  x86_64 | amd64) ARCH=x86_64 ;;
  aarch64 | arm64) ARCH=arm64 ;;
  *) die "no build for $(uname -m)" ;;
esac
command -v curl >/dev/null || die "curl is required"
command -v sha256sum >/dev/null || die "sha256sum is required"

# ldconfig lives in /sbin, outside a normal user's PATH on Debian
LDCONFIG=$(command -v ldconfig || echo /sbin/ldconfig)
if ! "$LDCONFIG" -p 2>/dev/null | grep -q 'libwebkit2gtk-4.1\.so'; then
  echo "warning: WebKitGTK 4.1 was not found. Install it first:" >&2
  echo "  Ubuntu/Debian: sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1" >&2
  echo "  Fedora:        sudo dnf install webkit2gtk4.1 libayatana-appindicator-gtk3" >&2
  echo "  Arch:          sudo pacman -S webkit2gtk-4.1 libayatana-appindicator" >&2
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

say "Looking up the latest release"
curl -fsSL "https://github.com/$REPO/releases/latest/download/manifest.json" -o "$TMP/manifest.json"
# the manifest is {"version": …, "linux": {"x86_64": {"url": …, "sha256": …}, "arm64": {…}}, …}
ENTRY=$(tr -d '\n ' <"$TMP/manifest.json" | grep -o "\"$ARCH\":{[^}]*}") || die "the latest release has no $ARCH build"
URL=$(printf '%s' "$ENTRY" | sed 's/.*"url":"\([^"]*\)".*/\1/')
SUM=$(printf '%s' "$ENTRY" | sed 's/.*"sha256":"\([^"]*\)".*/\1/')

say "Downloading ${URL##*/}"
curl -fL --progress-bar "$URL" -o "$TMP/arvudoro.tar.gz"
echo "$SUM  $TMP/arvudoro.tar.gz" | sha256sum -c --quiet - || die "checksum mismatch, download aborted"

tar -xzf "$TMP/arvudoro.tar.gz" -C "$TMP"
[ -x "$TMP/arvudoro/arvudoro" ] || die "unexpected archive layout"
mkdir -p "$(dirname "$DEST")" "$BIN" "$(dirname "$DESKTOP")"
rm -rf "$DEST"
mv "$TMP/arvudoro" "$DEST"
ln -sf "$DEST/arvudoro" "$BIN/arvudoro"

# Menu entry right away; the app rewrites it with its own launch line on
# first run (same file name, so there is never a second entry).
cat >"$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Arvudoro
GenericName=Pomodoro Timer
Comment=Pomodoro timer with active exercise breaks
Comment[pt_BR]=Timer pomodoro com pausas de exercício
Exec="$DEST/arvudoro" %u
Icon=$DEST/icon.png
Terminal=false
Categories=Utility;Clock;
StartupWMClass=$APP_ID
EOF
command -v update-desktop-database >/dev/null && update-desktop-database -q "$DATA/applications" 2>/dev/null || true

say "Installed in $DEST. Open Arvudoro from the app menu or run: arvudoro"
case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "note: $BIN is not in your PATH; the app menu entry works anyway" ;;
esac
