import fs from "fs/promises";

const content = await fs.readFile("metadata.json", "utf-8");
const metadata = JSON.parse(content);

const keys = Object.keys(metadata);
let iteration = 0;
for (const key of keys) {
  const file = `meta/${key}.json`;
  try {
    const fileContent = await fs.readFile(file, "utf-8");
    const fileMetadata = JSON.parse(fileContent);
    if (fileMetadata !== metadata[key]) {
      await fs.writeFile(file, JSON.stringify(metadata[key], null, 2));
    } else {
      console.log(`No changes for ${file}`);
    }
  } catch (err) {
    console.error(`Error reading ${file}: ${err.message}`);
  }
  iteration++;
  if (iteration % 100 === 0) {
    console.log(`Processed ${iteration}/${keys.length} files`);
  }
}
