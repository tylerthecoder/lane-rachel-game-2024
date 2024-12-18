# Lane & Rachel's Tandem Bike Adventure

A multiplayer game where 2-4 players control a bike together and compete in various minigames while navigating through a city.

## Game Overview

### Core Gameplay
- 2-4 players control a bike together in the middle of the screen ✅
- Players must coordinate their movements to navigate the city ✅
- The bike moves forward automatically through a city environment ✅
- When hitting special buildings, one player enters a minigame while others continue riding
- Points are earned by completing minigames
- Lives are lost by hitting road obstacles
- Game continues until all lives are lost

### Minigames
1. Restaurant Memory Game
   - Player is shown a grid of food emojis
   - Memorize positions in limited time
   - Match pairs to complete the game
   - Points awarded based on speed and accuracy

2. Pokemon Encounter (TBD)
   - Triggered when hitting Pokemon locations
   - Special encounter mechanics to be determined
   - Points awarded for successful catches

3. Pet Store Challenge (TBD)
   - Triggered when hitting pet stores
   - Minigame mechanics to be determined
   - Points awarded for completion

4. Operation Emergency
   - Triggered when hitting pedestrians
   - Operation-style medical minigame
   - Fix the patient's injuries
   - Must complete to continue

## Technical Implementation

### Client (React + Canvas)
- [x] React application with Canvas-based rendering
- [x] Real-time game loop for smooth animations
- [x] Perspective rendering for buildings and road
- [x] Basic collision detection system
- [x] Building placement and types
- [ ] Minigame system integration
- [ ] Points and lives tracking
- [ ] Player state management

### Server (Express + WebSocket)
- [ ] Express server with WebSocket support
- [ ] Player name registration and management
- [ ] Game state synchronization
- [ ] Minigame state handling
- [ ] Score tracking and persistence

### Game State
- [x] Bike position and movement
- [x] Building locations and types
- [ ] Player names and roles
- [ ] Active minigame states
- [ ] Points and lives tracking
- [ ] Collision history

## Todo List

### Phase 1: Basic Game Setup ✅
- [x] Initial project setup with React and Canvas
- [x] Basic road and perspective rendering
- [x] Simple bike movement controls
- [x] Building placement system
- [x] Building types and collision detection

### Phase 2: Multiplayer Core
- [ ] Set up WebSocket server
- [ ] Implement player name registration
- [ ] Add player connection display
- [ ] Synchronize bike controls between players
- [ ] Add waiting room for 2+ players
- [ ] Add player count display
- [x] Set up WebSocket server
- [x] Implement player name registration
- [x] Add player connection display
- [x] Add waiting room for 2+ players
- [x] Add player count display

### Phase 2.5: Game State Synchronization
- [ ] Create shared GameState interface between client/server
  - [ ] Bike position and velocity
  - [ ] Building positions and types
  - [ ] Player scores and status
  - [ ] Active minigames state
- [ ] Implement server-side game loop (30 fps)
  - [ ] Physics calculations
  - [ ] Collision detection
  - [ ] Score updates
- [ ] Create client-side state management
  - [ ] Separate game logic from rendering
  - [ ] Create state update handler
  - [ ] Implement interpolation for smooth movement
- [ ] Set up input handling
  - [ ] Send player inputs to server
  - [ ] Server validates and applies inputs
  - [ ] Broadcast updated state to all clients
- [ ] Add state synchronization monitoring
  - [ ] Track latency
  - [ ] Handle disconnections gracefully
  - [ ] Implement state reconciliation

### Phase 3: Road and Obstacles
- [ ] Add road obstacles (potholes, traffic)
- [ ] Implement lives system
- [ ] Add visual feedback for damage
- [ ] Add pedestrian obstacles
- [ ] Implement speed variations
- [ ] Add score display

### Phase 4: Minigame System
- [ ] Create minigame framework
- [ ] Implement Restaurant Memory Game
  - [ ] Emoji grid system
  - [ ] Timer and scoring
  - [ ] Victory/failure states
- [ ] Add Operation Emergency Game
  - [ ] Patient injury system
  - [ ] Surgery controls
  - [ ] Success conditions
- [ ] Design and implement Pokemon minigame
- [ ] Design and implement Pet Store minigame

### Phase 5: Game Flow
- [ ] Add game start conditions
- [ ] Implement minigame transitions
- [ ] Add spectator mode for players in minigames
- [ ] Create scoring system
- [ ] Add game over conditions
- [ ] Implement high score system

### Phase 6: Polish and Assets
- [ ] Add unique building images
- [ ] Create bike animations
- [ ] Add sound effects
- [ ] Implement background music
- [ ] Add particle effects
- [ ] Create tutorial screens

### Phase 7: Testing and Deployment
- [ ] Test multiplayer synchronization
- [ ] Implement error handling
- [ ] Add reconnection logic
- [ ] Optimize performance
- [ ] Deploy server
- [ ] Set up client hosting





