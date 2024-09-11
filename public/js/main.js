import { initScene, scene } from './scene.js';
import { createRoad } from './road.js';
import { createSpaceship } from './spaceship.js';
import { initControls } from './controls.js';
import { startGameLoop, resetGameState, removeTrails } from './game.js';
import { initController } from './controller.js';

let spaceship, road;

async function init() {
    initScene();
    initController();
    road = createRoad();
    scene.add(road);
    
    try {
        spaceship = await createSpaceship();
        scene.add(spaceship);
        
        initControls();
        
        // Load best score from local storage
        const bestScore = localStorage.getItem('bestScore') || 0;
        document.getElementById('bestScoreDisplay').textContent = `best: ${bestScore}`;
        
        startGameLoop(spaceship, road);
    } catch (error) {
        console.error("Failed to load spaceship:", error);
    }
}

export async function restartGame() {
    removeTrails();
    if (spaceship) {
        scene.remove(spaceship);
        spaceship.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
    spaceship = null;

    scene.remove(road);

    road = createRoad();
    scene.add(road);

    try {
        spaceship = await createSpaceship();
        scene.add(spaceship);

        resetGameState();
        startGameLoop(spaceship, road);
    } catch (error) {
        console.error("Failed to load spaceship:", error);
    }
}

init();