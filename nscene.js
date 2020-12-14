// import * as THREE from './node_modules/three/build/three.module.js';
// import { GUI } from './node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { GUI } from './web_modules/three/examples/jsm/libs/dat.gui.module.js';
// import { MapControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from './web_modules/three/examples/jsm/controls/PointerLockControls.js';

//import { EffectComposer } from './web_modules/three/examples/jsm/postprocessing/EffectComposer.js';
//import { RenderPass } from './web_modules/three/examples/jsm/postprocessing/RenderPass.js';
//import { SMAAPass } from './web_modules/three/examples/jsm/postprocessing/SMAAPass.js';

import { GamepadControls } from './controls/GamepadControls.js';
// import { addCrossHair } from './controls/CrossHair.js';
import * as WORLD from './gfx/World.js';
import * as ANIM from './gfx/Animations.js';
import * as OBJS from './gfx/Objects.js'
import * as SFX from './audio/SoundFX.js';
// import * as MSX from './audio/Music.js';
import * as PTFX from './gfx/ParticleEffects.js';

export var controls, gpControls, raycaster, intersectedObject, composer;
var renderer, rightRenderer, leftRenderer;
var scene, rightScene, leftScene;
var camera, rightCam, leftCam;
var particleSystems = [];

//var rayHelper = new THREE.ArrowHelper();

var testMode = false;

var isElectronApp = (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1); // detect whether run as electron app

var fps = [];

var nightLights = [];

const particleEffects = { rain: null, snow: null, stars: null, shootingStars: null, fireflies: null };

var animClock = new THREE.Clock();
var walkClock = new THREE.Clock();

var playerGuy;
const guyOffset = 20;
var lastGuyPos = new THREE.Vector3();

var winterWeatherChangeTimeout;

const jumpInitialVel = 350;

var mixer;

var skyMesh;
var hemiLight;
var dirLight;

const dirLightIntensity = 0.4;
const hemiLightIntensity = 0.75;

var isNight = true;

const moveDir = { forward:0, backward:1, left:2, right:3 }
var moveActive = [ false, false, false, false ];

var canJump = false;

var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

var absMaxDistance = 0.5 * WORLD.plateSize - guyOffset;

var progressBarDiv;

var isTouch = ('ontouchstart' in window);

var resolutions = [{ x: 0, y: 0 }, { x: 320, y: 240 }, {x: 640, y: 480 }, { x: 1024, y: 768 }, { x: 1280, y: 800 }, { x: 1920, y: 1080 }]
var resolutionNames  = { 'Auto': 0, '320x240': 1, '640x480': 2, '1024x768': 3, "1280x800": 4, "1920x1080": 5 };
var qualityNames = { High: 1, Low : 2};
var audioSettings = { enabled : true, volume: 100 };
var gamepadSettings = { enabled: true, moveSensitivity: 1, lookSensitivity: 1 };
var gfxSettings = { resolution: resolutionNames.Auto, quality: qualityNames.High, fullScreen: false, shadows: isTouch ? 0 : 3 , antiAlias: true , showFPS: false};
var gameSettings = { itemAmount: isTouch ? 20 : 50, nightEnabled: false, season : WORLD.seasons.normal };

var gui, gfxFolder, controlsFolder, audioFolder, gameFolder;

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );
var rightCanvas = document.getElementById( 'rightCanvas' );
var leftCanvas = document.getElementById( 'leftCanvas' );

var fpsLabel = document.getElementById('fpsLabel');

var touchMoveForward = document.getElementById('touchForward');
var touchMoveBack = document.getElementById('touchBack');
var touchMoveLeft = document.getElementById('touchLeft');
var touchMoveRight = document.getElementById('touchRight');
var touchToggleSeason = document.getElementById('touchSeason');
var touchToggleDayNight = document.getElementById('touchDayNight');

const touchControlDirs = new Map();
var touchMoveTime;
var touchCameraControls = document.getElementById('cameraControls');
var touchCamPos = new THREE.Vector2();


const playerCamHeight = 85;

const cradleXOffset = 80, cradleZOffset = (WORLD.roadPlates * WORLD.plateSize) + 140;

const sceneTotalItems = 19;
var sceneInitItems = sceneTotalItems; // counter for startup to render only if all scene items initialized

var gameActive = false;

const angelLightColor = 0xffffdd, rLightsColor = 0xff0000, windowColor = 0xffffbb;

var angel, star;

// main entry point
init();

function init() {
    initTouchControls(true);
    initScene();
    initControls();
    SFX.init(camera);
    initGUI();
    initAdditionalAnim();
}

function initControls() {

    renderer = new THREE.WebGLRenderer( { antialias: gfxSettings.antiAlias } );
    //renderer = new THREE.WebGLRenderer( { antialias: false } );
    if (!isTouch) {
        renderer.setPixelRatio( window.devicePixelRatio );
    }

    renderer.setSize( window.innerWidth, window.innerHeight );

    updateShadows(gameSettings.shadow);
    // renderer.physicallyCorrectLights = true;

    renderer.domElement.setAttribute('style', "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto");
    document.body.insertBefore( renderer.domElement, document.getElementById( 'blocker' ));


    // document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 12000 );

    camera.up = new THREE.Vector3(0, 1, 0);
    // camera.position.set(WORLD.plateSize, 85, WORLD.plateSize );
    camera.position.set(0, playerCamHeight, WORLD.worldPlates * WORLD.plateSize);
    // camera.rotateX(Math.PI);

    // addCrossHair(camera);

    // initComposer();

    raycaster = new THREE.Raycaster();

    // raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, -1, 0 ), 0 , 1000);

    controls = new PointerLockControls( camera, document.body );

    gpControls = new GamepadControls( controls );

    let gamePadButtonActions = [];
    gamePadButtonActions[6] = jump;
    gamePadButtonActions[7] = function() {
                                            evaluateAnswer(currentHighlight);
                                         };
    gamePadButtonActions[9] = function() {
                                            if ( controls.isLocked ) {
                                                controls.unlock();
                                            } else if (gameActive) {
                                                pauseGame();
                                            } else {
                                                controls.lock();
                                            }
                                         };
    gamePadButtonActions[16] = gamePadButtonActions[9];

    gpControls.buttonActions = gamePadButtonActions;
    // gpControls.moveAction = checkChrystals;

    scene.add( controls.getObject() );

    if (isTouch) {
        instructions.addEventListener( 'touchstart', function (e) {
            openFullscreen();
            window.history.pushState({}, '');
            startGame();
        }, false );

        /*
        document.getElementById('clickSpan').addEventListener( 'click', function () {
            startGame();
        }, false );
        */

        window.addEventListener('popstate', function() {
            pauseGame();
        });

    } else {
        instructions.addEventListener( 'click', function () {
            controls.lock();
        }, false );

        controls.addEventListener( 'lock', function () {
            startGame();
        } );

        controls.addEventListener( 'unlock', function () {
            pauseGame();
        } );
    }

    var onKeyDown = function ( event ) {

        //console.log("down " + event.keyCode);

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                toggleMove(true, moveDir.forward, touchMoveForward);
                break;

            case 37: // left
            case 65: // a
            toggleMove(true, moveDir.left, touchMoveLeft);
                break;

            case 40: // down
            case 83: // s
            toggleMove(true, moveDir.backward, touchMoveBack);
                break;

            case 39: // right
            case 68: // d
            toggleMove(true, moveDir.right, touchMoveRight);
                break;

            case 32: // space
                jump();
                break;

            case 8: // backspace
                if ( animClock.running ) {
                    animClock.stop();
                } else {
                    animClock.start();
                }
                break;

            case 77: // m
                toggleSeason();
            break;
            case 78: // n
                toggleDayNight();
            break;
        }

    };

    var onKeyUp = function ( event ) {

        //console.log("up " + event.keyCode);

        switch ( event.keyCode ) {

            case 27: //ESC
                if (controls.isLocked) {
                    controls.unlock();
                } else if (gameActive){
                    pauseGame();
                }
                break;

            case 38: // up
            case 87: // w
                toggleMove(false, moveDir.forward, touchMoveForward);
                break;

            case 37: // left
            case 65: // a
                toggleMove(false, moveDir.left, touchMoveLeft);
                break;

            case 40: // down
            case 83: // s
                toggleMove(false, moveDir.backward, touchMoveBack);
                break;

            case 39: // right
            case 68: // d
                toggleMove(false, moveDir.right, touchMoveRight);
                break;
        }
    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    /*
    // controls
    controls = new MapControls( camera, renderer.domElement );
    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 2500;
    controls.maxPolarAngle = Math.PI / 2;

    */
    //
    window.addEventListener( 'resize', onWindowResize, false );
    // document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

function toggleDayNight() {
    gameSettings.nightEnabled = !gameSettings.nightEnabled;
    updateNightMode(false);
}

function toggleSeason() {
    if (gameSettings.season == WORLD.seasons.normal) {
        gameSettings.season = WORLD.seasons.winter;
    } else {
        gameSettings.season = WORLD.seasons.normal;
    }
    setSeason(gameSettings.season);
}

function initComposer() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
}

function jump() {
    if (canJump === true)
        velocity.y += jumpInitialVel;
    canJump = false;
}

function initTouchControls(hide) {
    if (hide) {
        document.getElementById('touchControls').style.display = 'none';

        touchCameraControls.removeEventListener("touchstart", onCamControlsTouch);
        touchCameraControls.removeEventListener("touchmove", onCamControlsTouchMove);
        touchCameraControls.removeEventListener("touchend", onCamControlsRelease);

        touchMoveForward.removeEventListener("touchstart", onMoveControlTouch);
        touchMoveForward.removeEventListener("touchend", onMoveControlRelease);

        touchMoveBack.removeEventListener("touchstart", onMoveControlTouch);
        touchMoveBack.removeEventListener("touchend", onMoveControlRelease);

        touchMoveLeft.removeEventListener("touchstart", onMoveControlTouch);
        touchMoveLeft.removeEventListener("touchend", onMoveControlRelease);

        touchMoveRight.removeEventListener("touchstart", onMoveControlTouch);
        touchMoveRight.removeEventListener("touchend", onMoveControlRelease);

        touchToggleSeason.removeEventListener("click", onToggleSeasonClick);
        touchToggleDayNight.removeEventListener("click", onToggleDayNightClick);

    } else {
        document.getElementById('touchControls').style.display = '-webkit-box';
        document.getElementById('touchControls').style.display = '-moz-box';
        document.getElementById('touchControls').style.display = 'box';

        touchCameraControls.addEventListener("touchstart", onCamControlsTouch, false);
        touchCameraControls.addEventListener("touchmove", onCamControlsTouchMove, false);
        touchCameraControls.addEventListener("touchend", onCamControlsRelease, false);

        touchControlDirs.set(touchMoveForward, moveDir.forward);
        touchControlDirs.set(touchMoveBack, moveDir.backward);
        touchControlDirs.set(touchMoveLeft, moveDir.left);
        touchControlDirs.set(touchMoveRight, moveDir.right);

        touchMoveForward.addEventListener("touchstart", onMoveControlTouch, false);
        touchMoveForward.addEventListener("touchend", onMoveControlRelease, false);

        touchMoveBack.addEventListener("touchstart", onMoveControlTouch, false);
        touchMoveBack.addEventListener("touchend", onMoveControlRelease, false);

        touchMoveLeft.addEventListener("touchstart", onMoveControlTouch, false);
        touchMoveLeft.addEventListener("touchend", onMoveControlRelease, false);

        touchMoveRight.addEventListener("touchstart", onMoveControlTouch, false);
        touchMoveRight.addEventListener("touchend", onMoveControlRelease, false);

        touchToggleSeason.addEventListener("click", onToggleSeasonClick, false);
        touchToggleDayNight.addEventListener("click", onToggleDayNightClick, false);
    }
}

function onCamControlsTouchMove(e) {
    e.preventDefault();
    let touch = e.changedTouches[0];
    let factor = 0.0075;
    controls.rotateCamera((touch.pageX-touchCamPos.x) * factor, (touch.pageY - touchCamPos.y ) * factor);
    touchCamPos.x = touch.pageX;
    touchCamPos.y = touch.pageY;
}

function onCamControlsTouch(e) {
    e.preventDefault();
    highlightTouchControl(touchCameraControls);
    let touch = e.changedTouches[0];
    touchCamPos.x = touch.pageX;
    touchCamPos.y = touch.pageY;
}

function onCamControlsRelease(e) {
    e.preventDefault();
    resetTouchControl(touchCameraControls);

    let touch = e.changedTouches[0];
    if (currentHighlight && ((touchCamPos.x - touch.pageX) * (touchCamPos.y - touch.pageY)) < 10) {
        evaluateAnswer(currentHighlight);
    }
}

function onMoveControlTouch(e) {
    e.preventDefault();
    let target = e.target || e.source;

    if (e.timeStamp - touchMoveTime < 250) {
        if ( canJump === true ) velocity.y += jumpInitialVel;
        canJump = false;
    }
    toggleMove(true, touchControlDirs.get(target), target);
}

function onMoveControlRelease(e) {
    e.preventDefault();
    let target = e.target || e.source;
    toggleMove(false, touchControlDirs.get(target), target);
    touchMoveTime = e.timeStamp;
}

function highlightTouchControl(control) {
    control.style.background = 'rgba(128,128,128,0.6)';
}

function resetTouchControl(control) {
    control.style.background = '';
}

function toggleMove(activate, moveDirIndex, control) {
    if (control) {
        if (activate) {
            highlightTouchControl(control);
        } else {
            resetTouchControl(control);
        }
    }
    moveActive[moveDirIndex] = activate;
}

function pauseGame() {
    gameActive = false;
    initTouchControls(true);
    updateBlocker(false);

    SFX.pause();

    animClock.stop();
    walkClock.stop();
    document.removeEventListener('click', onDocumentClick);
    touchCameraControls.removeEventListener('click', onDocumentClick);
}

function startGame() {
    requestAnimationFrame(animate);

    updateBlocker(true);

    initTouchControls(!isTouch);

    document.addEventListener('click', onDocumentClick, false);
    touchCameraControls.addEventListener('click', onDocumentClick, false);

    animClock.start();
    walkClock.start();
    gameActive = true;

    SFX.resume();

    //MSX.play(SFX.listener);
}

function updateBlocker(hide) {
    if (hide) {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    } else {
        blocker.style.display = 'block';
        instructions.style.display = '';
        if (rightRenderer) {
            resizeBlockerRenderer();
            animateBlocker();
        }
    }
}

function initGUI() {

    gui = new GUI( { autoPlace: false } );

    gui.useLocalStorage = true;

    gui.remember(gfxSettings);
    gui.remember(audioSettings);
    gui.remember(gamepadSettings);
    gui.remember(gameSettings);

    gfxFolder = gui.addFolder ("Graphics settings");

    gfxFolder.add(gfxSettings, "resolution", resolutionNames).name("Resolution").onChange(function(value) {
        // update resolution
        onWindowResize();
    });

    gfxFolder.add(gfxSettings, "quality", qualityNames).name("Render quality").onChange(function(value) {
        // update resolution
        onWindowResize();
    });

    onWindowResize(false);


    // does not work when starting fullscreen with F11 :(
    /*
    gfxFolder.add(gfxSettings, "fullScreen").name("Full screen").onChange(function(value) {

        if (value) {
            openFullscreen();
        } else {
            closeFullscreen();
        }

        //toggleFullScreen();
    }).listen();
    */

    gfxFolder.add(gfxSettings, "shadows", 0, 3, 1).name("Shadows").onChange(function(value) {
        // update shadows
        updateShadows(value);
        preRender();
    });

    updateShadows(gfxSettings.shadows);

    gfxFolder.add(gfxSettings, "showFPS").name("Show FPS").onChange(function(value){
            updateFPSLabel();
    });
    updateFPSLabel();

    /*
    gfxFolder.add(gfxSettings, "antiAlias").name("Antialias").onChange(function(value) {
        // would need to reset context - so it's a bit complex
    });
    */

    audioFolder = gui.addFolder("Audio settings");
    audioFolder.add(audioSettings, "enabled").name("Enabled").onChange(function (value) {
        setMasterVolume();
    });
    audioFolder.add(audioSettings, "volume", 0, 100).name("Volume").step(1).onChange(function (value) {
        setMasterVolume();
    });

    setMasterVolume();

    controlsFolder = gui.addFolder("Gamepad settings");
    controlsFolder.add(gamepadSettings, "enabled").name("Enabled").onChange(setGamepadEnabled);
    controlsFolder.add(gamepadSettings, "moveSensitivity", 0.1, 2).step(0.1).name("Move sensitivity").onChange(function (value) {
        gpControls.moveSensitivity = value;
    });
    controlsFolder.add(gamepadSettings, "lookSensitivity", 0.1, 2).step(0.1).name("Look sensitivity").onChange(function (value) {
        gpControls.lookSensitivity = value;
    });

    gpControls.moveSensitivity = gamepadSettings.moveSensitivity;
    gpControls.lookSensitivity = gamepadSettings.lookSensitivity;
    setGamepadEnabled();

    gameFolder = gui.addFolder("Game settings");
    gameFolder.add(gameSettings, "itemAmount", 10, 200).step(10).name("Obj density %");
    gameFolder.add(gameSettings, "nightEnabled").name("Night mode").onChange(function (value) {
        updateNightMode(false);
    }).listen();

    gameFolder.add(gameSettings, "season", WORLD.seasons).name("Season").onChange(function (value) {
        setSeason(value);
        preRender();
    }).listen();

    setSeason(gameSettings.season);

    if (isElectronApp) {
        gui.add(window, "close").name("Exit game");
    }

    gui.close();

    // exFolder.open();
    let guiContainer = document.getElementById('guiContainer');
    guiContainer.appendChild(gui.domElement);
}

function updateFPSLabel() {
    fpsLabel.style.display = gfxSettings.showFPS ? '' : 'none';
}

function updateNightMode(blend) {
    //if (isNight != gameSettings.nightEnabled) {
        setNight(blend);
        checkAndEndWeatherEffects();
        preRender();
    //}
}

function setGamepadEnabled() {
    if (gpControls) {
        if (gamepadSettings.enabled && !gpControls.ticking) {
            gpControls.startPolling();
        } else if (gpControls.ticking) {
            gpControls.stopPolling();
        }
    }
}

function setSeason(season) {
    WORLD.setSeasonColor(season);

    scene.remove(hemiLight);
    hemiLight = new THREE.HemisphereLight(hemiLight.skyColor, WORLD.seasonPlateColor[season], hemiLight.intensity);
    scene.add(hemiLight);

    checkAndEndWeatherEffects(false);

    updateAmbientSound();
    preRender();
}

function updateShadows(value) {
    renderer.shadowMap.enabled = (value > 0);
    scene.traverse(c => {
        if (c.receiveShadow && c.material) {
            if (c.material.length > 0) {
                for (let mat of c.material) {
                    mat.needsUpdate = true;
                }
            }
            else {
                c.material.needsUpdate = true;
            }
        }
    });
    switch (value) {
        case 1:
            renderer.shadowMap.type = THREE.BasicShadowMap;
            break;
        case 2:
            renderer.shadowMap.type = THREE.PCFShadowMap;
            break;
        case 3:
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            break;
        //case 4 :
        //    renderer.shadowMap.type = THREE.VSMShadowMap;
        //    break;
    }
    renderer.shadowMap.needsUpdate = true;
}

function setMasterVolume() {
    if (SFX.listener) {
        SFX.listener.setMasterVolume(audioSettings.enabled ? audioSettings.volume / 100 : 0);
    }
}

function initScene() {

    showProgressBar();

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x606060 );

    scene.fog =  new THREE.FogExp2( 0xcccccc, 0.00025);// new THREE.Fog(0xcccccc, 2000, 12000);// .FogExp2( 0xcccccc, 0.0003);

    // world
    //var geometry = new THREE.PlaneGeometry( 200, 200 );
    //geometry.rotateX(Math.PI / 2);

    const skyColor = 0xB1E1FF;  // light blue
    const groundColor = 0xB97A20;  // brownish orange
    hemiLight = new THREE.HemisphereLight(skyColor, groundColor, hemiLightIntensity);
    scene.add(hemiLight);

    /*
    var light = new THREE.DirectionalLight(0x002288);
    light.position.set(-1, -1, -1);
    scene.add(light);
    */

    //var light = new THREE.AmbientLight(0x222222);
    //scene.add(light);

    if (WORLD.model) {
        scene.remove(WORLD.model);
    }

    mixer = new THREE.AnimationMixer(scene);

    WORLD.initPlates(function ( newModel ) {
        scene.add(newModel);
        newModel.updateMatrixWorld();

        WORLD.createPlates();

        WORLD.prepareRoads();

        WORLD.initRoads(checkSceneInitItems, onProgress, onError);

        WORLD.initScene(function(model) {
            WORLD.createFences();
            WORLD.initGate(checkSceneInitItems, onProgress, onError);
            initSky(checkSceneInitItems, onProgress, onError);
            WORLD.populatePlants(10, gameSettings.itemAmount);
            addPalmTree(Math.round(40 * (gameSettings.itemAmount / 100)), PTFX.generateWind(20));
            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.initCow(function(cow) {
            cow.translateZ((WORLD.roadPlates + 0.5) * WORLD.plateSize);
            cow.translateX(-80);
            WORLD.model.add(cow);
            WORLD.addCollBox(cow);
            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.initHorse(function(horse) {
            horse.translateZ((WORLD.roadPlates + 0.5) * WORLD.plateSize);
            horse.translateX(80);
            WORLD.model.add(horse);
            WORLD.addCollBox(horse);
            checkSceneInitItems();
        }, onProgress, onError);

        initStable();
        initAngel();
        initStar();

        absMaxDistance = WORLD.worldPlates * WORLD.plateSize - guyOffset;

        checkSceneInitItems();

    }, onProgress, onError );

    function initStable() {
        OBJS.initStable(function (obj) {
            obj.position.z = (WORLD.roadPlates + 0.5) * WORLD.plateSize;
            WORLD.model.add(obj);
            WORLD.addCollBox(obj);
            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.loadModel('cradle', function (cradle) {
            cradle.translateZ(cradleZOffset);
            cradle.translateX(cradleXOffset);
            WORLD.model.add(cradle);
            WORLD.addCollBox(cradle);
            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.loadModel('baby', function (baby) {
            baby.translateY(-32);
            baby.translateX(cradleXOffset - 20);
            baby.translateZ(cradleZOffset);
            WORLD.model.add(baby);

            baby.traverse(c => {
                if (c.material && c.material[0]) {
                    for (let mat of c.material) {
                        mat.emissive = mat.color;
                        mat.emissiveIntensity = 0.2;
                    }
                }
            });

            let light = new THREE.PointLight(angelLightColor, 2, 200, 2);
            light.visible = isNight;
            light.position.y = -30;
            light.position.x = 20;
            light.castShadow = true;
            baby.add(light);
            nightLights.push(light);

            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.initMinifig('joseph', function (minifig) {
            minifig.position.z = cradleZOffset + 60;
            minifig.position.x = cradleXOffset + 40;
            minifig.rotateY(Math.PI / 8);
            WORLD.model.add(minifig);
            WORLD.addCollBox(minifig);
            checkSceneInitItems();
        }, onProgress, onError);

        OBJS.initMinifig('mary', function (minifig) {
            minifig.position.z = cradleZOffset + 60;
            minifig.position.x = cradleXOffset - 40;
            minifig.rotateY(-Math.PI / 8);
            WORLD.model.add(minifig);
            WORLD.addCollBox(minifig);
            checkSceneInitItems();
        }, onProgress, onError);
    }

    function initAngel() {
        OBJS.initMinifig('angel', function (minifig) {
            angel = new THREE.Group();
            WORLD.model.add(angel);
            angel.attach(minifig);
            angel.translateY(-160);

            angel.traverse(c => {
                if (c.material && c.material[0]) {
                    for (let mat of c.material) {
                        mat.emissive = mat.color;
                        mat.emissiveIntensity = 0.2;
                    }
                }
            });

            minifig.bodyParts.get(OBJS.BodyParts.LeftArm).rotateX(-Math.PI / 8);

            let light = new THREE.PointLight(angelLightColor, 1.5, 500, 1.8);

            light.visible = isNight;

            light.position.z = 50;
            light.position.y = 90;
            light.castShadow = true;
            angel.add(light);
            nightLights.push(light);

            let action = mixer.clipAction(ANIM.createFloatAnimation('y', angel.position.y, 10, 8), angel);
            action.setLoop(THREE.LoopRepeat).setDuration(5).play();

            checkSceneInitItems();
        }, onProgress, onError);
    }

    function initStar() {
        OBJS.loadModel('star', obj => {
            let mat = obj.steps[0][0].material[0];
            mat.emissive = new THREE.Color(angelLightColor);
            mat.emissiveIntensity = 3;

            let action = mixer.clipAction(ANIM.createRotationAnimation(10, 'z'), obj);
            action.setLoop(THREE.LoopRepeat).setDuration(10).play();

            star = new THREE.Group();
            star.add(obj);

            star.position.y = -2800;
            star.position.z = cradleZOffset;
            star.position.x = cradleXOffset;

            particleSystems.push(PTFX.starTrail(star, angelLightColor));

            WORLD.model.add(star);

            checkSceneInitItems();
        }, onProgress, onError);
    }

    function initSky() {
        var loader = new THREE.TextureLoader();
        loader.load('./gfx/textures/sky_day.jpg',
            //loader.load('./gfx/nightsky.jpg',
            texture => {
                var skyGeo = new THREE.SphereBufferGeometry(12 * WORLD.plateSize, 160, 160); //, 0, 2*Math.PI, 0, Math.PI/2);
                var skyMat = new THREE.MeshLambertMaterial({ map: texture, flatShading: true, emissive: 0x5555ff, emissiveIntensity: 0.05 }); //1

                // var skyMat = new THREE.MeshLambertMaterial({ map: texture, shading: THREE.FlatShading, emissive: 0x00 });
                skyMat.side = THREE.BackSide;
                skyMesh = new THREE.Mesh(skyGeo, skyMat);

                createSky();
                updateNightMode(false);
                checkSceneInitItems();
            }, xhr => {
                console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            }, error => { console.log("An error happened" + error); });
    }
}

function checkSceneInitItems() {
    if (--sceneInitItems <= 0) {
        hideProgressBar();
        updateBlocker(false);
        preRender();
    }
}

function addSun() {
    dirLight = new THREE.DirectionalLight(0x222244, dirLightIntensity); //1);
    dirLight.position.set(2500, 5000, 1000);
    dirLight.castShadow = true;
    let size = WORLD.plateSize * WORLD.plateCounter;
    dirLight.shadow.camera.left = -size;
    dirLight.shadow.camera.right = size;
    dirLight.shadow.camera.bottom = -size;
    dirLight.shadow.camera.top = size;
    dirLight.shadow.camera.near = 3800;
    dirLight.shadow.camera.far = 7800;
    dirLight.shadow.bias = 0.0001;

    // scene.add (new THREE.CameraHelper(light.shadow.camera));

    var SHADOW_MAP_WIDTH = 4096, SHADOW_MAP_HEIGHT = 4096;
    dirLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    dirLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    scene.add(dirLight);

    //ANIM.blendProperty(mixer, dirLight, 'intensity', dirLightIntensity, 3);

    //let action = mixer.clipAction(ANIM.createHighlightAnimation(1, 1), dirLight);

    let sphereGeo = new THREE.SphereBufferGeometry(250, 32, 32);
    let sphereMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffdd, emissiveIntensity: 1 , roughness: 1});
    let sphere = new THREE.Mesh(sphereGeo, sphereMat);

    sphere.position.copy(dirLight.position).normalize().multiplyScalar(11.9 * WORLD.plateSize);
    scene.add(sphere);
}

function createSky() {
    walkClock.stop();
    scene.add(skyMesh);

    // ANIM.blendProperty(mixer, skyMesh.material, 'emissiveIntensity', 1, 3);

    // lights
    addSun();

    // SFX.play(SFX.newItemSound);
    walkClock.start();
}

function addPalmTree(count, wind) {
    let maxAngle = 1.0 * Math.PI / 180;

    for (let idx = 0; idx < count; idx++) {
        let parcelIdx = Math.floor(Math.random() * (WORLD.freeParcels.length));

        let parcel = WORLD.freeParcels[parcelIdx];
        WORLD.freeParcels.splice(parcelIdx, 1);

        OBJS.initPalmTree(function(palmTree) {
            palmTree.position.x = parcel.x;
            palmTree.position.z = parcel.z;

            WORLD.model.add(palmTree);
            WORLD.addCollBox(palmTree);
            parcel.occupied = palmTree;
            parcel.mapObjId = WORLD.MapObjectId.plant;

            palmTree.parcel = parcel;

            if (wind && palmTree.segments.length > 0) {
                let timeOffset = Math.random() * 5;
                for (let segment of palmTree.segments) {
                    let xAction = mixer.clipAction(ANIM.createPalmSegmentWindAnimation(wind, segment, maxAngle, 5), segment);
                    xAction.setLoop(THREE.LoopRepeat).setDuration(5).play();
                    xAction.time = timeOffset;
                }
            }
        }, onProgress, onError);
    }
}


function addParcelEffect(x, z, height, time, size) {
    if (gameSettings.itemEffect) {
        particleSystems.push(PTFX.parcelEffect(scene, x, -z, height, time, size));
    }
}


function onProgress( xhr ) {
    if ( xhr.lengthComputable ) {
        updateProgressBar( xhr.loaded / xhr.total );
        // console.log( Math.round( xhr.loaded / xhr.total * 100, 2 ) + '% downloaded' );
    }
}

function onError() {

    var message = "Error loading model";
    progressBarDiv.innerText = message;
    console.log( message );

}

function showProgressBar() {

    if (!progressBarDiv) {
        progressBarDiv = document.createElement( 'div' );
        progressBarDiv.innerText = "Loading...";
        progressBarDiv.style.fontSize = "3em";
        progressBarDiv.style.color = "#888";
        progressBarDiv.style.display = "block";
        progressBarDiv.style.position = "absolute";
        progressBarDiv.style.top = "50%";
        progressBarDiv.style.width = "100%";
        progressBarDiv.style.textAlign = "center";
    }

    document.body.appendChild( progressBarDiv );

    animClock.stop();
    walkClock.stop();

}

function hideProgressBar() {

    if (document.body.contains(progressBarDiv)) {
        document.body.removeChild( progressBarDiv );
    }

    animClock.start();
    walkClock.start();
}

function updateProgressBar( fraction ) {
    progressBarDiv.innerText = 'Loading... ' + Math.round( ((sceneTotalItems - sceneInitItems + fraction) / sceneTotalItems) * 100, 2 ) + '%';
}

function onWindowResize(update = true) {

    let res = { x: resolutions[gfxSettings.resolution].x, y: resolutions[gfxSettings.resolution].y };

    if (res.x == 0) {
        res.x = window.innerWidth ;
    }
    if (res.y == 0) {
        res.y = window.innerHeight;
    }

    res.x = Math.min(res.x, window.innerWidth);
    res.y = Math.min(res.y, window.innerHeight);

    camera.aspect = res.x / res.y;
    camera.updateProjectionMatrix();

    // renderer.setPixelRatio(window.devicePixelRatio * scale);
    let scale = gfxSettings.quality;

    if (composer) {
        composer.setSize( res.x / scale, res.y / scale, false );
    }

    renderer.setSize( res.x / scale, res.y / scale, false );
    renderer.domElement.style.width = renderer.domElement.width * scale + 'px';
    renderer.domElement.style.height = renderer.domElement.height * scale + 'px';

    var style = window.getComputedStyle(renderer.domElement);
    fpsLabel.style.marginLeft = style.marginLeft;
    fpsLabel.style.marginTop = style.marginTop;

    fpsLabel.style.fontSize = res.y / (40 - (30 * (1 - res.y / 1200))) + "px"; // non-linear scale for lower res.
    fpsLabel.style.lineHeight = fpsLabel.style.fontSize;

    gfxSettings.fullScreen = (window.screen.width == window.innerWidth); // API not working when triggered with F11

    if (rightRenderer) {
        resizeBlockerRenderer();
    }

    if (update) {
        preRender();
    }

    // playerInfo.innerHTML =  window.innerWidth + " x " + window.innerHeight + " (" + window.screen.width + " x " + window.screen.height + ")";
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function onToggleSeasonClick( event ) {
    highlightTouchControl(touchToggleSeason);
    toggleSeason();
    resetTouchControl(touchToggleSeason);
}

function onToggleDayNightClick( event ) {
    highlightTouchControl(touchToggleDayNight);
    toggleDayNight();
    resetTouchControl(touchToggleDayNight);
}

function onDocumentClick( event ) {
    event.preventDefault();
}

function animate() {

    if ( gameActive ) {

        requestAnimationFrame( animate );

        let animDelta = animClock.getDelta();
        let walkDelta = walkClock.getDelta();

        if (gfxSettings.showFPS) {
            if (fps.length > 25) fps.splice(0, 1);
                fps.push(1/ Math.max(animDelta, walkDelta));
                let currFps = 0;
                for (let idx = 0; idx < fps.length; idx++) {
                    currFps += fps[idx];
            }
            currFps = Math.round(currFps / fps.length);
            fpsLabel.innerHTML = currFps + " FPS";
        }

        mixer.update( animDelta );

        updateControls( walkDelta );

        particleSystems = particleSystems.filter(function(ps) {
            ps.update(animDelta);
            return !ps.removeAndDisposeIfFinished();
        });

        render();
    }
}

function addAnimal() {

    let parcels = [];
    let counter = 0;
    do {
        parcels = [];
        // find empty parcel
        let parcelIdx = Math.floor(Math.random() * (WORLD.freeParcels.length));
        let freeParcel = WORLD.freeParcels[parcelIdx];

        parcels.push(freeParcel);

        let parcel = WORLD.parcels[WORLD.getParcelIndex(freeParcel.x, freeParcel.z + WORLD.parcelSize)];
        if (!parcel.occupied) {
            parcels.push(parcel);

            parcel = WORLD.parcels[WORLD.getParcelIndex(freeParcel.x + WORLD.parcelSize, freeParcel.z)];
            if (!parcel.occupied) {
                parcels.push(parcel);

                parcel = WORLD.parcels[WORLD.getParcelIndex(freeParcel.x + WORLD.parcelSize, freeParcel.z + WORLD.parcelSize)];
                if (!parcel.occupied) {
                    parcels.push(parcel);
                }
            }
        }
    } while (parcels.length < 4 && counter++ < 25); // max tries

    if (parcels.length == 4) {

        let x = 0;
        let z = 0;

        for (let parcel of parcels) {
            WORLD.freeParcels.splice(WORLD.freeParcels.indexOf(parcel), 1);
            // parcel.occupied = true;
            parcel.mapObjId = WORLD.MapObjectId.animal;
            x += parcel.x;
            z += parcel.z;
        }

        x = x/4;
        z = z/4;

        if (Math.random() < 0.6) {
            OBJS.initCow(function (cow) {

                WORLD.model.add(cow);
                for (let parcel of parcels) {
                    parcel.occupied = cow;
                }

                cow.position.x = x;
                cow.position.z = z;

                cow.rotateY(Math.floor(Math.random() * 4) * Math.PI / 2);

                var action = mixer.clipAction(ANIM.createHeadAnimation( 1, Math.PI/4, 'x'), cow.head);
                action.setLoop(THREE.LoopRepeat).setDuration(5).play();

                SFX.addItemSound(cow, SFX.soundBuffers.cow, true);

                WORLD.addCollBox(cow);

            }, onProgress, onError);
        } else {
            OBJS.initHorse(function (horse) {

                WORLD.model.add(horse);

                for (let parcel of parcels) {
                    parcel.occupied = horse;
                }

                horse.position.x = x;
                horse.position.z = z;

                horse.rotateY(Math.floor(Math.random() * 4) * Math.PI / 2);

                var action = mixer.clipAction(ANIM.createHeadAnimation( 1, Math.PI/2, 'x'), horse.head);
                action.setLoop(THREE.LoopRepeat).setDuration(5).play();

                action = mixer.clipAction(ANIM.createHeadAnimation( 1, -Math.PI * 0.4, 'x'), horse.body);
                action.setLoop(THREE.LoopOnce).setDuration(8).play();

                SFX.addItemSound(horse, SFX.soundBuffers.horse, true);

                WORLD.addCollBox(horse);
            }, onProgress, onError);
        }
    }
}

function updateControls(delta) {

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveActive[moveDir.forward]) - Number(moveActive[moveDir.backward]);
    direction.x = Number(moveActive[moveDir.right]) - Number(moveActive[moveDir.left]);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveActive[moveDir.forward] || moveActive[moveDir.backward]) {
        velocity.z -= direction.z * 4000.0 * delta;
    }
    if (moveActive[moveDir.left] || moveActive[moveDir.right])
        velocity.x -= direction.x * 4000.0 * delta;
    /*
    if ( onObject === true ) {

        velocity.y = Math.max( 0, velocity.y );
        canJump = true;

    }
    */

    let oldPos = controls.getObject().position;
    oldPos = new THREE.Vector3(oldPos.x, oldPos.y, oldPos.z);

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.getObject().position.y += (velocity.y * delta); // new behavior
    if (controls.getObject().position.y < playerCamHeight) {
        velocity.y = 0;
        controls.getObject().position.y = playerCamHeight;
        canJump = true;
    }

    let pos = controls.getObject().position;

    if (pos.x > absMaxDistance) {
        pos.x = absMaxDistance;
    } else if (pos.x < -absMaxDistance) {
        pos.x = -absMaxDistance;
    }
    if (pos.z > absMaxDistance) {
        pos.z = absMaxDistance;
    } else if (pos.z < -absMaxDistance) {
        pos.z = -absMaxDistance;
    }

    if (velocity.x != 0 || velocity.z != 0) {
        let testPos = new THREE.Vector3();
        controls.getObject().getWorldPosition(testPos);
        testPos.y -= playerCamHeight / 2;

        // let collArr = Array.from(WORLD.collObjs); fix if problems with set
        for (let bbox of WORLD.collObjs) {
            if (bbox.containsPoint(testPos)) {
                testPos = new THREE.Vector3(testPos.x, testPos.y, oldPos.z);
                if (bbox.containsPoint (testPos)) { // enable sliding to one side
                    pos.x = oldPos.x;
                } else {
                    pos.z = oldPos.z;
                }
                break;
            }
        }
    }

    if (star) {
        star.lookAt(controls.getObject().position);
    }

    if (angel) {
        angel.lookAt(controls.getObject().position);
    }
}

function setNight(blend) {
    let nightChangeDuration = 1;

    isNight = gameSettings.nightEnabled;

    updateFog(blend);

    if (dirLight) {

        if (blend) {
            ANIM.blendColor(mixer, dirLight, isNight ? 0x222244 : 0xffffff, nightChangeDuration);
        } else {
            dirLight.color.setHex(isNight ? 0x222244 : 0xffffff);
        }
    }

    if (hemiLight) {
        if (blend) {
            ANIM.blendProperty(mixer, hemiLight, 'intensity', hemiLightIntensity * (isNight ? 0.1 : 1), nightChangeDuration);
        } else {
            hemiLight.intensity = hemiLightIntensity * (isNight ? 0.1 : 1);
        }
    }

    if (skyMesh) {
        if (blend) {
            ANIM.blendProperty(mixer, skyMesh.material, 'emissiveIntensity', (isNight ? 0.05 : 1), nightChangeDuration);
        } else {
            skyMesh.material.emissiveIntensity = (isNight ? 0.05 : 1);// (isNight ? 0.1 : 1);
        }
    }

    for (let light of nightLights) {
        light.visible = isNight;
    }

    fpsLabel.style.color = (isNight ? "gold" : "black");

    updateAmbientSound();
}

function updateAmbientSound() {
    let sb;

    if (WORLD.currentSeason == WORLD.seasons.winter) {
        sb = isNight ? SFX.soundBuffers.silence : SFX.soundBuffers.crows;
    } else {
        sb = isNight ? SFX.soundBuffers.ambientNight : SFX.soundBuffers.ambientDay;
    }

    SFX.setAmbientSound(sb);
}


function checkAndEndWeatherEffects(blend = true) {

    if (particleEffects.snow) {
        if (WORLD.currentSeason == WORLD.seasons.normal) {
            particleEffects.snow.removeSelf();
        }

        particleEffects.snow.ttl = 0;
        particleEffects.snow = null;
    }

    if (winterWeatherChangeTimeout) {
        window.clearTimeout(winterWeatherChangeTimeout);
    }

    if (WORLD.currentSeason == WORLD.seasons.winter) {
        if (Math.random() < 0.5) {
            let intensity = Math.round(Math.random() * 18 + 2) / 10;
            particleEffects.snow = PTFX.letItSnow(scene, intensity, PTFX.generateWind(75));
            particleSystems.push(particleEffects.snow);
        }

        winterWeatherChangeTimeout = window.setTimeout(function(){ checkAndEndWeatherEffects(); }, 30000); // change intensity
    } else {
        winterWeatherChangeTimeout = null;
    }

    if (isNight && !particleEffects.snow) {
        if (!particleEffects.stars) {
            particleEffects.stars = PTFX.starsAbove(scene, 1.5);
            particleSystems.push(particleEffects.stars);
        }
    } else {
        if (particleEffects.stars) {
            particleEffects.stars.removeSelf();
            particleEffects.stars.ttl = 0;
            particleEffects.stars = null;
        }
    }

    if (dirLight) {
        if (blend) {
            ANIM.blendProperty(mixer, dirLight, 'intensity', particleEffects.snow ? 0.05 : dirLightIntensity, 10);
        } else {
            dirLight.intensity = particleEffects.snow ? 0.05 : dirLightIntensity;
        }
    }
    updateFog(blend);
}

function updateFog(blend = false) {
    if (scene && scene.fog) {

        scene.fog.color.setHex(isNight ? 0x101015 : 0xcccccc);

        let newDensity = scene.fog.density;
        let season = WORLD.currentSeason;
        if (season == WORLD.seasons.winter) {
            newDensity = particleEffects.snow ? 0.0004 : 0.00016;
        } else {
            newDensity = 0.00012;
        }

        if (scene.fog.density != newDensity) {
            if (blend) {
                ANIM.blendProperty(mixer, scene.fog, "density", newDensity, 10);
            } else {
                if (mixer) mixer.uncacheRoot(scene.fog);
                scene.fog.density = newDensity;
            }
        }
    }
}

function preRender() {
    if (sceneInitItems<= 0) {
        render();
    }
}

function render() {
    // checkIntersect();
    //composer.render(scene, camera);

    renderer.render( scene, camera );
}

/* View in fullscreen */
function openFullscreen() {

    if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
    } else if (document.body.mozRequestFullScreen) { /* Firefox */
        document.body.mozRequestFullScreen();
    } else if (document.body.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        document.body.webkitRequestFullscreen();
    } else if (document.body.msRequestFullscreen) { /* IE/Edge */
        document.body.msRequestFullscreen();
    }
}

/* Close fullscreen */
function closeFullscreen() {
    console.log("Closing FS");
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
      document.msExitFullscreen();
    }
}

function toggleFullScreen() {
    var doc = window.document;
    var docEl = doc.body;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      requestFullScreen.call(docEl);
    }
    else {
      cancelFullScreen.call(doc);
    }
}

function initAdditionalAnim() {
    // set the candles and ornaments according to advent date
    let now = new Date();
    let date = new Date(now.getFullYear(), 11, 24, 0, 0, 0, 0); // month is 0 based!
    let deltaDays = (now - date) / (1000 * 3600 * 24.0);

    OBJS.loadModel('wreath', obj => {
        rightRenderer = new THREE.WebGLRenderer( { antialias: gfxSettings.antiAlias, alpha: true } );
        if (!isTouch) {
            rightRenderer.setPixelRatio( window.devicePixelRatio );
        }
        rightRenderer.shadowMap.enabled = false;

        rightRenderer.domElement.setAttribute('style', "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto");
        rightCanvas.appendChild(rightRenderer.domElement);
        rightScene = new THREE.Scene();

        obj.rotateX(-Math.PI);

        for (let mesh of obj.steps[1]) {
            let mat = mesh.material[0];
            mat.emissive = mat.color;
            mat.emissiveIntensity = 0.3;
        }

        let advDelta = deltaDays + date.getDay(); // 4th advent sunday

        let count = 0;
        while (advDelta < 0 && count < obj.steps[1].length) {
            obj.steps[1][count].parent.remove(obj.steps[1][count]);
            advDelta += 7;
            count++;
        }

        rightScene.add(obj);

        rightScene.add(new THREE.DirectionalLight(0xffffff, 1).translateX(100).translateY(100).translateZ(100));
        rightScene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.6));

        rightCam = new THREE.PerspectiveCamera( 30, rightCanvas.clientWidth / rightCanvas.clientHeight, 1, 1000 );

        rightCam.up = new THREE.Vector3(0, 1, 0);
        rightCam.position.set(0, 100, 400);
        rightCam.lookAt(0, 40, 0);

        checkSceneInitItems();

    }, onProgress, onError);

    OBJS.loadModel('xtree', obj => {
        leftRenderer = new THREE.WebGLRenderer( { antialias: gfxSettings.antiAlias, alpha: true } );
        if (!isTouch) {
            leftRenderer.setPixelRatio( window.devicePixelRatio );
        }
        leftRenderer.shadowMap.enabled = false;

        leftRenderer.domElement.setAttribute('style', "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto");
        leftCanvas.appendChild(leftRenderer.domElement);
        leftScene = new THREE.Scene();

        obj.rotateX(-Math.PI);
        leftScene.add(obj);

        console.log(deltaDays);
        if (deltaDays < 0 && deltaDays > -352) {
            for (let stepIdx = 1; stepIdx <= 2; stepIdx++) {
                for (let item of obj.steps[stepIdx]) {
                    item.parent.remove(item);
                }
            }
        }

        leftScene.add(new THREE.DirectionalLight(0xffffff, 1).translateX(100).translateY(100).translateZ(100));
        leftScene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.6));

        leftCam = new THREE.PerspectiveCamera( 30, leftCanvas.clientWidth / leftCanvas.clientHeight, 1, 1600 );

        leftCam.up = new THREE.Vector3(0, 1, 0);
        leftCam.position.set(0, 150, 400);
        leftCam.lookAt(0, 90, 0);

        checkSceneInitItems();

    }, onProgress, onError);
}

function resizeBlockerRenderer() {
    rightCam.aspect = rightCanvas.clientWidth / rightCanvas.clientHeight;
    rightCam.updateProjectionMatrix();

    rightRenderer.setSize( rightCanvas.clientWidth, rightCanvas.clientHeight, true);

    leftCam.aspect = leftCanvas.clientWidth / leftCanvas.clientHeight;
    leftCam.updateProjectionMatrix();

    leftRenderer.setSize( leftCanvas.clientWidth, leftCanvas.clientHeight, true);
}

function animateBlocker(){
    if (!gameActive) requestAnimationFrame(animateBlocker);

    let rot = 0.002;

    rightScene.children[0].rotateY(rot);
    rightRenderer.render(rightScene, rightCam);

    leftScene.children[0].rotateY(rot);
    leftRenderer.render(leftScene, leftCam);
}