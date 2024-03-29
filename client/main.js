//global socket
var socket = io.connect();

//configure canvas to screen size
//canvasWidth = window.innerWidth * window.devicePixelRatio; 
//canvasHeight = window.innerHeight * window.devicePixelRatio;
canvasHeight = 750;
canvasWidth = 1000;

//The actual phaser game
//Create the game, first two arguments are its resolution
//third is the renderer to be used
//last is the DOM element the game will live in
game = new Phaser.Game(canvasWidth, canvasHeight, Phaser.CANVAS,
	'gameDiv');

//game properties
var gameProperties = {
	gameElement: "gameDiv",
	gameWidth: 750,
	gameHeight: 1000,
	inGame: false,
	//Settings for movement speed and force
	maxAngle: 90,
	speed: 4,
	maxScale: 5,
	scaleSpeed: 6,
	maxForce: 5,
	name,
};

var PlayerState = {
	ANGLE: 1,
	POWER: 2,
	FORCE: 3,
	BLOCKED: 4,
};

var enemies = [];

//game state
var main = function(game){
};

//splash page (name selection) state
var splash = function(game){
};

//When connected to the server, log it, create a new object
//for the player to control, and then tell the server
function onSocketConnected() {
	console.log("Connected to server");
	createPlatforms();
	createPlayer();
	gameProperties.inGame = true;
	socket.emit('newPlayer', {x: 0, y: 0, name: gameProperties.name});
};


//We've lost connection with the server!
function onSocketDisconnect() {
	console.log("Lost connection with server!");

};

//When the server notifies the client an enemy has disconnected,
//search for it in the enemies list and stop rendering it
function onEnemyDisconnect(data) {
	var index;
	for(i = 0; i < enemies.length; i++) {
		if(enemies[i].id == data) {
			index = i;
		}
	}

	console.log("destroying");
	if(enemies.length > 0){
		enemies[index].destroy();
		enemies.splice(index, 1);
	}
}

//Create the client player. 
function createPlayer() {
	//adding graphics at a point on the plane
	var box = game.add.graphics(500, 0);
	
	//draws the box
	box.lineStyle(2, 0x0000FF, 1);
	box.beginFill(0xffd900);
	box.drawRect(-25, -25, 50, 50);
	box.endFill();

	//create sprite from the drawn graphics
	player = game.add.sprite(500, 700, box.generateTexture());
	player.anchor.set(0.5);

	//player.anchor.setTo(0.5, 0.5)
	game.physics.enable(player, Phaser.Physics.ARCADE);
	player.body.collideWorldBounds = true;

	//Anchor arrow as a child to the player
	arrow = game.add.sprite(0,-20, 'arrow');
	arrow.scale.setTo(2,2);
	arrow.anchor.set(0.5, 1);
	//Direction for arrow rotation
	arrow.dir = -1;
	//Power percentage threshold for movement
	arrow.power = 10;
	player.addChild(arrow);	
	//Adds the player state enum property, to determine what
	//phase of movement the player object is in
	player.moveState = PlayerState.ANGLE;

	box.destroy();
}

//function to create a new enemy
function createEnemy(startx, starty, id, name) {
  //adding graphics at a point on the plane
  var box = game.add.graphics(500, 600);
  //draws the box
  box.lineStyle(2, 0x0000FF, 1);
  box.beginFill(0xD10A0A);
  box.drawRect(-25, -25, 50, 50);
  box.endFill();

  //create sprite from the drawn graphics
  var enemy = game.add.sprite(startx, starty, box.generateTexture());

  //create the text for the name
  var style = { font: "16px Arial", fill: "#000000", wordWrap: true, wordWrapWidth: 70, align: "center" };
  var text = game.add.text(0,0, name, style);
  text.anchor.set(0.5);
  enemy.addChild(text);

  enemy.anchor.set(0.5);
  enemy.id = id;
  enemies.push(enemy);

  box.destroy();
}

//when a new enemy's data is passed from the server, 
//we need to create it in the game world.
function onNewEnemy(data) {
  //enemy position and id for testing
  console.log(data.x, data.y, data.id);
  console.log("New player " + data.id + " detected");
  createEnemy(data.x, data.y, data.id, data.name);
}

function onEnemyMovement(data) {
  //Find the correct enemy in the list. Once found update its sprite's position
  for(i = 0; i < enemies.length; i++){
    if(enemies[i].id == data.id){
      enemies[i].x = data.x;
      enemies[i].y = data.y;
    }
  }
}

function onEnemyScore(data) {
	console.log(data + "scored a point!");
}

function createPlatforms() {
	platforms = game.add.group();
	platforms.enableBody = true;
	
	var ground = platforms.create(0, 725, 'block');
	ground.scale.setTo(500, 1);
	ground.body.immovable = true;
	ground.body.allowGravity = false;	

	var platform = platforms.create(250, 600, 'block');
	platform.scale.setTo(4, 1);
	platform.body.immovable = true;
	platform.body.allowGravity = false;

	platform = platforms.create(600, 600, 'block');
	platform.scale.setTo(4, 1);
	platform.body.immovable = true;
	platform.body.allowGravity = false;

	platform = platforms.create(100, 400, 'block');
	platform.scale.setTo(4, 1);
	platform.body.immovable = true;
	platform.body.allowGravity = false;

	platform = platforms.create(800, 400, 'block');
	platform.scale.setTo(4, 1);
	platform.body.immovable = true;
	platform.body.allowGravity = false;

	winningPlatform = platforms.create(450, 200, 'block');
	winningPlatform.scale.setTo(4, 1);
	winningPlatform.body.immovable = true;
	winningPlatform.body.allowGravity = false;
}

//This contains the preload, create, and update functions
main.prototype = {
	//preload function should load all assets required for the game
	preload: function() {
		game.load.image('block', 'client/assets/block.png');
		game.load.image('arrow', 'client/assets/arrow.png');
		//physics engine for the game, we're using arcade physics
		game.physics.startSystem(Phaser.Physics.ARCADE);
		//y gravity
		game.physics.arcade.gravity.y = 300;
	},

	create: function() {
		console.log("client started");
		console.log("My name is: " + gameProperties.name);
		socket.on("connect", onSocketConnected());
		socket.on("disconnect", onSocketDisconnect);
    socket.on("newEnemy", onNewEnemy);
    socket.on("enemyMovement", onEnemyMovement);
    socket.on("playerDisconnect", onEnemyDisconnect);
    socket.on("enemyScored", onEnemyScore);
		//set background color
		game.stage.backgroundColor = "#4488AA";
    //allows the game to continue rendering when losing focus from browser
		game.stage.disableVisibilityChange = true;
		//Adds listener to client\player.js playerMove function
		game.input.onDown.add(changeState, this);
		won = false;
	},

	update: function() {
		//allows collisions between the player and platforms
		var collision = game.physics.arcade.collide(player, platforms);
		//check for a player hitting the top platform and scoring a point
		if(won == false){ 
				if(winningPlatform.body.touching.up == true) {
					console.log("You scored a point!");
					socket.emit("playerScore", gameProperties.name);
					player.x = 500;
					player.y = 650;
			}
		}
		playerMove();

    //Tell the server we have moved
    socket.emit("playerMovement", {x: player.x, y: player.y});
	}
}

splash.prototype = {
	//preload function should load all assets required for the game
	preload: function() {
		game.load.image('splash', 'client/assets/splash.png');
	},

	create: function() {
		game.input.onDown.add(chooseName, this);
		logo = game.add.sprite(300,200, 'splash');
		logo.scale.setTo(1,1);
		logo.anchor.set(0.5);
		var style = { font: "40px Arial", fill: "#000000", align: "center" };
		game.add.text (300,400, 'Click anywhere to begin!', style);
		//set background color
		game.stage.backgroundColor = "#C62917";
    //allows the game to continue rendering when losing focus from browser
    game.stage.disableVisibilityChange = true;
	},

	update: function() {
	}
}

function chooseName(){
	var name = prompt("What is your name?");
	(name === "") ? gameProperties.name = "Anonymous" : gameProperties.name = name
	game.state.start('main');
}

var gameBootStrapper = {
	init: function(gameContainerElementID) {
		game.state.add('splash',splash);
		game.state.add('main', main);
		game.state.start('splash');
	}
};;

gameBootStrapper.init("gameDiv");
