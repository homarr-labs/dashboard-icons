#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';

// Define the file paths - this script is in /web/src/scripts
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const METADATA_PATH = path.join(SCRIPT_DIR, '../../../metadata.json');
const SVG_DIR = path.join(SCRIPT_DIR, '../../../svg');

interface MetadataItem {
  base: string;
  aliases: string[];
  categories: string[];
  update: {
    timestamp: string;
    author: {
      id: number | string;
      name: string;
    };
  };
  wordmark?: string | {
    light: string;
    dark: string;
  };
  colors?: {
    dark: string;
    light: string;
  };
}

interface Metadata {
  [key: string]: MetadataItem;
}

// Function to normalize a name by removing light/dark suffixes and replacing underscores
function normalizeName(name: string): string {
  return name.replace(/_/g, '-').replace(/-(light|dark)(-wordmark)?$/i, '$2');
}

// Function to collect all valid icon names from metadata
function collectValidIconNames(metadata: Metadata): Set<string> {
  const validNames = new Set<string>();
  
  for (const [key, data] of Object.entries(metadata)) {
    // Add the main key (icon name)
    validNames.add(key.replace(/_/g, '-'));
    
    // Add wordmark if it exists
    if (data.wordmark) {
      if (typeof data.wordmark === 'string') {
        validNames.add(data.wordmark.replace(/_/g, '-'));
      } else {
        if (data.wordmark.light) validNames.add(data.wordmark.light.replace(/_/g, '-'));
        if (data.wordmark.dark) validNames.add(data.wordmark.dark.replace(/_/g, '-'));
      }
    }
    
    // Add colors if they exist
    if (data.colors) {
      if (data.colors.light) validNames.add(data.colors.light.replace(/_/g, '-'));
      if (data.colors.dark) validNames.add(data.colors.dark.replace(/_/g, '-'));
    }
  }
  
  return validNames;
}

async function main() {
  console.log('Starting cleanup of unused SVG files...');
  
  try {
    // Read and parse metadata.json
    console.log(`Reading metadata from ${METADATA_PATH}`);
    const metadataContent = await fs.promises.readFile(METADATA_PATH, 'utf8');
    const metadata: Metadata = JSON.parse(metadataContent);
    
    // Collect all valid icon names
    const validIconNames = collectValidIconNames(metadata);
    console.log(`Found ${validIconNames.size} valid icon names in metadata`);
    
    // Read all SVG files in the directory
    const svgFiles = await fs.promises.readdir(SVG_DIR);
    console.log(`Found ${svgFiles.length} SVG files in directory`);
    
    // Files to delete
    const filesToDelete: string[] = [];
    
    // Check each SVG file
    for (const file of svgFiles) {
      if (!file.endsWith('.svg')) continue;
      
      // Get the base name without extension
      const baseName = file.replace('.svg', '');
      
      // Convert any underscores to hyphens for comparison with metadata
      const normalizedBaseName = baseName.replace(/_/g, '-');
      
      // If not in valid names, mark for deletion
      if (!validIconNames.has(normalizedBaseName)) {
        filesToDelete.push(file);
      }
    }
    
    // Delete unused files
    console.log(`Found ${filesToDelete.length} unused SVG files to delete`);
    for (const file of filesToDelete) {
      const filePath = path.join(SVG_DIR, file);
      await fs.promises.unlink(filePath);
      console.log(`Deleted: ${file}`);
    }
    
    console.log('Cleanup completed successfully!');
    console.log(`Deleted ${filesToDelete.length} unused SVG files`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

main(); 