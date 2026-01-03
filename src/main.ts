import './style.css';
import * as THREE from 'three';
import * as TSL from 'three/tsl';
import { WebGPURenderer, MeshPhysicalNodeMaterial, PostProcessing } from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

async function init() {
  const canvas = document.querySelector<HTMLCanvasElement>('#app')!;
  const loaderElement = document.querySelector<HTMLDivElement>('#loader')!;

  const renderer = new WebGPURenderer({ antialias: true, canvas });
  await renderer.init();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000205);

  const isMobile = window.innerWidth < 768;
  const camera = new THREE.PerspectiveCamera(20.2, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, isMobile ? 12 : 8);

  // --- Bloomの設定（正面も滲ませるために閾値を調整） ---
  const scenePass = TSL.pass(scene, camera);
  const bloomPass = bloom(scenePass, 0.4, 0.5, 0.4);
  const outputNode = scenePass.add(bloomPass);

  const postProcessing = new PostProcessing(renderer);
  postProcessing.outputNode = outputNode;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  // --- ジャイロ連動 ---
  let tiltX = 0, tiltY = 0;
  window.addEventListener('deviceorientation', (event) => {
    tiltX = (event.beta || 0) / 45;
    tiltY = (event.gamma || 0) / 45;
  });

  const loader = new FontLoader();
  loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    const geometry = new TextGeometry('fuwa.jp', {
      font: font, size: isMobile ? 0.4 : 0.7, depth: 0.2, curveSegments: 24,
      bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 5
    });
    geometry.center();

    const material = new MeshPhysicalNodeMaterial();
    const udOrange = TSL.color(0xffcc00);

    material.colorNode = udOrange;

    // 1. 液体感のうねり（さらに滑らかにして黒い線を撲滅）
    const time = TSL.time.mul(0.12);
    // ノイズの影響度を 0.05 -> 0.03 に下げ、極端な影の落ち込みを防ぎます
    const noise = TSL.mx_noise_float(TSL.positionLocal.mul(0.3).add(time));
    material.normalNode = TSL.normalLocal.add(noise.mul(0.03)).normalize();

    // 2. ヌルヌルとした質感（白い反射を抑える調整）
    material.clearcoatNode = TSL.float(0.4);
    material.clearcoatRoughnessNode = TSL.float(0.15); // 0.01 -> 0.15 に上げ、ハイライトをボカします
    material.iorNode = TSL.float(1.5); // 屈折率を下げて、正面の反射をマイルドに
    material.roughnessNode = TSL.float(0.8); // 0.3 -> 0.4 に上げ、白いテカリを拡散させます
    material.metalnessNode = TSL.float(0.0);

    // 3. 発光ロジック：前後を区別せず、ライトに対して自然に反応させる
    const viewDir = TSL.modelViewPosition.normalize().negate();

    // dotNVの絶対値をとることで、表でも裏でも「カメラを向いている面」を同じように扱います
    const dotNV = TSL.dot(viewDir, TSL.normalView).abs();

    // フレネル（エッジ光）を極限まで弱く(0.05)し、指数をpow(2.0)に下げることで、
    // 特定の角度だけが爆発的に光る（拡散する）のを防ぎます
    const fresnel = dotNV.oneMinus().pow(2.0);

    // 正面方向の発光
    const frontSide = dotNV.pow(1.5);

    const pulse = TSL.time.mul(0.6).sin().add(1.5).mul(0.5);

    // 正面とエッジをマイルドに合成。
    // fresnelの倍率を0.05に下げたことで、背面の「光の爆発」を抑え込みます
    const emissiveMix = frontSide.mul(0.6).add(fresnel.mul(0.05));

    // 全体の底上げ(0.2)
    material.emissiveNode = udOrange.mul(pulse).mul(emissiveMix.add(0.2));

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- 1. 固定ライト（真上から常に照らす） ---
    const topFixedLight = new THREE.SpotLight(0xffffff, 80);
    topFixedLight.position.set(0, 10, 2); // 真上より少し手前
    topFixedLight.angle = Math.PI / 4;
    topFixedLight.penumbra = 0.8;
    topFixedLight.decay = 2;
    topFixedLight.target = mesh;
    scene.add(topFixedLight);

    // --- 2. 4つの公転スポットライトの設定 ---
    const spotIntensity = 10; // 合計5灯になるため、公転ライトの強さを少し抑えて調整
    const spots: THREE.SpotLight[] = [];

    for (let i = 0; i < 4; i++) {
      const spot = new THREE.SpotLight(0xffffff, spotIntensity);
      spot.angle = Math.PI / 6;
      spot.penumbra = 0.5;
      spot.decay = 2;
      spot.target = mesh;
      scene.add(spot);
      spots.push(spot);
    }

    // 4. 【追加】環境光（AmbientLight）
    // どの角度からも一定の光を当てることで、法線の歪みによる「完全な黒」を消し去ります
    const ambientLight = new THREE.AmbientLight(0xffcc00, 0.2); // UDイエロー系の薄い光
    scene.add(ambientLight);

    // ローディング解除
    setTimeout(() => {
      if (loaderElement) {
        loaderElement.style.opacity = '0';
        setTimeout(() => loaderElement.remove(), 1000);
      }
    }, 1100);

    renderer.setAnimationLoop(async () => {
      const t = Date.now() * 0.001;

      // 文字の挙動
      mesh.position.y = Math.sin(t * 1.5) * 0.05 + (tiltX * 0.1);
      mesh.rotation.x = tiltX * 0.05;
      mesh.rotation.y = t * 0.1 + (tiltY * 0.1);

      // --- 4つのライトの公転運動 ---
      const radius = 8;
      spots.forEach((spot, i) => {
        // 90度ずつずらして配置
        const angle = t * 0.8 + (i * Math.PI / 2);
        spot.position.x = Math.cos(angle) * radius;
        spot.position.z = Math.sin(angle) * radius;

        // 公転ライトは上下に大きく振ることで、固定ライトと干渉しない動きにする
        const yOffset = i % 2 === 0 ? Math.sin(t * 0.7) : Math.cos(t * 0.7);
        spot.position.y = yOffset * 6;
      });

      controls.update();
      postProcessing.render();
    });
  });
}

init();