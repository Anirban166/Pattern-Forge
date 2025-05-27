import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const scene = new THREE.Scene();
const gradientCanvas = document.createElement('canvas');
gradientCanvas.width = 1;
gradientCanvas.height = 256;
const gradientContext = gradientCanvas.getContext('2d');
const backgroundGradient = gradientContext.createLinearGradient(0, 0, 0, gradientCanvas.height);

backgroundGradient.addColorStop(0, '#151515');
backgroundGradient.addColorStop(1, '#050505');

gradientContext.fillStyle = backgroundGradient;
gradientContext.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);
scene.background = new THREE.CanvasTexture(gradientCanvas);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
directionalLight.position.set(50, 50, 50).normalize();
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-50, -50, -50).normalize();
scene.add(fillLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const group = new THREE.Group();
scene.add(group);

const labelGroup = new THREE.Group();
scene.add(labelGroup);

group.position.x = -10;
labelGroup.position.x = -10;
group.position.y = -45;
labelGroup.position.y = -45;

const fontLoader = new FontLoader();
let font;

fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.153.0/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
  font = loadedFont;
  updatePattern();
});

const patternPresets = {
  shirt: [
  { type: "line", points: [[0, 0], [100, 0]], label: "Bottom line: (0, 0) to (100, 0)" },
  { type: "line", points: [[100, 0], [100, 90]], label: "Right line: (100, 0) to (100, 90)" },
  {
    type: "bezier",
    points: [
      [100, 90],
      [79, 96],
      [66, 113],
      [60, 130]
    ],
    label: "Armscye curve: (60, 130) to (100, 90)"
  },
  { type: "line", points: [[60, 130], [10, 130]], label: "Top line: (10, 130) to (60, 130)" },
  {
    type: "bezier",
    points: [
      [10, 130],
      [15, 126],
      [18, 118],
      [0, 100]
    ],
    label: "Collar curve: (0, 100) to (10, 130)"
  },
  { type: "line", points: [[0, 100], [0, 0]], label: "Left line: (0, 0) to (0, 100)" }
  ],
  collar: [
    { type: "line", points: [[90, 0], [90, 40]], label: "Right line: (90, 0) to (90, 40)" },
    { type: "bezier", points: [[90, 40], [90, 60], [63, 80], [45, 100]], label: "Bezier curve: (90, 40), (90, 60), (63, 80), (45, 100)" },
    { type: "line", points: [[45, 100], [0, 100]], label: "Top line: (0, 100) to (45, 100)" },
    { type: "line", points: [[0, 100], [0, 40]], label: "Left line: (0, 40) to (0, 100)" },
    { type: "bezier", points: [[0, 40], [18, -10], [72, -10], [90, 0]], label: "Bezier curve: (0, 40), (18, -10), (72, -10), (90, 0)" }
  ]
};

const lineMaterial = new LineMaterial({
  color: 0xffffff,
  linewidth: 3,
  resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
});

const generatePatternShape = (patternData, width, height, colorHex, isMirrored = false) => {
  let shape = new THREE.Shape();
  let lastPoint = null;
  let linePoints = [];

  const addShapeToGroup = (shp, pathLinePoints) => {
    if (shp && shp.getPoints().length > 1) {
      const geometry = new THREE.ShapeGeometry(shp);
      const fill = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.05
      }));
      group.add(fill);

      if (pathLinePoints.length > 0) {
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(pathLinePoints);

        const line = new Line2(lineGeometry, lineMaterial);
        group.add(line);
      }
    }
  };

  patternData.forEach((segment) => {
    if (segment.type === "break") {
      addShapeToGroup(shape, linePoints);
      shape = new THREE.Shape();
      lastPoint = null;
      linePoints = [];
      return;
    }

    const processedPoints = segment.points.map(p => isMirrored ? [-p[0], p[1]] : [p[0], p[1]]);
    const scaled = processedPoints.map(p => new THREE.Vector2(p[0] * (width / 100), p[1] * (height / 100)));
    const start = scaled[0];

    if (!lastPoint || !lastPoint.equals(start)) {
      shape.moveTo(start.x, start.y);
      if (linePoints.length === 0 || !(linePoints[linePoints.length - 3] === start.x && linePoints[linePoints.length - 2] === start.y)) {
          linePoints.push(start.x, start.y, 0);
      }
    }

    let labelPosition = new THREE.Vector3();
    const labelZOffset = 20;
    const labelLateralOffset = 8;
    const labelTextSize = 4;

    if (segment.type === "line") {
      shape.lineTo(scaled[1].x, scaled[1].y);
      linePoints.push(scaled[1].x, scaled[1].y, 0);

      const midPoint = new THREE.Vector2((scaled[0].x + scaled[1].x) / 2, (scaled[0].y + scaled[1].y) / 2);
      const lineVec = new THREE.Vector2().subVectors(scaled[1], scaled[0]).normalize();
      const normalVec = new THREE.Vector2(-lineVec.y, lineVec.x);

      labelPosition.set(
        midPoint.x + normalVec.x * labelLateralOffset,
        midPoint.y + normalVec.y * labelLateralOffset,
        labelZOffset
      );
      lastPoint = scaled[1];
    } else if (segment.type === "bezier") {
      shape.bezierCurveTo(scaled[1].x, scaled[1].y, scaled[2].x, scaled[2].y, scaled[3].x, scaled[3].y);
      const curve = new THREE.CubicBezierCurve(scaled[0], scaled[1], scaled[2], scaled[3]);
      const curvePoints = curve.getPoints(20);
      for (let i = 1; i < curvePoints.length; i++) {
          linePoints.push(curvePoints[i].x, curvePoints[i].y, 0);
      }

      const endPoint = scaled[3];
      const tangent = curve.getTangent(1).normalize();

      labelPosition.set(
        endPoint.x + tangent.y * labelLateralOffset,
        endPoint.y - tangent.x * labelLateralOffset,
        labelZOffset
      );
      lastPoint = scaled[3];
    }

    if (font && segment.label && labelGroup.visible && !isMirrored) {
      const labelText = segment.label || "";

      const textGeometry = new TextGeometry(labelText, {
        font: font,
        size: labelTextSize,
        height: 0.1,
        curveSegments: 4,
        bevelEnabled: false,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);

      textGeometry.computeBoundingBox();
      const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      textMesh.position.copy(labelPosition);
      textMesh.position.x -= textWidth / 2;

      textMesh.lookAt(camera.position);
      labelGroup.add(textMesh);
    }
  });
  addShapeToGroup(shape, linePoints);
};

const calculateTotalMeasurement = (patternData, currentWidth, currentHeight) => {
  let total = 0;
  patternData.forEach((segment) => {
    if (segment.type === "break") return;
    const scaledPoints = segment.points.map(p => new THREE.Vector2(p[0] * (currentWidth / 100), p[1] * (currentHeight / 100)));
    if (segment.type === "line") {
      total += scaledPoints[0].distanceTo(scaledPoints[1]);
    } else if (segment.type === "bezier") {
      const curve = new THREE.CubicBezierCurve(scaledPoints[0], scaledPoints[1], scaledPoints[2], scaledPoints[3]);
      const curvePoints = curve.getPoints(50);
      for (let i = 0; i < curvePoints.length - 1; i++) {
        total += curvePoints[i].distanceTo(curvePoints[i+1]);
      }
    }
  });
  return total;
};

const patternSelect = document.getElementById('patternPreset');
const widthSlider = document.getElementById('width');
const heightSlider = document.getElementById('height');
const scaleSlider = document.getElementById('scale');
const colorInput = document.getElementById('fillColor');
const measurementDisplay = document.getElementById('measurementDisplay');

const toggleLabelsCheckbox = document.getElementById('toggleLabelsCheckbox');
const mirrorPatternCheckbox = document.getElementById('mirrorPatternCheckbox');
const downloadDxfButton = document.getElementById('downloadDxfButton');

toggleLabelsCheckbox.addEventListener('change', () => {
  labelGroup.visible = toggleLabelsCheckbox.checked;
  updatePattern();
});

mirrorPatternCheckbox.addEventListener('change', updatePattern);

function updatePattern() {
  if (!font) return;

  while(group.children.length > 0){ group.remove(group.children[0]); }
  while(labelGroup.children.length > 0){ labelGroup.remove(labelGroup.children[0]); }

  const patternName = patternSelect.value;
  const originalPatternData = JSON.parse(JSON.stringify(patternPresets[patternName]));

  let currentWidth = parseFloat(widthSlider.value);
  let currentHeight = parseFloat(heightSlider.value);
  const currentScale = parseFloat(scaleSlider.value);
  const fillColor = colorInput.value;

  const effectiveWidth = currentWidth * currentScale;
  const effectiveHeight = currentHeight * currentScale;

  generatePatternShape(originalPatternData, effectiveWidth, effectiveHeight, fillColor, false);

  if (mirrorPatternCheckbox.checked) {
    generatePatternShape(originalPatternData, effectiveWidth, effectiveHeight, fillColor, true);
  }

  const totalMeasurement = calculateTotalMeasurement(originalPatternData, effectiveWidth, effectiveHeight);
  measurementDisplay.textContent = `Total Measurement: ${totalMeasurement.toFixed(2)} cm`;
}

patternSelect.addEventListener('change', updatePattern);
widthSlider.addEventListener('input', updatePattern);
heightSlider.addEventListener('input', updatePattern);
scaleSlider.addEventListener('input', updatePattern);
colorInput.addEventListener('input', updatePattern);

downloadDxfButton.addEventListener('click', async () => {
    const patternName = patternSelect.value;
    const basePatternData = JSON.parse(JSON.stringify(patternPresets[patternName]));

    const uiWidth = parseFloat(widthSlider.value);
    const uiHeight = parseFloat(heightSlider.value);
    const uiScale = parseFloat(scaleSlider.value);
    const isMirrored = mirrorPatternCheckbox.checked;

    const effectiveWidth = uiWidth * uiScale;
    const effectiveHeight = uiHeight * uiScale;

    const dxfSegments = [];

    const processSegmentsForDxf = (patternSegs, applyMirror) => {
        patternSegs.forEach(segment => {
            if (segment.type === "break") return;

            const processedDxfPoints = segment.points.map(p => {
                let x = p[0];
                let y = p[1];
                if (applyMirror) {
                    x = -x;
                }
                // Apply scaling based on effective dimensions
                // The points in patternPresets are relative to 100x100 virtual box
                return [x * (effectiveWidth / 100), y * (effectiveHeight / 100)];
            });
            dxfSegments.push({ type: segment.type, points: processedDxfPoints });
        });
    };

    processSegmentsForDxf(basePatternData, false);
    if (isMirrored) {
        processSegmentsForDxf(basePatternData, true);
    }

    try {
        const response = await fetch('/api/export-dxf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ segments: dxfSegments }),
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'pattern.dxf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const errorData = await response.json();
            console.error('DXF Export Error:', errorData.error, errorData.details || '');
            alert(`Error exporting DXF: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Network or other error during DXF export:', error);
        alert('Network error or unexpected issue during DXF export.');
    }
});

const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');

zoomInButton.addEventListener('click', () => {
  camera.position.z = Math.max(camera.position.z - 20, 10);
  controls.update();
});

zoomOutButton.addEventListener('click', () => {
  camera.position.z += 20;
  controls.update();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

  const newGradientCanvas = document.createElement('canvas');
  newGradientCanvas.width = 1;
  newGradientCanvas.height = 256;
  const newGradientContext = newGradientCanvas.getContext('2d');
  const newBackgroundGradient = newGradientContext.createLinearGradient(0, 0, 0, newGradientCanvas.height);
  newBackgroundGradient.addColorStop(0, '#151515');
  newBackgroundGradient.addColorStop(1, '#050505');
  newGradientContext.fillStyle = newBackgroundGradient;
  newGradientContext.fillRect(0, 0, newGradientCanvas.width, newGradientCanvas.height);
  scene.background.dispose();
  scene.background = new THREE.CanvasTexture(newGradientCanvas);
});

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

animate();
updatePattern();