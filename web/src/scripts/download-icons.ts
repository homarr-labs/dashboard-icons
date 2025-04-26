import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

// Import the SVG data
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { svgs } = require('../lib/isvg') as { svgs: ISVG[] };

// Define the ISVG interface
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

// Base URL for GitHub raw content
const BASE_URL = 'https://raw.githubusercontent.com/pheralb/svgl/refs/heads/main/static';
// Target directory (relative to the script location)
const TARGET_DIR = path.join(__dirname, '../../..', 'svg');

// Create the target directory if it doesn't exist
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`Created target directory: ${TARGET_DIR}`);
}

// Get a list of existing files in the target directory
const existingFiles = fs.readdirSync(TARGET_DIR);
console.log(`Found ${existingFiles.length} existing files in ${TARGET_DIR}`);

// Helper function to download a file
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(destPath); // Remove the file if download failed
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(destPath); // Remove the file if there was an error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlinkSync(destPath); // Remove the file if there was an error
      reject(err);
    });
  });
}

// Helper function to get base icon name from route
function getBaseIconName(route: string): string {
  // Extract basename, remove -icon/-logo, replace underscores with hyphens
  const filename = path.basename(route, '.svg')
    .replace(/(-icon|-logo)$/g, '')
    .replace(/_/g, '-');
  
  // Remove light/dark suffixes to get the base name
  return filename.replace(/-(light|dark)$/i, '');
}

// Map to store icon keys to their base names
const iconKeyMap = new Map<string, string>();

// First pass to build the icon key map
function buildIconKeyMap() {
  for (const svg of svgs) {
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
    
    const baseIconName = getBaseIconName(routePath);
    iconKeyMap.set(svg.title, baseIconName);
  }
}

// Build the key map before processing
buildIconKeyMap();

// Helper function to check if a file already exists
function fileExists(filename: string): boolean {
  return existingFiles.includes(filename);
}

// Format URL correctly by joining BASE_URL with the route path
function getFullUrl(route: string): string {
  // Remove leading slash if present
  const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
  return `${BASE_URL}/${cleanRoute}`;
}

// Process each SVG icon
async function processIcons() {
  let downloadCount = 0;
  let skipCount = 0;
  const failedDownloads: string[] = [];

  for (const svg of svgs) {
    try {
      // Get base name for this icon
      const baseIconName = iconKeyMap.get(svg.title) || '';
      
      // Process the main route
      if (typeof svg.route === 'string') {
        // Simple string route - use base name
        const filename = `${baseIconName}.svg`;
        if (!fileExists(filename)) {
          const url = getFullUrl(svg.route);
          const destPath = path.join(TARGET_DIR, filename);
          
          try {
            await downloadFile(url, destPath);
            console.log(`Downloaded: ${filename} (from ${path.basename(svg.route)})`);
            downloadCount++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error downloading ${filename}: ${errorMessage}`);
            failedDownloads.push(filename);
          }
        } else {
          console.log(`Skipping existing file: ${filename}`);
          skipCount++;
        }
      } else if (typeof svg.route === 'object') {
        // Object with light/dark variants
        if (svg.route.light) {
          const filename = `${baseIconName}-light.svg`;
          if (!fileExists(filename)) {
            const url = getFullUrl(svg.route.light);
            const destPath = path.join(TARGET_DIR, filename);
            
            try {
              await downloadFile(url, destPath);
              console.log(`Downloaded: ${filename} (from ${path.basename(svg.route.light)})`);
              downloadCount++;
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Error downloading ${filename}: ${errorMessage}`);
              failedDownloads.push(filename);
            }
          } else {
            console.log(`Skipping existing file: ${filename}`);
            skipCount++;
          }
        }

        if (svg.route.dark) {
          const filename = `${baseIconName}-dark.svg`;
          if (!fileExists(filename)) {
            const url = getFullUrl(svg.route.dark);
            const destPath = path.join(TARGET_DIR, filename);
            
            try {
              await downloadFile(url, destPath);
              console.log(`Downloaded: ${filename} (from ${path.basename(svg.route.dark)})`);
              downloadCount++;
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Error downloading ${filename}: ${errorMessage}`);
              failedDownloads.push(filename);
            }
          } else {
            console.log(`Skipping existing file: ${filename}`);
            skipCount++;
          }
        }
      }

      // Process wordmark if present
      if (svg.wordmark) {
        if (typeof svg.wordmark === 'string') {
          // Simple string wordmark
          const filename = `${baseIconName}-wordmark.svg`;
          
          // Download even if it exists because we want all wordmarks
          const url = getFullUrl(svg.wordmark);
          const destPath = path.join(TARGET_DIR, filename);
          
          try {
            await downloadFile(url, destPath);
            console.log(`Downloaded wordmark: ${filename} (from ${path.basename(svg.wordmark)})`);
            downloadCount++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error downloading wordmark ${filename}: ${errorMessage}`);
            failedDownloads.push(filename);
          }
        } else if (typeof svg.wordmark === 'object') {
          // Object with light/dark variants
          if (svg.wordmark.light) {
            const filename = `${baseIconName}-wordmark-light.svg`;
            
            // Download even if it exists because we want all wordmarks
            const url = getFullUrl(svg.wordmark.light);
            const destPath = path.join(TARGET_DIR, filename);
            
            try {
              await downloadFile(url, destPath);
              console.log(`Downloaded wordmark: ${filename} (from ${path.basename(svg.wordmark.light)})`);
              downloadCount++;
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Error downloading wordmark ${filename}: ${errorMessage}`);
              failedDownloads.push(filename);
            }
          }

          if (svg.wordmark.dark) {
            const filename = `${baseIconName}-wordmark-dark.svg`;
            
            // Download even if it exists because we want all wordmarks
            const url = getFullUrl(svg.wordmark.dark);
            const destPath = path.join(TARGET_DIR, filename);
            
            try {
              await downloadFile(url, destPath);
              console.log(`Downloaded wordmark: ${filename} (from ${path.basename(svg.wordmark.dark)})`);
              downloadCount++;
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Error downloading wordmark ${filename}: ${errorMessage}`);
              failedDownloads.push(filename);
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error processing ${svg.title}: ${errorMessage}`);
    }
  }

  console.log('\nSummary:');
  console.log(`Total icons processed: ${svgs.length}`);
  console.log(`Downloaded: ${downloadCount}`);
  console.log(`Skipped: ${skipCount}`);
  
  if (failedDownloads.length > 0) {
    console.log(`Failed downloads: ${failedDownloads.length}`);
    console.log(`Failed files: ${failedDownloads.join(', ')}`);
  }
}

// Run the script
processIcons().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 