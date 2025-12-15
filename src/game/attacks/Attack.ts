import { Scene } from "phaser";

export interface AttackConfig {
	damage: number;
	interval: number; // milliseconds between attacks
	duration: number; // how long the attack visual lasts
	scale: number;
	spriteKey: string;
	offsetDistance: number; // distance from player
}

export interface AttackDirection {
	x: number;
	y: number;
}

export abstract class Attack {
	protected scene: Scene;
	protected player: Phaser.Physics.Arcade.Sprite;
	protected config: AttackConfig;
	protected lastAttackTime: number = 0;
	protected currentDirection: AttackDirection = { x: 1, y: 0 }; // default facing right
	protected activeAttacks: Phaser.GameObjects.Sprite[] = [];

	constructor(scene: Scene, player: Phaser.Physics.Arcade.Sprite, config: AttackConfig) {
		this.scene = scene;
		this.player = player;
		this.config = config;
	}

	// Update the facing direction based on player movement
	updateDirection(velocityX: number, velocityY: number): void {
		if (velocityX !== 0 || velocityY !== 0) {
			// Normalize the direction
			const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
			this.currentDirection = {
				x: velocityX / length,
				y: velocityY / length,
			};
		}
	}

	// Check if attack should fire and execute it
	update(time: number): void {
		if (time - this.lastAttackTime >= this.config.interval) {
			this.execute();
			this.lastAttackTime = time;
		}
	}

	// Get rotation angle based on direction (in radians)
	protected getRotationFromDirection(): number {
		return Math.atan2(this.currentDirection.y, this.currentDirection.x);
	}

	// Abstract method - each attack implements its own visual/behavior
	abstract execute(): void;

	// Get current active attack sprites (for collision detection later)
	getActiveAttacks(): Phaser.GameObjects.Sprite[] {
		return this.activeAttacks;
	}

	// Get damage value
	getDamage(): number {
		return this.config.damage;
	}

	// Clean up attack sprite after duration
	protected destroyAttackAfterDuration(sprite: Phaser.GameObjects.Sprite): void {
		this.scene.time.delayedCall(this.config.duration, () => {
			const index = this.activeAttacks.indexOf(sprite);
			if (index > -1) {
				this.activeAttacks.splice(index, 1);
			}
			sprite.destroy();
		});
	}
}

