import { Building, BuildingType, buildingImages } from './BuildingTypes';

interface BikeState {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    maxSpeed: number;
    turnSpeed: number;
    isColliding: boolean;
}

interface RoadDimensions {
    bottomWidth: number;
    topWidth: number;
    topY: number;
}

export interface GameGoals {
    treatsCollected: number;
    pokemonCaught: number;
    restaurantsVisited: Set<string>;
    isComplete: boolean;
}

export class Game {
    private buildings: Building[] = [];
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private animationId: number | null = null;
    private keys: Set<string> = new Set();
    private readonly ROAD_LENGTH = 2000;
    private buildingImageElements: Record<BuildingType, HTMLImageElement> = {} as Record<BuildingType, HTMLImageElement>;
    private showDebugHitboxes = false; // Toggle with 'H' key
    private onGoalsUpdate: (() => void) | null = null;
    private collidedBuildingIds: Set<string> = new Set(); // Track by unique ID instead of distance
    private nextBuildingId = 0; // For generating unique building IDs

    public goals: GameGoals = {
        treatsCollected: 0,
        pokemonCaught: 0,
        restaurantsVisited: new Set<string>(),
        isComplete: false
    };

    private bike: BikeState = {
        x: 350,
        y: 500,
        width: 100,
        height: 60,
        speed: 0,
        maxSpeed: 5,
        turnSpeed: 4,
        isColliding: false
    };

    private road: RoadDimensions = {
        bottomWidth: 400,
        topWidth: 50,
        topY: 100
    };

    constructor() {
        this.loadBuildingImages();
        this.initializeBuildings();
        this.setupInputHandlers();
    }

    private loadBuildingImages() {
        Object.entries(buildingImages).forEach(([type, url]) => {
            const img = new Image();
            img.src = url;
            this.buildingImageElements[type as BuildingType] = img;
        });
    }

    private setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key);
            if (e.key === 'h' || e.key === 'H') {
                this.showDebugHitboxes = !this.showDebugHitboxes;
                console.log('Debug hitboxes:', this.showDebugHitboxes ? 'enabled' : 'disabled');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key);
        });
    }

    private initializeBuildings() {
        const types: BuildingType[] = ['restaurant', 'pokemon', 'dogStore', 'park', 'house'];
        this.buildings = [
            // Left side buildings
            { id: this.getNextBuildingId(), side: 'left', y: 100, width: 100, height: 200, distance: 500, type: types[0] },
            { id: this.getNextBuildingId(), side: 'left', y: 100, width: 150, height: 250, distance: 1000, type: types[1] },
            // Right side buildings
            { id: this.getNextBuildingId(), side: 'right', y: 100, width: 120, height: 180, distance: 700, type: types[2] },
            { id: this.getNextBuildingId(), side: 'right', y: 100, width: 140, height: 220, distance: 1200, type: types[3] },
        ];
    }

    private getNextBuildingId(): string {
        return `building_${this.nextBuildingId++}`;
    }

    public start(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.gameLoop();
    }

    public stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        // Clean up event listeners
        window.removeEventListener('keydown', this.setupInputHandlers);
        window.removeEventListener('keyup', this.setupInputHandlers);
    }

    private getRoadWidthFromDistance(distance: number): number {
        const progress = distance / this.ROAD_LENGTH;
        return this.road.bottomWidth - progress * (this.road.bottomWidth - this.road.topWidth);
    }

    private getRoadYValueFromDistance(distance: number): number {
        if (!this.canvas) return 0;
        const progress = distance / this.ROAD_LENGTH;
        return this.canvas.height - (progress * (this.canvas.height - this.road.topY));
    }

    private getRoadEdgesFromDistance(distance: number): { left: number; right: number } {
        if (!this.canvas) return { left: 0, right: 0 };
        const width = this.getRoadWidthFromDistance(distance);
        const centerX = this.canvas.width / 2;
        return {
            left: centerX - width / 2,
            right: centerX + width / 2
        };
    }

    private drawBuildingAtDistance(building: Building) {
        if (!this.ctx || !this.canvas) return;

        // Calculate perspective scale based on distance
        const progress = building.distance / this.ROAD_LENGTH;
        const scale = 1 - progress;

        // Calculate dimensions with perspective
        const dimensions = {
            width: building.width * scale,
            height: building.height * scale
        };

        const scaledDistance = ((building.distance / this.ROAD_LENGTH) ** .5) * this.ROAD_LENGTH;

        // Get road position at this distance
        const roadY = this.getRoadYValueFromDistance(scaledDistance);
        const edges = this.getRoadEdgesFromDistance(scaledDistance);

        // Calculate final position
        const position = {
            x: building.side === 'left'
                ? edges.left - dimensions.width
                : edges.right,
            y: roadY - dimensions.height
        };

        // Draw the building
        const buildingImage = this.buildingImageElements[building.type];
        if (buildingImage.complete) {
            this.ctx.drawImage(buildingImage, position.x, position.y, dimensions.width, dimensions.height);
        } else {
            this.ctx.fillStyle = '#334455';
            this.ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height);
        }

        // Draw label
        const label = building.type.charAt(0).toUpperCase() + building.type.slice(1);
        const distance = Math.round(building.distance);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${label} (${distance}m)`, position.x + dimensions.width/2, position.y - 10);

        // Draw building hitbox
        this.drawHitbox(
            position.x,
            position.y,
            dimensions.width,
            dimensions.height,
            `${building.type} (${Math.round(building.distance)}m)`
        );

        return { position, dimensions }; // Return for collision detection
    }

    private updateBuildingPosition(building: Building) {
        // Move building closer with increasing speed as it gets closer
        const speedScale = 1 + (1 - building.distance / this.ROAD_LENGTH) * 2;
        building.distance -= 2 * speedScale;

        // Reset building when it gets too close
        if (building.distance < 0) {
            building.distance = this.ROAD_LENGTH;
            building.id = this.getNextBuildingId(); // Give it a new ID when recycling
            const types: BuildingType[] = ['restaurant', 'pokemon', 'dogStore', 'park', 'house'];
            building.type = types[Math.floor(Math.random() * types.length)];
        }
    }

    private updateBike() {
        if (!this.canvas) return;

        // Calculate road boundaries at bike's position
        const bikeDistance = this.ROAD_LENGTH * 0.2; // Position bike 20% up the road
        const edges = this.getRoadEdgesFromDistance(bikeDistance);

        // Calculate movement bounds with padding
        const padding = 0;
        const leftBound = edges.left + padding;
        const rightBound = edges.right - this.bike.width - padding;

        // Update bike position
        if (this.keys.has('ArrowLeft')) {
            this.bike.x = Math.max(leftBound, this.bike.x - this.bike.turnSpeed);
        }
        if (this.keys.has('ArrowRight')) {
            this.bike.x = Math.min(rightBound, this.bike.x + this.bike.turnSpeed);
        }

        // Update bike Y position based on road perspective
        this.bike.y = this.getRoadYValueFromDistance(bikeDistance);
    }

    private gameLoop = () => {
        if (!this.canvas || !this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Reset collision state at the start of each frame
        this.bike.isColliding = false;

        this.updateBike();
        this.drawRoad();
        this.updateAndDrawBuildings();
        this.drawBike();

        this.animationId = requestAnimationFrame(this.gameLoop);
    }

    private drawRoad() {
        if (!this.ctx || !this.canvas) return;

        // Draw road in segments for better visual quality
        const segments = 10;
        const segmentLength = this.ROAD_LENGTH / segments;

        for (let i = 0; i < segments; i++) {
            const fromDistance = i * segmentLength;
            const toDistance = (i + 1) * segmentLength;
            this.drawRoadSegment(fromDistance, toDistance);
        }
    }

    private drawRoadSegment(fromDistance: number, toDistance: number) {
        if (!this.ctx || !this.canvas) return;

        const fromY = this.getRoadYValueFromDistance(fromDistance);
        const toY = this.getRoadYValueFromDistance(toDistance);
        const fromEdges = this.getRoadEdgesFromDistance(fromDistance);
        const toEdges = this.getRoadEdgesFromDistance(toDistance);

        // Draw road segment
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.moveTo(fromEdges.left, fromY);
        this.ctx.lineTo(fromEdges.right, fromY);
        this.ctx.lineTo(toEdges.right, toY);
        this.ctx.lineTo(toEdges.left, toY);
        this.ctx.fill();

        // Draw center line for this segment
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, fromY);
        this.ctx.lineTo(this.canvas.width / 2, toY);
        this.ctx.stroke();
    }

    private drawBike() {
        if (!this.ctx) return;

        this.ctx.fillStyle = this.bike.isColliding ? '#0000ff' : '#ff0000';
        this.ctx.fillRect(
            this.bike.x,
            this.bike.y - this.bike.height,
            this.bike.width,
            this.bike.height
        );

        // Draw bike hitbox
        this.drawHitbox(
            this.bike.x,
            this.bike.y - this.bike.height,
            this.bike.width,
            this.bike.height,
            'Bike'
        );
    }

    private drawHitbox(x: number, y: number, width: number, height: number, label?: string) {
        if (!this.ctx || !this.showDebugHitboxes) return;

        // Draw actual object hitbox
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Draw buffer zone with smaller buffer
        const buffer = 5; // Decreased from 10 to 5
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            x - buffer,
            y - buffer,
            width + buffer * 2,
            height + buffer * 2
        );

        if (label) {
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(label, x, y - 5);
        }
    }

    private checkCollisionWithBuilding(building: Building, buildingData: { position: { x: number, y: number }, dimensions: { width: number, height: number } }): boolean {
        // Don't collide if we've already hit this building
        if (this.collidedBuildingIds.has(building.id)) {
            return false;
        }

        const buffer = 5; // Decreased from 10 to 5
        const bikeHitbox = {
            x: this.bike.x - buffer,
            y: (this.bike.y - this.bike.height) - buffer,
            width: this.bike.width + buffer * 2,
            height: this.bike.height + buffer * 2
        };

        const buildingHitbox = {
            x: buildingData.position.x - buffer,
            y: buildingData.position.y - buffer,
            width: buildingData.dimensions.width + buffer * 2,
            height: buildingData.dimensions.height + buffer * 2
        };

        const collision = (
            bikeHitbox.x < buildingHitbox.x + buildingHitbox.width &&
            bikeHitbox.x + bikeHitbox.width > buildingHitbox.x &&
            bikeHitbox.y < buildingHitbox.y + buildingHitbox.height &&
            bikeHitbox.y + bikeHitbox.height > buildingHitbox.y
        );

        if (collision) {
            // Add to collided buildings when we hit it
            this.collidedBuildingIds.add(building.id);
            console.log(`Collision with ${building.type} at distance ${Math.round(building.distance)}m`);
        }

        return collision;
    }

    private handleBuildingCollision(building: Building) {
        switch (building.type) {
            case 'dogStore':
                this.goals.treatsCollected++;
                console.log(`Collected treat! Total: ${this.goals.treatsCollected}/3`);
                this.notifyGoalsUpdate();
                break;
            case 'pokemon':
                this.goals.pokemonCaught++;
                console.log(`Caught Pokemon! Total: ${this.goals.pokemonCaught}/3`);
                this.notifyGoalsUpdate();
                break;
            case 'restaurant': {
                const wasNewRestaurant = !this.goals.restaurantsVisited.has(building.distance.toString());
                this.goals.restaurantsVisited.add(building.distance.toString());
                if (wasNewRestaurant) {
                    console.log(`Visited new restaurant! Total: ${this.goals.restaurantsVisited.size}/3`);
                } else {
                    console.log('Already visited this restaurant!');
                }
                this.notifyGoalsUpdate();
                break;
            }
        }

        this.checkGoalsCompletion();
    }

    private checkGoalsCompletion() {
        const isComplete =
            this.goals.treatsCollected >= 3 &&
            this.goals.pokemonCaught >= 3 &&
            this.goals.restaurantsVisited.size >= 3;

        if (isComplete && !this.goals.isComplete) {
            this.goals.isComplete = true;
            this.notifyGoalsUpdate();
        }
    }

    private updateAndDrawBuildings() {
        if (!this.ctx || !this.canvas) return;

        // Sort buildings by distance (furthest first)
        const sortedBuildings = [...this.buildings].sort((a, b) => b.distance - a.distance);

        sortedBuildings.forEach(building => {
            // Draw building and get its position/dimensions
            const buildingData = this.drawBuildingAtDistance(building);

            if (buildingData && this.checkCollisionWithBuilding(building, buildingData)) {
                this.bike.isColliding = true;
                this.handleBuildingCollision(building);
            }

            // Update building position for next frame
            this.updateBuildingPosition(building);
        });
    }

    public setGoalsUpdateCallback(callback: () => void) {
        this.onGoalsUpdate = callback;
    }

    private notifyGoalsUpdate() {
        if (this.onGoalsUpdate) {
            this.onGoalsUpdate();
        }
    }

    private handlePlayAgain() {
        this.collidedBuildingIds.clear();
        this.goals.treatsCollected = 0;
        this.goals.pokemonCaught = 0;
        this.goals.restaurantsVisited.clear();
        this.goals.isComplete = false;
        this.nextBuildingId = 0; // Reset building IDs
        this.buildings.forEach(building => building.id = this.getNextBuildingId()); // Give all buildings new IDs
    }
}