import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Check for WebGL2 support
function isWebGL2Available() {
    try {
        const canvas = document.createElement('canvas');
        return !!window.WebGL2RenderingContext && !!canvas.getContext('webgl2');
    } catch (e) {
        return false;
    }
}

if (!isWebGL2Available()) {
    document.body.innerHTML = 'This application requires WebGL 2 support.';
    throw new Error('WebGL 2 is not available.');
} else {
    console.log('WebGL2 is available.');
}

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000000);
const renderer = new THREE.WebGLRenderer({
    logarithmicDepthBuffer: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add Axes Helper
// const axesHelper = new THREE.AxesHelper(1000000);
// scene.add(axesHelper);

// Set up OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI;

// Initial camera position
camera.position.set(222.16466633265046, 48.433966322931276, 180.67713105350742);
camera.lookAt(0, 0, 0);

let lidarGroup = new THREE.Group();
let moon;

// Function to load and transform PLY data
function loadAndTransformPLY(file) {
    const loader = new PLYLoader();
    loader.load(file, function (geometry) {
        console.log(`PLY file ${file} loaded`);
        const positionAttribute = geometry.getAttribute('position');
        const vertices = [];
        const elevations = [];

        // Apply the correct scaling factor
        const scaleFactor = 0.000057; // Adjust as needed to match the moon's size

        for (let i = 0; i < positionAttribute.count; i++) {
            // Apply the correct coordinate transformation
            const x = positionAttribute.getX(i) * scaleFactor;
            const y = positionAttribute.getY(i) * scaleFactor;
            const z = positionAttribute.getZ(i) * scaleFactor;
            
            // Assuming the LIDAR data needs to be rotated or reoriented to match the moon's orientation
            // Adjust the following transformation as needed based on your coordinate system
            const correctedX = x;
            const correctedY = -z; // Swap y and z if needed
            const correctedZ = -y; // Swap y and z if needed
            
            vertices.push(correctedX, correctedY, correctedZ);
            elevations.push(correctedZ);
        }

        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const colors = elevations.map(elevation => {
            const normalizedElevation = (elevation - minElevation) / (maxElevation - minElevation);
            return elevationToColor(normalizedElevation);
        }).flat();

        const sphereGeometry = new THREE.BufferGeometry();
        sphereGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        sphereGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const pointsMaterial = new THREE.PointsMaterial({ size: 0.9, vertexColors: true });
        const points = new THREE.Points(sphereGeometry, pointsMaterial);
        lidarGroup.add(points);
        scene.add(lidarGroup);
        console.log('Point cloud added to scene.');
    }, undefined, function (error) {
        console.error(`An error happened while loading PLY file ${file}:`, error);
    });
}
// Function to map normalized elevation to color
function elevationToColor(normalizedElevation) {
    const r = Math.max(0, Math.min(1, 2 * (0.5 - Math.abs(0.5 - normalizedElevation))));
    const g = Math.max(0, Math.min(1, 2 * (normalizedElevation - 0.5)));
    const b = Math.max(0, Math.min(1, 2 * (0.5 - normalizedElevation)));
    return [r, g, b];
}

// Load multiple point cloud datasets
const plyFiles = [
    'lidar_data_r008_099.ply',
    'lidar_data_r100_199.ply',
    'lidar_data_r200_299.ply',
    'lidar_data_r300_346.ply'
];
plyFiles.forEach(file => loadAndTransformPLY(file));

// Function to adjust sphere geometry based on elevation data
function adjustSphereGeometryWithElevations(geometry, elevations) {
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const elevation = elevations[i];
        const scale = 1 + elevation * 0.0001; // Adjust the scale factor as needed
        position.setXYZ(i, x * scale, y * scale, z * scale);
    }
    position.needsUpdate = true;
}

// Load the lunar map texture
const textureLoader = new THREE.TextureLoader();
const lunarMapTexture = textureLoader.load('lunar_map.png', () => {
    console.log('Lunar map texture loaded');

    // Load and create the moon with the texture
    loadAndCreateMoonWithTexture(lunarMapTexture);
}, undefined, function (error) {
    console.error('An error happened while loading lunar map texture:', error);
});

// Function to load and transform PLY data, then create the moon with the texture
function loadAndCreateMoonWithTexture(texture) {
    const loader = new PLYLoader();
    loader.load('lidar_data_r008_099.ply', function (geometry) {
        console.log('PLY file loaded');
        const positionAttribute = geometry.getAttribute('position');
        const vertices = [];
        const elevations = [];
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i) * 0.00011;
            const y = positionAttribute.getY(i) * 0.00011;
            const z = positionAttribute.getZ(i) * 0.00011;
            vertices.push(new THREE.Vector3(x, y, z));
            elevations.push(z);
        }

        // Calculate the scale factor
        const bbox = new THREE.Box3().setFromPoints(vertices);
        const plyRadius = bbox.getSize(new THREE.Vector3()).length() / 2;
        console.log("plyRadius: ", plyRadius);
        const sphereRadius = 100; // Adjust this to match the intended size
        const scaleFactor = sphereRadius / plyRadius;

        // Apply scale factor to vertices
        vertices.forEach(vertex => vertex.multiplyScalar(scaleFactor));

        createMoonWithTexture(texture, elevations, scaleFactor);
    }, undefined, function (error) {
        console.error('An error happened while loading PLY file:', error);
    });
}

// Function to create the moon with the texture and apply elevations
function createMoonWithTexture(texture, elevations, scaleFactor) {
    const radius = 100;  // Adjust radius as needed
    const segments = 50;  // Adjust segments as needed

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    adjustSphereGeometryWithElevations(geometry, elevations);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    moon = new THREE.Mesh(geometry, material);
    scene.add(moon);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();  // Required for damping
    renderer.render(scene, camera);
}
animate();

// Log camera position every two seconds
setInterval(() => {
    console.log(`Camera position: x=${camera.position.x}, y=${camera.position.y}, z=${camera.position.z}`);
}, 2000);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Log initial scene setup
console.log('Initial camera position:', camera.position);
console.log('Initial scene:', scene);

// Add event listeners for HUD checkboxes
document.getElementById('lidarCheckbox').addEventListener('change', (event) => {
    lidarGroup.visible = event.target.checked;
});

document.getElementById('moonCheckbox').addEventListener('change', (event) => {
    if (moon) {
        moon.visible = event.target.checked;
    }
});
