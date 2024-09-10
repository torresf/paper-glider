let gamepad = null;

export function initController() {
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        gamepad = e.gamepad;
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected:", e.gamepad.id);
        gamepad = null;
    });
}

export function getControllerInput() {
    if (!gamepad) return null;

    // Make sure we have the latest gamepad state
    gamepad = navigator.getGamepads()[gamepad.index];

    return {
        leftStick: gamepad.axes[0], // Left stick horizontal axis
        rightStick: gamepad.axes[2], // Right stick horizontal axis
        accelerate: gamepad.buttons[7].pressed, // R2 button
        brake: gamepad.buttons[6].pressed, // L2 button
        restart: gamepad.buttons[9].pressed, // Options button
        retry: gamepad.buttons[0].pressed, // X button (typically index 0 on most gamepads)
    };
}