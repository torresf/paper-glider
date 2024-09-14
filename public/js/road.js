import * as THREE from 'three';

export function createRoad() {
  const roadWidth = 20;
  const roadLength = 1024;
  const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
  const roadTexture = createRoadTexture();
  
  const roadMaterial = new THREE.ShaderMaterial({
    uniforms: {
      roadTexture: { value: roadTexture },
      roadLength: { value: roadLength },
      offset: { value: 0 },
      enemyPositions: { value: new Float32Array(30) }, // 10 enemies * 3 components
      playerPosition: { value: new THREE.Vector3(0, 0, 0) },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float offset;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vUv.y += offset;
        vPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D roadTexture;
      uniform float roadLength;
      uniform vec3 enemyPositions[10];
      uniform vec3 playerPosition;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      // Add these functions for rgb to hsv conversion
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
        vec4 texColor = texture2D(roadTexture, vUv);
        vec3 hsvColor = rgb2hsv(texColor.rgb);
        if (hsvColor.z > 0.1) {
          // hsvColor.x = fract(hsvColor.x + time * 0.01); // Slowly shift hue over time
        }
        vec3 shiftedRgb = hsv2rgb(hsvColor);
        texColor = vec4(shiftedRgb, texColor.a);
        
        float fadeStart = 0.1;
        float alpha = 1.0 - smoothstep(fadeStart, 1.0, vPosition.y / roadLength * 3.0);
        
        vec3 enemyGlow = vec3(0.0);
        for(int i = 0; i < 10; i++) {
          vec3 enemyPos = enemyPositions[i];
          float dist = distance(vWorldPosition, enemyPos);
          float intensity = 1. - smoothstep(0.0, 0.03, dist * .01);
          enemyGlow += vec3(1., .8, 0.) * intensity;
        }

        // Glow under player
        vec3 glow = vec3(0.0);
        // Calculate distance in world space
        vec3 playerPos = playerPosition;
        playerPos.y -= 1.;
        float dist = distance(vPosition, playerPos);
        float intensity = 1.0 - smoothstep(0.0, 0.8, dist * .05);
        glow += texColor.rgb * intensity;
        intensity = 1.0 - smoothstep(0.0, 1., dist * .3);
        glow += vec3(1., 0., 1.) * intensity * 0.2;

        vec3 finalColor = texColor.rgb + glow + enemyGlow;
        // vec3 finalColor = texColor.rgb;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  return road;
}

function createRoadTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Fill background with dark blue
    ctx.fillStyle = "rgb(3, 14, 22)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw main white stripes
    ctx.fillStyle = "rgb(20, 100, 120)";
    // ctx.fillStyle = "rgb(10, 50, 60)";
    const stripeWidth = 1;
    const gapWidth = 64;
    const totalWidth = stripeWidth + gapWidth;

    for (let y = 0; y < canvas.height; y += totalWidth) {
        ctx.fillRect(0, y, canvas.width, stripeWidth);
    }

    // Draw random small bright orange stripes on the y-axis
    const smallStripeWidth = 5;
    const smallStripeHeight = 30;
    const numSmallStripes = 500; // Adjust this for more or fewer small stripes

    ctx.fillStyle = "rgb(50, 220, 255)"; // Very bright, almost white-hot orange
    for (let i = 0; i < numSmallStripes; i++) {
        const x = 10 + Math.random() * (canvas.width - 20);
        const y = Math.random() * canvas.height;
        const alpha = Math.random() * 0.2 + 0.5; // Random alpha value between 0.4 and 1.0
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, smallStripeWidth, smallStripeHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 10); // Adjust this value to change the density of stripes
    return texture;
}