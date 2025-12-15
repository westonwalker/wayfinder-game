import { Scene } from "phaser";
import { Monster, MonsterConfig } from "./Monster";

export interface GoblinConfig extends Partial<MonsterConfig> {}

const DEFAULT_GOBLIN_CONFIG: MonsterConfig = {
	maxHealth: 50,
	speed: 80,
	damage: 10,
	spriteKey: "goblin",
	scale: 1.5,
	knockbackForce: 200,
	attackCooldown: 1000, // 1 second between damage ticks
};

export class Goblin extends Monster {
	constructor(
		scene: Scene,
		x: number,
		y: number,
		target: Phaser.Physics.Arcade.Sprite,
		config: GoblinConfig = {}
	) {
		const fullConfig = { ...DEFAULT_GOBLIN_CONFIG, ...config };
		super(scene, x, y, target, fullConfig);
	}
}

