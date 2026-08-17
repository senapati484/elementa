# Privacy Policy for Elementa

**Effective Date**: August 17, 2026  
**Extension**: Elementa — DOM Component Extractor  
**Developer**: senapati484  

Elementa ("the extension") is a developer tool that enables developers to inspect, extract, and convert DOM elements from live web pages into reusable React, Vue, HTML/CSS, and Tailwind components.

---

## 1. Data Collection and Usage

**Elementa does NOT collect, store, transmit, track, or sell any personal data, browsing history, or user information.**

- **Local Execution**: All DOM inspection, CSS cascade computation, code generation, and asset bundling take place 100% locally in your browser session.
- **No Remote Servers or Analytics**: The extension does not communicate with any external tracking servers, telemetry pipelines, or third-party analytics services.
- **No Data Retention**: Extracted components and media assets reside only in temporary browser memory during your active inspection session or within `.zip` files downloaded directly to your local file system upon your explicit request.

---

## 2. Permissions Justification

Elementa requests only the minimum permissions necessary to function as a DOM component extractor:

- **`sidePanel`**: Used to present the code generator, syntax highlighter, interactive live preview, and asset export interface alongside your active tab.
- **`activeTab` & `scripting`**: Used strictly to inject the interactive bounding box overlay into the active page when you click the "Inspect" button.
- **`tabs`**: Used to determine the active tab URL to prevent running on unsupported internal `chrome://` pages.
- **`storage`**: Used exclusively to persist your local user preferences (such as preferred export format and component naming rules) on your local device.
- **Host Permissions (`<all_urls>`)**: Required to enable DOM component extraction and CORS-free asset downloading across any website you choose to inspect.

---

## 3. Remote Code

Elementa does not execute any remote code. All JavaScript and WebAssembly packages are bundled locally within the extension package in compliance with Chrome Web Store Manifest V3 policies.

---

## 4. Contact & Inquiries

For questions, bug reports, or feature requests regarding Elementa, please visit:  
**GitHub Issues**: [https://github.com/senapati484/elementa/issues](https://github.com/senapati484/elementa/issues)
