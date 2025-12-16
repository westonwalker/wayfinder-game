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
	readonly PLAYER_STARTING_HEALTH = 5;
	playerHealth: number = this.PLAYER_STARTING_HEALTH;
	maxPlayerHealth: number = this.PLAYER_STARTING_HEALTH;
	heartIcons: Phaser.GameObjects.Image[] = [];

	// World size
	readonly WORLD_WIDTH = 3200;
	readonly WORLD_HEIGHT = 2400;
	readonly PLAYER_SPEED = 200;

	constructor() {
		super("Game");
	}

	create() {
		// Reset state for scene restart
		this.attacks = [];
		this.heartIcons = [];
		this.playerHealth = this.PLAYER_STARTING_HEALTH;

		// Set world bounds
		this.physics.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

		// Create background
		this.createBackground();

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
		// Create heart icons for health display
		const heartSpacing = 36;
		const startX = 20;
		const startY = 20;

		for (let i = 0; i < this.maxPlayerHealth; i++) {
			const heart = this.add.image(
				startX + i * heartSpacing,
				startY,
				i < this.playerHealth ? "heart" : "heart-empty"
			);
			heart.setOrigin(0, 0);
			heart.setScrollFactor(0);
			heart.setDepth(100);
			heart.setScale(1);
			this.heartIcons.push(heart);
		}
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

		// Update heart icons
		this.updateHeartDisplay();

		if (this.playerHealth <= 0) {
			this.gameOver();
		}
	}

	updateHeartDisplay() {
		for (let i = 0; i < this.heartIcons.length; i++) {
			this.heartIcons[i].setTexture(
				i < this.playerHealth ? "heart" : "heart-empty"
			);
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

	createBackground() {
		const graphics = this.add.graphics();
		graphics.fillStyle(0x0c1317, 1);
		graphics.fillRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
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
