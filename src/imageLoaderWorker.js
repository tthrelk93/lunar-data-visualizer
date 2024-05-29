const worker = new Worker('imageLoaderWorker.js');

self.onmessage = function(event) {
    const imagePaths = event.data;

    imagePaths.forEach(imagePath => {
        const image = new Image();
        image.onload = () => {
            const canvas = new OffscreenCanvas(image.width, image.height);
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const dataUrl = canvas.toDataURL();
            
            self.postMessage({
                path: imagePath,
                width: image.width,
                height: image.height,
                dataUrl: dataUrl
            });
        };
        image.src = imagePath;
    });
};
