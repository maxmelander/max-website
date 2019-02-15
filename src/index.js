import * as THREE from 'three';

// Sphere texture images
import * as albImg from './assets/scuffed-plastic7-alb.png';
import * as aoImg from './assets/scuffed-plastic-ao.png';
import * as metalImg from './assets/scuffed-plastic-metal.png';
import * as normalImg from './assets/scuffed-plastic-normal.png';
import * as roughImg from './assets/scuffed-plastic-rough.png';

// Env map texture image
import * as xnImg from './assets/xn.png';
import * as xpImg from './assets/xp.png';
import * as ynImg from './assets/yn.png';
import * as ypImg from './assets/yp.png';
import * as znImg from './assets/zn.png';
import * as zpImg from './assets/zp.png';

import * as shadowImg from './assets/shadowTexture.png';

// GLOBALS
const CAMERA_ORBIT_SLOWDOWN = 0.0009;
const CAMERA_ORBIT_START = 0.08;
const CAMERA_ORBIT_TARGET = 0.0025;

const GROUND_SCALE = 0.025;
const DEPTH = 600;
const ORIGIN = new THREE.Vector3();
const DISPLACEMENT = 0.4;
const SPRING_STRENGTH = 0.0003;
const DAMPEN = 0.998;

let sphere = null;
let ground = null;
let renderer = null;
let scene = null;
let camera = null;

let lightBottom = null;
let ambientLight = null;
let lightTop = null;

let cameraOrbit = 0;
let currentOrbitSpeed = CAMERA_ORBIT_START;
let groundScale = 1;
let sphereHeightScalar = 0;

function updateVertexSprings() {
  let sphereVertices = sphere.geometry.vertices,
      vertexCount    = sphereVertices.length,
      vertexSprings  = null,
      vertexSpring   = null,
      extension      = 0,
      length         = 0,
      force          = 0,
      vertex         = null,
      acceleration   = new THREE.Vector3(0, 0, 0);

  // Apparently going backwards is faster than a normal for-loop
  while(vertexCount--) {
    vertex = sphereVertices[vertexCount];
    vertexSprings = vertex.springs;

    // dont give af about verts without springs
    if(!vertexSprings) {
      continue;
    }

    // Go through each spring
    for (var v = 0; v < vertexSprings.length; v++) {
      vertexSpring = vertexSprings[v];
      length = vertexSpring.start.length(vertexSpring.end);

      extension = vertexSpring.length - length;

      acceleration.copy(vertexSpring.start.normal).multiplyScalar(extension * SPRING_STRENGTH);
      vertexSpring.start.velocity.add(acceleration);

      acceleration.copy(vertexSpring.end.normal).multiplyScalar(extension * SPRING_STRENGTH);
      vertexSpring.end.velocity.add(acceleration);

      vertexSpring.start.add(vertexSpring.start.velocity);
      vertexSpring.end.add(vertexSpring.end.velocity);

      vertexSpring.start.velocity.multiplyScalar(DAMPEN);
      vertexSpring.end.velocity.multiplyScalar(DAMPEN);
    }

    // Dampen back to original position
    vertex.add(vertex.originalPosition.clone().sub(vertex).multiplyScalar(0.03));
  }
}

function displaceVertex(vertex, magnitude) {
  const sphereVertices = sphere.geometry.vertices;
  sphereVertices[vertex].velocity.add(
    sphereVertices[vertex].normal.clone().multiplyScalar(magnitude)
  );
}

function displaceFace(face, magnitude) {
  displaceVertex(face.a, magnitude);
  displaceVertex(face.b, magnitude);
  displaceVertex(face.c, magnitude);

  if (face instanceof THREE.Face4) {
    displaceVertex(face.d, magnitude);
  }
}

function displaceRandomFace() {
  let sphereFaces = sphere.geometry.faces;
  let randomFaceIndex = Math.floor(Math.random() * sphereFaces.length);
  let randomFace = sphereFaces[randomFaceIndex];
  let displacement = Math.random() * (DISPLACEMENT - 0) + 0;
  displaceFace(randomFace, -displacement);

  setTimeout(displaceRandomFace, 50);
}

function animate() {
  updateVertexSprings();
  // move the camera around slightly
  // sin + cos = a circle
  if (currentOrbitSpeed >= CAMERA_ORBIT_TARGET) {
    currentOrbitSpeed -= CAMERA_ORBIT_SLOWDOWN;
  }

  cameraOrbit           += currentOrbitSpeed;
  camera.position.x     = Math.sin(cameraOrbit) * DEPTH;
  camera.position.z     = Math.cos(cameraOrbit) * DEPTH;
  camera.lookAt(ORIGIN);

  // scale the ground to make the shadow look like its real-time HEHE
  groundScale += GROUND_SCALE;
  sphereHeightScalar = (Math.cos(groundScale) + 2) / 2;
  ground.scale.y = 1 * sphereHeightScalar;
  ground.scale.x = 1 * sphereHeightScalar;
  ground.geometry.verticesNeedUpdate = true;
  sphere.position.y = (-50 * sphereHeightScalar) + 100;

  sphere.geometry.verticesNeedUpdate = true;
  sphere.geometry.normalsNeedUpdate = true;
  sphere.geometry.computeFaceNormals();
  sphere.geometry.computeVertexNormals();

  renderer.render(scene, camera);
  requestAnimationFrame( () => animate() );
}


function createObjects() {
  // Geometry
  const sphereGeometry = new THREE.SphereGeometry(200, 60, 30);

  // Sphere Textures
  const textureLoader = new THREE.TextureLoader();
  const albTex = textureLoader.load(albImg);
  const aoTex = textureLoader.load(aoImg);
  const metalTex = textureLoader.load(metalImg);
  const normalTex = textureLoader.load(normalImg);
  const roughTex = textureLoader.load(roughImg);

  // Env Map Textures
  const cubeLoader = new THREE.CubeTextureLoader();
  const envMap = cubeLoader.load([xpImg, xnImg, ypImg, ynImg, zpImg, znImg]);

  // Material
  const sphereMaterial = new THREE.MeshPhysicalMaterial({
    map: albTex,
    aoMap: aoTex,
    metalnessMap: metalTex,
    normalMap: normalTex,
    roughnessMap: roughTex,
    envMap: envMap,
  });

  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.geometry.dynamic = true;
  scene.add(sphere);


  // Ground
  const shadowTexture = textureLoader.load(shadowImg);
  const planeGeometry = new THREE.PlaneGeometry(500, 500, 1);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    map: shadowTexture,
    transparent: true
  });
  ground = new THREE.Mesh(planeGeometry, planeMaterial);
  ground.geometry.dynamic = true;
  ground.rotation.x = Math.PI * -0.5;
  ground.position.y = -300;

  scene.add(ground);

}

function createSprings() {
  let sphereFaces = sphere.geometry.faces;

  let face;
  for (var f = 0; f < sphereFaces.length; f++) {
    face = sphereFaces[f];
    if (face instanceof THREE.Face3) {
      createSpring(face.a, face.b);
      createSpring(face.b, face.c);
      createSpring(face.c, face.a);
    } else {
      createSpring(face.a, face.b);
      createSpring(face.b, face.c);
      createSpring(face.c, face.d);
      createSpring(face.d, face.a);
    }
  }
}

function createSpring(start, end) {
  const sphereVertices = sphere.geometry.vertices;
  const startVertex = sphereVertices[start];
  const endVertex = sphereVertices[end];

  if(!startVertex.springs) {
    startVertex.springs = [];
    startVertex.normal = startVertex.clone().normalize();
    startVertex.originalPosition = startVertex.clone();
  }

  if(!endVertex.springs) {
    endVertex.springs = [];
    endVertex.normal = endVertex.clone().normalize();
    endVertex.originalPosition = endVertex.clone();
  }

  if(!startVertex.velocity) {
    startVertex.velocity = new THREE.Vector3();
  }

  startVertex.springs.push({
    start: startVertex,
    end: endVertex,
    length: startVertex.length(endVertex)
  });
}

function createLights() {
  ambientLight = new THREE.AmbientLight(0xEEEEEE);
  scene.add(ambientLight);

  lightTop = new THREE.PointLight(0x0f0000, 1, 2500);
  lightTop.position.z = 1200;
  lightTop.position.x = 200;
  lightTop.position.y = 500;
  scene.add(lightTop);

  // and another from the bottom
  lightBottom = new THREE.DirectionalLight(0x111111, 1);
  lightBottom.position.y = 840;
  scene.add(lightBottom);
}

function init() {
  const body = document.getElementsByTagName('body')[0];
  body.style.margin = 0;
  body.style.overflow = 'hidden';
  body.style.width = '100%';
  body.style.height = '100%';
  body.style.backgroundColor = 'black';

  const width = window.innerWidth, height = window.innerHeight, ratio = width / height;

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x1e1e1e );
  camera = new THREE.PerspectiveCamera(75, ratio, 0.1, 1000);
  camera.position.z = 700;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 5s ease-in-out';

  createObjects();
  createSprings();
  createLights();


  scene.add(camera);
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.opacity = '1';

  setTimeout(() => {
    displaceRandomFace();
    requestAnimationFrame(animate);
  }, 200);
}

init();
