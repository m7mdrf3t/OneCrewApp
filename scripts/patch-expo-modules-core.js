#!/usr/bin/env node
/**
 * Adds FileSystemUtilities.isReadableFile to expo-modules-core for expo-media-library compatibility.
 * Run after npm install (postinstall).
 */
const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'ios',
  'FileSystemUtilities',
  'FileSystemUtilities.swift'
);

const marker = 'public static func isReadableFile(_ appContext: AppContext?, _ uri: URL) -> Bool {';
const insertion =
  `  /// Returns true if the given URI is readable (app has read permission and, for file URLs, file exists and is readable).
  public static func isReadableFile(_ appContext: AppContext?, _ uri: URL) -> Bool {
    let perms = permissions(appContext, for: uri)
    guard perms.contains(.read) else {
      return false
    }
    if uri.isFileURL {
      return FileManager.default.isReadableFile(atPath: uri.path)
    }
    return true
  }

  public static func permissions(_ appContext: AppContext?, for uri: URL) -> [FileSystemPermissionFlags] {`;

const searchFor =
  '  public static func permissions(_ appContext: AppContext?, for uri: URL) -> [FileSystemPermissionFlags] {';

if (!fs.existsSync(targetPath)) {
  console.warn('patch-expo-modules-core: target file not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

if (content.includes(marker)) {
  process.exit(0);
}

if (!content.includes(searchFor)) {
  console.warn('patch-expo-modules-core: expected line not found, skipping');
  process.exit(0);
}

content = content.replace(searchFor, insertion);
fs.writeFileSync(targetPath, content);
console.log('patch-expo-modules-core: applied isReadableFile to expo-modules-core');
