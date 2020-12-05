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

export function initCow(onLoad, onProgress, onError) {

    var lDrawLoader = new LDrawLoader();
    lDrawLoader.smoothNormals = WORLD.smoothNormals;

    lDrawLoader.separateObjects = true;

    lDrawLoader
        .setPath( "ldraw/" )
        .load( "models/cow.ldr_Packed.mpd", function ( model ) {

            // console.log(model);

            // Convert from LDraw coordinates: rotate 180 degrees around OX
            //model.rotateX(-Math.PI);

            let colorSelect = Math.floor(Math.random() * 4);

            // Adjust materials
            let cow = model;

            let horns = [];
            let headParts = [];

            let cowMat;
            let headMat;

            model.traverse( c => {
                c.visible = !c.isLineSegments;

                if (c.isMesh)
                {
                    if (c.parent.userData.constructionStep == stepCowBody) {
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

                    if (c.parent.userData.constructionStep == stepCowHead) {
                        headParts.push(c);
                        if (colorSelect > 0) {
                            if (!headMat) {
                                let headColor = new THREE.Color(colorSelect % 2 > 0 ? altCowHeadColor : altCowColor);
                                headMat = c.material[2].clone();
                                headMat.color = headColor;
                            }

                            c.material[2] = headMat;
                        }
                    }
                    if (c.parent.userData.constructionStep == stepCowHorns) {
                        horns.push(c);
                    }
                }

                c.castShadow = true;
                c.receiveShadow = true;
            } );

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

    var lDrawLoader = new LDrawLoader();
    lDrawLoader.smoothNormals = WORLD.smoothNormals;

    lDrawLoader.separateObjects = true;

    lDrawLoader
        .setPath( "ldraw/" )
        .load( "models/horse.ldr_Packed.mpd", function ( model ) {

            // console.log(model);

            // Convert from LDraw coordinates: rotate 180 degrees around OX
            // model.rotateX(Math.PI);

            let colorSelect = Math.floor(Math.random() * 3);

            // Adjust materials
            let horse = model;

            let bodyParts = [];
            let headParts = [];

            model.traverse( c => {
                c.visible = !c.isLineSegments;

                if (c.isMesh)
                {
                    if (c.parent.userData.constructionStep == stepHorseRearLegs) {
                        if (colorSelect > 0) {
                            let color = new THREE.Color(altHorseColors[colorSelect - 1]);
                            c.material[0].color = color;
                        }
                    }

                    if (c.parent.userData.constructionStep == stepHorseBody) {
                        bodyParts.push(c);
                    }

                    if (c.parent.userData.constructionStep == stepCowHorns) {
                        headParts.push(c);
                    }
                }

                c.castShadow = true;
                c.receiveShadow = true;
            } );

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

        //newPalmTree.rotateX(-Math.PI);

        let base = palmCache.base.clone();
        newPalmTree.add(base);

        let trunk = base;
        let count = Math.round(Math.random() * 2) + 5;

        let angleX;
        let angleZ;

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

            if (n == 2 && onLoad) {
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
        onLoad();
    } else {
        var lDrawLoader = new LDrawLoader();
        lDrawLoader.smoothNormals = WORLD.smoothNormals;

        lDrawLoader.separateObjects = true;

        lDrawLoader
            .setPath( "ldraw/" )
            .load( "models/palmtree.ldr_Packed.mpd", function ( model ) {
                let meshes = [];

                model.traverse( c => {
                    c.visible = !c.isLineSegments;

                    if (c.isMesh)
                    {
                        meshes.push(c);
                       //  c.rotateX(-Math.PI);

                        c.castShadow = true;
                        c.receiveShadow = true;
                    }
                } );

            palmCache.base = meshes[0];
            palmCache.base.translateY(-8);

            palmCache.trunk = meshes[1];
            palmCache.trunk.translateY(-36);

            palmCache.top = meshes[2];
            palmCache.top.translateY(-40);

            let leaf = meshes[3];

            leaf.translateY(-8);
            leaf.translateZ(10);
            palmCache.leaves.add(leaf.clone());
            leaf.rotateY(Math.PI);
            leaf.translateZ(20);
            palmCache.leaves.add(leaf.clone());
            leaf.translateY(-8);
            leaf.rotateY(Math.PI/2);
            leaf.translateZ(10);
            leaf.translateX(10);
            palmCache.leaves.add(leaf.clone());
            leaf.rotateY(Math.PI);
            leaf.translateZ(20);
            palmCache.leaves.add(leaf);

            if (onLoad) onLoad();
        }, onProgress, onError);
    }
}

export function initStable(onLoad, onProgress, onError) {
    var lDrawLoader = new LDrawLoader();
    lDrawLoader.smoothNormals = WORLD.smoothNormals;

    lDrawLoader.separateObjects = true;



    lDrawLoader
        .setPath( "ldraw/" )
        .load( "models/stable.ldr_Packed.mpd", function ( model ) {

            let parts = new Map();

            model.traverse( c => {
                c.visible = !c.isLineSegments;

                if (c.isMesh)
                {
                    let step = c.parent.userData.constructionStep;
                    if (!parts.has(step)) {
                        let newGroup = [];
                        parts.set(step, newGroup);
                    }

                    parts.get(step).push(c);

                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            } );

        if (onLoad) {
            for (let arr of parts.values()) {

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

export function initObj(name, onLoad, onProgress, onError) {
    var lDrawLoader = new LDrawLoader();
    lDrawLoader.smoothNormals = WORLD.smoothNormals;
    lDrawLoader.separateObjects = true;

    lDrawLoader
        .setPath( "ldraw/" )
        .load( "models/" + name + ".ldr_Packed.mpd", function ( obj ) {

            // Convert from LDraw coordinates: rotate 180 degrees around OX
            // minifig.rotateX(-Math.PI);


            obj.traverse( c => {
                c.visible = !c.isLineSegments;
                if (c.isMesh)
                {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            } );
            //console.log(obj);

            if (onLoad) onLoad(obj);

        }, onProgress, onError);
}

export function initMinifig(name, onLoad, onProgress, onError) {

    var lDrawLoader = new LDrawLoader();

    lDrawLoader.smoothNormals = WORLD.smoothNormals;

    lDrawLoader.separateObjects = true;

    lDrawLoader
        .setPath( "ldraw/" )
        .load( "models/" + name + ".ldr_Packed.mpd", function ( minifig ) {

            // Convert from LDraw coordinates: rotate 180 degrees around OX
            // minifig.rotateX(-Math.PI);

            // Adjust materials
            let lhand, rhand;

            minifig.bodyParts = new Map();

            minifig.traverse( c => {
                c.visible = !c.isLineSegments;
                c.castShadow = true;
                c.receiveShadow = true;

                if (c.isMesh)
                {
                    let step = c.parent.userData.constructionStep;

                    if (!minifig.bodyParts.has(step)) {
                        let group = [];
                        minifig.bodyParts.set(step, group);
                    }

                    minifig.bodyParts.get(step).push(c);
                }
            } );

            for (let key of minifig.bodyParts.keys()) {
                let arr = minifig.bodyParts.get(key);

                for (let item of arr) {
                    if (item!= arr[0]) {
                        arr[0].attach(item);
                    }
                }

                minifig.bodyParts.set(key, arr[0]);
            }

            minifig.bodyParts.get(BodyParts.RightArm).attach(minifig.bodyParts.get(BodyParts.RightHand));
            if (minifig.bodyParts.has(BodyParts.RightItem)) {
                minifig.bodyParts.get(BodyParts.RightHand).attach(minifig.bodyParts.get(BodyParts.RightItem));
            }

            minifig.bodyParts.get(BodyParts.LeftArm).attach(minifig.bodyParts.get(BodyParts.LeftHand));
            if (minifig.bodyParts.has(BodyParts.LeftItem)) {
                minifig.bodyParts.get(BodyParts.LeftHand).attach(minifig.bodyParts.get(BodyParts.LeftItem));
            }

            //console.log(minifig);

            if (onLoad) onLoad(minifig);

        }, onProgress, onError);
}