import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('player', 'humanoids/tile000.png');
        this.load.image('slash', 'effects/slash.png');
        
        // Monsters
        this.load.image('goblin', 'monsters/monster001.png');
        
        // UI
        this.load.image('heart', 'ui/heart.png');
        this.load.image('heart-empty', 'ui/heart-empty.png');
    }

    create ()
    {
        //  Move to the MainMenu
        this.scene.start('MainMenu');
    }
}
