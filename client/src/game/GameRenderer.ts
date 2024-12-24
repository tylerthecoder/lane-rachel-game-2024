import { GameState, RoadObject, RoadObjectType } from '@shared/GameState';

interface RoadDrawingData {
    left: number;
    right: number;
    center: number;
    width: number;
    y: number;
}

interface DrawingCoords {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Map object types to their image URLs
const OBJECT_IMAGES: Partial<Record<RoadObjectType, string>> = {
    restaurant: '/buildings/restraunt.png',
    dogStore: '/buildings/pet-store.png',
    dog: '/buildings/dog.webp',
    pedestrian: '/buildings/pedestrian.png'
};

export class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private objectImageElements: Partial<Record<RoadObjectType, HTMLImageElement>> = {};
    private showDebugInfo: boolean = false;
    private bikeImage: HTMLImageElement;
    private isImageLoaded: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;

        // Load all object images
        Object.entries(OBJECT_IMAGES).forEach(([type, url]) => {
            const img = new Image();
            img.src = url;
            this.objectImageElements[type as RoadObjectType] = img;
            img.onload = () => {
                this.isImageLoaded = true;
            };
            img.onerror = () => {
                console.error(`Failed to load image for ${type}`);
            };
        });

        // Load bike image
        this.bikeImage = new Image();
        this.bikeImage.src = '/buildings/bike.png';
        this.bikeImage.onload = () => {
            this.isImageLoaded = true;
        };
    }

    updateCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
    }

    private getRoadDrawingDataForZ(z: number, state: GameState): RoadDrawingData {
        const progress = z / state.road.length;
        const width = state.road.width * (4 - progress * 3.8); // Same scaling as in GameState
        const centerX = this.canvas.width / 2;
        const y = this.canvas.height - (progress * (this.canvas.height - state.road.topY));

        return {
            left: centerX - width / 2,
            right: centerX + width / 2,
            center: centerX,
            width: width,
            y: y
        };
    }

    private getRoadDrawingCoords(
        x: number,
        z: number,
        width: number,
        height: number,
        state: GameState
    ): DrawingCoords {
        const roadData = this.getRoadDrawingDataForZ(z, state);

        const scaledWidth = width * (roadData.width / state.road.width);
        const scaledHeight = height * (roadData.width / state.road.width);

        // Convert relative x position to screen position
        const drawX = roadData.left + (x * (roadData.width / state.road.width)) - scaledWidth / 2;

        return {
            x: drawX,
            y: roadData.y - scaledHeight,
            width: scaledWidth,
            height: scaledHeight
        };
    }

    private drawRoad(state: GameState) {
        // Draw the main road surface
        const fromRoad = this.getRoadDrawingDataForZ(0, state);
        const toRoad = this.getRoadDrawingDataForZ(state.road.length, state);

        // Draw road surface
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.moveTo(fromRoad.left, fromRoad.y);
        this.ctx.lineTo(fromRoad.right, fromRoad.y);
        this.ctx.lineTo(toRoad.right, toRoad.y);
        this.ctx.lineTo(toRoad.left, toRoad.y);
        this.ctx.fill();

        // Draw center line (continuous)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        const centerLineWidth = 8; // Base width for center line
        this.ctx.moveTo(fromRoad.center - centerLineWidth, fromRoad.y);
        this.ctx.lineTo(fromRoad.center + centerLineWidth, fromRoad.y);
        this.ctx.lineTo(toRoad.center + (centerLineWidth * 0.2), toRoad.y);
        this.ctx.lineTo(toRoad.center - (centerLineWidth * 0.2), toRoad.y);
        this.ctx.fill();

        // Draw side stripes
        const stripeSpacing = 50;
        const stripeLength = 30;
        const offset = -state.road.distanceMoved % stripeSpacing;
        const numStripes = Math.ceil(state.road.length / stripeSpacing) + 1;

        // Draw all stripes at once
        this.ctx.fillStyle = '#ffffff'; // White color for side stripes
        for (let i = 0; i < numStripes; i++) {
            const stripeFromZ = (i * stripeSpacing) + offset;
            const stripeToZ = stripeFromZ + stripeLength;

            if (stripeFromZ > state.road.length || stripeToZ < 0) continue;

            // Calculate scaling factors for start and end of stripe
            const fromScale = 1 - (stripeFromZ / state.road.length);
            const toScale = 1 - (stripeToZ / state.road.length);
            const baseWidth = 8; // Base width for side stripes

            const stripeFrom = this.getRoadDrawingDataForZ(stripeFromZ, state);
            const stripeTo = this.getRoadDrawingDataForZ(stripeToZ, state);

            // Draw left lane stripe
            const leftOffset = (stripeFrom.width / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(stripeFrom.left + leftOffset - (baseWidth * fromScale), stripeFrom.y);
            this.ctx.lineTo(stripeFrom.left + leftOffset + (baseWidth * fromScale), stripeFrom.y);
            this.ctx.lineTo(stripeTo.left + (stripeTo.width / 4) + (baseWidth * toScale), stripeTo.y);
            this.ctx.lineTo(stripeTo.left + (stripeTo.width / 4) - (baseWidth * toScale), stripeTo.y);
            this.ctx.fill();

            // Draw right lane stripe
            const rightOffset = (stripeFrom.width * 3 / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(stripeFrom.left + rightOffset - (baseWidth * fromScale), stripeFrom.y);
            this.ctx.lineTo(stripeFrom.left + rightOffset + (baseWidth * fromScale), stripeFrom.y);
            this.ctx.lineTo(stripeTo.left + (stripeTo.width * 3 / 4) + (baseWidth * toScale), stripeTo.y);
            this.ctx.lineTo(stripeTo.left + (stripeTo.width * 3 / 4) - (baseWidth * toScale), stripeTo.y);
            this.ctx.fill();
        }
    }

    private drawBike(state: GameState) {
        const coords = this.getRoadDrawingCoords(
            state.bike.x,
            state.bike.z,
            state.bike.width,
            state.bike.height,
            state
        );

        if (this.isImageLoaded) {
            this.ctx.drawImage(this.bikeImage, coords.x, coords.y, coords.width, coords.height);
        } else {
            // Fallback to rectangle if image hasn't loaded
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
        }

        // Draw bike hitbox if debug mode is on
        if (this.showDebugInfo) {
            this.drawHitbox(
                coords.x,
                coords.y,
                coords.width,
                coords.height,
                `Bike`
            );

            // Draw coordinates for debugging
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(
                `x: ${Math.round(state.bike.x)}, z: ${Math.round(state.bike.z)}`,
                coords.x,
                coords.y - 20
            );
        }
    }

    private drawHitbox(x: number, y: number, width: number, height: number, label?: string) {
        // Draw actual object hitbox
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Draw buffer zone with smaller buffer
        const buffer = 5;
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

    private drawRoadObject(object: RoadObject, state: GameState) {
        const coords = this.getRoadDrawingCoords(
            object.x,
            object.z,
            object.width,
            object.height,
            state
        );

        // Get the image for this object type
        const objectImage = this.objectImageElements[object.type];

        // Draw the road object based on type
        if (object.type === 'restaurant' || object.type === 'dogStore') {
            // Draw building
            const isVisitedRestaurant = object.type === 'restaurant' &&
                state.stats.restaurantsVisited.some(r => r.id === object.id);

            if (objectImage?.complete) {
                if (isVisitedRestaurant) {
                    // Draw a semi-transparent overlay first
                    this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';  // Green overlay
                    this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);

                    // Draw a checkmark
                    this.ctx.strokeStyle = '#4CAF50';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    const checkX = coords.x + coords.width - 30;
                    const checkY = coords.y + 30;
                    this.ctx.moveTo(checkX - 15, checkY);
                    this.ctx.lineTo(checkX - 5, checkY + 10);
                    this.ctx.lineTo(checkX + 15, checkY - 10);
                    this.ctx.stroke();
                }
                this.ctx.drawImage(objectImage, coords.x, coords.y, coords.width, coords.height);
            } else {
                this.ctx.fillStyle = '#334455';
                this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
                if (isVisitedRestaurant) {
                    this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                    this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
                }
            }

            // Draw label for restaurants
            if (object.type === 'restaurant' && object.name) {
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';

                const displayName = isVisitedRestaurant
                    ? `✓ ${object.name}`
                    : object.name;

                // Add shadow to make text more readable
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;

                this.ctx.fillText(
                    displayName,
                    coords.x + coords.width/2,
                    coords.y - 10
                );

                // Reset shadow
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }
        } else if (object.type === 'pothole') {
            // Draw pothole as a dark circle
            this.ctx.fillStyle = state.collidedRoadObjectIds.includes(object.id) ? '#ff0000' : '#333333';
            this.ctx.beginPath();
            this.ctx.ellipse(
                coords.x + coords.width / 2,
                coords.y + coords.height / 2,
                coords.width / 2,
                coords.height / 2,
                0,
                0,
                2 * Math.PI
            );
            this.ctx.fill();
        } else if (object.type === 'pedestrian' || object.type === 'dog') {
            if (objectImage?.complete) {
                this.ctx.save();
                if (state.collidedRoadObjectIds.includes(object.id)) {
                    // Apply red tint for collided objects
                    this.ctx.filter = 'sepia(1) saturate(10000%) hue-rotate(-50deg)';
                }

                // Handle dog flipping
                if (object.type === 'dog' && object.movementDirection === 'left') {
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(
                        objectImage,
                        -coords.x - coords.width,
                        coords.y,
                        coords.width,
                        coords.height
                    );
                } else {
                    this.ctx.drawImage(
                        objectImage,
                        coords.x,
                        coords.y,
                        coords.width,
                        coords.height
                    );
                }
                this.ctx.restore();
            } else {
                // Fallback to simple shapes
                if (object.type === 'pedestrian') {
                    this.drawStickFigure(coords, state.collidedRoadObjectIds.includes(object.id));
                } else {
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
                }
            }
        }

        // Only show coordinates if debug info is enabled
        if (this.showDebugInfo) {
            this.drawHitbox(
                coords.x,
                coords.y,
                coords.width,
                coords.height,
                `${object.type} ${object.id}`
            );
        }
    }

    private drawStickFigure(coords: DrawingCoords, isCollided: boolean) {
        this.ctx.strokeStyle = isCollided ? '#ff0000' : '#000000';
        this.ctx.lineWidth = 2;

        // Head
        const headRadius = coords.width / 3;
        this.ctx.beginPath();
        this.ctx.arc(
            coords.x + coords.width / 2,
            coords.y + headRadius,
            headRadius,
            0,
            2 * Math.PI
        );
        this.ctx.stroke();

        // Body
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x + coords.width / 2, coords.y + headRadius * 2);
        this.ctx.lineTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
        this.ctx.stroke();

        // Arms
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y + coords.height / 2);
        this.ctx.lineTo(coords.x + coords.width, coords.y + coords.height / 2);
        this.ctx.stroke();

        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
        this.ctx.lineTo(coords.x, coords.y + coords.height);
        this.ctx.moveTo(coords.x + coords.width / 2, coords.y + coords.height - headRadius);
        this.ctx.lineTo(coords.x + coords.width, coords.y + coords.height);
        this.ctx.stroke();
    }

    public render(state: GameState) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawRoad(state);

        // Sort road objects by z (furthest first)
        const sortedObjects = [...state.roadObjects].sort((a, b) => b.z - a.z);
        sortedObjects.forEach(object => this.drawRoadObject(object, state));

        this.drawBike(state);
    }

    public toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }
}