import { scene, camera } from './scene.js';
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let enemies = [];
let lightPlanes = [];
let spaceship;
let enemyModel;

const loader = new GLTFLoader();

// Load the enemy model
loader.load('/assets/objs/enemy.glb', (gltf) => {
  enemyModel = gltf.scene;
});

export function setSpaceship(ship) {
  spaceship = ship;
}

export function createEnemy(speed) {
  if (!enemyModel) return;

  const enemy = enemyModel.clone();

  // Center the enemy model at its origin
  const box = new THREE.Box3().setFromObject(enemy);
  const center = box.getCenter(new THREE.Vector3());
  enemy.position.sub(center);
  
  const enemyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      spaceshipPosition: { value: new THREE.Vector3() },
      minDistance: { value: 10.0 },
      maxDistance: { value: 180.0 },
      colorNear: { value: new THREE.Color(0xffbb00) },
      colorFar: { value: new THREE.Color(0xffffff) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 spaceshipPosition;
      uniform float minDistance;
      uniform float maxDistance;
      uniform vec3 colorNear;
      uniform vec3 colorFar;
      varying vec3 vWorldPosition;
      void main() {
        float distance = length(vWorldPosition - spaceshipPosition);
        float t = clamp((distance - minDistance) / (maxDistance - minDistance), 0.0, 1.0);
        vec3 color = mix(colorNear, colorFar, t);
        float alpha = 1.0 - smoothstep(0.9, 1.0, t);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
  });

  enemy.traverse((child) => {
    if (child.isMesh) {
      child.material = enemyMaterial.clone();
    }
  });

  const spawningDistance = -100 - 40 * speed;
  enemy.position.set((Math.random() - 0.5) * 18, 1.2, spawningDistance); // Adjusted y position
  scene.add(enemy);
  enemies.push(enemy);

  enemy.scale.set(0, 0, 0);
  const scale = 1.2;
  new TWEEN.Tween(enemy.scale)
    .to({ x: scale * 0.2, y: scale * 1.1, z: scale * 0.2 }, 200) // Adjusted final scale
    .easing(TWEEN.Easing.Elastic.Out)
    .start()
    .onComplete(() => {
      new TWEEN.Tween(enemy.scale)
        .to({ x: scale, y: scale, z: scale }, 400) // Adjusted final scale
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
    });

  // Create light plane
  // createLightPlane(enemy.position);
}

function createLightPlane(position) {
  const lightGeometry = new THREE.PlaneGeometry(8, 8);
  const lightMaterial = new THREE.MeshBasicMaterial({
    map: lightTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const lightPlane = new THREE.Mesh(lightGeometry, lightMaterial);
  lightPlane.rotation.x = -Math.PI / 2;
  lightPlane.position.copy(position);
  lightPlane.position.y = 0;
  lightPlane.renderOrder = 1;

  scene.add(lightPlane);
  lightPlanes.push(lightPlane);
}

export function updateEnemies(gameSpeed) {
  TWEEN.update();

  if (!spaceship) return;

  const spaceshipPosition = spaceship.position;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.position.z += gameSpeed;

    // Update light plane position
    if (lightPlanes[i]) {
      lightPlanes[i].position.copy(enemy.position);
      lightPlanes[i].position.y = 0;
      lightPlanes[i].material.opacity = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
      lightPlanes[i].scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);
    }

    // Update the uniform with the current spaceship position for all child meshes
    enemy.traverse((child) => {
      if (child.isMesh && child.material.uniforms) {
        child.material.uniforms.spaceshipPosition.value.copy(spaceshipPosition);
      }
    });

    if (enemy.position.z > 10) {
      scene.remove(enemy);
      enemies.splice(i, 1);
      if (lightPlanes[i]) {
        scene.remove(lightPlanes[i]);
        lightPlanes.splice(i, 1);
      }
    }
  }
}

export function getEnemies() {
  return enemies;
}

export function clearAllEnemies() {
  for (const enemy of enemies) {
    scene.remove(enemy);
  }
  for (const lightPlane of lightPlanes) {
    scene.remove(lightPlane);
  }
  enemies = [];
  lightPlanes = [];
}

function createLightTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, .5)');
    gradient.addColorStop(1, "rgba(255, 220, 0, 0)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    return new THREE.CanvasTexture(canvas);
}

const lightTexture = createLightTexture();