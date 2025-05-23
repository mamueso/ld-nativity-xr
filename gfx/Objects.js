import * as THREE from '../web_modules/three/build/three.module.js';
import { LDrawLoader } from './LDrawLoader.js'; // use fixed -
import * as WORLD from './World.js';

export const BodyParts = { Head:0, Torso:1, RightArm:2, RightHand:3, LeftArm:4, LeftHand:5, Hip:6, RightLeg:7, LeftLeg:8, RightItem:9, LeftItem:10 };

const stepCowBody = 0;
const stepCowHead = 1;
const stepCowHorns = 2;

const stepHorseRearLegs = 0;
const stepHorseBody = 1;
const stepHorseHead = 2;

const altCowHeadColor = 0x1B2A34; // black
const altCowColor = 0x543324; // brown

const altHorseColors = [altCowColor, 0x000000];

const palmCache = { base: null, trunk: null, top: null, leaves: new THREE.Group() };

//todo: cache also for animals

export function loadModel(name, onLoad, onProgress, onError, isBasePlate = false) {
    var lDrawLoader = new LDrawLoader();
    lDrawLoader.smoothNormals = !isBasePlate;
    lDrawLoader.separateObjects = true;

    lDrawLoader
        .setPath( 'ldraw/' )
        .load( 'models/' + name + '.ldr_Packed.mpd', obj => {
            // Convert from LDraw coordinates: rotate 180 degrees around OX
            // obj.rotateX(-Math.PI);

            let steps = [];
            obj.traverse( c => {
                c.visible = !c.isLineSegments;
                if (c.isMesh)
                {
                    c.castShadow = !isBasePlate;
                    c.receiveShadow = true;

                    let step = c.parent.userData.constructionStep;
                    while (steps.length <= step) {
                        steps.push([]);
                    }
                    steps[step].push(c);
                }
            } );

            obj.steps = steps;

            //console.log(obj);

            if (onLoad) onLoad(obj);

        }, onProgress, onError);
}

export function initCow(onLoad, onProgress, onError) {
   loadModel('cow', cow => {
        let horns = cow.steps[stepCowHorns];
        let headParts = cow.steps[stepCowHead];

        let cowMat;
        let headMat;

        let colorSelect = Math.floor(Math.random() * 4);

        for (let c of cow.steps[stepCowBody]) {
            if (colorSelect > 1) {
                let idx = c.material.length > 1 ? 1 : 0;
                if (!cowMat) {
                    let color = new THREE.Color(altCowColor);
                    cowMat = c.material[idx].clone();
                    cowMat.color = color;
                }
                c.material[idx] = cowMat;
            }
        }

        for (let c of headParts) {
            if (colorSelect > 0) {
                if (!headMat) {
                    let headColor = new THREE.Color(colorSelect % 2 > 0 ? altCowHeadColor : altCowColor);
                    headMat = c.material[2].clone();
                    headMat.color = headColor;
                }
                c.material[2] = headMat;
            }
        }

        cow.head = headParts[0];
        // cow.attach(cow.head);
        for (let headPart of headParts) {
            if (headPart !== cow.head) {
                cow.head.attach(headPart);
            }
        }
        for (let horn of horns) cow.head.attach(horn);

        if (onLoad) onLoad(cow);

    }, onProgress, onError);
}

export function initHorse(onLoad, onProgress, onError) {
    loadModel('horse',  horse => {
            let colorSelect = Math.floor(Math.random() * 3);
            for (let c of horse.steps[stepHorseRearLegs]) {
                if (colorSelect > 0) {
                    let color = new THREE.Color(altHorseColors[colorSelect - 1]);
                    c.material[0].color = color;
                }
            }

            let bodyParts = horse.steps[stepHorseBody];
            let headParts = horse.steps[stepHorseHead];

            horse.body = bodyParts[0];
            for (let bodyPart of bodyParts) {
                if (bodyPart !== horse.body) {
                    horse.body.attach(bodyPart);
                }
            }

            horse.head = headParts[0];
            for (let headPart of headParts) {
                if (headPart !== horse.head) {
                    horse.head.attach(headPart);
                }
            }

            horse.body.attach(horse.head);

            if (onLoad) onLoad(horse);

        }, onProgress, onError);
}

export function initPalmTree(onLoad, onProgress, onError) {
    initPalmTreeCache(function () {
        let newPalmTree = new THREE.Group();

        let base = palmCache.base.clone();
        newPalmTree.add(base);

        let trunk = base;
        let count = Math.round(Math.random() * 2) + 5;

        let angleX;
        let angleZ;

        newPalmTree.segments = [];

        for (let n = 0; n < count; n++ ) {
            let newTrunk = palmCache.trunk.clone();

            if (n % 3 == 0) {
                angleX = (Math.random() - 0.5) * 0.1;
                angleZ = (Math.random() - 0.5) * 0.1;
            }

            newTrunk.rotateX(angleX);
            newTrunk.rotateZ(angleZ);
            trunk.add(newTrunk);
            trunk = newTrunk;

            newPalmTree.segments.push(newTrunk);

            if (n == 3 && onLoad) {
                onLoad(newPalmTree);  // call here, so the coll box does not include the leaves
            }
        }

        let top = palmCache.top.clone();
        top.rotateY(Math.random() * Math.PI);
        trunk.add(top);

        top.add(palmCache.leaves.clone());
    }, onProgress, onError);
}

function initPalmTreeCache(onLoad, onProgress, onError) {
    if (palmCache.base) {
        if (onLoad) onLoad();
    } else {
        loadModel('palmtree', model => {
            let meshes = model.steps[0];

            palmCache.base = meshes[0];
            palmCache.base.translateY(-WORLD.flatSize);

            palmCache.trunk = meshes[1];
            palmCache.trunk.translateY(-WORLD.flatSize * 4.5);

            palmCache.top = meshes[2];
            palmCache.top.translateY(-WORLD.flatSize * 5);

            let leaf = meshes[3];

            leaf.translateY(-WORLD.flatSize);
            leaf.translateZ(WORLD.studSize/2);
            palmCache.leaves.add(leaf.clone());
            leaf.rotateY(Math.PI);
            leaf.translateZ(WORLD.studSize);
            palmCache.leaves.add(leaf.clone());
            leaf.translateY(-WORLD.flatSize);
            leaf.rotateY(Math.PI/2);
            leaf.translateZ(WORLD.studSize/2);
            leaf.translateX(WORLD.studSize/2);
            palmCache.leaves.add(leaf.clone());
            leaf.rotateY(Math.PI);
            leaf.translateZ(WORLD.studSize);
            palmCache.leaves.add(leaf);

            if (onLoad) onLoad();
        }, onProgress, onError);
    }
}

export function initStable(onLoad, onProgress, onError) {
    loadModel('stable',  model => {
        if (onLoad) {
            for (let arr of model.steps) {

                let group = new THREE.Group();
                //model.add(group);
                for (let c of arr) {
                    group.attach(c);
                }

                onLoad(group);
            }
        }
    }, onProgress, onError);
}

export function initMinifig(name, onLoad, onProgress, onError) {
    loadModel(name, minifig => {

        minifig.bodyParts = new Map();

        for (let idx = 0; idx < minifig.steps.length; idx++) {
            let arr = minifig.steps[idx];

            if (arr.length > 0) {
                for (let item of arr) {
                    if (item!= arr[0]) {
                        arr[0].attach(item);
                    }
                }
                minifig.bodyParts.set(idx, arr[0]);
            }
        }


        minifig.bodyParts.get(BodyParts.RightArm).attach(minifig.bodyParts.get(BodyParts.RightHand));
        if (minifig.bodyParts.has(BodyParts.RightItem)) {
            minifig.bodyParts.get(BodyParts.RightHand).attach(minifig.bodyParts.get(BodyParts.RightItem));
        }

        minifig.bodyParts.get(BodyParts.LeftArm).attach(minifig.bodyParts.get(BodyParts.LeftHand));
        if (minifig.bodyParts.has(BodyParts.LeftItem)) {
            minifig.bodyParts.get(BodyParts.LeftHand).attach(minifig.bodyParts.get(BodyParts.LeftItem));
        }

        // console.log(minifig);

        if (onLoad) onLoad(minifig);
    }, onProgress, onError);
}