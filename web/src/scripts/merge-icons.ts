import fs from 'node:fs';
import path from 'node:path';

// Define the types
interface ISVG {
  title: string;
  category: string | string[];
  route: string | {
    light?: string;
    dark?: string;
  };
  wordmark?: string | {
    light?: string;
    dark?: string;
  };
  url?: string;
  brandUrl?: string;
}

interface MetadataItem {
  base: string;
  aliases: string[];
  categories: string[];
  update: {
    timestamp: string;
    author: {
      id: string;
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

// Import the SVG data
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { svgs } = require('../lib/isvg') as { svgs: ISVG[] };

// Path to the metadata file (relative to the current script)
const metadataPath = path.join(__dirname, '../../..', 'metadata.json');

// Read existing metadata
let metadata: Metadata = {};
try {
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(metadataContent);
} catch (error) {
  console.error('Error reading metadata file:', error);
  process.exit(1);
}

// The author details
const author = {
  id: 49837342,
  name: "ajnart"
};

// The timestamp
const timestamp = "2025-04-25T12:00:00Z";

// Helper function to convert the author ID to string, since that's the expected type
function getAuthorWithStringId(authorObj: { id: number | string; name: string }): { id: string; name: string } {
  return {
    ...authorObj,
    id: String(authorObj.id)
  };
}

// Convert iSVG format to metadata format
for (const svg of svgs) {
  // Extract the key from the route path
  let routePath: string;
  
  if (typeof svg.route === 'string') {
    routePath = svg.route;
  } else if (svg.route.light) {
    routePath = svg.route.light;
  } else if (svg.route.dark) {
    routePath = svg.route.dark || '';
  } else {
    routePath = '';
  }
  
  // Get the filename without extension and remove suffixes
  // Also replace underscores with hyphens
  let key = path.basename(routePath, '.svg')
    .replace(/(-icon|-logo)$/g, '')
    .replace(/_/g, '-');
  
  // Remove -light or -dark suffixes for the base key
  key = key.replace(/-(light|dark)$/i, '');
  
  // Check if the icon already exists
  if (metadata[key]) {
    console.log(`Icon "${svg.title}" already exists in metadata as "${key}"`);
    
    // Update the existing entry with wordmark if it doesn't have one
    if (svg.wordmark && !metadata[key].wordmark) {
      console.log(`Adding wordmark to existing icon "${key}"`);
      
      if (typeof svg.wordmark === 'string') {
        // Instead of using the original wordmark name, use standardized naming
        metadata[key].wordmark = `${key}-wordmark`;
      } else if (typeof svg.wordmark === 'object') {
        // Object with light/dark variants - use standardized naming
        metadata[key].wordmark = {
          light: svg.wordmark.light ? `${key}-wordmark-light` : '',
          dark: svg.wordmark.dark ? `${key}-wordmark-dark` : ''
        };
      }
      
      // Update the timestamp and author
      metadata[key].update = {
        timestamp,
        author: getAuthorWithStringId(author)
      };
    }
    
    // If route contains light/dark values, update colors with standardized naming
    if (typeof svg.route === 'object' && (svg.route.light || svg.route.dark)) {
      if (!metadata[key].colors) {
        metadata[key].colors = {
          dark: svg.route.dark ? `${key}-dark` : '',
          light: svg.route.light ? `${key}-light` : ''
        };
      }
    }
  } else {
    // Create a new metadata entry
    const newEntry: MetadataItem = {
      base: "svg", // Assuming SVG format
      aliases: [],
      categories: [],
      update: {
        timestamp,
        author: getAuthorWithStringId(author)
      }
    };
    
    // Handle categories
    if (Array.isArray(svg.category)) {
      newEntry.categories = svg.category;
    } else if (typeof svg.category === 'string') {
      newEntry.categories = [svg.category];
    }
    
    // Handle wordmark if present with standardized naming
    if (svg.wordmark) {
      if (typeof svg.wordmark === 'string') {
        newEntry.wordmark = `${key}-wordmark`;
      } else if (typeof svg.wordmark === 'object') {
        newEntry.wordmark = {
          light: svg.wordmark.light ? `${key}-wordmark-light` : '',
          dark: svg.wordmark.dark ? `${key}-wordmark-dark` : ''
        };
      }
    }
    
    // Handle colors from route with standardized naming
    if (typeof svg.route === 'object' && (svg.route.light || svg.route.dark)) {
      newEntry.colors = {
        dark: svg.route.dark ? `${key}-dark` : '',
        light: svg.route.light ? `${key}-light` : ''
      };
    }
    
    // Add to metadata
    metadata[key] = newEntry;
    console.log(`Added new icon "${svg.title}" as "${key}"`);
  }
}

// Write the updated metadata back to the file
try {
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 4));
  console.log(`Successfully updated metadata file at ${metadataPath}`);
} catch (error) {
  console.error('Error writing metadata file:', error);
  process.exit(1);
} 