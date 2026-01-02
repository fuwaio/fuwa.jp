import './style.css';
import * as THREE from 'three';
import * as TSL from 'three/tsl';
import { WebGPURenderer, MeshStandardNodeMaterial, PointsNodeMaterial } from 'three/webgpu';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

async function init() {
  const canvas = document.querySelector<HTMLCanvasElement>('#app')!;
  const renderer = new WebGPURenderer({ antialias: true, canvas });
  await renderer.init();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000205);
  // 霧（フォグ）を復活させて奥行きを強調
  scene.fog = new THREE.Fog(0x000205, 5, 20);

  const isMobile = window.innerWidth < 768;
  const camera = new THREE.PerspectiveCamera(20.2, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2, isMobile ? 12 : 8);

  // --- OrbitControls の設定変更 ---
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.autoRotate = false; // 自由鑑賞の邪魔になるためOFF
  // 上下左右、全方位から見られるように制限を解除
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // --- ライトの構成変更 (文字と一緒に動くようにリグ化) ---
  // ライトグループの構成をさらに強化
  const lightGroup = new THREE.Group();
  scene.add(lightGroup);

  // 右上からのメインライト
  const topLight = new THREE.PointLight(0x00ffff, 150, 20);
  topLight.position.set(5, 5, 5);
  lightGroup.add(topLight);

  // 左下からのフィルライト（少し紫っぽくすると近未来感アップ）
  const fillLight = new THREE.PointLight(0x8800ff, 80, 20);
  fillLight.position.set(-5, -5, 2);
  lightGroup.add(fillLight);

  // 真後ろからのバックライト（シルエットを際立たせる）
  const backLight = new THREE.PointLight(0xffffff, 100, 20);
  backLight.position.set(0, 0, -5);
  lightGroup.add(backLight);

  // material設定箇所を以下のように強化
  const material = new MeshStandardNodeMaterial();

  // フレネル効果（斜めから見た面を光らせる = エッジ強調）
  const viewDir = TSL.modelViewPosition.normalize().negate();
  const normal = TSL.normalView;
  const fresnel = TSL.dot(viewDir, normal).oneMinus().pow(3); // 数値を大きくすると鋭くなる

  material.colorNode = TSL.color(0x00111a);
  material.metalnessNode = TSL.float(1.0);
  material.roughnessNode = TSL.float(0.1);

  // 自発光（Emissive）にフレネルを足して、輪郭を光らせる
  const neonColor = TSL.color(0x00ffff);
  const time = TSL.time;
  const pulse = time.mul(1.5).sin().add(2.0).mul(0.5);

  // 「呼吸する光」 + 「エッジの強い光」を合成
  material.emissiveNode = neonColor.mul(pulse.add(fresnel.mul(5.0)));

  // --- 背景：グリッドの復活 ---
  const grid = new THREE.GridHelper(30, 60, 0xffcc00, 0x001122);
  grid.position.y = -1.5;
  (grid.material as any).transparent = true;
  (grid.material as any).opacity = 0.2;
  scene.add(grid);

  // --- 背景：パーティクルの復活 (WebGPU Node) ---
  const count = 2000;
  const pGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 30;
  }
  pGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pMaterial = new PointsNodeMaterial();
  pMaterial.transparent = true;
  pMaterial.colorNode = TSL.color(0x00ffff);
  pMaterial.size = 0.02;
  pMaterial.sizeAttenuation = true;

  const particles = new THREE.Points(pGeometry, pMaterial);
  scene.add(particles);

  // ライト
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0x00ffff, 100, 15);
  scene.add(pointLight);

  const loader = new FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    const geometry = new TextGeometry('fuwa.jp', {
      font: font,
      size: isMobile ? 0.4 : 0.7,
      depth: 0.2,
      curveSegments: 24, // 12から24に増やして滑らかに
      bevelEnabled: true,
      bevelThickness: 0.05, // 少し厚めに
      bevelSize: 0.03,
      bevelOffset: 0,
      bevelSegments: 5 // 角を丸めて光の反射を作る
    });
    geometry.center();

    // --- マテリアル設定 (ユニバーサルデザイン対応) ---
    const material = new MeshStandardNodeMaterial();

    // 1. ユニバーサルデザインで推奨される視認性の高いオレンジ
    const udOrange = TSL.color(0xffcc00);

    // 2. エッジ強調 (フレネル効果) 
    // これにより、どの角度から見ても文字の輪郭に「白い光」が乗り、境界が潰れません
    const viewDir = TSL.modelViewPosition.normalize().negate();
    const normal = TSL.normalView;
    const fresnel = TSL.dot(viewDir, normal).oneMinus().pow(3);

    material.colorNode = TSL.color(0x000000); // 表面を黒にすることで、反射と発光を強調
    material.metalnessNode = TSL.float(0.8);
    material.roughnessNode = TSL.float(0.2);

    const time = TSL.time;
    const pulse = time.mul(1.2).sin().add(2.0).mul(0.5); // 穏やかな明滅

    // 自発光：UDオレンジの明滅 + 輪郭を際立たせる純白のエッジライト
    const edgeLight = TSL.color(0xffffff).mul(fresnel).mul(2.5);
    material.emissiveNode = udOrange.mul(pulse).add(edgeLight);

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- ライトもUDオレンジに同期 ---
    pointLight.color.set(0xffcc00);

    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => {
      const t = Date.now() * 0.001;

      // 文字の微弱な浮遊
      mesh.position.y = Math.sin(t * 1.5) * 0.05;

      // パーティクルの回転
      particles.rotation.y = t * 0.02;

      // ライトをマウスに追従
      pointLight.position.x = mouse.x * 5;
      pointLight.position.y = mouse.y * 5;
      pointLight.position.z = 4;

      controls.update();
      renderer.render(scene, camera);
    });
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

init();