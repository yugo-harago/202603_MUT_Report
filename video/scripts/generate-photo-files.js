const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/img/HouseGroupPictures/Pictures');
const thumbnailsDir = path.join(__dirname, '../public/img/HouseGroupPictures/Thumbnails');
let files = [];
try {
  files = fs.readdirSync(dir)
    .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .map(f => {
      // Check if the thumbnail exists to save render memory
      const hasThumbnail = fs.existsSync(path.join(thumbnailsDir, f));
      return hasThumbnail ? `Thumbnails/${f}` : `Pictures/${f}`;
    });
} catch (e) {
  console.warn('Could not read Pictures directory, returning empty array.', e);
}

fs.writeFileSync(
  path.join(__dirname, '../src/photoFiles.json'),
  JSON.stringify(files, null, 2)
);
console.log('Generated src/photoFiles.json with ' + files.length + ' photos.');
