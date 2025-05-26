/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-storage',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
        }
      }
    },
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firebase-firestore',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 // 1 天
        }
      }
    }
  ]
});

const nextConfig = {
  output: 'standalone',
  webpack: (config, { dev, isServer }) => {
    // 優化開發環境的編譯效能
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next',
          '**/dist',
          '**/build',
          '**/.turbo',
          '**/coverage',
        ],
      };
    }

    return config;
  },
  // 啟用 React 的 Fast Refresh
  reactStrictMode: true,
  // 優化圖片載入
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true, // 為 Firebase Hosting 優化
  },
  // 優化編譯效能
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 優化 CSS 載入
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    // 優化字體載入
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } },
    ],
  },
  // 優化資源載入
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // 優化資源預載入
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // 優化字體載入
  optimizeFonts: true,
  trailingSlash: true
};

module.exports = withPWA(nextConfig); 