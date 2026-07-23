# Repomix Extension

A browser extension that adds a Repomix button to GitHub repository pages.

## 🚀 Features

- Adds a "Repomix" button to GitHub repository pages
- One-click redirect to Repomix (https://repomix.com)
- Seamlessly integrates with GitHub's UI design
- Works on Chrome, Firefox, and Edge

## 🛠️ Usage

1. Install the browser extension
2. Navigate to any GitHub repository page
3. A "Repomix" button will appear in the page header action area
4. Click the button to open the repository in Repomix

## 💻 Development

### Prerequisites

- Node.js 22 or higher

### Setup

```bash
# Install dependencies
npm install

# Generate icons
npm run generate-icons

# Development mode for Chrome
npm run dev chrome

# Development mode for Firefox
npm run dev firefox

# Development mode for Edge
npm run dev edge
```

### Build

```bash
# Build for all browsers
npm run build-all

# Build for specific browsers
npm run build chrome
npm run build firefox
npm run build edge
```

Built files will be generated in the `dist/` folder.

### Manual Installation

1. Run `npm run build chrome` to build
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. Select the `dist/chrome` folder

## 📝 Technical Specifications

- **Manifest V3** - Latest browser extension specification
- **Content Scripts** - Direct button injection into GitHub pages
- **Internationalization** - English and Japanese support
- **Cross-browser** - Chrome, Firefox, Edge support

## 🔒 Privacy

This extension:
- Does not collect any data
- Does not track user behavior
- Only accesses github.com
- Requires minimal permissions
