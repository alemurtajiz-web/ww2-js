// Socket.io stub for static hosting (Vercel/GitHub Pages)
// Multiplayer requires the Node.js server — solo mode works without it
if (typeof io === 'undefined') {
    window.io = function() {
        throw new Error('Multiplayer server not available');
    };
}
