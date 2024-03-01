/* 
 * CS 372 Final Project
 * Calvin University
 * Jason Chew, Daniel Kim
 * Feb. 2024
 * 3D Models provided by Quaternius: https://poly.pizza/u/Quaternius
 */

import * as THREE from 'three';
import { ColladaLoader } from 'ColladaLoader';
import { QuaterniusModel } from '../animation-class/QuaterniusModel.js';
import { SoundManager } from './SoundManager.js';
import { createWorldS, WORLDS_OFFSET_X } from '../world/worldStart.js';
import { createWorld1, LAND_BEGIN_X } from '../world/world1.js';
import { createWorld2, WORLD2_OFFSET_X } from '../world/world2.js';
import { createWorldF, WORLDF_OFFSET_X } from '../world/finalworld.js';

//=====< Global Variables >=====//
let scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer;
let kirby, kirbyModel;
let soundManager;
let targetPosition;
let isGameRunning = true;
let arrowUpPressed = false;
let canPlaySounds = true;
let isPaused = false;
let enablePause = false;
let hasPlayedClearSound = false;
let isGameClear = false;
let walkingAnimationIndex = 2;
let kirbyHP = 100;

const KIRBY_SIZE = 2.7;
const SMOOTHNESS = 0.05;
const CAMERA_SMOOTHNESS = 0.04;
const LAND_BEGIN = 5;
const LAND_END = -5;
const clock = new THREE.Clock();

// World Coordinates
const worldStartBoundaries = [WORLDS_OFFSET_X - 30, WORLDS_OFFSET_X + 35];
const world1Boundaries = [LAND_BEGIN_X - 5, LAND_BEGIN_X + WORLD2_OFFSET_X - 75];
const world2Boundaries = [LAND_BEGIN_X + WORLD2_OFFSET_X - 5, LAND_BEGIN_X + WORLDF_OFFSET_X + 45];
const finalWorldBoundaries = [LAND_BEGIN_X + WORLDF_OFFSET_X + 90, LAND_BEGIN_X + WORLDF_OFFSET_X + 175];
const starPosition = new THREE.Vector3(LAND_BEGIN_X + WORLDF_OFFSET_X + 135, 10, -5);

const tpPosList = [
    [new THREE.Vector3(WORLDS_OFFSET_X + 30, 7, 0), new THREE.Vector3(LAND_BEGIN_X, 7, 0)],
    [new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X - 80, 7, 0), new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X, 7, 0)],
    [new THREE.Vector3(LAND_BEGIN_X + WORLDF_OFFSET_X + 40, 7, 0), new THREE.Vector3(LAND_BEGIN_X + WORLDF_OFFSET_X + 95, 7, 0)]
];

const spikePosList = [
    // world1
    new THREE.Vector3(LAND_BEGIN_X + 60.5, 6, 0),
    new THREE.Vector3(LAND_BEGIN_X + 66.5, 6, 0),
    new THREE.Vector3(LAND_BEGIN_X + 60.5, 6, -5),
    new THREE.Vector3(LAND_BEGIN_X + 66.5, 6, -5),
    new THREE.Vector3(LAND_BEGIN_X + 60.5, 6, 5),
    new THREE.Vector3(LAND_BEGIN_X + 66.5, 6, 5),

    // world2
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 117.5, 61, 0),
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 122.5, 61, 0),
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 117.5, 61, -5),
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 122.5, 61, -5),
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 117.5, 61, 5),
    new THREE.Vector3(LAND_BEGIN_X + WORLD2_OFFSET_X + 122.5, 61, 5),
];

const colladaLoader = new ColladaLoader();

//=====< Set up the scene >=====//
function createScene() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    // Create the scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xFAF1E4, 100, 950);
    scene.fog.far = 900;

    // Create the camera
    fieldOfView = 75;
    aspectRatio = WIDTH / HEIGHT;
    nearPlane = 0.1;
    farPlane = 1000;
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );
    camera.rotateX(-Math.PI / 10);

    // Create the renderer
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', handleWindowResize, false);
}

//=====< Handle the window resize event >=====//
function handleWindowResize() {
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

//=====< Create Audio Files >=====//
function createAudio() {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    soundManager = new SoundManager(listener);

    // Load sounds
    // https://downloads.khinsider.com/game-soundtracks/album/kirby-super-star-ultra
    const sounds = [
        { name: 'jump', url: '../assets/audio/SE/jump.wav', options: { loop: false, volume: 0.9 }},
        { name: 'teleport', url: '../assets/audio/SE/teleport.wav', options: { loop: false, volume: 0.5 }},
        { name: 'select', url: '../assets/audio/SE/select.wav', options: { loop: false, volume: 0.5 }},
        { name: 'pause', url: '../assets/audio/SE/pause.wav', options: { loop: false, volume: 0.4 }},
        { name: 'damage', url: '../assets/audio/SE/damage.wav', options: { loop: false, volume: 0.7 }},
        { name: 'lowhp', url: '../assets/audio/SE/lowhp.wav', options: { loop: false, volume: 0.4 }},
        { name: 'die', url: '../assets/audio/SE/die.mp3', options: { loop: false, volume: 0.4 }},
        { name: 'dead', url: '../assets/audio/SE/dead.wav', options: { loop: false, volume: 0.3 }},
        { name: 'restingArea', url: '../assets/audio/BGM/recovery.mp3', options: { loop: true, volume: 0.8 }},
        { name: 'world1', url: '../assets/audio/BGM/greengreens.mp3', options: { loop: true, volume: 0.5 }},
        { name: 'world2', url: '../assets/audio/BGM/bubbyclouds.mp3', options: { loop: true, volume: 0.5 }},
        { name: 'finalWorld', url: '../assets/audio/BGM/end.mp3', options: { loop: false, volume: 0.2 }},
        { name: 'clear', url: '../assets/audio/BGM/clear.mp3', options: { loop: false, volume: 0.5 }},
    ];

    Promise.all(sounds.map(sound => 
        soundManager.loadSound(sound.name, sound.url, sound.options)
    )).then(() => {
        console.log("All sounds loaded");
        
    }).catch(err => console.error("Error loading sounds:", err));
}

let lastWorld = '';
function updateWorldMusic() {
    const newWorld = getCurrentWorld(kirby.position.x);
    if (newWorld !== lastWorld) {
        if (lastWorld) {
            setTimeout(() => soundManager.playSound(newWorld, true), 500);
            console.log('Playing', newWorld, 'music')
        } else {
            setTimeout(() => {
                soundManager.playSound(newWorld, true);
            }, 500);
        }
        lastWorld = newWorld;
    }
}

//=====< Add the lights >=====//
let hemisphereLight, dirLight1, dirLight2, ambientLight;
function createLights() {
    // gradient light: sky color - ground color - intensity
    hemisphereLight = new THREE.HemisphereLight(0xFFC0D9, 0x000000, 0.9)
    ambientLight = new THREE.AmbientLight(0xDCF2F1, 2);
    dirLight1 = new THREE.DirectionalLight(0xDCF2F1, 0.9);
    dirLight1.position.set(0, 300, -100);
    dirLight1.castShadow = true;
    dirLight2 = new THREE.DirectionalLight(0xDCF2F1, 0.9);
    dirLight2.position.set(0, 300, 200);
    dirLight2.castShadow = true;

    // Set the direction of the light
    dirLight1.shadow.camera.left = -100;
    dirLight1.shadow.camera.right = 100;
    dirLight1.shadow.camera.top = 100;
    dirLight1.shadow.camera.bottom = -100;
    dirLight1.shadow.camera.near = 1;
    dirLight1.shadow.camera.far = 500;

    // Set the resolution of the shadow map
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight2.shadow.mapSize.width = 2048;
    dirLight2.shadow.mapSize.height = 2048;

    // Add lights to scene
    scene.add(hemisphereLight);
    scene.add(dirLight1);
    scene.add(dirLight2);
}

//=====< Add Background >=====//
async function createBackground() {
    try {
        // Wrap the loader in a promise
        const loadModel = () => {
            return new Promise((resolve, reject) => {
                colladaLoader.load('../assets/model/forest/log_fix.dae', (collada) => {
                    resolve(collada); // Resolve the promise with the loaded model
                }, undefined, (error) => {
                    reject(error); // Reject the promise if there's an error
                });
            });
        };

        const collada = await loadModel();
        let dae = collada.scene;

        dae.scale.set(5, 5, 5);
        dae.position.set(-50, -30, -50);

        // To get rid of black bounding boxes
        dae.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.alphaTest = 0.5;
                if (child.material.map) {
                    child.material.map.needsUpdate = true;
                }
            }
        });

        // Bypass raycasting for the model
        dae.traverse((child) => {
            if (child.isMesh) {
                child.raycast = function () {};
            }
        });

        scene.add(dae);

    } catch (error) {
        console.error("Error loading model:", error);
    }
}

//=======< Add Kirby >=====//
async function createKirby() {
    try {
        let geometry = new THREE.SphereGeometry(KIRBY_SIZE, 32, 32);
        let material = new THREE.MeshPhongMaterial( {visible: false} );
        kirby = new THREE.Mesh(geometry, material);

        // Default Starting Position
        kirby.position.set(WORLDS_OFFSET_X, 7, 0);

        // Positions for debugging
        // kirby.position.set(LAND_BEGIN_X, 7, 0);
        // kirby.position.set(LAND_BEGIN_X + WORLD2_OFFSET_X, 7, 0);
        // kirby.position.set(LAND_BEGIN_X + WORLDF_OFFSET_X + 100, 7, 0);

        scene.add(kirby);

        // Positions to go to
        targetPosition = {
            x: kirby.position.x,
            y: kirby.position.y,
            z: kirby.position.z,
        };

        kirbyModel = new QuaterniusModel();
        await kirbyModel.load('../assets/model/kirby.glb', Math.PI/2);
        kirbyModel.cueAnimation(0, true, 0);

        // Inherits THREE.Object3D() methods
        kirbyModel.scale.set(0.03, 0.03, 0.03);

        kirbyModel.traverse((child) => {
            if (child.isMesh) {
                child.raycast = function () {};
            }
        });

        // Enable shadows
        kirbyModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        kirby.add(kirbyModel);
    } catch (error) {
        console.error("Error loading model:", error);
    }
}

//=====< Add Keyboard Interaction >=====//
const keyState = {};
window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp') {
        if (!arrowUpPressed) {
            // Allow only one keypress
            // https://stackoverflow.com/questions/5353254/javascript-onkeydown-event-fire-only-once
            if (event.repeat) return;
            arrowUpPressed = true;
            checkAndTeleportKirby();
        }
    } else {
        keyState[event.code] = true;
    }
    if (event.shiftKey) {
        kirbySpeed = baseKirbySpeed * 2; // Double the speed
        walkingAnimationIndex = 1;
        keyState[event.code] = true;
    } else {
        kirbySpeed = baseKirbySpeed; // Normal speed
        walkingAnimationIndex = 2;
        keyState[event.code] = true;
    }
});

window.addEventListener('keyup', (event) => {
    keyState[event.code] = false;
    if (event.code === 'ArrowUp') {
        arrowUpPressed = false;
    }
    kirbySpeed = baseKirbySpeed; // Reset speed
    if (event.shiftKey) {
        kirbyModel.cueAnimation(2, true, 0.3);
    }
    // Stop animation and reset to idle
    if(kirbyModel.lastAnimation != 0) {
        kirbyModel.stopAnimation(0.3);
        kirbyModel.cueAnimation(0, true, 0.3);
    }
});

// Function to handle keyboard input
const baseKirbySpeed = 0.15;
let kirbySpeed = baseKirbySpeed;
let onGround = true;
let yVelocity = 0;
const jumpSpeed = 0.55;
const gravity = 0.15;

function handleKeyboardInput(deltaTime, direction) {
    if (!kirby) return;
    if (keyState['KeyW']) {
        // TO DO: Maybe make a global variable for collision and only move kirby when there is no collision?
        targetPosition.z -= kirbySpeed * deltaTime * 100;
        direction.z -= baseKirbySpeed;
        if(kirbyModel.lastAnimation != walkingAnimationIndex) {
            kirbyModel.cueAnimation(walkingAnimationIndex, true, 0.2);
        }
    }
    if (keyState['KeyS']) {
        targetPosition.z += kirbySpeed * deltaTime * 100;
        direction.z += baseKirbySpeed;
        if(kirbyModel.lastAnimation != walkingAnimationIndex) {
            kirbyModel.cueAnimation(walkingAnimationIndex, true, 0.2);
        }
    }
    if (keyState['KeyA']) {
        targetPosition.x -= kirbySpeed * deltaTime * 100;
        direction.x -= baseKirbySpeed;
        if(kirbyModel.lastAnimation != walkingAnimationIndex) {
            kirbyModel.cueAnimation(walkingAnimationIndex, true, 0.2);
        }
    }
    if (keyState['KeyD']) {
        targetPosition.x += kirbySpeed * deltaTime * 100;
        direction.x += baseKirbySpeed;
        if(kirbyModel.lastAnimation != walkingAnimationIndex) {
            kirbyModel.cueAnimation(walkingAnimationIndex, true, 0.2);
        }
    }
    if (keyState['Space'] && onGround) {
        // I don't believe this has any noticeable effect and it causes the
        // idle animation to not loop if you just jump without moving, so I
        // have commented it out for now. 
        // kirbyModel.cueAnimation(0, true, 0.3);
        onGround = false;
        // jumpVelocity = jumpSpeed;
        yVelocity = jumpSpeed;
        soundManager.playSound('jump');
    }

    // Boundary checks
    targetPosition.z = Math.min(LAND_BEGIN, Math.max(LAND_END, targetPosition.z));
}

// Smooth movement (Source: ChatGPT)
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

let downVector = new THREE.Vector3(0, -1, 0);
let groundLevel = null;

function updateKirbyPosition(deltaTime) {
    // Determine the direction of movement
    let movementDirection = new THREE.Vector3(
        targetPosition.x - kirby.position.x,
        0, // Ignore vertical movement for wall detection
        targetPosition.z - kirby.position.z
    ).normalize();

    // Cast a ray upwards from Kirby's position to detect ceilings
    let ceilingRaycaster = new THREE.Raycaster(kirby.position, new THREE.Vector3(0, 1, 0), 0, 10);
    let ceilingIntersects = ceilingRaycaster.intersectObjects(scene.children, true);

    let ceilingDetected = ceilingIntersects.length > 0;
    let ceilingLevel = null;

    if (ceilingDetected) {
        let distanceToCeiling = ceilingIntersects[0].distance;
        ceilingLevel = kirby.position.y + distanceToCeiling - KIRBY_SIZE;
    }

    // Cast a ray in the direction Kirby is moving to detect walls
    let wallRaycaster = new THREE.Raycaster(kirby.position, movementDirection, 0, KIRBY_SIZE);
    let wallIntersects = wallRaycaster.intersectObjects(scene.children, true); // Check for walls

    let wallDetected = wallIntersects.length > 0;

    if (wallDetected) {
        targetPosition.x = kirby.position.x;
        targetPosition.z = kirby.position.z;
    } else {
        kirby.position.x = lerp(kirby.position.x, targetPosition.x, SMOOTHNESS);
        kirby.position.z = lerp(kirby.position.z, targetPosition.z, SMOOTHNESS);
    }

    // Raycast downwards to find the ground
    let groundRaycaster = new THREE.Raycaster(kirby.position, downVector);
    let intersects = groundRaycaster.intersectObjects(scene.children, true);

    yVelocity -= gravity * deltaTime * 5;

    // Check if intersects found before accessing the distance property
    if (intersects.length > 0) {
        let distanceToGround = intersects[0].distance;
        groundLevel = kirby.position.y - distanceToGround + KIRBY_SIZE/2;
    } else {
        groundLevel = -Infinity; // Kirby is over a void
    }

    onGround = kirby.position.y - KIRBY_SIZE/2 <= groundLevel && yVelocity < 0;
    if(onGround) {
        kirby.position.y = groundLevel + KIRBY_SIZE/2;
        yVelocity = 0;
    }

    kirby.position.y += yVelocity * deltaTime * 75;

    if (ceilingDetected && kirby.position.y >= ceilingLevel) {
        kirby.position.y = lerp(kirby.position.y, groundLevel, SMOOTHNESS * deltaTime * 100);
        yVelocity = 0; // Stop upward movement
    }
}

function togglePause() {
    if (!enablePause) return;
    isPaused = !isPaused;
    document.getElementById('pauseScreen').style.display = isPaused ? 'flex' : 'none';
    
    if (isPaused) {
        fadeIn(document.getElementById('pauseScreen'));
    } else {
        fadeOut(document.getElementById('pauseScreen'));
    }
}

window.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        togglePause();
        soundManager.playSound('pause');
    }
});

function fadeIn(element) {
    element.style.transition = "opacity 0.5s ease-out";
    element.style.opacity = 1;
}

function fadeOut(element) {
element.style.transition = "opacity 0.5s ease-out";
    element.style.opacity = 0;
    setTimeout(() => {
        element.style.display = 'none';
    }, 500);
}

//=====< Teleport >=====//
function checkAndTeleportKirby() {
    for (const [posA, posB] of tpPosList) {
        if (kirby.position.distanceTo(posA) <= 5 && arrowUpPressed) {
            soundManager.stopAllSounds();
            soundManager.playSound('teleport');
            kirby.position.set(posB.x, posB.y, posB.z);
            targetPosition.x = posB.x;
            targetPosition.y = posB.y;
            targetPosition.z = posB.z;
            updateWorldMusic();
            return;
        } else if (kirby.position.distanceTo(posB) <= 5 && arrowUpPressed) {
            soundManager.stopAllSounds();
            soundManager.playSound('teleport');
            kirby.position.set(posA.x, posA.y, posA.z);
            targetPosition.x = posA.x;
            targetPosition.y = posA.y;
            targetPosition.z = posA.z;
            updateWorldMusic();
            return;
        } else {
            console.log('No teleportation available');
            continue;
        }
    }
}

function getCurrentWorld(kirbyX) {
    if (kirbyX >= worldStartBoundaries[0] && kirbyX <= worldStartBoundaries[1]) {
        return 'restingArea';
    } else if (kirbyX >= world1Boundaries[0] && kirbyX <= world1Boundaries[1]) {
        return 'world1';
    } else if (kirbyX >= world2Boundaries[0] && kirbyX <= world2Boundaries[1]) {
        return 'world2';
    } else if (kirbyX >= finalWorldBoundaries[0] && kirbyX <= finalWorldBoundaries[1]) {
        return 'finalWorld';
    } else {
        return 'unknown';
    }
}

//=====< Game Logic >=====//
function checkCollisionWithSpikes() {
    spikePosList.forEach(spikePos => {
        if (kirby.position.distanceTo(spikePos) < 5) {
            updateHPBar(20);
        }
    });
}

function updateHPBar(damage) {
    if (damage > 0 && kirbyHP > 0) {
        soundManager.playSound('damage');
        kirbyHP = Math.max(0, kirbyHP - damage);
        document.getElementById('hpBar').value = kirbyHP;

        if (kirbyHP <= 0) {
            gameOver();
        } else if (kirbyHP <= 30 && kirbyHP > 0) {
            soundManager.playSound('lowhp');
        }
    }
}

function gameOver() {
    soundManager.stopAllSounds();
    if (!isGameClear) {
        soundManager.playSound('dead');
        isGameRunning = false;
    }
    
    document.getElementById('gameOverText').textContent = isGameClear ? "Game Clear" : "Game Over";
    setTimeout(() => {
        if (isGameClear) {
            soundManager.playSound('clear');
        } else {
            soundManager.playSound('die');
        }
    }, 500);

    setTimeout(() => {
        isGameRunning = false;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }, 3000);
}

document.getElementById('retryButton').addEventListener('click', function() {
    resetGame();  
});

document.getElementById('retryButton').addEventListener('mouseenter', function() {
    soundManager.playSound('select');
});

async function resetGame() {
    soundManager.stopAllSounds();

    isGameRunning = true;
    kirbyHP = 100;
    document.getElementById('hpBar').value = kirbyHP;

    createAudio();

    hasPlayedClearSound = false;
    isGameClear = false;
    kirby.position.set(WORLDS_OFFSET_X, 7, 0);
    targetPosition.x = WORLDS_OFFSET_X;
    targetPosition.y = 7;
    targetPosition.z = 0;
    lastWorld = '';
    
    document.getElementById('gameOverScreen').style.display = 'none';

    setTimeout(() => {
        soundManager.playSound('restingArea', true);
    }, 1000);
    loop();
}

//=====< Main Animation Loop >=====//
let collisionCheckInterval = 500;
let lastCollisionCheck = Date.now();
function loop() {
    const deltaTime = clock.getDelta(); 
    if (!isGameRunning) { return; }

    let direction = {
        x: 0,
        z: 0,
    }

    let now = Date.now();
    if(now - lastCollisionCheck > collisionCheckInterval) {
        checkCollisionWithSpikes();
        lastCollisionCheck = now;
    }

    handleKeyboardInput(deltaTime, direction);
    updateKirbyPosition(deltaTime);
    
    kirbyModel.advanceAnimation(deltaTime);
    alignRotation(kirbyModel, direction);

    // Camera for gameplay
    camera.position.x = lerp(camera.position.x, kirby.position.x, CAMERA_SMOOTHNESS);
    camera.position.y = lerp(camera.position.y, kirby.position.y + 12, CAMERA_SMOOTHNESS);
    camera.position.z = lerp(camera.position.z, kirby.position.z + 32, CAMERA_SMOOTHNESS);

    // Camera for construction
    // camera.position.x = lerp(camera.position.x, kirby.position.x, CAMERA_SMOOTHNESS);
    // camera.position.y = lerp(camera.position.y, kirby.position.y + 50, CAMERA_SMOOTHNESS);
    // camera.position.z = lerp(camera.position.z, kirby.position.z + 200, CAMERA_SMOOTHNESS);
    
    // Play clear sound when kirby got the star
    let distance = kirby.position.distanceTo(starPosition);
    if (distance <= 3 && !hasPlayedClearSound) {
        soundManager.stopAllSounds();
        canPlaySounds = false;
        hasPlayedClearSound = true;
        isGameClear = true;
        gameOver();
    }

    if (isGameRunning) {
        requestAnimationFrame(loop);
        renderer.render(scene, camera);
    }
}

function alignRotation(obj, vel) {
    if(vel.x != 0 || vel.z != 0) {
        const targetAngle = -Math.atan2(vel.z, vel.x);
        let targetRotation = new THREE.Quaternion();
        targetRotation.setFromEuler(new THREE.Euler(0, targetAngle, 0));
        obj.quaternion.rotateTowards(targetRotation, 0.1);
    }
}

//=====< Initialize >=====//
window.onload = function() {
    document.getElementById('playButton').addEventListener('click', function() {
        init();
        fadeOutTitleScreen();
        updateHPBar(0);
    });
};

function init(event) {
    createScene();
    runScene();
}

async function runScene() {
    createLights();
    createAudio();
    // Play recovery music by default
    setTimeout(() => {
        soundManager.playSound('restingArea', true);
    }, 1000);
    await createBackground();
    await createWorldS(scene);
    await createWorld1(scene);
    await createWorld2(scene);
    await createWorldF(scene);
    await createKirby();
    loop();
}

function fadeOutTitleScreen() {
    enablePause = true;
    let titleScreen = document.getElementById('titleScreen');
    let containerScreen = document.getElementById('container');
    let hpBar = document.getElementById('hpContainer');

    titleScreen.style.transition = "opacity 0.5s ease-out";
    containerScreen.style.transition = "opacity 0.5s ease-out";
    hpBar.style.transition = "opacity 0.5s ease-out";

    titleScreen.style.opacity = 0;
    containerScreen.style.opacity = 0;
    hpBar.style.opacity = 1;
    setTimeout(function() {
        titleScreen.style.display = 'none';
        containerScreen.style.display = 'none';
        hpBar.style.display = 'flex';
    }, 500);
}
