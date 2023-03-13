/*
File: App.js
Name: Legend of Mani JS Game

Course: COMP486
Author: James Bombardier
Date: October 28th, 2022

Description: This script is a self-contained turn-based JRPG style game which runs in Javascript on a web-browser.

*/

/*
////////////////////////////////////////////
////////// Initialization Section //////////
////////////////////////////////////////////
*/

//PIXI initialization.
const Application = PIXI.Application;
const app = new Application({
    width: 1200,
    height: 800
});
app.renderer.backgroundColor = 0x202020;
document.body.appendChild(app.view);
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

/*
Attack class stores variables used for enemies and player attacks. All variables set through constructor.
*/
class attack{
    constructor(name, damage, playerTeam, enemyTeam, cooldown, attacksAll){
        this.name = name;
        this.baseDamage = damage; //Stored for damage scaling.
        this.damage = damage;
        this.playerTeam = playerTeam;
        this.enemyTeam = enemyTeam;
        this.cooldown = cooldown;
        this.cooldownTimer = 0;
        this.attacksAll = attacksAll; // Whether attack hits entire teams or single enemies.
    }
}

/*
The item class refers to items usable in battle by the players. Contains similar variables to attacks,
with the exception of cooldown variables.
*/
class item{
    constructor(name, damage, playerTeam, enemyTeam, self, attacksAll){
        this.name = name;
        this.baseDamage = damage; //Stored for damage scaling.
        this.damage = damage;
        this.self = self; //WIll make the item only affect the current turn user.
        this.playerTeam = playerTeam;
        this.enemyTeam = enemyTeam;
        this.attacksAll = attacksAll; // Whether attack hits entire teams or single enemies.
        this.quantity = 1;
    }
}

/*
The Enemy class contains variables and methods needed for in-game enemies fought in the battle screen. 
All method calls are local except for takeDamage() called by performAction and Enemy Action. 
*/
class enemy{
    constructor(name, life, attacks, XP, texture, level){
        this.level = level;
        this.name = name;
        this.life = Math.round(life + life * ((level - 1) / 5));
        this.maxLife = this.life;
        this.attacks = attacks; //List of attacks available to the enemy.
        this.texture = texture; //Used to initialize sprite in combat scene.
        this.XP = Math.round(XP + ((0.5 + Math.random() / 2) + (XP * level))); // XP dropped when killed.
        this.sprite = new PIXI.Sprite(texture);    
        this.sprite.on('pointerdown', performAction); //For player target selection   .

        //Scale attacks to level.
        for(i = 0; i < this.attacks.length; i++){
            this.attacks[i].damage = this.attacks[i].damage + (this.attacks[i].damage * ((level - 1) / 3));
            this.attacks[i].damage = Math.round(this.attacks[i].damage);
        }
    }

    //Handles the taking of damage. Called by performAction() and processEnemyTurn()
    takeDamage(damage){
        this.life = this.life - damage;
        if(this.life <= 0){
            this.life = 0;
            this.die();
        }
        else if(this.life > this.maxLife){
            this.life = this.maxLife;
        }
    }

    //awards XP to players on death. 
    die(){
        maniPlayer.addXP(this.XP);
        if(gabeFollow){
            gabePlayer.addXP(this.XP);
        }
    }
}

/*
Overworld enemy class contains the variables for controlling an enemy sprite in the overworld.
*/
class overWorldEnemy{
    constructor(enemyList, texture){
        this.enemyList = enemyList;
        this.texture = texture; 
        this.sprite = new PIXI.Sprite(texture);    
        this.sprite.enemyList = this.enemyList; //Enemies to be faced in combat.
        this.sprite.isEnemy = true;
    }
}

/*
The player class contains variables and methods used throughout the game for the player. All method calls are local. 
LevelUp() method called through the nextTurn() method in the combat handling section.  
*/
class player{
    constructor(name, life, attacks, texture){
        this.name = name;
        this.life = life;
        this.maxLife = life;
        this.attacks = attacks;
        this.texture = texture;       
        this.power = 100; //Scaling of attack power.
        this.sprite = new PIXI.Sprite(texture);     
        this.sprite.on('pointerdown', performAction);

        this.XP = 0;
        this.level = 1;
    }

    //Handles recieving of damage and healing.
    takeDamage(damage){
        this.life = this.life - damage;
        if(this.life <= 0){
            this.life = 0;
            this.die();
        }
        else if(this.life > this.maxLife){
            this.life = this.maxLife;
        }
    }

    //Prints a message to the player. NextTurn() handles removing of sprite and turn order.
    die(){
        combatMessages[combatMessages.length] = this.name + " has died in combat...";
    }

    //Adds XP and prints message. NextTurn() handles leveling. 
    addXP(toAdd){
        this.XP += toAdd;
        combatMessages[combatMessages.length] = this.name + " recieved " + toAdd + "XP!"
    }

    //Adds XP without printing a message. Will make a call to levelUp().
    carryOverXP(toAdd){
        this.XP += toAdd;
        if(this.XP > (this.level * 100)){
            this.levelUp();
        }
    }

    //Increases the power of the Player relative to their new level.
    levelUp(){
        this.XPCarryOVer = this.XP - (this.level * 100); //store the remainder of the XP for the carry over method.
        this.XP = 0;
        this.level++;
        combatMessages[combatMessages.length] = this.name + " has leveled up to level " + this.level + "!"
        
        this.increasePower(10);
        this.maxLife += 10 * this.level;
        this.life = this.maxLife;

        //Give mani specific abilities.
        if(this.name == "Mani"){
            if(this.level == 3){
                combatMessages[combatMessages.length] = this.name + " has learned the ability 'Sweep'!";
                maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Sweep", 15, false, true, 6, true);
                combatMessages[combatMessages.length] = this.name + " has learned the ability 'Rally Cry'!";
                maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Rally Cry", -10, true, false, 1, true);
            }
            if(this.level == 5){
                combatMessages[combatMessages.length] = this.name + " has learned the ability 'Puncture'!";
                maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Puncture", 40, false, true, 2, false);
            }
            if(this.level == 7){
                combatMessages[combatMessages.length] = this.name + " has learned the ability 'Death Blow'!";
                maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Death Blow", 100, false, true, 8, false);
            }
        }
        //Give Gabe specific spells.
        else if(this.name == "Gabe"){
            if(this.level == 4){
                combatMessages[combatMessages.length] = this.name + " has learned the spell 'Mass Heal'!";
                gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Mass Heal", -20, true, false, 5, true);
            }
            if(this.level == 5){
                combatMessages[combatMessages.length] = this.name + " has learned the spell 'Psychic Bolt'!";
                gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Psychic Bolt", 70, false, true, 7, false);
            }
            if(this.level == 6){
                combatMessages[combatMessages.length] = this.name + " has learned the spell 'Decimate'!";
                gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Decimate", 60, false, true, 7, true);
            }
        }

        //Carry over the XP
        this.carryOverXP(this.XPCarryOVer);
        //Adjust strength of moves.
        for(i = 0; i < this.attacks.length; i++){
            this.attacks[i].damage = this.attacks[i].baseDamage * (this.power / 100);
        }
        //Redraw player info.
        drawPlayerInfo();
    }

    //Handles increasing attack power relative to strength.
    increasePower(increase){
        this.power += increase;
        for(i = 0; i < this.attacks.length; i++){
            this.attacks[i].damage = this.attacks[i].baseDamage * (this.power / 100);
        }
    }

}

//Textures
let grassTexture,
houseTexture,
treeTexture,
lakeTexture,
rockTexture,
chestTexture,
uiSlotTexture,
gabeTexture,
gabeIdleTexture,
maniTexture,
maniIdleTexture,
exitTexture,
bossTexture,
mushroomTexture,
beeTexture,
eyeTexture,
goblinTexture,
slimeTexture,
koboldTexture,
vertExitTexture,
exitFrames = [],
vertExitFrames = [],
maniFrames = [],
gabeFrames = [];

//Sounds
let hurtSound = "resources/SFX/hit.wav",
healSound = "resources/SFX/heal.wav",
battleSound = "resources/SFX/Enter Battle.wav",
UISound = "resources/SFX/UI.wav",
cancelSound = "resources/SFX/cancel.wav",
levelUpSound = "resources/SFX/level Up.wav",
lootSound = "resources/SFX/loot.wav";

//Music
let mainMusic = "resources/Music/Celestial.mp3",
bossMusic = "resources/Music/Nocturnal Mysteries.mp3",
forestMusic = "resources/Music/Foggy Woods.mp3",
fieldMusic = "resources/Music/Windless Slopes.mp3",
battleMusic = "resources/Music/The Arrival (BATTLE II).mp3",
deathMusic = "resources/Music/AMBIENCE_HEARTBEAT_LOOP.wav",
currentMusic,
oldMusic = [],
musicChangeTimer;

let maniPlayer, gabePlayer; //Player objects.

//Combat related.
let items = [],
players = [],
enemies = [], 
turnOrder = [],
turnIndex = 0,
combatMessages = [],
healthBars = new PIXI.Container(),
playerInfo = new PIXI.Container();

let combatSlots = new PIXI.Container(),
turnSlots = new PIXI.Container();
let combatUISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
let selectedAction;
let currentOverworldEnemy;

//Scene initialization.
let menuScreen = new PIXI.Container(), deathScreen = new PIXI.Container(),
winScreen = new PIXI.Container(),
scene1 = new PIXI.Container(), scene2 = new PIXI.Container(), 
scene3 = new PIXI.Container(), scene4 = new PIXI.Container(),
scene5 = new PIXI.Container(), ashLayer = new PIXI.Container(), 
lastScene;
let scene1Objects = [], scene2Objects = [], scene3Objects = [], scene4Objects = [];
let currentSceneObjects = scene1Objects;

//Movement Variables.
let up = false, down = false, left = false, right = false;
const moveSpeed = 3;
let canMove = true;
let gabeFollow = false;
let trail = []; //Stores Two-Touple positions for gabe to follow mani. 

//Changes control in the main loop.
const GameStates = {
    Overworld: 0,
    Dialogue: 1,
    Combat: 2,
};
let gameState = GameStates.Overworld;

//Text and UI stuff
const style = new PIXI.TextStyle({
    fontFamily: 'Times New Roman',
    fontSize: 24,
    fill: '#ffffff', // gradient
    stroke: '#000000',
    strokeThickness: 5,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowDistance: 6,
    wordWrap: true,
    lineJoin: 'round',
    breakWords: true
});

const styleLarge = new PIXI.TextStyle({
    fontFamily: 'Times New Roman',
    fontSize: 42,
    fill: '#ffffff', // gradient
    stroke: '#000000',
    strokeThickness: 5,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowDistance: 6
});

const ControlsStyle = new PIXI.TextStyle({
    fontFamily: 'Times New Roman',
    fontSize: 24,
    fill: '#ffffff', // gradient
    stroke: '#000000',
    strokeThickness: 5,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowDistance: 6
});

//for overworld interaction.
let showUI = false;
let UISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
UISprite.scale.set(4, 4);
UISprite.x = 600;
UISprite.y = 600;
UISprite.anchor.x = 0.5;
UISprite.buttonMode = true;
UISprite.interactive = true;
UISprite.on('pointerdown', onClick);
UISprite.alpha = 0.7;

let UIText = new PIXI.Text('Placeholder text', style);
UIText.x = 2.5;
UIText.y = 2.5;
UIText.anchor.x = 0.5;
UIText.scale.set(0.25, 0.25);
UISprite.addChild(UIText);
let currentInteractable;

let dialogueLines = [];

/*
Loads sprites, animations, and sprite sheets.
*/
function init(){
    grassTexture = PIXI.Texture.from("resources/drawable/grass.png"),
    houseTexture = PIXI.Texture.from("resources/drawable/house.png"),
    treeTexture = PIXI.Texture.from("resources/drawable/tree.png"),
    blueTreeTexture = PIXI.Texture.from("resources/drawable/blue tree.png"),
    flowerTexture = PIXI.Texture.from("resources/drawable/blue flower.png"),
    lakeTexture = PIXI.Texture.from("resources/drawable/lake.png"),
    rockTexture = PIXI.Texture.from("resources/drawable/rock.png"),
    chestTexture = PIXI.Texture.from("resources/drawable/chest.png"),
    uiSlotTexture = PIXI.Texture.from("resources/drawable/uiSlot.png"),

    gabeTexture = PIXI.Texture.from("resources/drawable/gabe.png"),
    gabeIdleTexture = PIXI.Texture.from("resources/drawable/gabeIdle.png"),
    maniTexture = PIXI.Texture.from("resources/drawable/mani.png"),
    maniIdleTexture = PIXI.Texture.from("resources/drawable/maniIdle.png"),

    bossTexture = PIXI.Texture.from("resources/drawable/boss.png");
    mushroomTexture = PIXI.Texture.from("resources/drawable/mushroom.png");
    beeTexture = PIXI.Texture.from("resources/drawable/bee.png");
    slimeTexture = PIXI.Texture.from("resources/drawable/slime.png");
    koboldTexture = PIXI.Texture.from("resources/drawable/kobold.png");
    eyeTexture = PIXI.Texture.from("resources/drawable/eye.png");
    goblinTexture = PIXI.Texture.from("resources/drawable/goblin.png");
    exitTexture = PIXI.Texture.from("resources/drawable/exit.png"),
    vertExitTexture = PIXI.Texture.from("resources/drawable/vertExit.png");

    if(exitFrames.length == 0){
        loadSpriteSheet(exitTexture, 6, exitFrames);
    }
    if(vertExitFrames.length == 0){
        loadSpriteSheet(vertExitTexture, 6, vertExitFrames);
    }
    if(maniFrames.length == 0){
        loadSpriteSheet(maniTexture, 7, maniFrames);
    }
    if(gabeFrames.length == 0){
        loadSpriteSheet(gabeTexture, 7, gabeFrames);
    }

    /*
    This ticker was required to stop a buffering error that forced the user to have to refresh their browser
    multiple times before starting the game. 
    */
    const bufferTicker = new PIXI.Ticker
    bufferTicker.start();
    bufferTicker.add(() => {
        exitFrames = [];
        loadSpriteSheet(exitTexture, 6, exitFrames);
        vertExitFrames = [];
        loadSpriteSheet(vertExitTexture, 6, vertExitFrames);
        maniFrames = [];
        loadSpriteSheet(maniTexture, 7, maniFrames);
        gabeFrames = [];
        loadSpriteSheet(gabeTexture, 7, gabeFrames);
        if(exitFrames.length == 6 && vertExitFrames.length == 6 && maniFrames.length == 7 && gabeFrames.length == 7){
            finishInit();
            bufferTicker.destroy();
        }
    });
}

// Starts the initialization on load.
init(); 

/*
Completes the initialization after the frames for animations have been loaded. 
*/
function finishInit(){
    maniAnimation = new PIXI.AnimatedSprite(maniFrames);
    maniAnimation.scale.set(2, 2);
    maniAnimation.animationSpeed = 0.1;
    maniAnimation.play();

    gabeAnimation = new PIXI.AnimatedSprite(gabeFrames);
    gabeAnimation.scale.set(2, 2);
    gabeAnimation.animationSpeed = 0.1;
    gabeAnimation.play();

    changeScene("menu");
    style.wordWrapWidth = UISprite.width - 20;

    app.ticker.add(delta => loop(delta));
}

/*
////////////////////////////////////////////
////////// Game Section //////////
////////////////////////////////////////////
*/

/*
Resets the values and scenes in the game to their defaults. 
calls: various sprite methods, constructors, changeScene(), initializeScene[1, 2, 3, 4]() player.increasePower(), addItem()
*/
function restart(){

    scene1 = new PIXI.Container();
    scene2 = new PIXI.Container();
    scene3 = new PIXI.Container();
    scene4 = new PIXI.Container();
    scene5 = new PIXI.Container();
    ashLayer = new PIXI.Container();
    enemies = [];
    maniAnimation.y = 400;
    maniAnimation.x = 500;
    gabeAnimation.y = 150;
    gabeAnimation.x = 110;
    gabeAnimation.interactable = true;
    gabeAnimation.canInteract = true;
    gabeAnimation.oneShot = true;
    gabeAnimation.scale.set(2, 2);
    gabeAnimation.anchor.set(0, 0);
    gabeFollow = false;
    
    if(gabeAnimation.parent != null){
        gabeAnimation.parent.removeChild(gabeAnimation);
    }
    scene2.addChild(gabeAnimation);

    gabeAnimation.onInteraction = function(){
        gabeFollow = true;
        trail = [];
        jiji.dialogueLines = ["You found Gabe!...", "What great news! I was doing some digging into the old town records" + 
        " whilst you were gone...", "... Hopefully whatever you find out there has nothing to do with what I found...",
        "By the way, I found a few potions that might come in handy, and a better wand for Gabe! Here you go...",
        "Anyways, I think I'm going to sit here and do nothing now. Good luck!"];
        jiji.onInteraction = function(){
            gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Fireball", 30, false, true, 4, true);
            gabePlayer.power += 20;
            addItem(new item("Health Potion", -30, false, false, true, false));
            addItem(new item("Health Potion", -30, false, false, true, false));
            addItem(new item("Health Potion", -30, false, false, true, false));
            jiji.onInteraction = function(){
            random = Math.random();
            if(random < 0.2){
                    jiji.dialogueLines = ["Have you considered going to the north?"];
                } else if(random < 0.4){
                    jiji.dialogueLines = ["Shouldn't you be going somewhere?"];
                } else if(random < 0.6){
                    jiji.dialogueLines = ["If it's really him.....",
                        "HMM!!?? Ah, sorry didn't see you there... Shouldn't you be heading out?"];
                } else if(random < 0.8){
                    jiji.dialogueLines = ["Where did I leave my cane?"];
                } else {
                    jiji.dialogueLines = ["The north? It's... well... to the north."];
                }
                maniPlayer.life = maniPlayer.maxLife;
                gabePlayer.life = gabePlayer.maxLife;
                playSound("heal");
            }

            jiji.onInteraction();
        }
    }
    gabeAnimation.dialogueLines = ["Mani!!!!...", "Thank you so much for saving me, they really had me cornered here! I didn't think I would make it...",
        "... Jiji said they came from the north? Well we better go see if we can put an end to this. I'll tag along and assist.",
        "I'm not as good with a sword as you, but I'll use my magic to help out! Let's go!"];
    gabeAnimation.interactText = 'Click to rescue Gabe...';

    maniPlayer = new player("Mani", 100, [], maniIdleTexture);
    gabePlayer = new player("Gabe", 120, [], gabeIdleTexture);
    maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Punch", 5, false, true, 0, false);
    maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Slash", 15, false, true, 1, false);

    gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Magic Missiles", 10, false, true, 0, true);
    gabePlayer.attacks[gabePlayer.attacks.length] = new attack("Heal", -40, true, false, 3, false);
    gabePlayer.increasePower(60);
    gabePlayer.level = 3;

    addItem(new item("Health Potion", -30, false, false, true, false));
    addItem(new item("Health Potion", -30, false, false, true, false));
    
    scene1Objects = [], scene2Objects = [], scene3Objects = [], scene4Objects = [];
    currentSceneObjects = scene1Objects;
    initializeScene1();
    initializeScene2();
    initializeScene3();
    initializeScene4();
    UISprite.on('pointerdown', onClick);
    UISprite.alpha = 0.7;

    changeScene(1);
}

/*
Handles the game loop based on the game state.
calls: Move(), handleUI()
*/
function loop(){
    switch(gameState){
        case GameStates.Overworld:
            showUI = false;
            move();
            handleUI();
        break;
        case GameStates.Dialogue:
            showUI = true;
            handleUI();
        break;
        case GameStates.Combat:
        break;
    }
}

/*
Handles movement, sprite rotation, and collision. 
Calls: checkCollisions(), list.Splice()
*/
function move(){
    if(canMove == false){
        return;
    }
    let xVel = 0, yVel = 0;
    if(up == true && down != true){
        yVel = -moveSpeed;
    } 
    else if(down == true && up != true){
        yVel = moveSpeed;
    }

    if(right == true && left != true){
        maniAnimation.scale.x = 2;
        maniAnimation.anchor.x = 0;
        xVel = moveSpeed;
    }
    else if(left == true && right != true){
        maniAnimation.scale.x = -2;
        maniAnimation.anchor.x = 1;
        xVel = -moveSpeed;
    }
    if(checkCollisions(xVel, yVel) == false){
        maniAnimation.x += xVel;
        maniAnimation.y += yVel;
        //stores a list of points for gabe to follow.
        if(gabeFollow && (xVel != 0 || yVel != 0)){
            trail[trail.length] = maniAnimation.x;
            trail[trail.length] = maniAnimation.y;
            if(trail.length > 40){
                if(gabeAnimation.x - trail[0] < 0){
                    gabeAnimation.scale.x = 2;
                    gabeAnimation.anchor.x = 0;
                }
                else if(gabeAnimation.x - trail[0] > 0){
                    gabeAnimation.scale.x = -2;
                    gabeAnimation.anchor.x = 1;
                }
                gabeAnimation.x = trail[0];
                gabeAnimation.y = trail[1];
                trail.splice(0, 2);
            }
        }
    }
}

/*
Checks to see if Mani will collide with anything in the current scene will collide at the given velocity.
Takes: x and y values to be added to maniAnimation. 
calls: isInside(), beginBattle(), hasOwnProperty()
*/
function checkCollisions(x, y){
    if(isInBounds(x, y) == false){ // if going out of bounds.
        return true;
    }

    for(i = 0; i < currentSceneObjects.length; i++){
        if(isInside(maniAnimation.x + x, maniAnimation.y + y, 
            maniAnimation.width, maniAnimation.height, currentSceneObjects[i])){

            if(currentSceneObjects[i] == null) {return;}
            if(currentSceneObjects[i].hasOwnProperty('isEnemy')){
                enemies = currentSceneObjects[i].enemyList;
                currentOverworldEnemy = currentSceneObjects[i];
                console.log(maniAnimation.x + " " + maniAnimation.y);
                console.log(currentSceneObjects[i].x + " " + currentSceneObjects[i].y);
                beginBattle();
                return;
            } 
            else{
                return true;
            }
        }
    }
    return false;
}

/*
Checks to see if Mani will be out of bounds after the addition of the passed velocity. 
Takes: x and y values to be added to maniAnimation. 
*/
function isInBounds(x, y){
    if(maniAnimation.x + x < 0){
        return false;
    }
    else if(maniAnimation.x + x + maniAnimation.width > 1200){
        return false;
    }
    else if(maniAnimation.y + y < 0){
        return false;
    }
    else if(maniAnimation.y + y + maniAnimation.height > 800){
        return false;
    }
    return true;
}

/*
Checks to see if the passed values (Converted to bounds) will intersect with the sprite passed's bounds.
calls: changeSCene().
*/
function isInside(x, y, width, height, spriteB){
    if(spriteB.x + spriteB.width < x){
        return false;
    }
    else if(spriteB.x > x + width){
        return false;
    }
    else if(spriteB.y + spriteB.height < y){
        return false;
    }
    else if(spriteB.y > y + height){
        return false;
    }
    if(spriteB.interactable == true){
        if(spriteB.canInteract != false){
            UIText.text = spriteB.interactText;
            showUI = true;
            currentInteractable = spriteB;
        }
        return false;
    } 
    else if(spriteB.exit == true){
        changeScene(spriteB.targetScene);
    }
    return true;
}

/*
////////////////////////////////////////////
////////// Scene Section //////////
////////////////////////////////////////////
*/

/*
Adds or removes the UI sprite from the scene.
calls: addChild(), removeChild()
*/
function handleUI(){
    if(showUI == false && UISprite.parent != null){
        UISprite.parent.removeChild(UISprite);
    }
    else if(showUI == true && UISprite.parent != app.stage){
        app.stage.addChild(UISprite);
    }
}

/*
Initializes the first scene, including the environment, exits, enemies, treasure, etc.
Calls: many constructors, sprite methods, playSound(), player.increasePower(), onInteraction() method creation
animatedSprite.play()
Called by restart()
*/
function initializeScene1(){
    groundSprite = new PIXI.TilingSprite.from(grassTexture, 1, 1);
    groundSprite.width = 1200;
    groundSprite.height = 800;
    groundSprite.tileScale.set(2, 2);
    scene1.addChild(groundSprite);

    house = new PIXI.Sprite(houseTexture);
    house.x = 300;
    house.y = 150;
    house.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = house;

    house = new PIXI.Sprite(houseTexture);
    house.x = 300;
    house.y = 450;
    house.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = house;

    house = new PIXI.Sprite(houseTexture);
    house.x = 700;
    house.y = 150;
    house.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = house;

    house = new PIXI.Sprite(houseTexture);
    house.x = 700;
    house.y = 450;
    house.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = house;

    lake = new PIXI.Sprite(lakeTexture);
    lake.x = 850;
    lake.y = 400;
    lake.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = lake;

    lake = new PIXI.Sprite(lakeTexture);
    lake.x = 900;
    lake.y = 200;
    lake.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = lake;

    lake = new PIXI.Sprite(lakeTexture);
    lake.x = 175;
    lake.y = 300;
    lake.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = lake;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 1000;
    tree.y = 400;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 1100;
    tree.y = 80;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 580;
    tree.y = 10;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 50;
    tree.y = -20;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 0;
    tree.y = 120;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 35;
    tree.y = 250;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 20;
    tree.y = 400;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    tree = new PIXI.Sprite(treeTexture);
    tree.x = 200;
    tree.y = 700;
    tree.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = tree;

    rock = new PIXI.Sprite(rockTexture);
    rock.x = 300;
    rock.y = 50;
    rock.scale.set(2, 2);
    scene1.addChild(rock);

    rock = new PIXI.Sprite(rockTexture);
    rock.x = 1100;
    rock.y = 650;
    rock.scale.set(2, 2);
    scene1.addChild(rock);

    rock = new PIXI.Sprite(rockTexture);
    rock.x = 600;
    rock.y = 700;
    rock.scale.set(2, 2);
    scene1.addChild(rock);

    chest = new PIXI.Sprite(chestTexture);
    chest.x = 200;
    chest.y = 250;
    chest.scale.set(2, 2);
    chest.interactable = true;
    chest.oneShot = true;
    chest.interactText = 'Click to open the chest...';
    chest.dialogueLines = ["Inside you find a new sword! All of your attacks now do 20% more damage!", 
    "Not only that, but you've unlocked a new move, Stab!"];
    chest.onInteraction = function(){
        maniPlayer.attacks[maniPlayer.attacks.length] = new attack("Stab", 30, false, true, 2, false);
        maniPlayer.increasePower(20);
        playSound("loot");
    }
    scene1Objects[scene1Objects.length] = chest;

    jiji = new PIXI.Sprite.from("resources/drawable/jiji.png");
    jiji.x = 600;
    jiji.y = 400;
    jiji.scale.set(-2, 2);
    jiji.anchor.x = 1;
    jiji.interactable = true;
    jiji.interactText = 'Click to talk to Jiji...';
    jiji.dialogueLines = ["Mani! Thank goodness you are here...", 
        "These monsters have come out of thin air! Please be careful around the them or they will attack you.",
        "They all came from the fields to the north, I'm sure that something up there is driving them wild. Perhaps you should go check!",
        "But it's too dangerous for you to go alone... First you should go grab your brother, Gabe.", 
        "I saw him get chased into the forests to the south-east. You'll find him there for sure. Good luck Mani!",
        "By the way, if you and Gabe are ever injured, just come talk to me and I'll heal you. Like this..."];
    scene1Objects[scene1Objects.length] = jiji;
    jiji.onInteraction = function(){
        maniPlayer.life = maniPlayer.maxLife;
        gabePlayer.life = gabePlayer.maxLife;
        playSound("heal");
    }

    forestExit = new PIXI.AnimatedSprite(exitFrames);
    forestExit.y = 600;
    forestExit.x = 0;
    forestExit.scale.set(3, 3);
    forestExit.animationSpeed = 0.2;
    forestExit.play();
    forestExit.exit = true;
    forestExit.targetScene = 2;
    scene1Objects[scene1Objects.length] = forestExit;

    plainsExit = new PIXI.AnimatedSprite(vertExitFrames);
    plainsExit.y = 0;
    plainsExit.x = 800;
    plainsExit.scale.set(3, 3);
    plainsExit.animationSpeed = 0.2;
    plainsExit.play();
    plainsExit.exit = true;
    plainsExit.targetScene = 3;
    scene1Objects[scene1Objects.length] = plainsExit;

    enemiesList = [];
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)],
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 20, slimeTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)],
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 20, slimeTexture, 2);
    newEnemy = new overWorldEnemy(enemiesList, slimeTexture);
    newEnemy.sprite.x = 475;
    newEnemy.sprite.y = 100;
    newEnemy.sprite.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = newEnemy.sprite;

    enemiesList = [];
    mushroomAttacks = [new attack("Spores", 5, true, false, 0, true), new attack("Healing Powder", -16, false, true, 3, false)]
    enemiesList[enemiesList.length] = new enemy("Mushroom", 40, mushroomAttacks, 30, mushroomTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, mushroomTexture);
    newEnemy.sprite.x = 200;
    newEnemy.sprite.y = 80;
    newEnemy.sprite.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = newEnemy.sprite;


    enemiesList = [];
    beeAttacks = [new attack("Queen's Blessing", -30, false, true, 10, true), new attack("Sting", 15, true, false, 3, false), new attack("Queen's Boon", 8, true, false, 6, true)];
    enemiesList[enemiesList.length] = new enemy("Queen Bee", 40, beeAttacks, 50, beeTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 20, slimeTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, beeTexture);
    newEnemy.sprite.x = 300;
    newEnemy.sprite.y = 650;
    newEnemy.sprite.anchor.x = 1;
    newEnemy.sprite.scale.set(-2, 2);
    scene1Objects[scene1Objects.length] = newEnemy.sprite;

    enemiesList = [];
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 1);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, slimeTexture);
    newEnemy.sprite.x = 250;
    newEnemy.sprite.y = 400;
    newEnemy.sprite.scale.set(2, 2);
    scene1Objects[scene1Objects.length] = newEnemy.sprite;

    for(i = 0; i < scene1Objects.length; i++){
        scene1.addChild(scene1Objects[i]);
    }
    scene1.addChild(maniAnimation);
}

/*
Initializes the second scene, including the environment, exits, enemies, treasure, etc.
Calls: many constructors, sprite methods, playSound(), addItem(), onInteraction() method creation
animatedSprite.play()
Called by restart()
*/
function initializeScene2(){
    groundSprite = new PIXI.TilingSprite.from(grassTexture, 1, 1);
    groundSprite.width = 1200;
    groundSprite.height = 800;
    groundSprite.tileScale.set(2, 2);
    scene2.addChild(groundSprite);

    //top trees
    for(i = -55; i < 1200; i += 110){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i;
        tree.y = -30;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i + 55;
        tree.y = -10;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
    }

    //maze trees
    for(i = 100; i < 300; i += 60){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 900;
        tree.y = i;
        tree.scale.set(1, 1);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 400;
        tree.y = i;
        tree.scale.set(1, 1);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 650;
        tree.y = i + 150;
        tree.scale.set(1, 1);
        scene2Objects[scene2Objects.length] = tree;
    }

    for(i = 200; i < 1100; i += 60){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i;
        tree.y = 500;
        tree.scale.set(1, 1);
        scene2Objects[scene2Objects.length] = tree;
    }

    //right trees
    for(i = 300; i < 800; i += 80){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 1150;
        tree.y = i;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 1100;
        tree.y = i + 30;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
    }

    //left trees.
    for(i = 0; i < 800; i += 80){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = -20;
        tree.y = i;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = 0;
        tree.y = i + 30;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
    }

    //bottom trees
    for(i = -55; i < 1200; i += 110){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i;
        tree.y = 700;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i + 55;
        tree.y = 720;
        tree.scale.set(2, 2);
        scene2Objects[scene2Objects.length] = tree;
    }

    forestExit = new PIXI.AnimatedSprite(exitFrames);
    forestExit.scale.set(-3, 3);
    forestExit.y = 200;
    forestExit.x = 1200 - forestExit.width;
    forestExit.anchor.x = 1;
    forestExit.animationSpeed = 0.2;
    forestExit.play();
    forestExit.exit = true;
    forestExit.targetScene = 1;
    scene2Objects[scene2Objects.length] = forestExit;
    scene2Objects[scene2Objects.length] = gabeAnimation;

    enemiesList = [];
    goblinAttacks = [new attack("Slash", 9, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 30, goblinAttacks, 30, goblinTexture, 1);
    goblinAttacks = [new attack("Slash", 9, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 30, goblinAttacks, 30, goblinTexture, 2);
    goblinAttacks = [new attack("Slash", 9, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 30, goblinAttacks, 30, goblinTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, goblinTexture);
    newEnemy.sprite.x = 900;
    newEnemy.sprite.y = 400;
    scene2Objects[scene2Objects.length] = newEnemy.sprite;

    enemiesList = [];
    enemiesList[enemiesList.length] = new enemy("Mushroom", 40, mushroomAttacks, 30, mushroomTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 20, slimeTexture, 4);
    newEnemy = new overWorldEnemy(enemiesList, mushroomTexture);
    newEnemy.sprite.x = 625;
    newEnemy.sprite.y = 125;
    newEnemy.sprite.scale.set(2, 2);
    scene2Objects[scene2Objects.length] = newEnemy.sprite;
    
    enemiesList = [];
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 4);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 4);
    newEnemy = new overWorldEnemy(enemiesList, slimeTexture);
    newEnemy.sprite.x = 475;
    newEnemy.sprite.y = 150;
    newEnemy.sprite.scale.set(2, 2);
    scene2Objects[scene2Objects.length] = newEnemy.sprite;

    enemiesList = [];
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 2);

    slimeAttacks = [new attack("Super Jump", 8, true, false, 0, true), new attack("Sticky Healing", -50, false, true, 1, true),
        new attack("Slime Spit", 30, true, false, 0, false)];
    kingSlime = new enemy("King Slime", 100, slimeAttacks, 50, slimeTexture, 5);
    kingSlime.sprite.scale.set(3);
    enemiesList[enemiesList.length] = kingSlime;

    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 2);
    slimeAttacks = [new attack("Jump Attack", 4, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Slime", 25, slimeAttacks, 25, slimeTexture, 2);
    newEnemy = new overWorldEnemy(enemiesList, slimeTexture);
    newEnemy.sprite.x = 600;
    newEnemy.sprite.y = 600;
    newEnemy.sprite.scale.set(-6, 6);
    newEnemy.sprite.anchor.x = 1;
    scene2Objects[scene2Objects.length] = newEnemy.sprite;

    enemiesList = [];
    beeAttacks = [new attack("Sting", 10, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Worker Bee", 40, beeAttacks, 10, beeTexture, 1);
    beeAttacks = [new attack("Queen's Blessing", -30, false, true, 10, true), new attack("Sting", 15, true, false, 3, false), new attack("Queen's Boon", 8, true, false, 6, true)];
    enemiesList[enemiesList.length] = new enemy("Queen Bee", 40, beeAttacks, 50, beeTexture, 3);
    beeAttacks = [new attack("Sting", 10, true, false, 0, false)];
    enemiesList[enemiesList.length] = new enemy("Worker Bee", 40, beeAttacks, 10, beeTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, beeTexture);
    newEnemy.sprite.x = 400;
    newEnemy.sprite.y = 400;
    newEnemy.sprite.scale.set(-2, 2);
    newEnemy.sprite.anchor.x = 1;
    scene2Objects[scene2Objects.length] = newEnemy.sprite;

    chest = new PIXI.Sprite(chestTexture);
    chest.x = 800;
    chest.y = 650;
    chest.scale.set(2, 2);
    chest.interactable = true;
    chest.oneShot = true;
    chest.interactText = 'Click to open the chest...';
    chest.dialogueLines = ["Inside you find new armor for Mani and Gabe. +50 HP.", 
    "Not only that, but you've found a potion of mass harming! Throw that on a group of enemies to get rid of them fast."];
    chest.onInteraction = function(){
        maniPlayer.maxLife += 50;
        maniPlayer.life += 50;
        gabePlayer.maxLife += 50;
        gabePlayer.life += 50;
        playSound("loot");
        addItem(new item("Damage Potion", 80, false, true, false, true));
    }
    scene2Objects[scene2Objects.length] = chest;

    for(i = 0; i < scene2Objects.length; i++){
        scene2.addChild(scene2Objects[i]);
    }
}

/*
Initializes the third scene, including the environment, exits, enemies, treasure, etc.
Calls: many constructors, sprite methods, playSound(), addItem(), onInteraction() method creation
animatedSprite.play()
Called by restart()
*/
function initializeScene3(){
    groundSprite = new PIXI.TilingSprite.from(grassTexture, 1, 1);
    groundSprite.width = 1200;
    groundSprite.height = 800;
    groundSprite.tileScale.set(2, 2);
    scene3.addChild(groundSprite);

    for(i = -20; i < 800; i += 20){
        for(j = -20; j < 1200; j += 20){
            if(Math.random() > 0.9){
                flower = new PIXI.Sprite(flowerTexture);
                flower.y = i + Math.random() * 20;
                flower.x = j + Math.random() * 20;
                flower.scale.set(2);
                scene3.addChild(flower);
            }
        }
    }

    lake = new PIXI.Sprite(lakeTexture);
    lake.x = 175;
    lake.y = 300;
    lake.scale.set(2, 2);
    scene3Objects[scene3Objects.length] = lake;


    for(i = 300; i < 850; i += 50){
        tree = new PIXI.Sprite(blueTreeTexture);
        tree.x = 1000 - Math.random() * 50;
        tree.y = i;
        tree.scale.set(2, 2);
        scene3Objects[scene3Objects.length] = tree;
    }

    tree = new PIXI.Sprite(blueTreeTexture);
    tree.x = 500;
    tree.y = 200;
    tree.scale.set(1, 1);
    scene3Objects[scene3Objects.length] = tree;

    townExit = new PIXI.AnimatedSprite(vertExitFrames);
    townExit.scale.set(3, -3);
    townExit.y = 800 - townExit.height;
    townExit.x = 600;
    townExit.anchor.y = 1;
    townExit.animationSpeed = 0.2;
    townExit.play();
    townExit.exit = true;
    townExit.targetScene = 1;
    scene3Objects[scene3Objects.length] = townExit;

    finalExit = new PIXI.AnimatedSprite(vertExitFrames);
    finalExit.scale.set(3, 3);
    finalExit.y = 0;
    finalExit.x = 800;
    finalExit.animationSpeed = 0.2;
    finalExit.play();
    finalExit.exit = true;
    finalExit.targetScene = 4;
    scene3Objects[scene3Objects.length] = finalExit;

    enemiesList = [];
    eyeAttacks = [new attack("Gaze", 12, true, false, 2, false), new attack("Mass Gaze", 8, true, false, 4, true)];
    enemiesList[enemiesList.length] = new enemy("Eye", 40, eyeAttacks, 50, eyeTexture, 1);
    eyeAttacks = [new attack("Gaze", 12, true, false, 2, false), new attack("Mass Gaze", 8, true, false, 4, true)];
    enemiesList[enemiesList.length] = new enemy("Eye", 40, eyeAttacks, 50, eyeTexture, 4);
    eyeAttacks = [new attack("Gaze", 12, true, false, 2, false), new attack("Mass Gaze", 8, true, false, 4, true)];
    enemiesList[enemiesList.length] = new enemy("Eye", 40, eyeAttacks, 50, eyeTexture, 2);
    newEnemy = new overWorldEnemy(enemiesList, eyeTexture);
    newEnemy.sprite.x = 200;
    newEnemy.sprite.y = 200;
    newEnemy.sprite.scale.set(2);
    scene3Objects[scene3Objects.length] = newEnemy.sprite;

    
    enemiesList = [];
    koboldAttacks = [new attack("Stab", 20, true, false, 0, false), new attack("Slash", 10, true, false, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Kobold", 40, koboldAttacks, 50, koboldTexture, 3);
    koboldAttacks = [new attack("Stab", 20, true, false, 0, false), new attack("Slash", 10, true, false, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Kobold", 40, koboldAttacks, 50, koboldTexture, 6);
    koboldAttacks = [new attack("Stab", 20, true, false, 0, false), new attack("Slash", 10, true, false, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Kobold", 40, koboldAttacks, 50, koboldTexture, 2);
    newEnemy = new overWorldEnemy(enemiesList, koboldTexture);
    newEnemy.sprite.scale.set(2);
    newEnemy.sprite.x = 200;
    newEnemy.sprite.y = 600;
    scene3Objects[scene3Objects.length] = newEnemy.sprite;

    enemiesList = [];
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 1);
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 1);
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 3);
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    goblinQueen = new enemy("Goblin Queen", 200, goblinAttacks, 100, goblinTexture, 7)
    goblinQueen.sprite.scale.set(2);
    enemiesList[enemiesList.length] = goblinQueen;
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 3);
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 1);
    goblinAttacks = [new attack("Slash", 13, true, false, 0, false), new attack("Bomb", 6, true, false, 3, true), new attack("Potion Bomb", -8, false, true, 1, true)];
    enemiesList[enemiesList.length] = new enemy("Goblin", 40, goblinAttacks, 10, goblinTexture, 1);
    newEnemy = new overWorldEnemy(enemiesList, goblinTexture);
    newEnemy.sprite.x = 1100;
    newEnemy.sprite.y = 500;
    newEnemy.sprite.anchor.x = 1;
    newEnemy.sprite.scale.set(-3, 3);
    scene3Objects[scene3Objects.length] = newEnemy.sprite;

    chest = new PIXI.Sprite(chestTexture);
    chest.x = 1100;
    chest.y = 650;
    chest.scale.set(2, 2);
    chest.interactable = true;
    chest.oneShot = true;
    chest.interactText = 'Click to open the chest...';
    chest.dialogueLines = ["Inside you find new armor for Mani and Gabe. +50 HP.", 
    "Not only that, but you've found a Holy Hand Grenade! Throw that on the ground and it will heal your team!!."];
    chest.onInteraction = function(){
        maniPlayer.maxLife += 50;
        maniPlayer.life += 50;
        gabePlayer.maxLife += 50;
        gabePlayer.life += 50;
        playSound("loot");
        addItem(new item("Holy Hand Grenade", -100, true, false, false, true));
    }
    scene3Objects[scene3Objects.length] = chest;

    for(i = 0; i < scene3Objects.length; i++){
        scene3.addChild(scene3Objects[i]);
    }
}

/*
Initializes the second scene, including the environment, exits, enemies, treasure, etc.
Calls: many constructors, sprite methods, onInteraction() method creation
animatedSprite.play(), beginBattle()
Called by restart()
*/
function initializeScene4(){
    groundSprite = new PIXI.TilingSprite.from(grassTexture, 1, 1);
    groundSprite.width = 1200;
    groundSprite.height = 800;
    groundSprite.tileScale.set(2, 2);
    groundSprite.tint = "0x808080";
    scene4.addChild(groundSprite);

    finalExit = new PIXI.AnimatedSprite(vertExitFrames);
    finalExit.scale.set(3, -3);
    finalExit.y = 800 - finalExit.height;
    finalExit.x = 600;
    finalExit.anchor.y = 1;
    finalExit.animationSpeed = 0.2;
    finalExit.play();
    finalExit.exit = true;
    finalExit.targetScene = 3;
    scene4Objects[scene4Objects.length] = finalExit;

    //boss trees
    for(i = 200; i < 900; i += 60){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i;
        tree.y = -40 + Math.random() * 20;
        tree.scale.set(1, 1);
        scene4Objects[scene4Objects.length] = tree;
    }
    for(i = 200; i < 900; i += 60){
        tree = new PIXI.Sprite(treeTexture);
        tree.x = i + 30;
        tree.y = -20 + Math.random() * 20;
        tree.scale.set(1, 1);
        scene4Objects[scene4Objects.length] = tree;
    }
    for(i = -50; i < 300; i += 30 + Math.random() * 30){
        for(j = -50; j < 300; j += 30 + Math.random() * 30 ){
            tree = new PIXI.Sprite(treeTexture);
            tree.x = i + Math.random() * 20;
            tree.y = j + Math.random();
            tree.scale.set(1, 1);
            scene4Objects[scene4Objects.length] = tree;
        }
    }
    for(i = -50; i < 450; i += 30 + Math.random() * 30){
        for(j = 300; j < 900; j += 30 + Math.random() * 30 ){
            tree = new PIXI.Sprite(treeTexture);
            tree.x = i + Math.random() * 20;
            tree.y = j + Math.random();
            tree.scale.set(1, 1);
            scene4Objects[scene4Objects.length] = tree;
        }
    }
    for(i = 900; i < 1300; i += 30 + Math.random() * 30){
        for(j = -50; j < 300; j += 30 + Math.random() * 30 ){
            tree = new PIXI.Sprite(treeTexture);
            tree.x = i + Math.random() * 20;
            tree.y = j + Math.random();
            tree.scale.set(1, 1);
            scene4Objects[scene4Objects.length] = tree;
        }
    }
    for(i = 750; i < 1300; i += 30 + Math.random() * 30){
        for(j = 300; j < 900; j += 30 + Math.random() * 30 ){
            tree = new PIXI.Sprite(treeTexture);
            tree.x = i + Math.random() * 20;
            tree.y = j + Math.random();
            tree.scale.set(1, 1);
            scene4Objects[scene4Objects.length] = tree;
        }
    }


    boss = new PIXI.Sprite(bossTexture);
    boss.x = 600;
    boss.y = 100;
    boss.scale.set(2, 2);
    boss.onInteraction = function(){
        enemies[enemies.length] = new enemy("Eye", 80, eyeAttacks, 50, eyeTexture, 5);
        enemies[enemies.length] = new enemy("Goblin", 80, goblinAttacks, 50, goblinTexture, 5);
        bossAttacks = [new attack("Precision Punch", 15, true, false, 1, false), new attack("Ultimate Heal", -20, false, true, 4, false), new attack("Flurry", 15, true, false, 5, true),
            new attack("Doom Curse", 7.5, true, true, 1, true), new attack("Mass Heal", -10, false, true, 1, true), new attack("Roulette Meteor", 40, true, true, 1, false)];
        enemies[enemies.length] = new enemy("Old Man", 500, bossAttacks, 50, bossTexture, 10);
        enemies[enemies.length] = new enemy("Eye", 80, eyeAttacks, 50, eyeTexture, 5);
        enemies[enemies.length] = new enemy("Goblin", 80, goblinAttacks, 50, goblinTexture, 5);
        beginBattle();
    }
    boss.interactable = true;
    boss.interactText = 'Click to talk to the mysterious stranger...';
    boss.dialogueLines = ["Hello young one... The monsters? Why yes, that was me!",
        "You see, a long time ago that accursed old man Jiji exiled me from your village...",
        "... After many decades, I have finally returned to get my revenge!",
        "It's a real shame that you got yourselves caught up in this...",
        "Either way, time to deal with you... Now... Raise your weapons and fight!!!!"];
    scene4Objects[scene4Objects.length] = boss;


    for(i = 0; i < scene4Objects.length; i++){
        scene4Objects[i].tint = "0x808080";
        scene4.addChild(scene4Objects[i]);
    }

    const numberOfAshes = 1000;
    const ashes = new PIXI.ParticleContainer(numberOfAshes, {
        scale: true,
        position: true,
        rotation: true,
        uvs: true,
        alpha: true,
    });
    const particles = [];
    for(i = 0; i < numberOfAshes; i++){
        ash = new PIXI.Sprite.from("resources/drawable/dust.png");
        ash.distance = 0.2 + (Math.random() * 0.8);
        ash.turningSpeed = Math.random() - 0.5;
        ash.anchor.set(0.5);
        ash.scale.set(ash.distance);
        ash.position.x = Math.random() * 1200;
        ash.position.y = Math.random() * 800;
        random = Math.random();
        if(random > 0.4){
            ash.tint = "0x707070";
        } else if (random > 0.8){
            ash.tint = "0x606060";
        } else{
            ash.tint = "0x808080";
        }
        ash.direction = 1 - (Math.random() * 2);
        particles[particles.length] = ash;
        ashes.addChild(ash);
    }
    ashLayer.addChild(ashes);
    app.ticker.add(() => {
        if(app.stage != scene4) { return; }
        // iterate through the sprites and update their position
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            particle.rotation += particle.direction * 0.01;
            particle.x += 0.5 * (particle.distance * 0.5);
            particle.y += 0.5 * (particle.distance);
            if(particle.x > 1200){
                particle.x = 0 - particle.width;
            }
            if(particle.y > 800){
                particle.y = 0 - particle.height;
            }
        }
    });
}

/*
Initializes the battleScene. 
Calls: Sprite methods, math methods.
Called by: changeScene()
*/
function initializeScene5(){
    scene5 = new PIXI.Container();

    turnOrder = [];
    gameState = GameStates.Combat;

    players = [];
    players[0] = maniPlayer;
    ManiIdleSprite = maniPlayer.sprite;
    ManiIdleSprite.scale.set(2.5, 2.5);
    ManiIdleSprite.x = 200;
    ManiIdleSprite.y = 200;
    scene5.addChild(ManiIdleSprite);
    turnOrder[0] = maniPlayer;
    
    if(gabeFollow == true){
        players[players.length] = gabePlayer;
        gabeIdleSprite = gabePlayer.sprite;
        gabeIdleSprite.scale.set(2.5, 2.5);
        gabeIdleSprite.x = 200;
        gabeIdleSprite.y = 400;
        scene5.addChild(gabeIdleSprite);
        turnOrder[turnOrder.length] = gabePlayer;
    }

    enemyYOffset = -(enemies.length / 2);
    for(i = 0; i < enemies.length; i++){
        newEnemy = enemies[i].sprite;
        newEnemy.scale.set(-2.5 * enemies[i].sprite.scale.x, 2.5 * enemies[i].sprite.scale.y);
        newEnemy.anchor.x = 1;
        if(i % 2 == 0){
            newEnemy.x = 750;
        }
        else{
            newEnemy.x = 950;
        }
        newEnemy.y = 350 + ((enemyYOffset + i) * (400 / enemies.length)) - newEnemy.height / 2;
        scene5.addChild(newEnemy);
        turnOrder[turnOrder.length] = enemies[i];        
    }

    scene5.addChild(healthBars);
    scene5.addChild(playerInfo);
    turnIndex = Math.round(Math.random() * turnOrder.length);
}

/*
No-argument method to start a battle. 
Calls: ChangeScene(), nextTurn()
*/
function beginBattle(){
    changeScene(5);
    nextTurn();
}

/*
Changes the scene based on the value passed as an argument. 
Takes: A string or number representing tha destination scene. 
Calls: changeMusic(), drawMenu(), initializeScene5()
Called by: beginBattle(), OldMan.onInteraction(), isInside()
*/
function changeScene(scneIndex){
    let newScene = scene1;
    switch(scneIndex){
        case "menu": // battle
            changeMusic(null);
            app.stage = menuScreen;
            drawMenu();
            canMove = false;
            return;
        case "death": 
            changeMusic(deathMusic);
            app.stage = deathScreen;
            canMove = false;
            return;
        case "win": 
            changeMusic(mainMusic);
            app.stage = winScreen;
            canMove = false;
            return;
        case 1: // town
            newScene = scene1;
            currentSceneObjects = scene1Objects;
            changeMusic(mainMusic);
            if(app.stage == scene2){
                maniAnimation.position.x = 80;
                maniAnimation.position.y = 600;
            }
            else if(app.stage == scene3){
                maniAnimation.position.x = 800;
                maniAnimation.position.y = 80;
            }
            break;
        case 2: // forest
            changeMusic(forestMusic);
            maniAnimation.position.x = 1100;
            maniAnimation.position.y = 200; 
            newScene = scene2;
            currentSceneObjects = scene2Objects;
            break;
        case 3: // fields
            changeMusic(fieldMusic);
            if(app.stage == scene1){
                maniAnimation.position.x = 600;
                maniAnimation.position.y = 700;
            }
            else if(app.stage == scene4){
                maniAnimation.position.x = 800;
                maniAnimation.position.y = 80;
            }
            newScene = scene3;
            currentSceneObjects = scene3Objects;
            break;
        case 4: // boss
            changeMusic(bossMusic);
            maniAnimation.position.x = 600;
            maniAnimation.position.y = 700;
            newScene = scene4;
            currentSceneObjects = scene4Objects;
            break;
        case 5: // battle
            changeMusic(battleMusic);
            lastScene = app.stage;
            initializeScene5();
            app.stage = scene5;
            canMove = false;
            return;
        case -1: // return from battle
            switch(lastScene){
                case scene1:
                    changeMusic(mainMusic);
                    break;
                case scene2:
                    changeMusic(forestMusic);
                    break;
                case scene3:
                    changeMusic(fieldMusic);
                    break;
                case scene4:
                    changeMusic(bossMusic);
                    break;
            }
            newScene = lastScene;
            enemies = [];
            break;
    }
    gameState = GameStates.Overworld;
    canMove = true;
    newScene.addChild(maniAnimation);
    if(gabeFollow == true){
        newScene.addChild(gabeAnimation);
        gabeAnimation.x = maniAnimation.x;
        gabeAnimation.y = maniAnimation.y;
        trail.splice(0);
    }
    if(newScene == scene4){
        newScene.addChild(ashLayer);
        maniAnimation.tint = 0x808080;
        gabeAnimation.tint = 0x808080;
    } else{
        maniAnimation.tint = 0xFFFFFF;
        gabeAnimation.tint = 0xFFFFFF;
    }
    app.stage = newScene;
}

/*
No-arg method to quickly return to the last scene. 
calls: changeScene();
Called by: endCombat() on pointer down.
*/
function returnToLastScene(){
    changeScene(-1);
}

/*
Draws the main menu screen.
Called by: drawControlsScreen.onPointerDown(), changeScreen()
Calls: drawControlsScreen()
*/
function drawMenu(){
    titleImage = new PIXI.Sprite.from("resources/drawable/title.png");
    menuScreen.addChild(titleImage);

    startButton = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    startButton.scale.set(3);
    startButton.x = 900;
    startButton.y = 300;
    startButton.buttonMode = true;
    startButton.interactive = true;
    startButton.on('pointerdown', restart);
    menuScreen.addChild(startButton);

    startText = new PIXI.Text("Start", styleLarge);
    startText.style.fontSize = 42;
    startText.x = startButton.x + startButton.width / 2 - startText.width / 2;
    startText.y = startButton.y + startButton.height / 2 - startText.height / 2;
    menuScreen.addChild(startText);

    startButton = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    startButton.scale.set(3);
    startButton.x = 900;
    startButton.y = 500;
    startButton.buttonMode = true;
    startButton.interactive = true;
    startButton.on('pointerdown', drawControlsScreen);
    menuScreen.addChild(startButton);
    
    startText = new PIXI.Text("Controls", styleLarge);
    startText.style.fontSize = 42;
    startText.x = startButton.x + startButton.width / 2 - startText.width / 2;
    startText.y = startButton.y + startButton.height / 2 - startText.height / 2;
    menuScreen.addChild(startText);

}

/*
Draws the controls screen.
Called by: drawMenuScene.onPointerDown()
Calls: drawMenuScene()
*/
function drawControlsScreen(){
    menuScreen.removeChildren();
    startButton = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    startButton.scale.set(3);
    startButton.x = 900;
    startButton.y = 300;
    startButton.buttonMode = true;
    startButton.interactive = true;
    startButton.on('pointerdown', drawMenu);
    menuScreen.addChild(startButton);
    
    text = new PIXI.Text("Return", styleLarge);
    text.x = startButton.x + startButton.width / 2 - startText.width / 2;
    text.y = startButton.y + startButton.height / 2 - startText.height / 2;
    menuScreen.addChild(text);

    text = new PIXI.Text("Instructions:", styleLarge);
    text.x = 200;
    text.y = 100;
    menuScreen.addChild(text);

    text = new PIXI.Text("WASD to walk.", ControlsStyle);
    text.x = 200;
    text.y = 200;
    menuScreen.addChild(text);

    text = new PIXI.Text("Click on text boxes to interact with the game world.", ControlsStyle);
   text.x = 200;
   text.y = 250;
   menuScreen.addChild(text);

   text = new PIXI.Text("Walk into enemies to interact with them.", ControlsStyle);
   text.x = 200;
   text.y = 300;
   menuScreen.addChild(text);

   text = new PIXI.Text("Combat is turn based. Kill enemies to gain XP and level up!", ControlsStyle);
   text.x = 200;
   text.y = 350;
   menuScreen.addChild(text);

   text = new PIXI.Text("Go between levels by stepping on the arrow indicators.", ControlsStyle);
   text.x = 200;
   text.y = 400;
   menuScreen.addChild(text);

    maniAnim = new PIXI.AnimatedSprite(maniFrames);
    maniAnim.x = 150; 
    maniAnim.y = 200;
    maniAnim.animationSpeed = 0.1;
    menuScreen.addChild(maniAnim);
    maniAnim.play();

    uiBox = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    uiBox.position.x = 75;
    uiBox.position.y = 250;
    menuScreen.addChild(uiBox);

    enemySprite = new PIXI.Sprite(slimeTexture);
    enemySprite.position.x = 150;
    enemySprite.position.y = 300;
    enemySprite.scale.set(2);
    menuScreen.addChild(enemySprite);

    enemySprite = new PIXI.Sprite(mushroomTexture);
    enemySprite.position.x = 150;
    enemySprite.position.y = 350;
    menuScreen.addChild(enemySprite);

    arrowAnim = new PIXI.AnimatedSprite(exitFrames);
    arrowAnim.position.x = 160;
    arrowAnim.position.y = 410;
    arrowAnim.animationSpeed = 0.3;
    arrowAnim.play();
    menuScreen.addChild(arrowAnim);
}

/*
Cuts a sprite sheed into individual frames based on arguments passed. 
Arguments: Texture for the sprite sheet, numberOfFrames for the number of evenly spaced frames, outArray for the storage position. 
Called By: (initialize)
Calls: sprite methods. 
*/
function loadSpriteSheet(texture, numberOfFrames, outArray){
    text = new PIXI.Texture(texture);
    if(text.width <= 1 || text.height <= 1) {return};
    frameWidth = text.width / numberOfFrames;
    for(i = 0; i < numberOfFrames; i++){
        rect = new PIXI.Rectangle(frameWidth * i, 0, frameWidth, text.height);
        text.frame = rect;
        outArray[i] = text;
        text = new PIXI.Texture(texture);
    }
}

/*
Plays a sound based on the string passed.
Calls: sound.play
Called by: various locations.
*/
function playSound(name){
    let sound;
    switch(name){
        case "hit":
            sound = new Audio(hurtSound);
            break;
        case "heal":
            sound = new Audio(healSound);
            break;
        case "UI":
            sound = new Audio(UISound);
            break;
        case "Cancel":
            sound = new Audio(cancelSound);
            break;
        case "BattleSound":
            sound = new Audio(battleSound);
            break;
        case "LevelUp":
            sound = new Audio(levelUpSound);
            break;
        case "loot":
            sound = new Audio(lootSound);
            break;
        default:
            console.log(name + " WAS NOT A VALID SOUND.");
            return;
    }
    sound.play();
}

/*
Changes the current song by crossfading the current music with the last played song. 
Arguments: newMusic takes a string file directory of the new music file. 
Array methods, ticker methods. 
Called by: changeScene()
*/
function changeMusic(newMusic){
    if(currentMusic != null){
        oldMusic[oldMusic.length] = currentMusic;  
    }
    if(newMusic != null){
        currentMusic = new Audio(newMusic);
        currentMusic.play();
        currentMusic.volume = 0;
        currentMusic.loop = true;
    }
 
    if(currentMusic != null){
        stillFading = false;
        if(musicChangeTimer != null){
            musicChangeTimer.stop();
        }
        musicChangeTimer = new PIXI.Ticker();
        musicChangeTimer.add(() => {
            for(i = 0; i < oldMusic.length; i++){
                if(oldMusic[i].volume > 0.1){
                    oldMusic[i].volume -= 0.01;
                    stillFading = true;
                }
                else{
                    oldMusic[i].pause();
                    oldMusic.splice(i, 1);
                }

            }
    
            if(currentMusic != null && currentMusic.volume < 0.99){
                currentMusic.volume += 0.01;
            }
            else if(stillFading == true){
                musicChangeTimer.destroy();
            }
        });
        musicChangeTimer.start();
    }
    
}

/*
////////////////////////////////////////////
////////// Input Section //////////
////////////////////////////////////////////
*/

/*
Takes the key-down input of the user's keyboard and enables a boolean if it is a movement key.
*/
document.addEventListener('keydown', function(event) {
    if(event.key == "a" || event.key == "A") {
        left = true; 
    }
    else if(event.key == "d" || event.key == "D") {
        right = true;
    }
    else if(event.key == "s" || event.key == "S") {
        down = true;
    }
    else if(event.key == "w" || event.key == "W") {
        up = true;
    }
});

/*
Takes the key-up input of the user's keyboard and disables a boolean if it is a movement key.
*/
document.addEventListener('keyup', function(event) {
    if(event.key == "a" || event.key == "A") {
        left = false; 
    }
    else if(event.key == "d" || event.key == "D") {
        right = false;
    }
    else if(event.key == "s" || event.key == "S") {
        down = false;
    }
    else if(event.key == "w" || event.key == "W") {
        up = false;
    }
});

/*
For overworld interaction with dialogue boxes. 
Called by: various on-click methods. 
*/
function onClick() { //When the interactable button is clicked.
    playSound("UI");
    if(gameState == GameStates.Overworld){
        dialogueLines = currentInteractable.dialogueLines;
        UIText.text = dialogueLines[0];
        UISprite.alpha = 1;
        gameState = GameStates.Dialogue;
        if(currentInteractable.oneShot == true){
            currentInteractable.canInteract = false;
        }
    }
    
    else if(gameState == GameStates.Dialogue){
        for(i = 0; i < dialogueLines.length - 1; i++){
            if(dialogueLines[i] == UIText.text){
                UIText.text = dialogueLines[i + 1];
                return;
            }
        }
        gameState = GameStates.Overworld;
        if(typeof currentInteractable.onInteraction === 'function'){
            currentInteractable.onInteraction();
        }
        UISprite.alpha = 0.7;
    }
}

/*
////////////////////////////////////////////
////////// Combat Section //////////
////////////////////////////////////////////
*/
/*
Initializes the combat slots (actions available to the player) each player turn. 
Arguments: a list of actions to display.
Called by: nextTurn().
*/
function setCombatSlots(list){
    combatSlots = new PIXI.Container();
    combatSlots.position.y = 700;
    index = 0;
    for(i = 0; i < list.length; i++){
        slot = new PIXI.Sprite(uiSlotTexture);
        slot.scale.set(16, 6);
        slot.x = 600 + ((i - parseInt(i / 5) * 5) - 2.5) * (10 + slot.width);
        slot.y = -(parseInt(i / 5) * (10 + slot.height));
        combatSlots.addChild(slot);

        if(list[i].cooldownTimer < 0){
            slot.buttonMode = true;
            slot.interactive = true;
            slot.tint = "0xFFFFFF";
        }
        else {
            slot.buttonMode = false;
            slot.interactive = false;
            slot.tint = "0xb0b0b0";
        }

        slot.action = list[i];

        let text = new PIXI.Text(list[i].name);
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.x = 1;
        text.y = 1;
        slot.addChild(text);
        if(list[i].cooldownTimer < 0){
            text = new PIXI.Text("Ready");
        } else{
            text = new PIXI.Text(list[i].cooldownTimer + 1);
        }

        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.anchor.x = 1;
        text.x = (slot.width / slot.scale.x) - 0.5;
        text.y = 1;
        slot.addChild(text);
        text = new PIXI.Text(list[i].damage + "; CD: " + list[i].cooldown + " turns");
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.x = 1;
        text.y = 5;
        slot.addChild(text);
        string = "None.";
        if(list[i].enemyTeam){
            string = "Enemies"
        }
        else if(list[i].enemyTeam && list[i].playerTeam){
            string = "Enemies, Players"
        }
        else if(list[i].playerTeam){
            string = "Players"
        }
        if(list[i].attacksAll){
            string = "All " + string;
        }
        text = new PIXI.Text(string);
        text.x = 1;
        text.y = 9;
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        slot.addChild(text);

        slot.on('pointerdown', selectTarget);

        index = i + 1;
    }
    for(i = 0; i < items.length; i++){
        slot = new PIXI.Sprite(uiSlotTexture);
        slot.scale.set(16, 6);
        slot.x = 600 + (((i + index) - parseInt((i + index) / 5) * 5) - 2.5) * (10 + slot.width);
        slot.y = -(parseInt((i + index) / 5) * (10 + slot.height));
        combatSlots.addChild(slot);

        slot.buttonMode = true;
        slot.interactive = true;
        slot.tint = "0xFFFFFF";

        slot.action = items[i];
        slot.isItem = true;

        let text = new PIXI.Text(items[i].name);
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.x = 1;
        text.y = 1;
        slot.addChild(text);

        text = new PIXI.Text("x" + items[i].quantity);

        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.anchor.x = 1;
        text.x = (slot.width / slot.scale.x) - 0.5;
        text.y = 1;
        slot.addChild(text);
        text = new PIXI.Text(items[i].damage + ";");
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        text.x = 1;
        text.y = 5;
        slot.addChild(text);
        string = "None.";
        if(items[i].self){
            string = "Self";
        }
        else if(items[i].enemyTeam){
            string = "Enemies";
        }
        else if(items[i].enemyTeam && items[i].playerTeam){
            string = "Enemies, Players";
        }
        else if(items[i].playerTeam){
            string = "Players";
        }
        if(items[i].attacksAll && !items[i].self){
            string = "All " + string;
        }
        text = new PIXI.Text(string);
        text.x = 1;
        text.y = 9;
        text.scale.x = 0.75 / slot.scale.x;
        text.scale.y = 0.75 / slot.scale.y;
        slot.addChild(text);


        slot.on('pointerdown', selectTarget);
    }
    scene5.addChild(combatSlots);
}

/*
Enables the appropriate targets of a selected combat action. Creates a cancel button. 
Calls: playSount(), hasOwnProperty(), cancelSelection()
Called by: setCombatSlots() onPointerDown action. 
*/
function selectTarget(){
    playSound("UI");
    selectedAction = this.action;
    combatSlots.children.forEach(function(child){
        child.tint = "0xb0b0b0";
        child.buttonMode = false;
        child.interactive = false;
    });

    if(this.action.hasOwnProperty('self') && this.action.self){
        turnOrder[turnIndex].sprite.buttonMode = true;
        turnOrder[turnIndex].sprite.interactive = true;
        if(turnOrder[turnIndex] == players[0]){
            turnOrder[turnIndex].sprite.playerIndex = 0;
        }
        else{
            turnOrder[turnIndex].sprite.playerIndex = 1;
        }
    }
    else{
        if(this.action.enemyTeam){
            for(i = 0; i < enemies.length; i++){
                enemies[i].sprite.buttonMode = true;
                enemies[i].sprite.interactive = true;
                enemies[i].sprite.enemyIndex = i;
            }
        }
        if(this.action.playerTeam){
            for(i = 0; i < players.length; i++){
                players[i].sprite.buttonMode = true;
                players[i].sprite.interactive = true;
                players[i].sprite.playerIndex = i;
            }
        }
    }

    this.tint = "0xFFFFFF";
    cancelButton = new PIXI.Sprite(uiSlotTexture);
    cancelButton.scale.set(12, 6);
    cancelButton.x = 50;
    cancelButton.y = -650;
    combatSlots.addChild(cancelButton);
    cancelButton.buttonMode = true;
    cancelButton.interactive = true;
    cancelButton.on('pointerdown', cancelSelection);

    text = new PIXI.Text("Cancel");
    text.x = 3;
    text.y = 4.5;
    text.scale.x = 1 / slot.scale.x;
    text.scale.y = 1 / slot.scale.y;
    cancelButton.addChild(text);
}

/*
Cancels the currently selected move and allows selecting of another move or item. 
Called by: SelectTarget() onPointerDown button. 
*/
function cancelSelection(){
    playSound("Cancel");
    combatSlots.removeChild(combatSlots.children[combatSlots.children.length - 1]);
    combatSlots.children.forEach(function(child){
        if(child.action.cooldownTimer < 0 || child.action instanceof item){
            child.buttonMode = true;
            child.interactive = true;
            child.tint = "0xFFFFFF";
        }
        else {
            child.buttonMode = false;
            child.interactive = false;
            child.tint = "0xb0b0b0";
        }
    });
    for(i = 0; i < turnOrder.length; i++){
        turnOrder[i].sprite.buttonMode = false;
        turnOrder[i].sprite.interactive = false;
    }
}

/*
performs the selected action on the selected target / team.
Calls: playSound(), Enemy/Player.takeDamage(), nextTurn()
Called by: targeted sprite click event.
*/
function performAction(){
    playSound("UI");
    for(i = 0; i < turnOrder.length; i++){
        turnOrder[i].sprite.buttonMode = false;
        turnOrder[i].sprite.interactive = false;
    }

    if(selectedAction.attacksAll){
        if(selectedAction.playerTeam == true){
            for(i = 0; i < turnOrder.length; i++){
                if(turnOrder[i] instanceof player){
                    turnOrder[i].takeDamage(selectedAction.damage);
                }
            }
        }
        if (selectedAction.enemyTeam == true){
            for(i = 0; i < turnOrder.length; i++){
                if(turnOrder[i] instanceof enemy){
                    console.log(turnOrder.length);
                    turnOrder[i].takeDamage(selectedAction.damage);
                }
            }
        }
    }
    else{
        if(this.hasOwnProperty('enemyIndex')){
            enemies[this.enemyIndex].takeDamage(selectedAction.damage);
        } 
        else if (this.hasOwnProperty('playerIndex')){
            players[this.playerIndex].takeDamage(selectedAction.damage);
        }
    }

    if(selectedAction instanceof item){
        selectedAction.quantity--;
        if(selectedAction.quantity <= 0){
            items.splice(items.indexOf(selectedAction), 1)
        }        
    }

    if(selectedAction.damage > 0){
        playSound("hit");
    }
    else{
        playSound("heal");
    }
    selectedAction.cooldownTimer = selectedAction.cooldown;
    combatSlots.parent.removeChild(combatSlots);
    nextTurn();
}

/*
Adds an item to the player's inventory. If an item of the same name exists, updates the quantity. 
Called by: various
*/
function addItem(toAdd){
    for(i = 0; i < items.length; i++){
        if(toAdd.name == items[i].name){
            items[i].quantity++;
            return;
        }
    }
    items[items.length] = toAdd;
}

/*
Performs all of the processing that happens between one turn to another, including handling level-up logic, removing killed
enemies, giving dialogue, updating the turn order, drawing, etc. 
Called by: performAction(), processEnemyTurn(), nextTurn(), changeScene()
Calls: playSound(), endCombat(), gameOver(), setCombatSlots, enemyTurnThink(),
drawTurnOrder(), drawPlayerInfo(), drawHealthBars()
*/
function nextTurn(){
    for(i = 0; i < turnOrder.length; i++){
        if(turnOrder[i].life <= 0){
            console.log("Removing " + turnOrder[i].name + " " + i);
            turnOrder[i].sprite.parent.removeChild(turnOrder[i].sprite);
            turnOrder.splice(i, 1);
        }
    }

    if(maniPlayer.XP >= maniPlayer.level * 100){
        maniPlayer.levelUp();
        playSound("LevelUp");
    }
    if(gabePlayer.XP >= gabePlayer.level * 100){
        gabePlayer.levelUp();
        playSound("LevelUp");
    }

    if(combatUISprite.parent != null){
        combatUISprite.parent.removeChild(combatUISprite);
    }
    if(combatMessages.length > 0){
        combatUISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
        combatUISprite.scale.set(4, 4);
        combatUISprite.x = 600 - (combatUISprite.width / 2);
        combatUISprite.y = 800 - 10 - combatUISprite.height;
        combatUISprite.buttonMode = true;
        combatUISprite.interactive = true;
        combatUISprite.on('pointerdown', combatUIButtonPress);

        style.wordWrapWidth = combatUISprite.width - 20;
        textString = combatMessages[0];
        combatMessages.splice(0, 1);
        let combatUIText = new PIXI.Text(textString, style);
        combatUIText.x = 2.5;
        combatUIText.y = 2.5;
        combatUIText.scale.set(0.25, 0.25);
        combatUISprite.addChild(combatUIText);

        scene5.addChild(combatUISprite);
        return;
    }

    hasPlayers = false;
    hasEnemies = false;
    for(i = 0; i < turnOrder.length; i++){
        if(turnOrder[i] instanceof player){
            hasPlayers = true;
        }
        else{
            hasEnemies = true;
        }
    }

    if(hasEnemies == false){
        endCombat();
        return;
    }
    else if(hasPlayers == false){
        gameOver();
        return;
    }

    turnIndex++;
    if(turnIndex >= turnOrder.length){
        turnIndex = 0;
    }
    drawTurnOrder();
    drawPlayerInfo();
    drawHealthBars();

    for(i = 0; i < turnOrder[turnIndex].attacks.length; i++){
        turnOrder[turnIndex].attacks[i].cooldownTimer--;
    }
    if(turnOrder[turnIndex] instanceof player){
        setCombatSlots(turnOrder[turnIndex].attacks);
    } else {
        enemyTurnThink(30);
    }
}

/*
Allows the combat dialogue buttons to make noise on click. 
Called by: nextTurn()
Calls: playSound(), nextTurn()
*/
function combatUIButtonPress(){
    playSound("UI");
    nextTurn();
}

/*
Slows down the excecution of enemies so that they appear to process their actions, instead of taking them immediatley after the player. 
Arguments: the time that the program should be slowed down by.
Called by: nextTurn()
Calls: processEnemyTurn()
*/
function enemyTurnThink(timeToThink){
    let thinkTimer = 0;
    const thinkTicker = new PIXI.Ticker
    thinkTicker.start();
    thinkTicker.add(() => {
        if(thinkTimer++ > timeToThink){
            processEnemyTurn();
            thinkTicker.destroy();
        }
    });
}

/*
Handles the enemy AI by allowing them to randomly choose a cooled-down move from their move pool and excecuting it on the 
most appropriate (or occaisionally random) target.
Called by: enemyTurnThink()
Calls: takeDamage(), nextTurn(), playSound()
*/
function processEnemyTurn(){
    outputString = "";
    potentialAttacks = [];
    attackTarget = null;
    for(i = 0; i < turnOrder[turnIndex].attacks.length; i++){
        currentAttack = turnOrder[turnIndex].attacks[i];
        if(currentAttack.cooldownTimer < 0){
            potentialAttacks[potentialAttacks.length] = currentAttack;
        }
    }
    
    if(potentialAttacks.length <= 0){
        outputString = turnOrder[turnIndex].name + " was unable to attack this turn...";
    }
    else{
        randomIndex = Math.floor(potentialAttacks.length * Math.random());
        chosenAttack = potentialAttacks[randomIndex];
        potentialTargets = [];
        if(chosenAttack.enemyTeam == true){
            for(i = 0; i < turnOrder.length; i++){
                if(turnOrder[i] instanceof enemy){
                    potentialTargets[potentialTargets.length] = turnOrder[i];
                }
            }
            //Choose lowest health percentage for healing.
            for(i = 0; i < potentialTargets.length; i++){
                if(attackTarget == null || (potentialTargets[i].life / potentialTargets[i].maxLife > 
                attackTarget.life / attackTarget.maxLife)){
                    attackTarget = potentialTargets[i];
                }
            }
        } else if(chosenAttack.playerTeam == true){
            for(i = 0; i < turnOrder.length; i++){
                if(turnOrder[i] instanceof player){
                    potentialTargets[potentialTargets.length] = turnOrder[i];
                }
            }
            if(Math.random() > 0.7) { // 70% chance to hit lowest health percent.
                for(i = 0; i < potentialTargets.length; i++){
                    if(attackTarget == null || (potentialTargets[i].life / potentialTargets[i].maxLife > 
                    attackTarget.life / attackTarget.maxLife)){
                        attackTarget = potentialTargets[i];
                    }
                }
            }
            else{ //or act randomly
                attackTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            }
        }

        if(attackTarget == null){
            outputString = turnOrder[turnIndex].name + " was unable to attack this turn...";
        }
        else if(chosenAttack.attacksAll){
            if(chosenAttack.playerTeam == true && chosenAttack.enemyTeam == true){
                outputString = turnOrder[turnIndex].name + " used " + chosenAttack.name
                + " for " + chosenAttack.damage + " damage on everyone!";
                for(i = 0; i < turnOrder.length; i++){
                    turnOrder[i].takeDamage(chosenAttack.damage);
                }
                chosenAttack.cooldownTimer = chosenAttack.cooldown;
            }
            else if (chosenAttack.playerTeam == true){
                outputString = turnOrder[turnIndex].name + " used " + chosenAttack.name
                + " for " + chosenAttack.damage + " damage on the player team!";
                for(i = 0; i < turnOrder.length; i++){
                    if(turnOrder[i] instanceof player){
                        turnOrder[i].takeDamage(chosenAttack.damage);
                    }
                }
                chosenAttack.cooldownTimer = chosenAttack.cooldown;
            }
            else if (chosenAttack.enemyTeam == true){
                outputString = turnOrder[turnIndex].name + " used " + chosenAttack.name
                + " for " + chosenAttack.damage + " damage on the enemy team!";
                for(i = 0; i < turnOrder.length; i++){
                    if(turnOrder[i] instanceof enemy){
                        turnOrder[i].takeDamage(chosenAttack.damage);
                    }
                }
                chosenAttack.cooldownTimer = chosenAttack.cooldown;
            }
            else{
                outputString = turnOrder[turnIndex].name + " was unable to attack this turn...";
            }
        } 
        else {
            outputString = turnOrder[turnIndex].name + " used " + chosenAttack.name
            + " for " + chosenAttack.damage + " damage on " + attackTarget.name;
            attackTarget.takeDamage(chosenAttack.damage);
            chosenAttack.cooldownTimer = chosenAttack.cooldown;
        }
    }
    combatMessages[combatMessages.length] = outputString;
    if(chosenAttack.damage > 0){
        playSound("hit");
    }
    else{
        playSound("heal");
    }
    nextTurn();
}

/*
Draws the sprites that show the order of combat. 
Called by: nextTurn()
*/
function drawTurnOrder(){
    turnSlots.removeChildren();
    drawn = 0;
    for(i = turnIndex; (drawn < turnOrder.length && drawn < 5); i++){
        if(i >= turnOrder.length){
            i = 0;
        }
        slot = new PIXI.Sprite(uiSlotTexture);
        slot.scale.set(2, 2);
        slot.x = 600 + ((drawn - parseInt(drawn / 5) * 5) - 2.5) * (10 + slot.width);
        slot.y = 10 + slot.height;
        turnSlots.addChild(slot);

        sprite = new PIXI.Sprite(turnOrder[i].texture);
        proportion = sprite.height / sprite.width;
        sprite.width = slot.width / 2;
        sprite.height = sprite.width * proportion;
        squareMask = new PIXI.Graphics()
        .beginFill(0xFFFFFF)
        .drawRect(slot.x, slot.y, slot.width, slot.height)
        .endFill();
        sprite.mask = squareMask;
        slot.addChild(sprite);

        drawn++;
    }
    scene5.addChild(turnSlots);
}

/*
Draws health bars and limited entity information during combat.
Called by: nextTurn()
*/
function drawHealthBars(){
    healthBars.removeChildren();
    for(i = 0; i < turnOrder.length; i++){
        targetSprite = turnOrder[i].sprite;
        if(targetSprite == null) { continue; }
        background = new PIXI.Graphics()
        .beginFill(0x000000)
        .drawRect(targetSprite.x - 25, targetSprite.y, targetSprite.width + 50, -50)
        .endFill();
        background.alpha = 0.5;
        healthBars.addChild(background);

        infoText = new PIXI.Text("Lvl. " + turnOrder[i].level + " " + turnOrder[i].name);
        infoText.x = targetSprite.x - 20;
        infoText.y = targetSprite.y - 45;
        infoText.style.fontSize = 12;
        infoText.style.fill = 0xffffff;
        healthBars.addChild(infoText);

        line = new PIXI.Graphics()
        .beginFill(0x000000)
        .drawRect(targetSprite.x - 20, targetSprite.y, targetSprite.width + 40, -20)
        .endFill();
        healthBars.addChild(line);

        healthPercent = turnOrder[i].life / turnOrder[i].maxLife;
        if(healthPercent < 0){ healthPercent = 0; }
        healthLine = new PIXI.Graphics()
        .beginFill(0xff0000)
        .drawRect(targetSprite.x -19.5, targetSprite.y + 0.1, (targetSprite.width + 40) * healthPercent, -19.8)
        .endFill();
        healthBars.addChild(healthLine);

        healthText = new PIXI.Text(turnOrder[i].life + "/" + turnOrder[i].maxLife);
        healthText.x = targetSprite.x - 20;
        healthText.y = targetSprite.y - 20;
        healthText.style.fontSize = 20;
        healthText.style.fill = 0xffffff;
        healthBars.addChild(healthText);
    }
}

/*
Draws an info screen detailing player information during the player's turn.
Called by: nextTurn()
*/
function drawPlayerInfo(){
    playerInfo.removeChildren();
    if(turnOrder[turnIndex] instanceof player){
        box = new PIXI.Graphics()
        .lineStyle(2, 0xffffff, 1)
        .beginFill(0x000000)
        .drawRect(turnOrder[turnIndex].sprite.x - 20, turnOrder[turnIndex].sprite.y, -160, 120)
        .endFill();
        playerInfo.addChild(box);

        text = new PIXI.Text("Name: " + turnOrder[turnIndex].name);
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);

        text = new PIXI.Text("Power: " + turnOrder[turnIndex].power + "%");
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y + 20;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);

        text = new PIXI.Text("Max Health: " + turnOrder[turnIndex].maxLife);
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y + 40;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);
        
        text = new PIXI.Text("XP: " + turnOrder[turnIndex].XP);
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y + 60;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);

        text = new PIXI.Text("Level: " + turnOrder[turnIndex].level);
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y + 80;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);

        text = new PIXI.Text("Next level XP: " + turnOrder[turnIndex].level * 100);
        text.x = turnOrder[turnIndex].sprite.x - 175;
        text.y = turnOrder[turnIndex].sprite.y + 100;
        text.style.fontSize = 18;
        text.style.fill = 0xffffff;
        box.addChild(text);
    }
}

/*
Performs the clean-up after the battle. Additionally calls gameWon after the specific circumstances of the boss battle. 
Called By: nextTurn()
Calls: gameWon(), returnToLastSCene()
*/
function endCombat(){
    combatUISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    combatUISprite.scale.set(4, 4);
    combatUISprite.x = 600 - (combatUISprite.width / 2);
    combatUISprite.y = 800 - 10 - combatUISprite.height;
    combatUISprite.buttonMode = true;
    combatUISprite.interactive = true;
    combatUISprite.on('pointerdown', returnToLastScene);

    style.wordWrapWidth = combatUISprite.width - 20;
    let combatUIText = new PIXI.Text("You have defeated your enemy!", style);
    combatUIText.x = 2.5;
    combatUIText.y = 2.5;
    combatUIText.scale.set(0.25, 0.25);
    combatUISprite.addChild(combatUIText);

    if(currentOverworldEnemy != null && currentOverworldEnemy.parent != null){
        currentOverworldEnemy.parent.removeChild(currentOverworldEnemy);
        currentSceneObjects.splice(currentSceneObjects.indexOf(currentOverworldEnemy), 1);
    }
    else{
        gameWon();
    }

    scene5.addChild(combatUISprite);
}

/*
Draws the death screen of the game.
Called by: nextTurn()
Calls: restart()
*/
function gameOver(){
    changeScene("death");

    deathScreen.removeChildren();
    const ashes = new PIXI.ParticleContainer(400, {
        scale: true,
        position: true,
        rotation: true,
        uvs: true,
        alpha: true,
    });
    for(i = 0; i < 400; i++){
        ash = new PIXI.Sprite.from("resources/drawable/dust.png");
        ash.distance = 0.2 + (Math.random() * 0.8);
        ash.turningSpeed = Math.random() - 0.5;
        ash.anchor.set(0.5);
        ash.scale.set(ash.distance);
        ash.position.x = Math.random() * 1200;
        ash.position.y = Math.random() * 800;
        random = Math.random();
        if(random > 0.4){
            ash.tint = "0x707070";
        } else if (random > 0.8){
            ash.tint = "0x606060";
        } else{
            ash.tint = "0x808080";
        }
        ash.direction = 1 - (Math.random() * 2);
        ashes.addChild(ash);
    }
    deathScreen.addChild(ashes);
    const deathParticles = new PIXI.ParticleContainer(400, {
        scale: true,
        position: true,
        rotation: true,
        uvs: true,
        alpha: true,
    });
    for(i = 0; i < 300; i++){
        particle = new PIXI.Sprite.from("resources/drawable/spiral.png");
        particle.turningSpeed = Math.random();
        particle.xDir = 1 - (Math.random() * 2);
        particle.yDir = 1 - (Math.random() * 2);
        random = Math.random();
        particle.anchor.set(0.5);
        particle.position.x = 600 + particle.xDir * 10 * random;
        particle.position.y = 400 + particle.yDir * 10 * random;
        particle.alpha = random;
        particle.tint = "0xff2222";
        deathParticles.addChild(particle);
    }
    deathScreen.addChild(deathParticles);
    
    endUISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    endUISprite.scale.set(4);
    endUISprite.x = 600 - (endUISprite.width / 2);
    endUISprite.y = 800 - 10 - endUISprite.height;
    endUISprite.buttonMode = true;
    endUISprite.interactive = true;
    endUISprite.alpha = 1;
    endUISprite.on('pointerdown', restart);

    style.wordWrapWidth = endUISprite.width - 20;
    endUIText = new PIXI.Text("You have been defeated your enemy! \nPress here to restart your journey...", style);
    endUIText.x = 2.5;
    endUIText.y = 2.5;
    endUIText.scale.set(0.25, 0.25);
    endUISprite.addChild(endUIText);
    deathScreen.addChild(endUISprite);

    mani = new PIXI.Sprite(maniIdleTexture);
    mani.scale.set(6);
    mani.anchor.set(0.5);
    mani.position.set(600, 400);
    if(gabeFollow){
        gabe = new PIXI.Sprite(gabeIdleTexture);
        gabe.scale.set(-6, 6);
        gabe.anchor.set(0.5);
        gabe.position.set(575, 400);
        deathScreen.addChild(gabe);
        mani.x = 625;
    }
    deathScreen.addChild(mani);

    app.ticker.add(() => {
        if(app.stage != deathScreen) { return; }
        // iterate through the sprites and update their position
        ashes.children.forEach(function(child){;
            child.rotation += child.direction * 0.01;
            child.x += 0.5 * (child.distance * 0.5);
            child.y += 0.5 * (child.distance);
            if(child.x > 1200){
                child.x = 0 - child.width;
            }
            if(child.y > 800){
                child.y = 0 - child.height;
            }
        });
        deathParticles.children.forEach(function(child){
            child.x += child.xDir;
            child.y += child.yDir;
            child.rotation += child.turningSpeed;
            child.alpha -= 0.01 * Math.random();
            if(child.alpha <= 0.02){
                child.xDir = 1 - (Math.random() * 2);
                child.yDir = 1 - (Math.random() * 2);
                child.position.x = 600
                child.position.y = 400;
                child.turningSpeed = Math.random();
                child.alpha = 1;
            }
        });
    });
}

/*
Draws the win screen of the game.
Called by: endCombat()
Calls: returnToMenu()
*/
function gameWon(){
    changeScene("win");

    winScreen.removeChildren();
    const winParticles = new PIXI.ParticleContainer(400, {
        scale: true,
        position: true,
        rotation: true,
        uvs: true,
        alpha: true,
    });
    for(i = 0; i < 300; i++){
        particle = new PIXI.Sprite.from("resources/drawable/spiral.png");
        particle.turningSpeed = Math.random();
        particle.xDir = 1 - (Math.random() * 2);
        particle.yDir = 1 - (Math.random() * 2);
        random = Math.random();
        particle.anchor.set(0.5);
        particle.position.x = 600 + particle.xDir * 10 * random;
        particle.position.y = 400 + particle.yDir * 10 * random;
        particle.alpha = random;
        particle.tint = "0x00ff00";
        winParticles.addChild(particle);
    }
    winScreen.addChild(winParticles);


    endUISprite = new PIXI.Sprite.from("resources/drawable/UIBox.png");
    endUISprite.scale.set(4);
    endUISprite.x = 600 - (endUISprite.width / 2);
    endUISprite.y = 800 - 10 - endUISprite.height;
    endUISprite.buttonMode = true;
    endUISprite.interactive = true;
    endUISprite.alpha = 1;
    endUISprite.on('pointerdown', returnToMenu);

    style.wordWrapWidth = endUISprite.width - 20;
    endUIText = new PIXI.Text("Congratulations! You have beaten the Game.. \nClick here to return to the main menu.", style);
    endUIText.x = 2.5;
    endUIText.y = 2.5;
    endUIText.scale.set(0.25, 0.25);



    jiji = new PIXI.Sprite.from("resources/drawable/jiji.png");
    jiji.scale.set(6);
    jiji.anchor.set(0.5);
    jiji.position.set(590, 300);
    mani = new PIXI.Sprite(maniIdleTexture);
    mani.scale.set(6);
    mani.anchor.set(0.5);
    mani.position.set(625, 400);
    gabe = new PIXI.Sprite(gabeIdleTexture);
    gabe.scale.set(-6, 6);
    gabe.anchor.set(0.5);
    gabe.position.set(575, 400);
    winScreen.addChild(jiji);
    winScreen.addChild(gabe);    
    winScreen.addChild(mani);
    endUISprite.addChild(endUIText);
    winScreen.addChild(endUISprite);

    app.ticker.add(() => {
        if(app.stage != winScreen) { return; }
        winParticles.children.forEach(function(child){
            child.x += child.xDir;
            child.y += child.yDir;
            child.rotation += child.turningSpeed;
            child.alpha -= 0.01 * Math.random();
            if(child.alpha <= 0.02){
                child.xDir = 1 - (Math.random() * 2);
                child.yDir = 1 - (Math.random() * 2);
                child.position.x = 600
                child.position.y = 400;
                child.turningSpeed = Math.random();
                child.alpha = 1;
            }
        });
    });
}

/*
on-click utility method for returning to the main menu. 
Called by: gameWon()
Calls: changeScene()
*/
function returnToMenu(){
    changeScene("menu");
}