import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function createSpaceship() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/assets/objs/spaceship.glb');
    const spaceship = gltf.scene;

    const spaceshipMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorBase: { value: new THREE.Color(0x0099ff) },
        colorAccent: { value: new THREE.Color(0x00ffff) },
        gameSpeed: { value: 0.5 },
      },
      vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            uniform float time;
            uniform vec3 colorBase;
            uniform vec3 colorAccent;
            uniform float gameSpeed;
            varying vec3 vNormal;
            varying vec3 vPosition;

            vec3 rgb2hsv(vec3 c) {
                vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                float d = q.x - min(q.w, q.y);
                float e = 1.0e-10;
                return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            void main() {
                vec3 normal = normalize(vNormal);
                float fresnel = pow(1.0 - max(0.0, dot(normal, vec3(0.0, 0.0, 1.0))), 3.0);

                vec3 baseColor = rgb2hsv(colorBase);
                baseColor.x = fract(.6 + baseColor.x + time * 0.01); // Shift hue over time
                baseColor = hsv2rgb(baseColor);

                vec3 accentColor = rgb2hsv(colorAccent);
                accentColor.x = fract(.1 + accentColor.x + time * 0.01); // Shift hue over time
                accentColor = hsv2rgb(accentColor);

                // vec3 color = mix(baseColor, accentColor, fresnel);
                vec3 color = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), fresnel);
                
                // Interpolate between white and yellow based on game speed
                float t = (gameSpeed - 0.5) / (2.4 - 0.5);
                vec3 speedColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 1.0, 0.0), t);
                
                // Mix the original color with the speed-based color
                color = mix(color, speedColor, 0.5);
                if (gameSpeed == 2.4) {
                    color = vec3(1.0, .6, 1.0);
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
    });

    spaceship.traverse((child) => {
        if (child.isMesh) {
            child.material = spaceshipMaterial;
        }
    });

    spaceship.position.set(0, 1, 0);

    return spaceship;
}

export function updateTrail(trail, spaceshipPosition, time, rotationZ, isLeftTrail, speed) {
    if (!trail) return;
    const positions = trail.geometry.attributes.position.array;
    const numPoints = positions.length / 3;

    const lineWidth = .05;
    const offsetX = isLeftTrail ? -0.95 + Math.abs(rotationZ) * 0.4 : 0.95 - Math.abs(rotationZ) * 0.4;  // Invert offset for left trail
    const rotationOffset = isLeftTrail ? -rotationZ : rotationZ;  // Invert offset for left trail

    // Shift all other points to their preceding position
    for (let i = numPoints - 1; i > 0; i--) {
        positions[i * 3] = positions[(i - 1) * 3];
        positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
        positions[i * 3 + 2] = positions[(i - 1) * 3 + 2] + .12;
        positions[i * 3 + 3] = positions[(i - 1) * 3 + 3];
        positions[i * 3 + 4] = positions[(i - 1) * 3 + 4];
        positions[i * 3 + 5] = positions[(i - 1) * 3 + 5] + .12;
    }

    // Update the first point to the current spaceship position
    positions[0] = spaceshipPosition.x - lineWidth + offsetX;
    positions[1] = spaceshipPosition.y + rotationOffset*0.8;
    positions[2] = spaceshipPosition.z + 1;
    positions[3] = spaceshipPosition.x + lineWidth + offsetX;
    positions[4] = spaceshipPosition.y + rotationOffset*0.8;
    positions[5] = spaceshipPosition.z + 1;

    // Mark the position attribute as needing an update
    trail.geometry.attributes.position.needsUpdate = true;
    trail.material.uniforms.time.value = time;
    trail.material.uniforms.speed.value = speed;
}

export function createTrail(isLeftTrail) {
    const trailGeometry = new THREE.PlaneGeometry(0.2, 6, 1, 12);
    trailGeometry.rotateY(Math.PI / 2);
    trailGeometry.rotateZ(Math.PI / 2);
    trailGeometry.rotateY(Math.PI / 2);
    trailGeometry.translate(0, 0, 4);
    trailGeometry.rotateX(Math.PI / 2);
    const trailMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x44ff44) },
            isLeftTrail: { value: isLeftTrail },
            speed: { value: 0 },
        },
        vertexShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float speed;
                uniform bool isLeftTrail;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    if (isLeftTrail) {
                        gl_Position.y += .4 * sin(time*20.0 + vUv.y * 3.14159) * (1.0-vUv.y) * speed;
                    } else {
                        gl_Position.y += .4 * sin(3.14159*.5 + time*20.0 + vUv.y * 3.14159) * (1.0-vUv.y) * speed;
                    }
                }
            `,

        // fragmentShader: `
        //     uniform float time;
        //     uniform vec3 color;
        //     varying vec2 vUv;
        //     void main() {
        //         float alpha = sin(vUv.y * 3.14159) * pow(4.0 * vUv.y * (1.0 - vUv.y), 4.0);
        //         gl_FragColor = vec4(color, alpha);
        //     }
        // `,
        fragmentShader: `
                uniform float time;
                uniform vec3 color;
                varying vec2 vUv;
                void main() {
                    float alpha = sin(vUv.y * 3.14159) * pow(4.0 * vUv.y * (1.0 - vUv.y), 4.0);
                    gl_FragColor = vec4(color, alpha);
                }
            `,
        transparent: true,
        side: THREE.DoubleSide,
    });
    // const trailMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: false });

    return new THREE.Mesh(trailGeometry, trailMaterial);
}