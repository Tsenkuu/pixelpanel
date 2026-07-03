# PixelPanel Plugin SDK Documentation

Welcome to the PixelPanel Plugin SDK. This documentation is auto-generated from the SDK source.

## 🔒 Security Sandbox
Plugins are executed within a restricted Node.js `vm` context. You do not have access to `require`, `process`, or the host file system. You must use the `sdk` object provided globally.

## Available APIs

### `sdk.*.register(method, path, handler)`
Registers a new Express route accessible at /api/plugins/custom/{pluginId}/{path}

### `sdk.*.registerSidebar(title, icon, routeName, componentIframeUrl)`
Registers a new item in the frontend Sidebar Menu

### `sdk.*.registerWidget(title, componentIframeUrl, size = 'medium')`
Registers a Dashboard Widget

### `sdk.*._exportRegistry()`
Internal use only: exports the registry

### `sdk.*.registerTemplate(templateObj)`
Register a custom app template to the marketplace

### `sdk.*.query(sql, ...params)`
Allows plugins to execute safe, prepared SELECT statements

