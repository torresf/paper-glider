export const keys = {};

export function initControls() {
    document.addEventListener('keydown', (event) => keys[event.code] = true);
    document.addEventListener('keyup', (event) => keys[event.code] = false);
}