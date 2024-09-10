import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export let scene, camera, renderer, composer;

export function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(95, window.innerWidth / window.innerHeight, .01, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.); // Soft blue ambient light
    scene.add(ambientLight);

    // Add sun light (DirectionalLight)
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.); // White directional light
    sunLight.name = 'sunLight';
    sunLight.position.set(50, 100, 50);
    scene.add(sunLight);

    camera.position.set(0, 4, 8);

    // Set a light blue background color
    // scene.background = new THREE.Color(0xE6F3FF);
    scene.background = new THREE.Color("rgb(3, 14, 22)"); // Dark blue

    // Set up EffectComposer and UnrealBloomPass
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        .8,  // strength
        1,  // radius
        0.7  // threshold
    );
    // composer.addPass(bloomPass);
}

// Add a resize handler
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}