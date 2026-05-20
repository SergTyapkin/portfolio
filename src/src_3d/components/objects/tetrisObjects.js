import {
  EquirectangularReflectionMapping,
  Mesh,
  MeshBasicMaterial, MeshNormalMaterial,
  MeshPhongMaterial, MeshPhysicalMaterial, RepeatWrapping,
  Shape, SphereGeometry,
  TextureLoader, Vector2,
} from "three";
import {
  BLOCK_DEPTH,
  BLOCK_SIDE,
  BOX_HEIGHT,
  BOX_WIDTH,
  BEVEL_HEIGHT,
  BEVEL_SIZE,
  BEVEL_QUALITY,
  ROUNDNESS_RADIUS,
  ROUNDNESS_QUALITY,
  THICKNESS,
  MOTION_AMPLITUDE_RANGE_MIN,
  MOTION_AMPLITUDE_RANGE_MAX,
  MOTION_OFFSET_RANGE_MIN,
  MOTION_SPEED_RANGE_MIN,
  MOTION_SPEED_RANGE_MAX, MOTION_OFFSET_RANGE_MAX,
} from "~/src_3d/constants";
import TEXTURE_NORMAL_MAP_ROUGH_MATERIAL_URL from '/static/images/normal_maps/rough_material.jpg';
import TEXTURE_ENV_MAP_EMPTY_WAREHOUSE_URL from '/static/images/environment_maps/empty_warehouse.hdr';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import {
  computeUVs,
  fillContourGetFaces,
  generateBevel,
  generateExtrudedFaces,
  transformFacesToGeometry
} from "~/src_3d/geometryUtils";
import {randomBetween} from "~/utils/utils";
import {Load, TrackAsset} from "~/src_3d/AssetsTrackerLoader";


const WIREFRAMED = false;
const NORMAL_MAP_REPEAT = 6;


const TETRIS_CONFIG = [
  { // left bottom Z
    name: 'Some site 1',
    contour: [[0, 0], [0, 2], [1, 2], [1, 3], [2, 3], [2, 1], [1, 1], [1, 0]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // left Г
    name: 'Some site 2',
    contour: [[1, 0], [1, 1], [3, 1], [3, 2], [4, 2], [4, 0]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // left square
    name: 'Some site 3',
    contour: [[2, 2], [2, 4], [4, 4], [4, 2]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // left T
    name: 'Some site 4',
    contour: [[5, 0], [5, 3], [6, 3], [6, 2], [7, 2], [7, 1], [6, 1], [6, 0]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // right L
    name: 'Some site 5',
    contour: [[6, 2], [6, 5], [7, 5], [7, 3], [8, 3], [8, 2]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // right |
    name: 'Some site 6',
    contour: [[4, 0], [4, 4], [5, 4], [5, 0]],
    color: 0xFF0055,
    lightness: 2,
  },
  { // left top Z
    name: 'Some site 7',
    contour: [[0, 3], [0, 4], [1, 4], [1, 5], [3, 5], [3, 4], [2, 4], [2, 3]],
    color: 0xFF0055,
    lightness: 2,
  },
]

function generateBeveledGeometry(shape) {
  const contour = shape.extractPoints(ROUNDNESS_QUALITY).shape;
  const faces = [];

  // Outer back bevel
  const {faces: outerBackBevelFaces, contour: outerBackFaceVertices} = generateBevel(contour, BEVEL_SIZE, BEVEL_HEIGHT, BEVEL_QUALITY, 0, true);
  faces.push(...outerBackBevelFaces);
  // Outer back face
  // faces.push(...fillContourGetFaces(outerBackFaceVertices, BEVEL_HEIGHT, false));
  // Outer side faces
  faces.push(...generateExtrudedFaces(contour, -BLOCK_DEPTH + BEVEL_HEIGHT * 2, 0, true));
  // Outer front bevel
  const {faces: outerFrontBevelFaces, contour: outerFrontFaceVertices} = generateBevel(contour, BEVEL_SIZE, -BEVEL_HEIGHT, BEVEL_QUALITY, -BLOCK_DEPTH + BEVEL_HEIGHT * 2, false, false, false);
  faces.push(...outerFrontBevelFaces);
  // Inner front side faces
  faces.push(...generateExtrudedFaces(outerFrontFaceVertices, THICKNESS, -BLOCK_DEPTH + BEVEL_HEIGHT, true));
  // Inner front bevel
  const {faces: innerFrontBevelFaces, contour: innerFrontFaceVertices} = generateBevel(outerFrontFaceVertices, BEVEL_SIZE - THICKNESS, BEVEL_HEIGHT - THICKNESS, BEVEL_QUALITY, -BLOCK_DEPTH + BEVEL_HEIGHT + THICKNESS, false, true, true);
  faces.push(...innerFrontBevelFaces);
  // Inner side faces
  faces.push(...generateExtrudedFaces(innerFrontFaceVertices, BLOCK_DEPTH - BEVEL_HEIGHT * 2, -BLOCK_DEPTH + BEVEL_HEIGHT * 2, true));
  // Inner back bevel
  const {faces: innerBackBevelFaces, contour: innerBackFaceVertices} = generateBevel(innerFrontFaceVertices, BEVEL_SIZE - THICKNESS, BEVEL_HEIGHT - THICKNESS, BEVEL_QUALITY, 0, false);
  faces.push(...innerBackBevelFaces);
  // Inner back face
  faces.push(...fillContourGetFaces(innerBackFaceVertices, BEVEL_HEIGHT - THICKNESS, true));

  return {box: transformFacesToGeometry(faces), frontFace: generateFillContourGeometry(outerFrontFaceVertices)};
}

function generateShape(contour) {
  const shape = new Shape();
  const radius = ROUNDNESS_RADIUS;
  const contourExt = contour.concat([contour[0], contour[1]]);
  for (let i = 1; i < contourExt.length-1; i++) {
    const pointPrev = contourExt[i-1];
    const point = contourExt[i];
    const pointNext = contourExt[i+1];
    const pX = -point[0] * BLOCK_SIDE;
    const pY = point[1] * BLOCK_SIDE;
    if (pointPrev[1] < point[1]) { // from Top
      if (pointNext[0] > point[0]) { // to right
        shape.absarc(pX - radius, pY - radius, radius,  0, Math.PI / 2, false);
      } else if (pointNext[0] < point[0]) { // to left
        shape.absarc(pX + radius, pY - radius, radius, Math.PI / 2, 0, true);
      }
    } else if (pointPrev[0] < point[0]) { // from Right
      if (pointNext[1] > point[1]) { // to top
        shape.absarc(pX + radius, pY + radius, radius, Math.PI / 2 * 3, Math.PI, true);
      } else if (pointNext[1] < point[1]) { // to bottom
        shape.absarc(pX + radius, pY - radius, radius, Math.PI / 2, Math.PI, false);
      }
    } else if (pointPrev[1] > point[1]) { // from Bottom
      if (pointNext[0] > point[0]) { // to right
        shape.absarc(pX - radius, pY + radius, radius, Math.PI / 2 * 4, Math.PI / 2 * 3, true);
      } else if (pointNext[0] < point[0]) { // to left
        shape.absarc(pX + radius, pY + radius, radius, Math.PI, Math.PI / 2 * 3, false);
      }
    } else if (pointPrev[0] > point[0]) { // from Left
      if (pointNext[1] > point[1]) { // to top
        shape.absarc(pX - radius, pY + radius, radius, Math.PI / 2 * 3, Math.PI / 2 * 4, false);
      } else if (pointNext[1] < point[1]) { // to bottom
        shape.absarc(pX - radius, pY - radius, radius, Math.PI / 2, 0, true);
      }
    }
  }
  return shape;
}

function generateExtrudedGeometry(contour, extrudeHeight) {
  const faces = [];

  // Front face
  faces.push(...fillContourGetFaces(contour, 0, true));
  // Side faces
  faces.push(...generateExtrudedFaces(contour, extrudeHeight, 0, false));
  // Back face
  faces.push(...fillContourGetFaces(contour, extrudeHeight, false));

  return transformFacesToGeometry(faces);
}

function generateFillContourGeometry(contour) {
  const faces = fillContourGetFaces(contour, 0, true);
  return transformFacesToGeometry(faces);
}

function addTickMotionFunctionOnObjects(...objects) {
  const amplitude = randomBetween(MOTION_AMPLITUDE_RANGE_MIN, MOTION_AMPLITUDE_RANGE_MAX);
  const offset = randomBetween(MOTION_OFFSET_RANGE_MIN, MOTION_OFFSET_RANGE_MAX);
  const speed = randomBetween(MOTION_SPEED_RANGE_MIN, MOTION_SPEED_RANGE_MAX);
  const phase = randomBetween(0, Math.PI * 2);

  function tickFunction(timeDelta, startZ, offset, amplitude, phase) {
    this.timeTotal += timeDelta;
    this.position.z = startZ - amplitude / 2 + Math.sin(this.timeTotal / Math.PI * speed + phase) * amplitude;
  }

  objects.forEach(obj => {
    obj.timeTotal = 0;
    const startZ = obj.position.z + offset;
    obj.tick = (timeDelta) => tickFunction.call(obj, timeDelta, startZ, offset, amplitude, phase);
  });
}

export async function createTetris() {
  // Create materials
  const [textureNormalMapRoughMaterial, textureEnvMapEmptyWarehouse] = await Promise.all([
    Load(TextureLoader, TEXTURE_NORMAL_MAP_ROUGH_MATERIAL_URL),
    Load(RGBELoader, TEXTURE_ENV_MAP_EMPTY_WAREHOUSE_URL),
  ]);
  textureNormalMapRoughMaterial.wrapS = RepeatWrapping;
  textureNormalMapRoughMaterial.wrapT = RepeatWrapping;
  textureEnvMapEmptyWarehouse.mapping = EquirectangularReflectionMapping;

  const mat1 = TrackAsset(new MeshBasicMaterial({
    color: 0x000000,
  }));
  const mat2 = TrackAsset(new MeshPhongMaterial({
    color: 0x105942,
    shininess: 100,
  }));
  const mat3 = TrackAsset(new MeshPhysicalMaterial({
    // color: 0xFF8888,
    transmission: 1,
    roughness: 0.2,
    thickness: 3,
    clearcoat: true,
    clearcoatRoughness: 0.5,
    ior: 1.5,
    // sheen: 1,
    // sheenRoughness: 0.3,
    // sheenColor: 0xFF5555,
    envMap: textureEnvMapEmptyWarehouse,
    envMapIntensity: 1,
    normalMap: textureNormalMapRoughMaterial,
    clearcoatNormalMap: textureNormalMapRoughMaterial,
    normalScale: new Vector2(.2, .2),
    clearcoatNormalScale: new Vector2(10, 10),
  }));


  const mat4 = TrackAsset(new MeshNormalMaterial({
    // color: 0xF05942,
    wireframe: WIREFRAMED,
  }));

  // Calculate all meshes coordinates by config
  const totalMeshes = [];
  TETRIS_CONFIG.forEach((blockConfig) => {
    const shape = generateShape(blockConfig.contour);
    const {box: boxGeometry, frontFace: frontFaceGeometry} = generateBeveledGeometry(shape);
    TrackAsset(boxGeometry);
    TrackAsset(frontFaceGeometry);
    const beveledMesh = TrackAsset(new Mesh(boxGeometry, mat4));
    beveledMesh.position.z = -BEVEL_HEIGHT + BLOCK_DEPTH;
    beveledMesh.position.y = -BOX_HEIGHT / 2 + THICKNESS;
    beveledMesh.position.x = BOX_WIDTH / 2 - THICKNESS;
    totalMeshes.push(beveledMesh);

    const uvRepeat = computeUVs(frontFaceGeometry);
    const curMat = TrackAsset(mat3.clone());
    curMat.normalMap = TrackAsset(mat3.normalMap.clone());
    curMat.normalMap.repeat.set(uvRepeat[0] * NORMAL_MAP_REPEAT, uvRepeat[1] * NORMAL_MAP_REPEAT);
    curMat.normalMap.needsUpdate = true;

    const frontFaceMesh = TrackAsset(new Mesh(frontFaceGeometry, curMat));
    frontFaceMesh.position.z = 0;
    frontFaceMesh.position.y = 300;
    frontFaceMesh.position.y = -BOX_HEIGHT / 2 + THICKNESS;
    frontFaceMesh.position.x = BOX_WIDTH / 2 - THICKNESS;
    totalMeshes.push(frontFaceMesh);

    addTickMotionFunctionOnObjects(beveledMesh, frontFaceMesh);
  });

  const sphereGeo = TrackAsset(new SphereGeometry(1, 5, 5));
  const centerSphere = TrackAsset(new Mesh(sphereGeo, mat1));

  return [centerSphere, ...totalMeshes];
}
