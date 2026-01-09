const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for resolving .js files from node_modules
config.resolver.sourceExts.push('js', 'json', 'ts', 'tsx', 'jsx');

// Ensure proper handling of node_modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Fix for react-native-worklets: prevent Metro from looking for .native.ts files
// when they don't exist in the package
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, realModuleName, platform, moduleName) => {
  // If Metro is trying to resolve a .native.ts file that doesn't exist,
  // fall back to the regular .ts file for react-native-worklets
  if (realModuleName && realModuleName.includes('react-native-worklets') && realModuleName.includes('.native')) {
    const fallbackModuleName = realModuleName.replace('.native', '');
    // Try to resolve the fallback module using Metro's default resolver
    if (defaultResolver && typeof defaultResolver === 'function') {
      try {
        return defaultResolver(context, fallbackModuleName, platform, moduleName);
      } catch (e) {
        // Fall through to direct file resolution
      }
    }
    // If fallback fails, try to resolve the file directly
    const fs = require('fs');
    const workletsPath = path.join(__dirname, 'node_modules', 'react-native-worklets', 'src', 'runtimes.ts');
    if (fs.existsSync(workletsPath)) {
      return {
        filePath: workletsPath,
        type: 'sourceFile',
      };
    }
  }
  // Use default resolution for all other modules
  if (defaultResolver && typeof defaultResolver === 'function') {
    try {
      return defaultResolver(context, realModuleName, platform, moduleName);
    } catch (error) {
      // If resolution fails and it's a .native file for react-native-worklets, try fallback
      if (realModuleName && realModuleName.includes('react-native-worklets') && realModuleName.includes('.native')) {
        const fallbackModuleName = realModuleName.replace('.native', '');
        return defaultResolver(context, fallbackModuleName, platform, moduleName);
      }
      throw error;
    }
  }
  // If no default resolver, use Metro's built-in resolver
  // Note: resolve signature is (context, moduleName, platform)
  return resolve(context, realModuleName, platform);
};

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
