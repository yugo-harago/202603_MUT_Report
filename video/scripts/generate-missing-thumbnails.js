const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const picturesDir = path.join(__dirname, '../public/img/HouseGroupPictures/Pictures');
const thumbnailsDir = path.join(__dirname, '../public/img/HouseGroupPictures/Thumbnails');

if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const files = fs.readdirSync(picturesDir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));

let generatedCount = 0;

for (const f of files) {
  const inputPath = path.join(picturesDir, f);
  const outputPath = path.join(thumbnailsDir, f);
  
  const exists = fs.existsSync(outputPath);
  const isCorrupt = exists && fs.statSync(outputPath).size === 0;
  
  if (!exists || isCorrupt) {
    console.log(`Generating thumbnail for ${f}...`);
    try {
      execSync(`ffmpeg -y -v warning -i "${inputPath}" -vf "scale=640:-1" -frames:v 1 -update 1 "${outputPath}"`);
      generatedCount++;
    } catch (e) {
      console.error(`Failed to generate thumbnail for ${f}`, e.message);
    }
  }
}

console.log(`Finished. Generated ${generatedCount} missing thumbnails.`);
