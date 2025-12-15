import { Scene } from "phaser";
import { AxeHackAttack } from "../attacks/AxeHackAttack";
import { Attack } from "../attacks/Attack";
import { SpawnManager } from "../spawning/SpawnManager";
import { Monster } from "../monsters/Monster";

export class Game extends Scene {
	player: Phaser.Physics.Arcade.Sprite;
	cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	wasd: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};

	// Attacks
	attacks: Attack[] = [];

	// Spawning
	spawnManager: SpawnManager;

	// Player stats
	playerHealth: number = 100;
	maxPlayerHealth: number = 100;
	healthText: Phaser.GameObjects.Text;

	// World size
	readonly WORLD_WIDTH = 3200;
	readonly WORLD_HEIGHT = 2400;
	readonly PLAYER_SPEED = 200;

	constructor() {
		super("Game");
	}

	create() {
		// Set world bounds
		this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

		// Create grass background using tiled graphics
		this.createGrassBackground();

		// Create player in the center of the world
		this.player = this.physics.add.sprite(
			this.WORLD_WIDTH / 2,
			this.WORLD_HEIGHT / 2,
			"player"
		);
		this.player.setCollideWorldBounds(true);
		this.player.setScale(1);
		this.player.setDepth(5);

		// Setup camera to follow player
		this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
		this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

		// Setup keyboard input
		this.cursors = this.input.keyboard!.createCursorKeys();
		this.wasd = {
			W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
			A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
		};

		// Setup attacks
		this.setupAttacks();

		// Setup spawn manager
		this.setupSpawning();

		// Setup collisions
		this.setupCollisions();

		// Setup UI
		this.setupUI();
	}

	setupAttacks() {
		// Create the Axe Hack attack with custom config
		const axeHack = new AxeHackAttack(this, this.player, {
			damage: 25,
			interval: 2000,
			duration: 400,
			scale: 2.5,
			offsetDistance: 35,
			swingArc: 120,
			swingSpeed: 250,
		});

		this.attacks.push(axeHack);
	}

	setupSpawning() {
		this.spawnManager = new SpawnManager(
			this,
			this.player,
			this.WORLD_WIDTH,
			this.WORLD_HEIGHT
		);

		// Simple repeating goblin spawn every 5 seconds
		this.spawnManager.addRepeatingSpawn("goblins", {
			monsterType: "goblin",
			interval: 5000,
			count: 1,
		});

		// Example of how to use spawn schedules for levels:
		// this.spawnManager.startSchedule({
		// 	waves: [
		// 		{ delay: 0, spawns: [{ monsterType: "goblin", count: 3 }] },
		// 		{ delay: 5000, spawns: [{ monsterType: "goblin", count: 5 }] },
		// 		{ delay: 10000, spawns: [{ monsterType: "goblin", count: 8 }] },
		// 	],
		// 	loop: true,
		// 	loopDelay: 15000,
		// });
	}

	setupCollisions() {
		// Monster touching player
		this.physics.add.overlap(
			this.player,
			this.spawnManager.getMonsterGroup(),
			(_, monsterSprite) => {
				this.handleMonsterPlayerCollision(
					monsterSprite as Phaser.Physics.Arcade.Sprite
				);
			},
			undefined,
			this
		);
	}

	setupUI() {
		// Health display (fixed to camera)
		this.healthText = this.add.text(
			20,
			20,
			`HP: ${this.playerHealth}/${this.maxPlayerHealth}`,
			{
				fontFamily: "Arial Black",
				fontSize: "24px",
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 4,
			}
		);
		this.healthText.setScrollFactor(0);
		this.healthText.setDepth(100);
	}

	handleMonsterPlayerCollision(monsterSprite: Phaser.Physics.Arcade.Sprite) {
		const monster = (monsterSprite as any).monsterRef as Monster;
		if (
			monster &&
			monster.getIsAlive() &&
			monster.canDealDamage(this.time.now)
		) {
			this.takeDamage(monster.getDamage());
		}
	}

	takeDamage(amount: number) {
		this.playerHealth -= amount;

		// Flash player red
		this.player.setTint(0xff0000);
		this.time.delayedCall(100, () => {
			this.player.clearTint();
		});

		// Update UI
		this.healthText.setText(
			`HP: ${Math.max(0, this.playerHealth)}/${this.maxPlayerHealth}`
		);

		if (this.playerHealth <= 0) {
			this.gameOver();
		}
	}

	gameOver() {
		// Stop spawning
		this.spawnManager.destroy();

		// Go to game over scene
		this.scene.start("GameOver");
	}

	checkAttackCollisions() {
		const monsters = this.spawnManager.getMonsters();

		for (const attack of this.attacks) {
			const activeAttacks = attack.getActiveAttacks();

			for (const attackSprite of activeAttacks) {
				if (!attackSprite.active) continue;

				// Check overlap with each monster
				for (const monster of monsters) {
					if (!monster.getIsAlive()) continue;

					const monsterSprite = monster.getSprite();
					if (!monsterSprite.active) continue;

					// Simple distance-based collision
					const distance = Phaser.Math.Distance.Between(
						attackSprite.x,
						attackSprite.y,
						monsterSprite.x,
						monsterSprite.y
					);

					// Check if within hit range (adjust based on sprite sizes)
					const hitRange = 40;
					if (distance < hitRange) {
						// Check if this monster was already hit by this attack instance
						const hitKey = `${
							attackSprite.getData("id") || attackSprite.x
						}_${monster.getSprite().x}`;
						if (!attackSprite.getData(hitKey)) {
							attackSprite.setData(hitKey, true);
							monster.takeDamage(attack.getDamage());
						}
					}
				}
			}
		}
	}

	createGrassBackground() {
		const graphics = this.add.graphics();

		graphics.fillStyle(0x4a7c23, 1);
		graphics.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

		const tileSize = 64;
		for (let x = 0; x < this.WORLD_WIDTH; x += tileSize) {
			for (let y = 0; y < this.WORLD_HEIGHT; y += tileSize) {
				if ((x / tileSize + y / tileSize) % 2 === 0) {
					graphics.fillStyle(0x3d6b1c, 1);
					graphics.fillRect(x, y, tileSize, tileSize);
				}

				if (Math.random() > 0.7) {
					graphics.fillStyle(0x5a8c33, 1);
					graphics.fillCircle(
						x + Math.random() * tileSize,
						y + Math.random() * tileSize,
						3
					);
				}
			}
		}
	}

	update(time: number) {
		// Reset velocity
		this.player.setVelocity(0);

		let velocityX = 0;
		let velocityY = 0;

		// Horizontal movement
		if (this.cursors.left.isDown || this.wasd.A.isDown) {
			velocityX = -this.PLAYER_SPEED;
		} else if (this.cursors.right.isDown || this.wasd.D.isDown) {
			velocityX = this.PLAYER_SPEED;
		}

		// Vertical movement
		if (this.cursors.up.isDown || this.wasd.W.isDown) {
			velocityY = -this.PLAYER_SPEED;
		} else if (this.cursors.down.isDown || this.wasd.S.isDown) {
			velocityY = this.PLAYER_SPEED;
		}

		// Apply velocity
		this.player.setVelocity(velocityX, velocityY);

		// Normalize diagonal movement
		if (velocityX !== 0 && velocityY !== 0) {
			this.player.body!.velocity.normalize().scale(this.PLAYER_SPEED);
		}

		// Update attacks
		for (const attack of this.attacks) {
			if (velocityX !== 0 || velocityY !== 0) {
				attack.updateDirection(velocityX, velocityY);
			}
			attack.update(time);
		}

		// Update spawn manager
		this.spawnManager.update();

		// Check attack collisions with monsters
		this.checkAttackCollisions();
	}
}
