const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving .js files from node_modules
config.resolver.sourceExts.push('js', 'json', 'ts', 'tsx', 'jsx');

// Ensure proper handling of node_modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add transformer options for better compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
