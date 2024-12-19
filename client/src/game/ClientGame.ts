import { GameState, updateBikePosition, updateBuildings, updatePotholes } from '@shared/GameState';
import { GameRenderer, } from './GameRenderer';
import { WebSocketManager } from '../services/WebSocketManager';

export class ClientGame {
    private renderer: GameRenderer;
    private gameState: GameState;
    private animationFrameId: number | null = null;
    private wsManager: WebSocketManager;
    private isStarted: boolean = false;
    private keyStates: { [key: string]: boolean } = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false
    };

    constructor(canvas: HTMLCanvasElement, initialState: GameState, wsManager: WebSocketManager) {
        this.renderer = new GameRenderer(canvas);
        this.gameState = initialState;
        this.wsManager = wsManager;
    }

    public updateGameState(newState: GameState) {
        this.gameState = newState;
    }

    public getGameState(): GameState {
        return this.gameState;
    }

    private updateLocalState(deltaTime: number) {
        // Update bike position
        const newBike = updateBikePosition(this.gameState, deltaTime);

        // Update buildings and handle collisions
        const buildingUpdates = updateBuildings(this.gameState.buildings, this.gameState, deltaTime);

        // Update potholes and handle collisions
        const potholeUpdates = updatePotholes(this.gameState.potholes, this.gameState, deltaTime);

        // Update game state with all changes
        this.gameState = {
            ...this.gameState,
            bike: newBike,
            buildings: buildingUpdates.buildings,
            potholes: potholeUpdates.potholes,
            score: buildingUpdates.score,
            goals: buildingUpdates.goals,
            health: potholeUpdates.health,
            collidedBuildingIds: buildingUpdates.collidedBuildingIds,
            collidedPotholeIds: potholeUpdates.collidedPotholeIds
        };
    }

    public start() {
        if (this.isStarted) return;
        this.isStarted = true;

        let lastFrameTime = performance.now();
        const gameLoop = (currentTime: number) => {
            const deltaTime = (currentTime - lastFrameTime) / 1000;

            // Update local state at 30fps
            if (deltaTime >= (1000 / 30) / 1000) {
                this.updateLocalState(deltaTime);
                lastFrameTime = currentTime;
            }

            // Render at full fps
            this.renderer.render(this.gameState);
            this.animationFrameId = requestAnimationFrame(gameLoop);
        };

        this.animationFrameId = requestAnimationFrame(gameLoop);
    }

    public stop() {
        console.log("stop");
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.isStarted = false;
        }
    }

    public isGameStarted(): boolean {
        return this.isStarted;
    }

    public setupControls() {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // Ignore key repeat events

            switch (e.key) {
                case 'ArrowLeft':
                    if (!this.keyStates.ArrowLeft) {
                        this.keyStates.ArrowLeft = true;
                        this.wsManager.sendMessage({ type: 'moveLeft', pressed: true });
                    }
                    break;
                case 'ArrowRight':
                    if (!this.keyStates.ArrowRight) {
                        this.keyStates.ArrowRight = true;
                        this.wsManager.sendMessage({ type: 'moveRight', pressed: true });
                    }
                    break;
                case 'ArrowUp':
                    if (!this.keyStates.ArrowUp) {
                        this.keyStates.ArrowUp = true;
                        this.wsManager.sendMessage({ type: 'moveUp', pressed: true });
                    }
                    break;
                case 'ArrowDown':
                    if (!this.keyStates.ArrowDown) {
                        this.keyStates.ArrowDown = true;
                        this.wsManager.sendMessage({ type: 'moveDown', pressed: true });
                    }
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    if (this.keyStates.ArrowLeft) {
                        this.keyStates.ArrowLeft = false;
                        this.wsManager.sendMessage({ type: 'moveLeft', pressed: false });
                    }
                    break;
                case 'ArrowRight':
                    if (this.keyStates.ArrowRight) {
                        this.keyStates.ArrowRight = false;
                        this.wsManager.sendMessage({ type: 'moveRight', pressed: false });
                    }
                    break;
                case 'ArrowUp':
                    if (this.keyStates.ArrowUp) {
                        this.keyStates.ArrowUp = false;
                        this.wsManager.sendMessage({ type: 'moveUp', pressed: false });
                    }
                    break;
                case 'ArrowDown':
                    if (this.keyStates.ArrowDown) {
                        this.keyStates.ArrowDown = false;
                        this.wsManager.sendMessage({ type: 'moveDown', pressed: false });
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);

            // Clean up any pressed keys when controls are removed
            if (this.keyStates.ArrowLeft) {
                this.wsManager.sendMessage({ type: 'moveLeft', pressed: false });
            }
            if (this.keyStates.ArrowRight) {
                this.wsManager.sendMessage({ type: 'moveRight', pressed: false });
            }
            if (this.keyStates.ArrowUp) {
                this.wsManager.sendMessage({ type: 'moveUp', pressed: false });
            }
            if (this.keyStates.ArrowDown) {
                this.wsManager.sendMessage({ type: 'moveDown', pressed: false });
            }
        };
    }
}