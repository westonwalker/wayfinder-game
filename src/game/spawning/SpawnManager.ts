import { Scene } from "phaser";
import { Monster } from "../monsters/Monster";
import { Goblin } from "../monsters/Goblin";

// Types of monsters that can be spawned
export type MonsterType = "goblin";

// Configuration for a single spawn event
export interface SpawnEvent {
	monsterType: MonsterType;
	count: number;
	config?: Record<string, any>; // Optional monster config overrides
}

// Configuration for a spawn wave
export interface SpawnWave {
	delay: number; // ms after previous wave (or start)
	spawns: SpawnEvent[];
}

// Full spawn schedule for a level
export interface SpawnSchedule {
	waves: SpawnWave[];
	loop?: boolean; // Whether to loop the schedule
	loopDelay?: number; // Delay before restarting if looping
}

// Simple repeating spawn config
export interface RepeatingSpawnConfig {
	monsterType: MonsterType;
	interval: number; // ms between spawns
	count: number; // how many to spawn each time
	config?: Record<string, any>;
}

export class SpawnManager {
	private scene: Scene;
	private target: Phaser.Physics.Arcade.Sprite;
	private monsters: Monster[] = [];
	private monsterGroup: Phaser.Physics.Arcade.Group;

	// World bounds for spawn calculations
	private worldWidth: number;
	private worldHeight: number;
	private spawnPadding: number = 100; // Distance outside camera to spawn

	// Scheduled spawning
	private currentSchedule: SpawnSchedule | null = null;
	private currentWaveIndex: number = 0;
	private scheduleTimer: Phaser.Time.TimerEvent | null = null;

	// Repeating spawns
	private repeatingSpawns: Map<string, Phaser.Time.TimerEvent> = new Map();

	constructor(
		scene: Scene,
		target: Phaser.Physics.Arcade.Sprite,
		worldWidth: number,
		worldHeight: number
	) {
		this.scene = scene;
		this.target = target;
		this.worldWidth = worldWidth;
		this.worldHeight = worldHeight;

		// Create a physics group for all monsters
		this.monsterGroup = scene.physics.add.group();
	}

	// Start a spawn schedule
	startSchedule(schedule: SpawnSchedule): void {
		this.stopSchedule();
		this.currentSchedule = schedule;
		this.currentWaveIndex = 0;
		this.executeNextWave();
	}

	// Stop the current schedule
	stopSchedule(): void {
		if (this.scheduleTimer) {
			this.scheduleTimer.destroy();
			this.scheduleTimer = null;
		}
		this.currentSchedule = null;
	}

	private executeNextWave(): void {
		if (!this.currentSchedule) return;

		if (this.currentWaveIndex >= this.currentSchedule.waves.length) {
			// Schedule finished
			if (this.currentSchedule.loop) {
				// Restart schedule after loop delay
				this.currentWaveIndex = 0;
				this.scheduleTimer = this.scene.time.delayedCall(
					this.currentSchedule.loopDelay || 0,
					() => this.executeNextWave()
				);
			}
			return;
		}

		const wave = this.currentSchedule.waves[this.currentWaveIndex];

		// Schedule this wave
		this.scheduleTimer = this.scene.time.delayedCall(wave.delay, () => {
			this.executeWave(wave);
			this.currentWaveIndex++;
			this.executeNextWave();
		});
	}

	private executeWave(wave: SpawnWave): void {
		for (const spawnEvent of wave.spawns) {
			for (let i = 0; i < spawnEvent.count; i++) {
				this.spawnMonster(spawnEvent.monsterType, spawnEvent.config);
			}
		}
	}

	// Add a simple repeating spawn
	addRepeatingSpawn(id: string, config: RepeatingSpawnConfig): void {
		// Remove existing spawn with same id
		this.removeRepeatingSpawn(id);

		const timer = this.scene.time.addEvent({
			delay: config.interval,
			callback: () => {
				for (let i = 0; i < config.count; i++) {
					this.spawnMonster(config.monsterType, config.config);
				}
			},
			loop: true,
		});

		this.repeatingSpawns.set(id, timer);
	}

	// Remove a repeating spawn
	removeRepeatingSpawn(id: string): void {
		const timer = this.repeatingSpawns.get(id);
		if (timer) {
			timer.destroy();
			this.repeatingSpawns.delete(id);
		}
	}

	// Stop all repeating spawns
	stopAllRepeatingSpawns(): void {
		for (const [id] of this.repeatingSpawns) {
			this.removeRepeatingSpawn(id);
		}
	}

	// Spawn a single monster at a random position around the player
	spawnMonster(
		type: MonsterType,
		config?: Record<string, any>
	): Monster | null {
		const spawnPos = this.getRandomSpawnPosition();

		let monster: Monster;

		switch (type) {
			case "goblin":
				monster = new Goblin(
					this.scene,
					spawnPos.x,
					spawnPos.y,
					this.target,
					config
				);
				break;
			default:
				console.warn(`Unknown monster type: ${type}`);
				return null;
		}

		this.monsters.push(monster);
		this.monsterGroup.add(monster.getSprite());

		return monster;
	}

	// Get a random spawn position outside the camera view but within world bounds
	private getRandomSpawnPosition(): { x: number; y: number } {
		const camera = this.scene.cameras.main;
		const camBounds = {
			left: camera.scrollX - this.spawnPadding,
			right: camera.scrollX + camera.width + this.spawnPadding,
			top: camera.scrollY - this.spawnPadding,
			bottom: camera.scrollY + camera.height + this.spawnPadding,
		};

		// Choose a random side to spawn from (0=top, 1=right, 2=bottom, 3=left)
		const side = Phaser.Math.Between(0, 3);

		let x: number, y: number;

		switch (side) {
			case 0: // Top
				x = Phaser.Math.Between(
					Math.max(0, camBounds.left),
					Math.min(this.worldWidth, camBounds.right)
				);
				y = Math.max(0, camBounds.top);
				break;
			case 1: // Right
				x = Math.min(this.worldWidth, camBounds.right);
				y = Phaser.Math.Between(
					Math.max(0, camBounds.top),
					Math.min(this.worldHeight, camBounds.bottom)
				);
				break;
			case 2: // Bottom
				x = Phaser.Math.Between(
					Math.max(0, camBounds.left),
					Math.min(this.worldWidth, camBounds.right)
				);
				y = Math.min(this.worldHeight, camBounds.bottom);
				break;
			case 3: // Left
			default:
				x = Math.max(0, camBounds.left);
				y = Phaser.Math.Between(
					Math.max(0, camBounds.top),
					Math.min(this.worldHeight, camBounds.bottom)
				);
				break;
		}

		return { x, y };
	}

	// Update all monsters
	update(): void {
		// Clean up dead monsters
		this.monsters = this.monsters.filter((monster) => {
			if (!monster.getIsAlive()) {
				return false;
			}
			monster.update();
			return true;
		});
	}

	// Get all active monsters
	getMonsters(): Monster[] {
		return this.monsters;
	}

	// Get the physics group for collision detection
	getMonsterGroup(): Phaser.Physics.Arcade.Group {
		return this.monsterGroup;
	}

	// Clear all monsters
	clearAllMonsters(): void {
		for (const monster of this.monsters) {
			monster.destroy();
		}
		this.monsters = [];
	}

	// Destroy the spawn manager
	destroy(): void {
		this.stopSchedule();
		this.stopAllRepeatingSpawns();
		this.clearAllMonsters();
	}
}
