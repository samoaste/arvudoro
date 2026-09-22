# Distribution

Every channel below repackages the artifacts from one GitHub Release, which
`.github/workflows/release.yml` builds when a `v*` tag is pushed.

| Channel | Platform | How | Status |
|---|---|---|---|
| GitHub Releases | Linux x86_64/arm64, macOS, Windows | automatic on tag | ready |
| In-app auto-update | all | `update.url` in `tinyjs.json` reads the release's `manifest.json` | ready |
| AUR (`arvudoro-bin`) | Arch, Manjaro, EndeavourOS | `packaging/aur/PKGBUILD` | template |
| winget | Windows 10/11 | `packaging/winget/` → PR to microsoft/winget-pkgs | template |
| Homebrew cask | macOS | `packaging/homebrew/arvudoro.rb` → own tap first | template |
| Flathub | any Linux | AppStream metadata and `.desktop` ready in `packaging/linux/`; still needs a Flatpak manifest bundling libayatana-appindicator on top of `org.gnome.Platform` | partial |
| Snap Store | Ubuntu | `snapcraft.yaml` with the `gnome` extension | todo |
| Scoop (extras) | Windows | JSON manifest pointing at the `-win.zip` | todo |
| itch.io / AlternativeTo / Product Hunt | discovery | listing pages linking to the release; reuse `docs/social-preview.png`, `docs/demo.gif` and `docs/screenshots/` | todo |

## Release checklist

1. Bump `version` in `tinyjs.json` and write `CHANGELOG.md`.
2. `npm test`, then `tinyjs dev` for a manual pass (focus → break → set done → stats).
3. `git tag vX.Y.Z && git push --tags` and wait for the `release` workflow.
4. Copy the checksums from `SHA256SUMS.txt` into the AUR, winget and Homebrew files and submit them.

## Known limits

- **macOS signing.** Without an Apple Developer ID the app is ad-hoc signed and
  Gatekeeper warns on first open (right-click → Open). Add `signIdentity` and
  `notarize` to `tinyjs.json` once there is an account; the Homebrew main
  repository requires it.
- **Windows and Linux are beta targets in tinyjs.** Test the Windows build on
  real hardware before announcing it.
- **Linux runtime.** Users need `webkit2gtk-4.1` (preinstalled on Ubuntu
  22.04+, Fedora 38+). Sound effects use PipeWire.

## Regenerating the images

With `python3 -m http.server 8765` running in the project root:

- screenshots: open `dev/app.html?phase=short&lang=en` (params: `phase`, `lang`, `theme`, `view`) and capture at 400×680
- `docs/demo.gif`: `python3 dev/make-gif.py`
- `docs/social-preview.png`: render `dev/social.html` at 1280×640 and upload it in the repository settings (Social preview)
