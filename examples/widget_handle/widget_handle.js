/* globals Stats, dat*/

import HelpersStack from '../../src/helpers/helpers.stack';
import LoadersVolume from '../../src/loaders/loaders.volume';
import WidgetsHandle from '../../src/widgets/widgets.handle';
import WidgetsRuler from '../../src/widgets/widgets.ruler';
import WidgetsVoxelProbe from '../../src/widgets/widgets.voxelProbe';
import WidgetsAnnotation from '../../src/widgets/widgets.annotation';
import ControlsTrackball from '../../src/controls/controls.trackball';

// standard global variables
let controls;
let renderer;
let threeD;
let stats;
let scene;
let camera;
let offsets;
let widgets = [];
const widgetsAvailable = [
  'Handle',
  'Ruler',
  'VoxelProbe',
  'Annotation',
];
const guiObjects = {
  type: 'Handle',
};

function init() {
  // this function is executed on each animation frame
  function animate() {
    // render
    controls.update();
    renderer.render(scene, camera);
    stats.update();

    // request new frame
    requestAnimationFrame(function() {
      animate();
    });
  }

  // renderer
  threeD = document.getElementById('r3d');
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
  renderer.setClearColor(0xFFFFFF, 1);

  threeD.appendChild(renderer.domElement);

  // stats
  stats = new Stats();
  threeD.appendChild(stats.domElement);

  // scene
  scene = new THREE.Scene();

  // camera
  camera =
    new THREE.PerspectiveCamera(
      45, threeD.offsetWidth / threeD.offsetHeight,
      1, 10000000);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 150;
  // controls
  controls = new ControlsTrackball(camera, threeD);
  controls.rotateSpeed = 4.4;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  animate();
}

window.onload = function() {
  // init threeJS...
  init();

  const file =
    'https://cdn.rawgit.com/FNNDSC/data/master/dicom/adi_brain/36749894';

  const loader = new LoadersVolume(threeD);
  // Start off with a promise that always resolves
  loader.load(file)
  .then((series) => {
    const stack = series[0]._stack[0];
    loader.free();
    let stackHelper = new HelpersStack(stack);
    // update plane direction...
    let dirLPS = new THREE.Vector3(0,0,1).normalize();

    // update slice and THEN its border
    stackHelper.slice.planeDirection = dirLPS;
 
    scene.add(stackHelper);

    threeD.addEventListener('mouseup', function(evt) {
      // if something hovered, exit
      for (let widget of widgets) {
        if (widget.active) {
          widget.onEnd(evt);
          return;
        }
      }
    });

    threeD.addEventListener('mousemove', function(evt) {
      // if something hovered, exit
      let cursor = 'default';
      for (let widget of widgets) {
        widget.onMove(evt);
        if (widget.hovered) {
          cursor = 'pointer';
        }
      }

      threeD.style.cursor = cursor;
    });

    threeD.addEventListener('mousedown', function(evt) {
      // if something hovered, exit
      for (let widget of widgets) {
        if (widget.hovered) {
          widget.onStart(evt);
          return;
        }
      }

      threeD.style.cursor = 'default';

      // mouse position
      let mouse = {
        x: (event.clientX - offsets.left) / threeD.offsetWidth * 2 - 1,
        y: -((event.clientY - offsets.top) / threeD.offsetHeight)
          * 2 + 1,
      };

      // update the raycaster
      let raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      let intersects = raycaster.intersectObject(stackHelper.slice.mesh);

      if (intersects.length <= 0) {
        return;
      }

      let widget = null;
      switch (guiObjects.type) {
        case 'Handle':
          widget =
            new WidgetsHandle(stackHelper.slice.mesh, controls, camera, threeD);
          widget.worldPosition = intersects[0].point;
          break;
        case 'Ruler':
          widget =
            new WidgetsRuler(stackHelper.slice.mesh, controls, camera, threeD);
          widget.worldPosition = intersects[0].point;
          break;
        case 'VoxelProbe':
          widget =
            new WidgetsVoxelProbe(
              stack, stackHelper.slice.mesh, controls, camera, threeD);
          widget.worldPosition = intersects[0].point;
          break;
        case 'Annotation':
          widget =
            new WidgetsAnnotation(stackHelper.slice.mesh, controls, camera, threeD);
          widget.worldPosition = intersects[0].point;
          break;
        default:
          widget =
            new WidgetsHandle(stackHelper.slice.mesh, controls, camera, threeD);
          widget.worldPosition = intersects[0].point;
          break;
      }

      widgets.push(widget);
      scene.add(widget);
      console.log(widgets.length)
      if (widgets.length >= 3) {
        // find the long axis
        // distances:
        let points = widgets.map(widget => widget.worldPosition)
        let dist01 = points[0].distanceTo(points[1])
        let dist12 = points[1].distanceTo(points[2])
        let dist20 = points[2].distanceTo(points[0])
        let maxDist = dist01;
        let longAxis = [0, 1]
        if (dist12 > maxDist) { 
          maxDist = dist12;
          longAxis = [1, 2]; 
        }
        if (dist20 > maxDist) { 
          maxDist = dist20;
          longAxis = [2, 0]; 
        }
        console.log("0,1", dist01)
        console.log("1,2", dist12)
        console.log("2,0", dist20)
        console.log(longAxis)
        console.log(maxDist)
        // find get the other point
        let otherPoint = [0,1,2].filter(index => !longAxis.includes(index))[0]
        console.log(otherPoint)
        // draw elipse with long axis that passes through other point
        // - get line of long axis
        let longLine = new THREE.Line3(points[longAxis[0]], points[longAxis[1]])
        // - get distance from line to 3rd point (using this for short radius instead of finding ellipse through 3rd point)
        let longRay = new THREE.Ray(points[longAxis[0]]).lookAt(points[longAxis[1]])
        let shortRadius = longRay.distanceToPoint(points[otherPoint])
        // - create ellipse
        let centerPoint = longLine.getCenter()
        var curve = new THREE.EllipseCurve(
          0,  centerPoint.y,            // ax, aY
          longLine.distance() / 2, shortRadius,           // xRadius, yRadius
          0,  2 * Math.PI,  // aStartAngle, aEndAngle
          false,            // aClockwise
          0                 // aRotation
        );
        
        curve.worldPosition = longLine.getCenter()
        var path = new THREE.Path( curve.getPoints( 50 ) );
        var geometry = path.createPointsGeometry( 50 );
        var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
        
        // Create the final object to add to the scene
        var ellipse = new THREE.Line( geometry, material );
        // - get center

        scene.add(ellipse)
      }
    });

    function onWindowResize() {
      camera.aspect = threeD.clientWidth / threeD.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(threeD.clientWidth, threeD.clientHeight);

      // update offset
      const box = threeD.getBoundingClientRect();

      const body = document.body;
      const docEl = document.documentElement;

      const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft =
        window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const clientTop = docEl.clientTop || body.clientTop || 0;
      const clientLeft = docEl.clientLeft || body.clientLeft || 0;

      const top = box.top + scrollTop - clientTop;
      const left = box.left + scrollLeft - clientLeft;

      offsets = {
        top: Math.round(top),
        left: Math.round(left),
      };

      // repaint all widgets
      for (let widget of widgets) {
        widget.update();
      }
    }

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    //
    const centerLPS = stack.worldCenter();
    camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
    controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);
    camera.updateProjectionMatrix();

    const gui = new dat.GUI({
      autoPlace: false,
    });

    const widgetFolder = gui.addFolder('Widget');
    widgetFolder.add(guiObjects, 'type', widgetsAvailable);
    widgetFolder.open();

    const customContainer = document.getElementById('my-gui-container');
    customContainer.appendChild(gui.domElement);
  });
};
