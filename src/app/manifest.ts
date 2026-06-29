import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grow Log',
    short_name: 'Grow Log',
    description: '水耕栽培の成長記録',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdfff0',
    theme_color: '#376d44',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}