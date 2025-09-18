/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações do Next.js
  turbopack: {
    enabled: true,
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Configurar porta padrão (opcional - pode ser sobrescrita)
  // Isso não define a porta diretamente, mas você pode usar no processo
  env: {
    CUSTOM_PORT: process.env.PORT || '3000'
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
