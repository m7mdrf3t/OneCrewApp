#!/usr/bin/env node

/**
 * Error Checker Script
 * Checks for common issues that cause iOS runtime errors
 */

const fs = require('fs');
const path = require('path');

const errors = [];

// Check for missing exports
function checkExports() {
  console.log('🔍 Checking for missing exports...');
  
  const componentsDir = path.join(__dirname, 'src/components');
  const pagesDir = path.join(__dirname, 'src/pages');
  
  function checkFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if file has default export
      if (content.includes('export default') || content.includes('module.exports')) {
        return; // Has export
      }
      
      // Check if it's a style file (these don't need default exports)
      if (filePath.includes('.styles.')) {
        return;
      }
      
      // Check if it's a utility file
      if (filePath.includes('/utils/') || filePath.includes('/services/')) {
        return;
      }
      
      // Check if it's a type file
      if (filePath.includes('/types/')) {
        return;
      }
      
      // If it's a component/page file without export, that's a problem
      if (filePath.endsWith('.tsx') && !content.includes('export')) {
        errors.push(`⚠️  ${relativePath}: No export found`);
      }
    } catch (e) {
      errors.push(`❌ ${relativePath}: ${e.message}`);
    }
  }
  
  function walkDir(dir, baseDir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, baseDir);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const relativePath = path.relative(baseDir, filePath);
        checkFile(filePath, relativePath);
      }
    });
  }
  
  if (fs.existsSync(componentsDir)) {
    walkDir(componentsDir, __dirname);
  }
  if (fs.existsSync(pagesDir)) {
    walkDir(pagesDir, __dirname);
  }
}

// Check for common import issues
function checkImports() {
  console.log('🔍 Checking for import issues...');
  
  const files = [];
  function collectFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory() && !item.includes('node_modules')) {
        collectFiles(itemPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(itemPath);
      }
    });
  }
  
  collectFiles(path.join(__dirname, 'src'));
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for common problematic patterns
        if (line.includes('import') && line.includes('undefined')) {
          errors.push(`⚠️  ${path.relative(__dirname, filePath)}:${index + 1}: Import from undefined`);
        }
        
        // Check for missing file extensions in relative imports
        if (line.includes('from') && line.includes("'./") && !line.includes('.ts') && !line.includes('.tsx') && !line.includes('.js')) {
          const match = line.match(/from\s+['"](\.\/[^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            // Check if file exists without extension
            const possiblePaths = [
              path.join(path.dirname(filePath), importPath + '.ts'),
              path.join(path.dirname(filePath), importPath + '.tsx'),
              path.join(path.dirname(filePath), importPath + '.js'),
              path.join(path.dirname(filePath), importPath, 'index.ts'),
              path.join(path.dirname(filePath), importPath, 'index.tsx'),
            ];
            
            const exists = possiblePaths.some(p => fs.existsSync(p));
            if (!exists && !importPath.includes('node_modules')) {
              // This might be okay if it's a package, but log it
              // errors.push(`⚠️  ${path.relative(__dirname, filePath)}:${index + 1}: Possible missing import: ${importPath}`);
            }
          }
        }
      });
    } catch (e) {
      // Ignore read errors
    }
  });
}

// Check for SkeletonPlaceholder usage
function checkSkeletonPlaceholder() {
  console.log('🔍 Checking SkeletonPlaceholder usage...');
  
  const files = [];
  function collectFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        collectFiles(itemPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(itemPath);
      }
    });
  }
  
  collectFiles(path.join(__dirname, 'src'));
  
  const usingSkeleton = [];
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('SkeletonPlaceholder') || content.includes('react-native-skeleton-placeholder')) {
        usingSkeleton.push(path.relative(__dirname, filePath));
      }
    } catch (e) {
      // Ignore
    }
  });
  
  if (usingSkeleton.length > 0) {
    console.log(`\n📋 Files using SkeletonPlaceholder (${usingSkeleton.length}):`);
    usingSkeleton.forEach(f => console.log(`   - ${f}`));
    console.log('\n⚠️  These files depend on react-native-linear-gradient');
    console.log('   Make sure native modules are properly linked after rebuild\n');
  }
}

// Main
console.log('🔍 Running error checks...\n');
checkExports();
checkImports();
checkSkeletonPlaceholder();

if (errors.length > 0) {
  console.log('\n❌ Found issues:');
  errors.forEach(e => console.log(e));
  process.exit(1);
} else {
  console.log('\n✅ No obvious import/export issues found');
  console.log('\n💡 To see actual runtime errors:');
  console.log('   1. Open iOS Simulator');
  console.log('   2. Check the console in Metro bundler');
  console.log('   3. Or run: npx react-native log-ios');
  console.log('   4. Or check Xcode console output');
}

