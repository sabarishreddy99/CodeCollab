/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable server-side rendering for specific routes
    reactStrictMode: true,
    
    // Configure webpack to handle client-side libraries
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = { 
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false 
        };
      }
      
      return config;
    },
  
    // Transpile specific packages for better compatibility
    transpilePackages: [
      'monaco-editor', 
      '@monaco-editor/react',
      '@liveblocks/react', 
      '@liveblocks/yjs',
      'y-monaco'
    ],
  
    // Experimental configurations for better performance
    experimental: {
      serverComponentsExternalPackages: [
        'monaco-editor', 
        'y-monaco', 
        '@liveblocks/react'
      ]
    }
  };
  
  module.exports = nextConfig;