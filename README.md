# <img src="icons/icon48.png" width="28"> Retrace — Browser History Reimagined

> A sleek Chrome side panel that transforms your browsing history into an elegant, searchable timeline.

[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-v1.0-blue)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange)]()

<p align="center">
  <img src="icons/icon128.png" width="100" alt="Retrace Icon">
</p>

<p align="center">
  <strong>English</strong> | <a href="README_CN.md">中文</a>
</p>

## ✨ Features

### 🕐 **Timeline View**
- Browse history organized by date with sticky date headers
- Smooth infinite scroll through your browsing timeline
- Quick filters: Today, This Week, This Month

### 🔍 **Regex Search**
- Search by title or URL using JavaScript regular expressions
- Smart fallback: invalid regex → simple text search
- Auto-expands search range when no results found

### 📅 **Calendar Filter**
- Click-to-select date range picker
- Visual feedback with highlighted selection
- Quick year navigation with double arrows

### 🎨 **Elegant Design**
- **Morandi color palette** — sophisticated, muted tones
- **Color-coded favicons** — each domain gets a unique color based on hash
- **System theme sync** — automatically follows light/dark mode
- Clean card layout with minimal chrome

### ⌨️ **Keyboard Shortcuts**
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle side panel |
| `Ctrl+F` / `/` | Focus search |
| `Esc` | Clear search / Close calendar |
| `J` / `K` | Navigate up/down |
| `D` | Delete hovered item |
| `C` | Copy URL |
| `F` | Same-domain history |

### 🔄 **Undo System**
- Stack-based undo for deleted items
- 3.5-second toast with remaining count
- Batch restore support

### 📊 **Smart Features**
- **Lazy-loaded favicons** — fetches on scroll for performance
- **200-item render limit** — "Show All" for heavy users
- **Persistent state** — filters survive panel close/reopen

---

## 📸 Screenshots

<p align="center">
  <em>Timeline view with date headers</em>
  <br>
  <em>Search with regex support</em>
  <br>
  <em>Calendar date range picker</em>
</p>

---

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/retrace.git
   cd retrace
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `retrace` folder

4. **Pin the extension**
   - Click the puzzle icon in toolbar
   - Pin "Retrace" for easy access

5. **Open the side panel**
   - Click the Retrace icon, or
   - Press `Ctrl+Shift+R`

---

## 💡 Usage

### Basic Navigation
1. Click the extension icon in toolbar
2. Side panel opens on the right
3. Scroll through your history timeline
4. Click any item to open in new tab

### Search with Regex
```
# Find all GitHub pages
github\.com

# Find YouTube videos
youtube\.com/watch

# Find specific domains
(amazon|ebay)\.com

# Case-insensitive search
/github/i
```

### Date Filtering
- **Quick filters**: Click "Today", "This Week", or "This Month"
- **Custom range**: Click calendar icon → select start date → select end date
- **Clear**: Click "Clear" button in calendar

---

## 🛠️ Development

### Tech Stack
- **Chrome Extension Manifest V3**
- **Side Panel API** for persistent sidebar
- **Chrome History API** for data access
- **Vanilla JavaScript** — no frameworks, no dependencies
- **CSS Variables** for theming

### Project Structure
```
retrace/
├── manifest.json        # Extension configuration
├── background.js        # Service worker
├── sidebar.html         # Side panel UI
├── sidebar.css          # Styles
├── sidebar.js           # Main logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Design Decisions
- **No external dependencies** — lightweight and fast
- **Lazy loading** — favicons fetched on demand
- **Debounced search** — smooth typing experience
- **State persistence** — chrome.storage.local for filters

---

## 🎨 Design Philosophy

**Retrace** follows the **Morandi color palette** — muted, sophisticated tones that are easy on the eyes during extended use.

### Color System
- **Primary**: Sage Green (#7d8f7d / #8fa88f)
- **Favicons**: Hash-based Morandi colors (12 unique hues)
- **Theme**: Automatic light/dark mode following system

### Typography
- **Brand**: Plus Jakarta Sans
- **Content**: DM Sans

---

## 📋 Changelog

### v1.0.0 (Initial Release)
- ✅ Timeline view with date grouping
- ✅ Regex search (title + URL)
- ✅ Calendar date range picker
- ✅ Keyboard shortcuts
- ✅ Stack-based undo system
- ✅ Morandi color palette
- ✅ System theme sync
- ✅ Lazy-loaded favicons

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by modern timeline UIs
- Built with Chrome Extension best practices
- Morandi color palette for visual comfort

---

<p align="center">
  Made with ❤️ for better browsing history
</p>
