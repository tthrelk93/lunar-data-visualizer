const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const csv = require('csv-parser');
const path = require('path');
const sizeOf = require('image-size');

const imageDir = 'output/grayscale_images';
const canvas = createCanvas(8192, 4096);
const ctx = canvas.getContext('2d');

async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const metadata = {};
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const key = row[Object.keys(row)[0]].toLowerCase().replace(/\s/g, '_');
                const value = row[Object.keys(row)[1]];
                metadata[key] = value;
            })
            .on('end', () => {
                resolve(metadata);
            })
            .on('error', reject);
    });
}

function calculateBoundaries(metadata) {
    if (!metadata.reticle_point_latitude || !metadata.reticle_point_longitude) {
        console.error('Missing reticle point latitude or longitude in metadata:', metadata);
        return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
    }

    const reticleLatitudes = metadata.reticle_point_latitude.match(/-?\d+\.\d+/g).map(parseFloat);
    const reticleLongitudes = metadata.reticle_point_longitude.match(/-?\d+\.\d+/g).map(parseFloat);

    const minLat = Math.min(...reticleLatitudes);
    const maxLat = Math.max(...reticleLatitudes);
    const minLon = Math.min(...reticleLongitudes);
    const maxLon = Math.max(...reticleLongitudes);

    return { minLat, maxLat, minLon, maxLon };
}

async function drawImages() {
    const revDirs = fs.readdirSync(imageDir).filter(file => fs.statSync(path.join(imageDir, file)).isDirectory());

    for (const revDir of revDirs) {
        const subDirs = fs.readdirSync(path.join(imageDir, revDir)).filter(file => fs.statSync(path.join(imageDir, revDir, file)).isDirectory());

        for (const subDir of subDirs) {
            const files = fs.readdirSync(path.join(imageDir, revDir, subDir));
            const pngFiles = files.filter(file => file.endsWith('.png'));

            for (const pngFile of pngFiles) {
                const metadataFile = pngFile.replace('.png', '_metadata.csv');
                const metadataPath = path.join(imageDir, revDir, subDir, metadataFile);
                const metadata = await parseCSV(metadataPath);

                if (!metadata.reticle_point_latitude || !metadata.reticle_point_longitude) {
                    console.error('Metadata missing reticle points:', metadataPath);
                    continue;
                }

                const boundaries = calculateBoundaries(metadata);

                const horizontalPixelScale = parseFloat(metadata.horizontal_pixel_scale.split(' ')[0]);
                const verticalPixelScale = parseFloat(metadata.vertical_pixel_scale.split(' ')[0]);

                // Convert width and height from kilometers to pixels on the canvas
                const widthKm = 128 * horizontalPixelScale;
                const heightKm = 128 * verticalPixelScale;

                // Ensure proper scaling to the canvas dimensions
                const width = (widthKm / 10921) * canvas.width;  // assuming Moon's circumference ~10921 km
                const height = (heightKm / 10921) * canvas.width;

                const x = ((boundaries.minLon / 360) * canvas.width);
                const y = ((90 - boundaries.maxLat) / 180) * canvas.height;
                
                // Print the dimensions of the PNG file
                                const imagePath = path.join(imageDir, revDir, subDir, pngFile);
                                const dimensions = sizeOf(imagePath);
                                console.log(`Image: ${imagePath}, Width: ${dimensions.width}, Height: ${dimensions.height}`);


                console.log('Placing image:', path.join(imageDir, revDir, subDir, pngFile));
                console.log('Boundaries:', boundaries);
                console.log('Image position and size - x:', x, 'y:', y, 'width:', width, 'height:', height, 'widthKm:', widthKm, 'heightKm:', heightKm, "hps:" ,horizontalPixelScale, "vps:", verticalPixelScale);

                const img = await loadImage(path.join(imageDir, revDir, subDir, pngFile));
                ctx.drawImage(img, x, y, widthKm, heightKm);
            }
        }
    }

    const out = fs.createWriteStream('lunar_map.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
        console.log('Lunar map created and saved as lunar_map.png');
    });
}

drawImages().catch(console.error);
