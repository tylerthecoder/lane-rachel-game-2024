import { GameState, updateBikePosition, updateBuildings, updateRoadObjects } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';

export class ClientGame {
    private gameState: GameState;
    private wsManager: WebSocketManager;
    private isStarted: boolean = false;
    private updateInterval: NodeJS.Timeout | null = null;
    private keyStates: { [key: string]: boolean } = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false
    };

    constructor(initialState: GameState, wsManager: WebSocketManager) {
        this.gameState = initialState;
        this.wsManager = wsManager;
    }

    public updateGameState(newState: GameState) {
        this.gameState = newState;
    }

    public getGameState(): GameState {
        return this.gameState;
    }

    private updateState(deltaTime: number) {
        // Chain the update functions
        this.gameState = updateRoadObjects(
            updateBuildings(
                updateBikePosition(this.gameState, deltaTime),
                deltaTime
            ),
            deltaTime
        );
    }

    public start() {
        if (this.isStarted) return;
        this.isStarted = true;

        // Update game state at 30fps
        this.updateInterval = setInterval(() => {
            this.updateState(1/30); // Fixed time step
        }, 1000 / 30);
    }

    public stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isStarted = false;
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