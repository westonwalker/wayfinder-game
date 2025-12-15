import { Scene } from "phaser";

export interface MonsterConfig {
	maxHealth: number;
	speed: number;
	damage: number;
	spriteKey: string;
	scale: number;
	knockbackForce: number;
	attackCooldown: number; // ms between damage ticks when touching player
}

export abstract class Monster {
	protected scene: Scene;
	protected sprite: Phaser.Physics.Arcade.Sprite;
	protected target: Phaser.Physics.Arcade.Sprite;
	protected config: MonsterConfig;
	protected currentHealth: number;
	protected lastAttackTime: number = 0;
	protected isAlive: boolean = true;

	constructor(
		scene: Scene,
		x: number,
		y: number,
		target: Phaser.Physics.Arcade.Sprite,
		config: MonsterConfig
	) {
		this.scene = scene;
		this.target = target;
		this.config = config;
		this.currentHealth = config.maxHealth;

		// Create the sprite
		this.sprite = scene.physics.add.sprite(x, y, config.spriteKey);
		this.sprite.setScale(config.scale);
		this.sprite.setDepth(4);

		// Store reference to this monster on the sprite for collision handling
		(this.sprite as any).monsterRef = this;
	}

	update(): void {
		if (!this.isAlive || !this.sprite.active) return;

		// Move towards the target (player)
		this.moveTowardsTarget();
	}

	protected moveTowardsTarget(): void {
		const dx = this.target.x - this.sprite.x;
		const dy = this.target.y - this.sprite.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0) {
			// Normalize and apply speed
			const velocityX = (dx / distance) * this.config.speed;
			const velocityY = (dy / distance) * this.config.speed;
			this.sprite.setVelocity(velocityX, velocityY);

			// Flip sprite based on movement direction
			if (dx < 0) {
				this.sprite.setFlipX(true);
			} else {
				this.sprite.setFlipX(false);
			}
		}
	}

	takeDamage(amount: number): void {
		if (!this.isAlive) return;

		this.currentHealth -= amount;

		// Flash red on hit
		this.sprite.setTint(0xff0000);
		this.scene.time.delayedCall(100, () => {
			if (this.sprite.active) {
				this.sprite.clearTint();
			}
		});

		// Knockback away from player
		this.applyKnockback();

		if (this.currentHealth <= 0) {
			this.die();
		}
	}

	protected applyKnockback(): void {
		const dx = this.sprite.x - this.target.x;
		const dy = this.sprite.y - this.target.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0) {
			const knockbackX = (dx / distance) * this.config.knockbackForce;
			const knockbackY = (dy / distance) * this.config.knockbackForce;
			this.sprite.setVelocity(knockbackX, knockbackY);
		}
	}

	protected die(): void {
		this.isAlive = false;

		// Death animation - fade out and scale down
		this.scene.tweens.add({
			targets: this.sprite,
			alpha: 0,
			scale: 0,
			duration: 200,
			onComplete: () => {
				this.destroy();
			},
		});
	}

	// Check if monster can deal damage (cooldown)
	canDealDamage(time: number): boolean {
		if (time - this.lastAttackTime >= this.config.attackCooldown) {
			this.lastAttackTime = time;
			return true;
		}
		return false;
	}

	getDamage(): number {
		return this.config.damage;
	}

	getSprite(): Phaser.Physics.Arcade.Sprite {
		return this.sprite;
	}

	getIsAlive(): boolean {
		return this.isAlive;
	}

	destroy(): void {
		this.isAlive = false;
		if (this.sprite) {
			this.sprite.destroy();
		}
	}
}

