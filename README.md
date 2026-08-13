<div align="center">

# ⚡ Elementa

**Transform any live DOM element on the web into production-ready React, Vue 3, Tailwind, and Scoped HTML+CSS components in seconds.**

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Built_with-Vite_%2B_CRXJS-646CFF?logo=vite&logoColor=white)](https://crxjs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

</div>

---

## 📖 Overview

**Elementa** is an intelligent developer extension for Google Chrome. It solves the friction of inspecting browser elements and reverse-engineering styles manually. 

With Elementa, you can click on any card, navbar, feed item, or UI widget on any live website. Elementa isolates the element, computes its true CSS cascade rules, infers dynamic TypeScript props for repeated elements, captures vector and raster assets without CORS hurdles, and gives you clean, copy-pasteable component code or a complete downloadable `.zip` package.

---

## ✨ Features

- **🎯 Zero-Latency Click-to-Extract**: Synchronous DOM extraction instantly captures the element, styles, and assets the moment you click.
- **🛡️ Isolated Shadow DOM Overlay**: Hover and selection boxes are rendered inside an isolated Shadow Root so page stylesheets cannot affect the inspection UI or shift page layout.
- **👁️ Interactive Live Studio Preview**:
  - Live sandboxed preview frame directly inside the side panel.
  - Multi-device responsive viewports: **Mobile (375px)**, **Tablet (640px)**, and **Full Width (100%)**.
  - 4 Canvas Themes: **Dark Studio**, **Clean White**, **Dot Grid Matrix**, and **Checkerboard**.
  - Real-time **Zoom Controls** (60% to 140%).
- **🧠 Pattern Detection & Dynamic Prop Inference**:
  - Detects repeated cards, grid cells, and list items using structural and CSS module hash stripping.
  - Diffs repeating instances to infer dynamic TypeScript props (`title`, `imageSrc`, `price`, `href`) versus static template markup.
- **📦 Multi-Format Code Generation**:
  - **React (TSX)**: Clean functional components with typed `interface Props` and populated sample dataset.
  - **Vue 3 (SFC)**: `<script setup lang="ts">`, `<template>`, and `<style scoped>`.
  - **HTML + CSS**: Scoped CSS class prefixing (`.elementa-comp-*`) to prevent style leaks.
  - **Tailwind JSX**: Pure utility classes with computed inline fallbacks.
- **🎨 Comprehensive Asset Engine**:
  - **Inline SVG Support**: Automatically resolves `<use xlink:href>` references and converts icons to clean, standalone vector Data URIs and downloadable `.svg` files.
  - **In-Memory Canvas Snapshot**: Instantly captures rendered avatars and images without network lag.
  - **CORS-Free Downloader**: Background service worker streams external CDN assets into base64 and bundles them cleanly into `/assets/`.
- **⌨️ Keyboard-Driven DOM Walking**: Navigate parent and child hierarchies with arrow keys.

---

## 🚀 Quick Start (< 2 Minutes)

### 1. Clone & Build

```bash
# Clone repository
git clone https://github.com/senapati484/elementa.git
cd elementa

# Install dependencies
npm install

# Build production extension bundle
npm run build
```

### 2. Load into Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right toggle.
3. Click **Load unpacked** in the top-left.
4. Select the `dist` folder located inside the cloned `elementa` directory.

### 3. Start Extracting

1. Open any website (e.g. [GitHub](https://github.com), [Apple](https://apple.com), [Tailwind UI](https://tailwindui.com)).
2. Click the **Elementa** icon in your browser toolbar to open the Side Panel.
3. Click **"Inspect"** and click any element on the page to instantly view code, preview, and assets!

---

## ⌨️ Keyboard Shortcuts & DOM Walking

| Shortcut | Action | Description |
|---|---|---|
| <kbd>Click</kbd> | **Select Element** | Lock selection and extract component immediately |
| <kbd>↑</kbd> (Arrow Up) | **Navigate Parent** | Walk up to the parent container in the DOM tree |
| <kbd>↓</kbd> (Arrow Down) | **Navigate Child** | Step down into the previously navigated child element |
| <kbd>Esc</kbd> | **Deselect** | Release current selection and return to hover inspection mode |

---

## 🧩 Output Formats

| Format | File Extension | Features Included |
|---|---|---|
| **React (TSX)** | `.tsx` | TypeScript interfaces, inferred dynamic props, sample data array |
| **Vue 3 SFC** | `.vue` | `<script setup lang="ts">`, `defineProps<Props>()`, scoped styles |
| **Scoped HTML+CSS** | `.html`, `.css` | Self-contained HTML with unique scoped class prefixing |
| **Tailwind JSX** | `.tailwind.tsx` | Utility class JSX structure with minimal custom styles |
| **Full .ZIP Bundle** | `.zip` | All above formats + `package.json` + `README.md` + `/assets/` directory |

---

## ⚙️ Configuration & Settings

Access the **Settings (⚙️)** modal from the top bar to tailor your exports:

| Option | Description | Default |
|---|---|---|
| **Component Name** | Name used for exported components & filenames | `ExtractedCard` |
| **Scoped Class Prefix** | Prefix applied to isolated HTML/CSS classes | `elementa-comp` |
| **Inline Assets (<50KB)** | Embed small images and SVGs as Data URIs directly in code | `false` |
| **Asset Size Threshold** | Max file size in KB for automatic inlining | `50 KB` |
| **Infer Repeated Props** | Scan similar items on page and generate props interface | `true` |
| **Max Subtree Depth** | Limit recursive DOM node traversal depth | `15` |

---

## 🛠️ Tech Stack & Architecture

```
elementa/
├── manifest.json            # Manifest V3 configuration (sidePanel, host_permissions)
├── src/
│   ├── background/          # Background service worker (CORS-free asset streaming)
│   ├── content/             # In-page content scripts & Shadow DOM overlay
│   │   ├── inspector.ts     # Event interception & synchronous tree extraction
│   │   ├── overlay.ts       # Non-invasive Shadow Root bounding boxes & badges
│   │   ├── extract-styles.ts# Cascade calculation, computed styles & asset engine
│   │   └── similar-patterns.ts # Pattern matching & hash stripping algorithm
│   ├── sidepanel/           # React 18 UI
│   │   ├── App.tsx          # Main sidepanel controller
│   │   ├── LivePreview.tsx  # Sandboxed iframe with device frames & canvas themes
│   │   ├── CodeViewer.tsx   # PrismJS syntax highlighting & word wrap
│   │   ├── AssetList.tsx    # Asset gallery with search, filters & Data URI copy
│   │   └── SettingsModal.tsx# Export preferences & tuning
│   └── shared/              # Shared types, messages, codegen & zip packaging
│       ├── codegen/         # React, Vue SFC, Tailwind & HTML+CSS generators
│       └── assets/          # JSZip bundler & path rewriter
```

- **Manifest V3 Architecture**: Native Chrome Side Panel API (`chrome.sidePanel`), Service Worker background routing.
- **Cascade Precedence Algorithm**: Calculates specificity scores $(A \cdot 100 + B \cdot 10 + C)$, respects `!important` flags, source order, and inline overrides.
- **Zero-CORS Asset Streaming**: Utilizes Chrome extension `host_permissions: ["<all_urls>"]` in the background worker to fetch any external image CDN without origin blocking.

---

## 🧪 Testing & Development

```bash
# Run unit tests (Vitest)
npm test

# Run development watcher
npm run dev

# Type check & build bundle
npm run build
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
