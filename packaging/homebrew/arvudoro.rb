# Homebrew cask. Publish in your own tap first (github.com/samoaste/homebrew-tap,
# then `brew install --cask samoaste/tap/arvudoro`); homebrew/cask itself
# requires a notarized app and some traction.
cask "arvudoro" do
  version "0.1.1"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/samoaste/arvudoro/releases/download/v#{version}/arvudoro-#{version}.zip"
  name "Arvudoro"
  desc "Pomodoro timer with active breaks: compound exercises with animated demos"
  homepage "https://github.com/samoaste/arvudoro"

  depends_on macos: ">= :sonoma"

  app "Arvudoro.app"

  zap trash: "~/Library/Application Support/com.arvucore.arvudoro"
end
