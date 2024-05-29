import * as THREE from 'three';

// Function to create moon with textures
export function createMoonWithTextures(imagePaths) {
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create a sphere geometry for the moon
    const geometry = new THREE.SphereGeometry(5, 32, 32);

    // Placeholder for the texture loader and materials
    const loader = new THREE.TextureLoader();
    const materials = [];

    // Load and apply textures to the geometry
    imagePaths.forEach(imagePath => {
        const texture = loader.load(imagePath);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        materials.push(material);
    });

    // Apply the materials to the sphere geometry
    const sphere = new THREE.Mesh(geometry, materials);
    scene.add(sphere);

    // Position camera and start rendering
    camera.position.z = 10;
    const animate = function () {
        requestAnimationFrame(animate);
        sphere.rotation.y += 0.01; // Rotate for better viewing
        renderer.render(scene, camera);
    };

    animate();
}



// Function to read all image paths recursively
export function getAllImagePaths(directory) {
    const imagePaths = [];

    function traverse(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                traverse(filePath);
            } else if (filePath.endsWith('.png')) {
                imagePaths.push(filePath);
            }
        });
    }

    traverse(directory);
    return imagePaths;
}

