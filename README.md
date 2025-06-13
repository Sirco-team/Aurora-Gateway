# Aurora Gateway

A modern, feature-rich web browser built with privacy and extensibility in mind.

## Features

- 🌐 Built-in proxy support for unrestricted web access
- 🧩 Powerful extension system with full browser modification capabilities
- 🌙 Theme support (Light/Dark modes)
- ⭐ Bookmark/Favorites management
- 🔍 Multiple search engine support
- 📱 Responsive and modern UI
- 🛡️ Privacy-focused design

## Commands

Aurora Gateway supports special commands using the `aurora://` protocol:

- `aurora://start` - Opens the start page
- `aurora://settings` - Opens settings panel
- `aurora://extensions` - Opens extension manager
- `aurora://favorites` - Shows favorites page

## Extensions

Extensions can be installed from external sources and have full access to modify the browser's behavior and appearance. Extensions are stored in the format:

```javascript
/*METADATA*/
const metadata = {
    id: "extension-id",
    name: "Extension Name",
    description: "Extension Description",
    version: "1.0.0",
    icon: "data:image/..." // Base64 encoded icon
};
/*CODE*/
// Extension code here
```

## Settings

- Appearance: Theme selection, tab width, favicon display
- Search: Choose default search engine
- Extensions: Enable/disable extension support
- Advanced: Proxy selection, content loading mode
- Custom Code: Insert custom CSS/JS

## Development

To run Aurora Gateway locally:

1. Clone the repository
2. Open the project directory
3. Serve the files using a web server
4. Open index.html in a modern browser

## Privacy

Aurora Gateway uses proxies to bypass CORS restrictions and protect user privacy. All web requests are routed through configurable proxy servers.