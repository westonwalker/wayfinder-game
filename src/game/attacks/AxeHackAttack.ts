import { Scene } from "phaser";
import { Attack, AttackConfig } from "./Attack";

export interface AxeHackConfig extends AttackConfig {
	swingArc: number; // degrees of the swing arc
	swingSpeed: number; // how fast the swing animation plays
}

const DEFAULT_AXE_HACK_CONFIG: AxeHackConfig = {
	damage: 25,
	interval: 2000, // 2 seconds
	duration: 300, // attack lasts 300ms
	scale: 2,
	spriteKey: "slash",
	offsetDistance: 40,
	swingArc: 90, // 90 degree swing
	swingSpeed: 200, // ms for full swing
};

export class AxeHackAttack extends Attack {
	private axeConfig: AxeHackConfig;

	constructor(
		scene: Scene,
		player: Phaser.Physics.Arcade.Sprite,
		config: Partial<AxeHackConfig> = {}
	) {
		const fullConfig = { ...DEFAULT_AXE_HACK_CONFIG, ...config };
		super(scene, player, fullConfig);
		this.axeConfig = fullConfig;
	}

	execute(): void {
		// Calculate position offset from player based on direction
		const offsetX = this.currentDirection.x * this.axeConfig.offsetDistance;
		const offsetY = this.currentDirection.y * this.axeConfig.offsetDistance;

		// Create the slash sprite
		const slash = this.scene.add.sprite(
			this.player.x + offsetX,
			this.player.y + offsetY,
			this.axeConfig.spriteKey
		);

		slash.setScale(this.axeConfig.scale);
		slash.setDepth(10); // Above player

		// Calculate base rotation from direction
		const baseRotation = this.getRotationFromDirection();

		// Start the swing arc animation
		// Start at -half arc, swing to +half arc
		const halfArc = Phaser.Math.DegToRad(this.axeConfig.swingArc / 2);
		const startAngle = baseRotation - halfArc;
		const endAngle = baseRotation + halfArc;

		slash.setRotation(startAngle);

		// Tween the swing arc
		this.scene.tweens.add({
			targets: slash,
			rotation: endAngle,
			duration: this.axeConfig.swingSpeed,
			ease: "Quad.easeOut",
			onUpdate: () => {
				// Update position to stay relative to player during swing
				const currentRotation = slash.rotation;
				const swingOffsetX =
					Math.cos(currentRotation) * this.axeConfig.offsetDistance;
				const swingOffsetY =
					Math.sin(currentRotation) * this.axeConfig.offsetDistance;
				slash.setPosition(
					this.player.x + swingOffsetX,
					this.player.y + swingOffsetY
				);
			},
		});

		// Add fade out effect
		this.scene.tweens.add({
			targets: slash,
			alpha: 0,
			duration: this.axeConfig.duration,
			delay: this.axeConfig.swingSpeed * 0.5,
			ease: "Power2",
		});

		// Track active attacks
		this.activeAttacks.push(slash);

		// Clean up after duration
		this.destroyAttackAfterDuration(slash);
	}

	// Setters for customization
	setDamage(damage: number): this {
		this.config.damage = damage;
		this.axeConfig.damage = damage;
		return this;
	}

	setInterval(interval: number): this {
		this.config.interval = interval;
		this.axeConfig.interval = interval;
		return this;
	}

	setSwingArc(degrees: number): this {
		this.axeConfig.swingArc = degrees;
		return this;
	}

	setSwingSpeed(ms: number): this {
		this.axeConfig.swingSpeed = ms;
		return this;
	}

	setScale(scale: number): this {
		this.config.scale = scale;
		this.axeConfig.scale = scale;
		return this;
	}

	setOffsetDistance(distance: number): this {
		this.config.offsetDistance = distance;
		this.axeConfig.offsetDistance = distance;
		return this;
	}
}
