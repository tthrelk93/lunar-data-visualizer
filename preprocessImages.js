const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Function to create a texture atlas from images
async function createTextureAtlas(imagePaths, atlasWidth, atlasHeight) {
    const atlasCanvas = createCanvas(atlasWidth, atlasHeight);
    const context = atlasCanvas.getContext('2d');
    const tileSize = Math.sqrt((atlasWidth * atlasHeight) / imagePaths.length);

    for (let i = 0; i < imagePaths.length; i++) {
        const image = await loadImage(imagePaths[i]);
        const x = (i % (atlasWidth / tileSize)) * tileSize;
        const y = Math.floor(i / (atlasWidth / tileSize)) * tileSize;
        context.drawImage(image, x, y, tileSize, tileSize);
    }

    return atlasCanvas.toDataURL();
}

// Example usage
async function main() {
    const outputDirectory = 'output/grayscale_images';
    const imagePaths = getFirstImagePaths(outputDirectory);
    const atlas = await createTextureAtlas(imagePaths, 4096, 4096);
    fs.writeFileSync('textureAtlas.png', atlas.split(',')[1], 'base64');
}

main();
