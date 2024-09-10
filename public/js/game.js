import { scene, camera, renderer, composer } from './scene.js';
import { keys } from './controls.js';
import { createEnemy, updateEnemies, getEnemies, clearAllEnemies } from './enemies.js';
import { restartGame as mainRestartGame } from './main.js';
import { updateTrail, createTrail } from './spaceship.js';
import * as THREE from "three";
import { setSpaceship } from './enemies.js';
import { BoxHelper } from 'three';
import { getControllerInput } from './controller.js'; // Add this line

const DEBUG = false;
let gameSpeed = .5; // 0.6
let maxGameSpeed = 2.4;
const maxSpeed = 0.45;
const acceleration = 0.04;
const deceleration = 0.05;
let spawnInterval = 1500;
const minSpawnInterval = 135;
const maxSpaceshipRotation = Math.PI / 4;
const rotationSpeed = 0.2;
const cameraLerpFactor = .1;

let lastSpawnTime = 0;
let isGameOver = false;
let currentSpaceship, currentRoad, leftTrail, rightTrail;
let velocity = 0;
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;

let spaceshipBoxHelper, enemyBoxHelpers = [];
let animationFrameId; // Add this line to store the animation frame ID

// Add this near the top of the file with other variable declarations
let startTime = 0;

export function startGameLoop(spaceship, road) {
    if (!spaceship) {
        console.error("No spaceship provided to startGameLoop");
        return;
    }

    resetGameState();
    currentSpaceship = spaceship;
    setSpaceship(spaceship);  // Add this line to set the spaceship reference for enemies
    currentRoad = road;
    isGameOver = false;
    lastSpawnTime = 0;
    velocity = 0;
    score = 0;
    updateScoreDisplay();

    hideCursor(); // Hide the cursor when the game starts

    // Create trails
    leftTrail = createTrail(true);
    rightTrail = createTrail(false);
    leftTrail.castShadow = true;
    rightTrail.castShadow = true;
    scene.add(leftTrail);
    scene.add(rightTrail);

    // Cancel any existing animation frame before starting a new one
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // Reset the start time
    startTime = performance.now();

    function animate(time) {
        gameSpeed += 0.001;
        if (gameSpeed > maxGameSpeed) {
          gameSpeed = maxGameSpeed;
        }
        spawnInterval = 1000 - gameSpeed * 360; // 646 = difficulty
        if (!isGameOver) {
            animationFrameId = requestAnimationFrame(animate);

            currentRoad.material.uniforms.offset.value += gameSpeed * 0.001;
            currentRoad.material.uniforms.offset.value %= 1.0;

            let targetRotation = 0;
            let controllerInput = getControllerInput();

            const joystickDeadzone = 0.1; // Adjust this value to change the deadzone size
            const joystickSensitivity = 1.0; // Adjust this value to change joystick sensitivity

            // Handle controller input
            if (controllerInput) {
                if (Math.abs(controllerInput.leftStick) > joystickDeadzone) {
                    velocity += (controllerInput.leftStick - Math.sign(controllerInput.leftStick) * joystickDeadzone) * acceleration * joystickSensitivity;
                    targetRotation = -(controllerInput.leftStick - Math.sign(controllerInput.leftStick) * joystickDeadzone) * maxSpaceshipRotation * joystickSensitivity;
                }

                if (controllerInput.accelerate) {
                    gameSpeed = Math.min(gameSpeed + 0.01, maxGameSpeed);
                } else if (controllerInput.brake) {
                    gameSpeed = Math.max(gameSpeed - 0.01, 0.5);
                }
            }

            // Handle keyboard input
            if (keys['ArrowLeft'] || keys['KeyA'] || keys['KeyQ']) {
                velocity -= acceleration;
                targetRotation = maxSpaceshipRotation;
            } else if (keys['ArrowRight'] || keys['KeyD']) {
                velocity += acceleration;
                targetRotation = -maxSpaceshipRotation;
            }

            // Apply deceleration if no input is detected
            if (!controllerInput || Math.abs(controllerInput.leftStick) <= joystickDeadzone) {
                if (!keys['ArrowLeft'] && !keys['ArrowRight'] && !keys['KeyA'] && !keys['KeyD'] && !keys['KeyQ']) {
                    velocity *= (1 - deceleration);
                }
            }

            // Clamp velocity
            velocity = Math.max(Math.min(velocity, maxSpeed), -maxSpeed);

            // Update spaceship position
            currentSpaceship.position.x += velocity * gameSpeed * 0.5;
            currentSpaceship.position.x = Math.max(Math.min(currentSpaceship.position.x, 9), -9);

            // Smoothly interpolate rotation
            currentSpaceship.rotation.z += (targetRotation - currentSpaceship.rotation.z) * rotationSpeed * gameSpeed;

            // Update trails
            updateTrail(
                leftTrail,
                currentSpaceship.position,
                time * 0.001,
                currentSpaceship.rotation.z,
                true,  // isLeftTrail,
                gameSpeed
            );
            updateTrail(
                rightTrail,
                currentSpaceship.position,
                time * 0.001,
                currentSpaceship.rotation.z,
                false,  // isRightTrail,
                gameSpeed
            );

            // Increase score based on game speed
            score += Math.floor(gameSpeed * 10);
            updateScoreDisplay();

            if (time - lastSpawnTime > spawnInterval) {
                createEnemy(gameSpeed);
                lastSpawnTime = time;
            }

            TWEEN.update(time);
            updateEnemies(gameSpeed);

            // Update road shader with enemy positions
            const enemies = getEnemies();
            let enemyPositions = [];
            for (let i = 0; i < 10; i++) {
                if (i < enemies.length) {
                    enemyPositions.push(
                        enemies[i].position.x,
                        enemies[i].position.y,
                        enemies[i].position.z
                    );
                } else {
                    enemyPositions.push(0, 10, 0); // Add dummy positions
                }
            }
            currentRoad.material.uniforms.enemyPositions.value = enemyPositions;
            currentRoad.material.uniforms.playerPosition.value = currentSpaceship.position;
            currentRoad.material.uniforms.time.value = (time - startTime) * 0.002;
            currentRoad.material.uniforms.roadWidth.value = 20; // or whatever width you're using

            if (checkCollisions(currentSpaceship)) {
                gameOver();
            }

            if (currentSpaceship) {
                camera.position.x += (currentSpaceship.position.x - camera.position.x) * cameraLerpFactor;
                
                updateDebugHelpers();

                // Update the time and gameSpeed uniforms for the spaceship shader
                currentSpaceship.traverse((child) => {
                    if (child.isMesh && child.material.uniforms) {
                        child.material.uniforms.time.value = (time - startTime) * 0.002;
                        child.material.uniforms.gameSpeed.value = gameSpeed; // Add this line
                    }
                });
            }

            composer.render();
        }
    }

    // Start the animation loop
    animationFrameId = requestAnimationFrame(animate);
}

function checkCollisions(spaceship) {
    const enemies = getEnemies();
    const spaceshipBox = new THREE.Box3().setFromObject(spaceship);
    
    // Shrink the spaceship bounding box slightly
    const spaceshipShrinkFactor = .05;
    spaceshipBox.min.add(new THREE.Vector3(spaceshipShrinkFactor, spaceshipShrinkFactor, spaceshipShrinkFactor));
    spaceshipBox.max.sub(new THREE.Vector3(spaceshipShrinkFactor, spaceshipShrinkFactor, spaceshipShrinkFactor));

    for (const enemy of enemies) {
        const enemyBox = new THREE.Box3().setFromObject(enemy);
        
        // Shrink the enemy bounding box slightly
        const enemyShrinkFactor = .05;
        enemyBox.min.add(new THREE.Vector3(enemyShrinkFactor, enemyShrinkFactor, enemyShrinkFactor));
        enemyBox.max.sub(new THREE.Vector3(enemyShrinkFactor, enemyShrinkFactor, enemyShrinkFactor));

        if (spaceshipBox.intersectsBox(enemyBox)) {
            return true;
        }
    }
    return false;
}

function gameOver() {
    isGameOver = true;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
    }
    showCursor(); // Show the cursor when the game is over
    showGameOverOverlay();

    // Add this: Continue checking for controller input to allow restarting
    function checkForRestart() {
        let controllerInput = getControllerInput();
        if (controllerInput && controllerInput.retry) {
            restartGame();
        } else {
            requestAnimationFrame(checkForRestart);
        }
    }
    checkForRestart();
}

function showGameOverOverlay() {
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    gameOverOverlay.style.display = 'flex';
    document.getElementById('finalScore').textContent = `Score: ${score}`;
    document.getElementById('bestScore').textContent = `Best: ${bestScore}`;
    document.getElementById('retryButton').addEventListener('click', restartGame);
    document.getElementById("retryButton").focus();
}

function restartGame() {
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    gameOverOverlay.style.display = 'none';
    clearAllEnemies();
    removeTrails();
    hideCursor();

    // Ensure the animation loop is stopped
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Remove the current spaceship from the scene
    if (currentSpaceship) {
        scene.remove(currentSpaceship);
        currentSpaceship = null;
    }

    mainRestartGame();
}

export function resetGameState() {
    isGameOver = false;
    lastSpawnTime = 0;
    gameSpeed = 0.6;
    spawnInterval = 500;
    clearAllEnemies();

    score = 0;
    updateScoreDisplay();

    // Ensure the animation loop is stopped
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // The new animation loop will be started in startGameLoop

    // Reset the start time
    startTime = performance.now();
}

function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = `Score: ${score}`;
    document.getElementById('bestScoreDisplay').textContent = `Best: ${bestScore}`;
}

function hideCursor() {
    document.body.style.cursor = 'none';
}

function showCursor() {
    document.body.style.cursor = 'auto';
}

function updateDebugHelpers() {
    if (DEBUG) {
        if (spaceshipBoxHelper) {
            scene.remove(spaceshipBoxHelper);
            spaceshipBoxHelper = null;
        }
        if (!spaceshipBoxHelper) {
            spaceshipBoxHelper = new BoxHelper(currentSpaceship, 0xffff00);
            scene.add(spaceshipBoxHelper);
        }
        spaceshipBoxHelper.update();

        // Remove old enemy box helpers
        enemyBoxHelpers.forEach(helper => scene.remove(helper));
        enemyBoxHelpers = [];

        // Create new enemy box helpers
        getEnemies().forEach(enemy => {
            const helper = new BoxHelper(enemy, 0xff0000);
            scene.add(helper);
            enemyBoxHelpers.push(helper);
        });
    }
}

// Add this new function
export function removeTrails() {
    if (leftTrail) {
        scene.remove(leftTrail);
        leftTrail.geometry.dispose();
        leftTrail.material.dispose();
    }
    if (rightTrail) {
        scene.remove(rightTrail);
        rightTrail.geometry.dispose();
        rightTrail.material.dispose();
    }
    leftTrail = null;
    rightTrail = null;
}