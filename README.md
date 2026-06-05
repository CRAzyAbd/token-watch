cat > README.md << 'EOF'
# ⟨/⟩ token-watch

A browser extension that gives you real-time visibility into your Claude usage — token count, cost estimates, session limits, and response times, all in one clean widget.

![Token Watch](https://img.shields.io/badge/version-1.0.0-7c83fd) ![License](https://img.shields.io/badge/license-MIT-4caf82) ![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-blue)

## Features

- **Token Counter** — Live approximate token count with progress bar against the 200k context limit
- **Cost Estimator** — Rough cost estimate based on current model pricing
- **Model Detector** — Auto-detects which Claude model is active
- **Session & Weekly Usage** — Real usage bars from Claude's native API with reset countdowns
- **Response Timer** — Tracks last and average Claude response time
- **Alert System** — Yellow/red warnings as you approach context limits
- **Settings Page** — Customizable thresholds and toggleable features

## Installation

1. Clone this repo
```bash
   git clone https://github.com/YOUR_USERNAME/token-watch.git
```
2. Open `chrome://extensions` in Chrome/Edge
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `token-watch` folder

## Project Structure

<pre>
token-watch/
├── icons/                  # Extension icons
├── src/
│   ├── modules/
│   │   ├── tokenCounter.js     # Token counting logic
│   │   ├── usageTracker.js     # Claude API usage fetcher
│   │   ├── costEstimator.js    # Cost estimation by model
│   │   ├── modelDetector.js    # Active model detection
│   │   └── responseTimer.js    # Response time tracker
│   ├── content.js          # Main UI injection script
│   ├── background.js       # Service worker
│   └── styles.css          # Widget styles
├── popup/                  # Extension popup
├── settings/               # Settings page
└── manifest.json
</pre>

## Privacy

- All data stays local — no external servers, no tracking
- Only makes requests to `claude.ai`

## License

MIT
