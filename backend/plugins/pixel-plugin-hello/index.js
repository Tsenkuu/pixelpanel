// This runs inside the Node.js VM Sandbox
console.log('Hello World Plugin is booting up...');

// 1. Register a UI Sidebar Menu Item
sdk.ui.registerSidebar(
    'Hello World',               // Title
    'fa-smile',                  // FontAwesome Icon
    'hello-world',               // Route Name
    '/api/plugins/assets/pixel-plugin-hello/view.html' // Iframe URL to load
);

// 2. Register a Custom API Route
sdk.api.register('get', '/ping', (req, res) => {
    // This will be accessible at /api/plugins/custom/pixel-plugin-hello/ping
    res.json({ message: 'Pong from Hello World Plugin!', time: new Date() });
});

// 3. Listen to system events
sdk.events.subscribe('app.deployed', (data) => {
    console.log('Hello Plugin detected a deployment:', data.appName);
});

// 4. Test Database Sandboxing (should succeed)
try {
    const apps = sdk.db.query('SELECT * FROM apps LIMIT 1');
    console.log('Hello Plugin safely queried the DB:', apps.length, 'apps found.');
} catch (e) {
    console.error('DB Query failed:', e.message);
}

// 5. Test Sandbox Breach (Should Fail)
try {
    // require does not exist in the sandbox context
    const cp = require('child_process');
    console.log('BREACH SUCCESS - This should never print');
} catch (e) {
    console.log('BREACH PREVENTED successfully:', e.message);
}
