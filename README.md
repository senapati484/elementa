# Elementa — DOM Component Extractor (Chrome Extension)

**Elementa** is an intelligent Manifest V3 Chrome Extension that enables developers to inspect, select, and extract clean DOM components from any live website directly into production-ready React components (with inferred dynamic TypeScript props for repeated elements), scoped HTML+CSS, and Tailwind JSX, complete with asset resolution and ZIP packaging.

---

## Key Features

1. **Precision Hover & Click-to-Select**: Non-invasive Shadow DOM overlay tracking with live tag, class, and dimension badges without causing layout shifts or page CSS interference.
2. **Keyboard-Driven DOM Walking**:
   - `ArrowUp`: Walk up to parent element
   - `ArrowDown`: Walk back down to previous child
   - `Escape`: Deselect and return to hover mode
3. **Cascade-Aware CSS Extraction**:
   - Walks all stylesheets with CORS resilience
   - Resolves cascade precedence based on specificity, `!important`, source order, and inline styles
   - Extracts pseudo-classes & pseudo-elements (`:hover`, `:focus`, `::before`, `::after`)
4. **Tailwind Utility Heuristic Detection**:
   - Detects Tailwind utility classes and eliminates redundant computed style bloat
5. **"Select Similar" Pattern Detection**:
   - Automatically detects repeated cards, grid cells, and list items using structural and class fingerprints
   - Diffs repeating instances to infer dynamic TypeScript props (`title`, `imageSrc`, `price`, `href`) vs static structure
6. **Multi-Format Code Generation**:
   - **React (TSX)**: Clean functional component + typed props interface + sample data array
   - **HTML + CSS**: Scoped wrapper class preventing style contamination
   - **Tailwind JSX**: Pure utility class template
7. **Asset Bundling & ZIP Export**:
   - Resolves all media assets (`img`, `svg`, `video`, `background-image`) to absolute URLs
   - Base64 inlining for small assets (<50KB)
   - One-click JSZip download packaging component files + `/assets/` directory + README

---

## How to Install & Test Unpacked

1. **Build the extension**:
   ```bash
   npm install
   npm run build
   ```
2. **Load in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `dist` folder in this directory: `/Users/sayansenapati/Desktop/Dev/Innovation/elementa/dist`
3. **Test Elementa**:
   - Open any website (e.g. GitHub, Tailwind UI, Apple, Wikipedia, a blog, or product grid)
   - Click the **Elementa** toolbar icon -> Side Panel opens automatically
   - Click **Inspect** to activate inspection mode
   - Hover over components and click to select
   - Use `↑` / `↓` / `Esc` to walk the DOM tree
   - Switch between **React (TSX)**, **HTML+CSS**, and **Tailwind** tabs
   - Click **Copy Code** or **Download .ZIP**

---

## Development & Testing

```bash
# Run unit tests
npm test

# Run Vite dev server with hot module reload
npm run dev

# Build production bundle
npm run build
```
# elementa
