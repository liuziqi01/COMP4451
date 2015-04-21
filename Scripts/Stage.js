var Stage = function()
{
   
}
var FPS = 60; // max = 60 as limited by the requestAnimationFrame()

/* coordinate conversion */
var SPACE_SIZE = 10; // the game field is a $SPACE_SIZE by $SPACE_SIZE by $SPACE_SIZE cube. and make sure this is always an even number
                     // and note the range of the coordinate is [0, SPACE_SIZE - 1]
var UNIT_STEP = 40; // the edge length of each unit box


Physijs.scripts.worker = '/Script/physijs_worker.js';
Physijs.scripts.ammo = '/Script/ammo.js';


/* timing */
// the scale of the return value is ms
var timer = new Date();
var current_time = 0;
var last_time = 0;
var timeDiff = 0;
this.stop = false;
/* environment */
var CONTAINER, CAMERA, SCENE, RENDERER;
//var TRACKBALL_CONTROL;
var BACKGROUND_SCENE,BACKGROUND_CAMERA;



var sphere;
var OBJECTS = [];
var grids=[];
var materialArray=[];

/*interaction*/
var keyboard = new KeyboardState(); // the keyboard polling
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var mouse_click = false;
var simulation = false;
var blockType =0;
var sphere_simulation;






/* Game Initialization */
Stage.prototype.init= function(event) {

	/************** BASIC ELEMENTS **************/

	/* validate the FPS */
	if (FPS > 60)
		FPS = 60;
    else if (FPS < 0)
        FPS = 0;

    
    /* CONTAINER setup */
    CONTAINER = document.getElementById( "game" );
  
   	/* RENDERER setup */
    RENDERER = new THREE.WebGLRenderer();
    RENDERER.setPixelRatio( window.devicePixelRatio );
    RENDERER.setSize( window.innerWidth, window.innerHeight );
    CONTAINER.appendChild( RENDERER.domElement );

    /* SCENE with gravity */
    SCENE = new Physijs.Scene;
    SCENE.setGravity(new THREE.Vector3( 0, - SPACE_SIZE / 2 * UNIT_STEP - 1, 0 ));
    SCENE.addEventListener(
        'update',
        function() {
            SCENE.simulate( undefined, 1 );
        }
    );

    /* background setup */
    var backgroundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2, 0),
        new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture( 'Images/blue.png'),opacity:0.8,transparent: false
        }));

    backgroundMesh.material.depthTest = false;
    backgroundMesh.material.depthWrite = false;
    BACKGROUND_SCENE = new THREE.Scene();
    BACKGROUND_CAMERA = new THREE.Camera();
    BACKGROUND_SCENE.add(BACKGROUND_CAMERA );
    BACKGROUND_SCENE.add(backgroundMesh );
    

    /* CAMERA setup */
    CAMERA = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000 );
    CAMERA.position.set( 0, UNIT_STEP * SPACE_SIZE * 0.75,  UNIT_STEP * SPACE_SIZE * 1.2 );
    //CAMERA.lookAt(new THREE.Vector3(0,( 0 - SPACE_SIZE / 2 + 0.5) * UNIT_STEP,0));
 CAMERA.lookAt(new THREE.Vector3(0,0,0));

/*
    /* Trackball Control setup 
  	TRACKBALL_CONTROL = new THREE.TRACKBALL_CONTROLs( CAMERA, RENDERER.domElement );
  	TRACKBALL_CONTROL.minDistance = 200;
 	TRACKBALL_CONTROL.maxDistance = 500;
*/

 	/* Lights setup */
    SCENE.add( new THREE.AmbientLight( White ) );

	/************** Objcets **************/

    sphere = new THREE.Mesh(new THREE.SphereGeometry(13,10,10), new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'Images/basketball.jpg') }));
    sphere.position.set(-1.5 * UNIT_STEP, 1.5 * UNIT_STEP, 2.5*UNIT_STEP);
    SCENE.add(sphere);
    
     
    // Ground
    ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(SPACE_SIZE * UNIT_STEP, 3 , SPACE_SIZE * UNIT_STEP),
        Physijs.createMaterial(new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.7,transparent: true}), 0, 1),
        0 // mass
    );
    ground.position.x=0;
    ground.position.y= ( 0 - SPACE_SIZE / 2 ) * UNIT_STEP;
    ground.position.z=0;
    ground.receiveShadow = true;
    SCENE.add(ground);


   /* grid */
   var grid = new THREE.Geometry();
for(var height = ( 0 - SPACE_SIZE / 2 ) * UNIT_STEP ; height < ( 0 + SPACE_SIZE/2 ) * UNIT_STEP; height = height + UNIT_STEP){
    for ( var i = 0; i <= SPACE_SIZE; ++i) {

       grid.vertices.push( new THREE.Vector3(      - SPACE_SIZE / 2 * UNIT_STEP,     height,      (i - SPACE_SIZE/2) * UNIT_STEP));
       grid.vertices.push( new THREE.Vector3(        SPACE_SIZE / 2 * UNIT_STEP,     height ,      (i - SPACE_SIZE/2 ) * UNIT_STEP ) );
       grid.vertices.push( new THREE.Vector3( (i - SPACE_SIZE /2  ) * UNIT_STEP,     height ,      - SPACE_SIZE / 2 * UNIT_STEP      ) );
       grid.vertices.push( new THREE.Vector3( (i - SPACE_SIZE / 2 ) * UNIT_STEP,     height,        SPACE_SIZE / 2 * UNIT_STEP      ) );
        
    }
    if(height == ( 0 - SPACE_SIZE / 2) * UNIT_STEP )
	var material = new THREE.LineBasicMaterial( { color: 0x000000,transparent: false} );
    else 
	var material = new THREE.LineBasicMaterial( { color: 0xf8f8f8 ,transparent: true} );
    var line = new THREE.Line( grid, material, THREE.LinePieces );
    SCENE.add( line );


    var frame = new THREE.Mesh( new THREE.BoxGeometry(UNIT_STEP*SPACE_SIZE ,1, UNIT_STEP * SPACE_SIZE),new THREE.MeshBasicMaterial() );
    frame.visible = false;
    frame.position.x = 0;
    frame.position.z = 0;
    frame.position.y = (height / UNIT_STEP) * UNIT_STEP;
    SCENE.add(frame);
    grids.push(frame);
}


    var box_material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'Images/crate.jpg') }),
            80, // friction coefficient
            .0 // e
            // note the construction material should be solid and not bounce at all
        );
    materialArray.push(box_material);

    var diamond_material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'Images/diamondTexture.png') }),
            0, // friction coefficient
            .0 // e
            // note the construction material should be solid and not bounce at all
        );
    materialArray.push(diamond_material);

    var gold_material = Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'Images/goldTexture.png') }),
            0, // friction coefficient
            .0 // e
            // note the construction material should be solid and not bounce at all
        );
    materialArray.push(gold_material);
    


    /* timer */
    last_time = timer.getTime();


      requestAnimationFrame(animate);

document.getElementById("selectButtonBox").addEventListener("click", function(){
    blockType = 0;
});
document.getElementById("selectButtonDiamond").addEventListener("click", function(){
    //console.log("diamond Selected");
    blockType = 1;
});
document.getElementById("selectButtonGold").addEventListener("click", function(){
    //console.log("diamond Selected");
    blockType = 2;
});
    
}


 function putBoxbyMouse(mouse,blockType)
{
   var intersections = raycaster.intersectObjects(grids);
   var intersection = ( intersections.length ) > 0 ? intersections[ 0 ].point : null;
if(intersection) 
{
var box;



if(blockType ==2)
{
    console.log("HERE");
  box = new Physijs.BoxMesh(
        new THREE.BoxGeometry( UNIT_STEP, UNIT_STEP, UNIT_STEP),

        materialArray[blockType],
        0 // mass
    );
console.log("there");
var handleCollision = function( collided_with, linearVelocity, angularVelocity ) {
	    collided_with.setLinearVelocity(collided_with.getLinearVelocity().multiplyScalar(1.1));
	};
box.addEventListener('collision',handleCollision);
}
else{
   box = new Physijs.BoxMesh(
        new THREE.BoxGeometry( UNIT_STEP, UNIT_STEP, UNIT_STEP),
        materialArray[blockType],
        0 // mass
    );}

    box.position.set(
        (Math.round(intersection.x/UNIT_STEP) -0.5) *UNIT_STEP,
        (Math.round(intersection.y/UNIT_STEP)+0.5)*UNIT_STEP,
        (Math.round(intersection.z/UNIT_STEP)-0.5)*UNIT_STEP
    );
    box.castShadow = true;
    SCENE.add( box );

OBJECTS.push(box);


}
}

function animate(){
	/* looping */
    //setTimeout(function() {
        requestAnimationFrame(animate);

        // timer
        current_time = timer.getTime();
        timeDiff = current_time - last_time;
        last_time = current_time;


    	/* User Control */
 //		TRACKBALL_CONTROL.update();

  SCENE.simulate();
      
        //select the mouse clicked object
        raycaster.setFromCamera( mouse, CAMERA );


    if(mouse_click)
{
putBoxbyMouse(mouse,blockType);
mouse_click=false;

}

if(simulation){
console.log(sphere_simulation.getLinearVelocity().x);
sphere._dirtyPosition = true;
CAMERA.position.set(sphere_simulation.position.x -50, sphere_simulation.position.y + 50,sphere_simulation.position.z);
CAMERA.lookAt(sphere_simulation.position);
}

if(!this.stop){
		/* refresh frame */
        RENDERER.autoClear = false;
        RENDERER.clear();
        RENDERER.render(BACKGROUND_SCENE , BACKGROUND_CAMERA );
        RENDERER.render(SCENE, CAMERA);
        // render_stats.update();
        keyboard.update();
    }
else delete keyboard;
    //}, 1000 / FPS);    
}


Stage.prototype.stop= function()
{
    this.stop = true;
}