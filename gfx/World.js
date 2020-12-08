// import * as THREE from '../node_modules/three/build/three.module.js';

import { initObj } from './Objects.js';
import * as ANIM from './Animations.js';

export const studSize = 20;
export const flatSize = 8;

export const plateSize = 32 * studSize;
export const parcelSize = 4 * studSize;
export const plateCounter = 6;

export var worldPlates = plateCounter - 2.5;

export const roadPlates = worldPlates - 1.5;

export var model;

export var sky;
export var sunSphere;

export var collObjs = new Set();

var plate;
var fence;
var plantProtos = [];
var roadPlate;

export var plates = [];
export var parcels = [];
export var freeParcels = [];

export const MapObjectId = {
    none: 0,
    exercise: 1,
    fence: 2,
    road: 3,
    plant: 4,
    chrystal: 5,
    car: 6,
    animal: 7,
    msphere: 8,
    track : 9,
    train : 10
};

export const seasons = {
    normal: 0,
    winter: 1
}

export var currentSeason = seasons.normal;

export const seasonPlateColor = [ 0xD67923, 0xBCB4A5 ]; // old autumn: 0x91501C
export const seasonPlantColor = [ 0x77774E, 0x708E7C ];

export const smoothNormals = true; // test this later, but takes longer for testing

export const fencePlaceholder = 1;
export const roadPlaceholder = 2;
export const trackPlaceholder = 3;
export const trackDummyPlaceholder = 4;


export function initPlates(onLoad, onProgress, onError) {
    initObj('baseplate', obj => {
        model = obj;
        // Convert from LDraw coordinates: rotate 180 degrees around OX
        model.rotateX(-Math.PI);

        let max = plateSize * (plateCounter + 0.5);
        let min = -max;

        // create parcels
        for (let x = min; x <= max; x += parcelSize) {
            for (let z = min; z <= max; z += parcelSize) {
                let newParcel = { x: x, z: z };
                parcels.push(newParcel);
            }
        }

        // console.log(parcels);
        plate = model.children[0];

        // clear model, keep only first plate
        while(model.children.length > 1) model.remove(model.children[1]);

        freeParcels = parcels.filter(parcelFilter);

        setSeasonColor(currentSeason);

        if (onLoad) onLoad(model);
    }, onProgress, onError, true);
}

export function initScene(onLoad, onProgress, onError) {
    initObj('ambient', obj => {
        // Convert from LDraw coordinates: rotate 180 degrees around OX
        obj.rotateX(-Math.PI);

        fence = obj.children[0];

        for (let plantIdx = 1; plantIdx < obj.children.length; plantIdx++) {
            obj.children[plantIdx].position.x = 0;
            obj.children[plantIdx].position.z = 0;
            plantProtos.push(obj.children[plantIdx]);
        }

        let newBush = plantProtos[1].clone();
        newBush.add(plantProtos[2].clone().translateY(-flatSize));
        plantProtos.splice(2, 0, newBush);

        let newFlower = plantProtos[4].clone();
        newFlower.add(plantProtos[5].clone().rotateY(Math.PI));
        plantProtos.push(newFlower);

        newFlower = plantProtos[4].clone();
        newFlower.add(plantProtos[6].clone().rotateY(Math.PI));
        plantProtos.push(newFlower);

        setSeasonColor(currentSeason);

        if (onLoad) onLoad(obj);
    }, onProgress, onError);
}

export function setSeasonColor(season) {
    if (plate) {
        plate.children[0].material[0].color.setHex(seasonPlateColor[season]);
    }
    if (plantProtos && plantProtos.length > 0) {
        plantProtos[0].children[0].material[0].color.setHex(seasonPlantColor[season]);
        // plantProtos[5].children[0].material[0].color.setHex(seasonPlantColor[season]);
    }
    if (roadPlate) {
        roadPlate.children[0].material[0].color.setHex(seasonPlateColor[season]);
    }
    currentSeason = season;
}

export function createPlates() {
    model.remove(plate);
    for (let x = -plateCounter; x <= plateCounter; x += 1) {
        for (let z = -plateCounter; z <= plateCounter; z += 1) {
            let newPlate = plate.clone();
            newPlate.translateX(x * plateSize);
            newPlate.translateZ(z * plateSize);
            model.add(newPlate);
            plates.push(newPlate);
        }
    }
}

export function debugParcel(x, z, color = 0xffffff) {
    let mat = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity:0.5});
    let geo = new THREE.BoxBufferGeometry(parcelSize, parcelSize, parcelSize);
    let mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = x;
    mesh.position.z = z;
    model.add(mesh);
}

function parcelFilter(value) {
    /*
    // debug vis
    if (value.occupied) {
        debugParcel(value.x, value.z);
    }
    */

    return (!value.occupied) && (Math.abs(value.x) < (plateSize * worldPlates) && Math.abs(value.z) < (plateSize * worldPlates));
}

export function initGate(onLoad, onProgress, onError) {
    initObj('gate', gate => {
        gate.position.z = -worldPlates * plateSize - studSize;
        model.add(gate);
        if (onLoad) onLoad(gate);
    }, onProgress, onError);
}

export function createFences() {
    let max = plateSize * worldPlates;
    let min = -max;
    let x, z;
    let depth = 10;
    let width = 80;
    let step = width * 2;

    // +z
    z = max + depth;
    for (x = min + width; x <= max - width; x += step) {
        addFence(fence, x, z, true);
    }
    fence.rotateY(Math.PI);
    // -z
    z = min - depth;
    for (x = min + width; x <= max - width; x += step) {
        if (x < -step || x > step) {
            addFence(fence, x, z, true);
        }
    }
    // -x
    fence.rotateY(Math.PI / 2);
    x = min - depth;
    for (z = min + width; z <= max - width; z += step) {
        addFence(fence, x, z, false);
    }
    // +x
    fence.rotateY(Math.PI);
    x = max + depth;
    for (z = min + width; z <= max - width; z += step) {
        addFence(fence, x, z, false);
    }

    freeParcels = parcels.filter(parcelFilter);

    function addFence(template, fenceX, fenceZ, xDir) {
        let newFence = template.clone();
        newFence.position.x = fenceX;
        newFence.position.z = fenceZ;

        occupyParcel(parcels[getParcelIndex(fenceX, fenceZ)]);

        if (xDir) {
            occupyParcel(parcels[getParcelIndex(fenceX - width, fenceZ)]);
            occupyParcel(parcels[getParcelIndex(fenceX + width, fenceZ)]);
        } else {
            occupyParcel(parcels[getParcelIndex(fenceX, fenceZ - width)]);
            occupyParcel(parcels[getParcelIndex(fenceX, fenceZ + width)]);
        }

        model.add(newFence);

        function occupyParcel(parcel) {
            parcel.occupied = fencePlaceholder;
            parcel.mapObjId = MapObjectId.fence;
        }
    }
}

export function populatePlants(min, max, mixer, effectFunc) {
    // populate world
    let plantIdx = 0;
    for (let plant of plantProtos) {
        let count = (min + Math.random() * (max - min)) * (plantIdx++ > 4 ? 0.3 : 1);
        for (let i = 0; i < count; i++) {
            let parcelIdx = Math.round(Math.random() * (parcels.length - 1));
            let parcel = parcels[parcelIdx];
            if (!parcel.occupied) {
                let newPlant = plant.clone();
                newPlant.position.x = parcel.x;
                newPlant.position.z = parcel.z;

                newPlant.translateX(Math.floor(Math.random() * 3 - 1) * studSize);
                newPlant.translateZ(Math.floor(Math.random() * 3 - 1) * studSize);
                newPlant.rotateY(Math.floor(Math.random() * 4) * Math.PI / 2);

                model.add(newPlant);

                addCollBox(newPlant);

                parcel.occupied = newPlant;
                parcel.mapObjId = MapObjectId.plant;

                if (effectFunc) {
                    window.setTimeout(function() { effectFunc(newPlant.position.x, newPlant.position.z, newPlant.bbox.max.y, 20); }, i * 1000);
                }
/*
                newPlant.scale.x = 0;
                newPlant.scale.y = 0;
                newPlant.scale.z = 0;
*/
                if (mixer) {
                    // add an animation
                    let action = mixer.clipAction(ANIM.createGrowAnimation(20), newPlant);
                    action.clampWhenFinished = true;
                    action.setLoop(THREE.LoopOnce).startAt(mixer.time + i).play();
                }
            }
        }
    }

    freeParcels = parcels.filter(parcelFilter);
}

export function prepareRoads(mixer, collObjs) {
    /*
    for (let x = -roadPlates * plateSize; x <= roadPlates * plateSize; x +=parcelSize) {
        for (let z = -roadPlates * plateSize; z <= roadPlates * plateSize; z+= 2 * roadPlates * plateSize ) {
            for (let idx = -2; idx <= 2; idx++) {
                reserveParcelAt(x, z + idx * parcelSize, mixer, roadPlaceholder, collObjs);
            }
        }
    }

    for (let x = -roadPlates * plateSize; x <= roadPlates * plateSize; x+= 2 * roadPlates * plateSize) {
        for (let z = -roadPlates * plateSize; z <= roadPlates * plateSize; z+= parcelSize ) {
            for (let idx = -2; idx <= 2; idx++) {
                reserveParcelAt(x + idx * parcelSize, z, mixer, roadPlaceholder, collObjs);
            }
        }
    }
    */

   //for (let x = -roadPlates * plateSize; x <= roadPlates * plateSize; x+= 2 * roadPlates * plateSize) {
     let x = 0;
    for (let z = -plateCounter * plateSize; z <= (roadPlates + 1) * plateSize; z+= parcelSize ) {
        for (let idx = -2; idx <= 2; idx++) {
            reserveParcelAt(x + idx * parcelSize, z, mixer, roadPlaceholder, collObjs);
        }
    }
    //}
}

// call after obj is added to model
export function addCollBox(obj) {
    let bbox = new THREE.Box3().setFromObject(obj).expandByScalar(5);
    obj.bbox = bbox;
    collObjs.add(bbox);
    // model.parent.add(new THREE.Box3Helper(bbox));
    return bbox;
}

export function reserveParcelAt(x, z, mixer, placeHolder) {
    let parcel = parcels[getParcelIndex(x, z)];
    // debugParcel(parcel.x, parcel.z);
    if (parcel.occupied && parcel.occupied != placeHolder) {
        model.remove(parcel.occupied);
        if (mixer) {
            mixer.uncacheRoot(parcel.occupied);
        }
        collObjs.delete(parcel.occupied.bbox);
    }
    parcel.occupied = placeHolder;
    parcel.mapObjId = MapObjectId.none;
}

export function initRoads(onLoad, onProgress, onError, effectFunc) {
    if (model) {
        initObj('road', roads => {
            // Convert from LDraw coordinates: rotate 180 degrees around OX
            roads.rotateX(-Math.PI);

            // Adjust materials

            let roadPlate = roads.children[0];

            //for (let x = -roadPlates; x <= roadPlates; x+= 2 * roadPlates) {
                let x = 0;
                for (let z = -plateCounter; z <= roadPlates; z++ ) {
                    replacePlate(roadPlate, x * plateSize, z * plateSize, effectFunc)
                }
            //}

            for (let parcel of parcels) {
                if (parcel.occupied == roadPlaceholder) {
                    parcel.mapObjId = MapObjectId.road;
                }
            }
            setSeasonColor(currentSeason);

            if (onLoad) onLoad(roads);
        }, onProgress, onError, true);
    }
}

function replacePlate(template, x, z, effectFunc) {
    let newPlate = template.clone();
    newPlate.position.x = x;
    newPlate.position.z = z;
    let idx = getPlateIndex(x, z);
    model.remove(plates[idx]);
    // dispose
    plates[idx] = newPlate;
    model.add(newPlate);

    if (effectFunc) {
        effectFunc(x, z, 300, 15, plateSize/2);
    }
}

export function getPlateIndex( x, z ) {
    return (Math.round(x / plateSize) + plateCounter) * (plateCounter * 2 + 1) +  Math.round(z / plateSize) + plateCounter;
}

export function getParcelIndex( x, z ) {
    let max = plateSize * (plateCounter + 0.5);
    return (Math.round((x + max) / parcelSize)) * (Math.round((max * 2)/parcelSize) + 1) +  Math.round((z + max) / parcelSize);
}

