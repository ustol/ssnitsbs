// Leaflet is loaded via CDN script tag in index.html.
// This declaration gives TypeScript access to the global L namespace
// without causing Rolldown to try to bundle the CommonJS package.
declare const L: typeof import('leaflet')
