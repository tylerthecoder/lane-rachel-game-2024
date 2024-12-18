import { GameState } from '@shared/types/GameState';
import { GameRenderer } from './GameRenderer';
import { WebSocketManager } from '../services/WebSocketManager';
import { updateBikePosition } from '@shared/utils/bikePhysics';

export class ClientGame {
    private renderer: GameRenderer;
    private gameState: GameState;
    private lastUpdateTime: number;
    private animationFrameId: number | null = null;
    private wsManager: WebSocketManager;
    private isStarted: boolean = false;
    private keyStates: { [key: string]: boolean } = {
        ArrowLeft: false,
        ArrowRight: false
    };

    constructor(canvas: HTMLCanvasElement, initialState: GameState, wsManager: WebSocketManager) {
        this.renderer = new GameRenderer(canvas);
        this.gameState = initialState;
        this.lastUpdateTime = Date.now();
        this.wsManager = wsManager;
    }

    public updateGameState(newState: GameState) {
        this.gameState = newState;
        this.lastUpdateTime = newState.lastUpdateTime || Date.now();
    }

    private updateLocalState(deltaTime: number) {
        // Update building positions locally
        const updatedBuildings = this.gameState.buildings.map(building => {
            const speedScale = 1 + (1 - building.distance / this.gameState.ROAD_LENGTH) * 2;
            const newDistance = building.distance - (2 * speedScale * deltaTime * 30);

            if (newDistance < 0) {
                return building;
            }

            return {
                ...building,
                distance: newDistance
            };
        });

        // Update game state using shared function
        this.gameState = updateBikePosition({
            ...this.gameState,
            buildings: updatedBuildings
        }, deltaTime);
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
        };
    }
}