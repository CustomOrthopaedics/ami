/* globals dat, AMI*/

var WidgetsHandle = AMI.default.Widgets.Handle;
var widgets = [];
let ellipse;
let pelvicTiltLine;
let femurShaftLine;
let femurNeckLine;
let teardropLine;
let lines = {
  'pelvicTilt': pelvicTiltLine,
  'femurShaft': femurShaftLine,
  'femurNeck': femurNeckLine,
  'teardrop': teardropLine,
}
// Setup renderer
var container = document.getElementById('container');
var renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(container.offsetWidth, container.offsetHeight);
renderer.setClearColor(0x353535, 1);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// utility function
let range = (start, end) => Array.from({length: end - start}, (v, i) => i + start);

// Setup scene
var scene = new THREE.Scene();

// Setup camera
var camera = new AMI.OrthographicCamera(
    container.clientWidth / -2,
    container.clientWidth / 2,
    container.clientHeight / 2,
    container.clientHeight / -2,
    0.1,
    10000
);

// Setup controls
var controls = new AMI.TrackballOrthoControl(camera, container);
controls.staticMoving = true;
controls.noRotate = true;
camera.controls = controls;

/**
 * Handle window resize
 */
function onWindowResize() {
    camera.canvas = {
        width: container.offsetWidth,
        height: container.offsetHeight,
    };
    camera.fitBox(2);

    renderer.setSize(container.offsetWidth, container.offsetHeight);
}
window.addEventListener('resize', onWindowResize, false);

var guiDat
/**
 * Build GUI
 */
function gui(stackHelper) {
  if (guiDat != null) {
    return;
  }
  guiDat = new dat.GUI({
    autoPlace: false,
  });

  var customContainer = document.getElementById('my-gui-container');
  customContainer.appendChild(guiDat.domElement);
  // only reason to use this object is to satusfy data.GUI
  var camUtils = {
    invertRows: false,
    invertColumns: false,
    rotate45: false,
    rotate: 0,
    orientation: 'default',
    convention: 'radio',
    xray: 'AP',
  };

  // camera
  var cameraFolder = guiDat.addFolder('Camera');
  var invertRows = cameraFolder.add(camUtils, 'invertRows');
  invertRows.onChange(function() {
    camera.invertRows();
  });

    var invertColumns = cameraFolder.add(camUtils, 'invertColumns');
    invertColumns.onChange(function() {
        camera.invertColumns();
    });

    var rotate45 = cameraFolder.add(camUtils, 'rotate45');
    rotate45.onChange(function() {
        camera.rotate();
    });

    cameraFolder
        .add(camera, 'angle', 0, 360)
        .step(1)
        .listen();

    let orientationUpdate = cameraFolder.add(camUtils, 'orientation', ['default', 'axial', 'coronal', 'sagittal']);
    orientationUpdate.onChange(function(value) {
        camera.orientation = value;
        camera.update();
        camera.fitBox(2);
        stackHelper.orientation = camera.stackOrientation;
    });

    let conventionUpdate = cameraFolder.add(camUtils, 'convention', ['radio', 'neuro']);
    conventionUpdate.onChange(function(value) {
        camera.convention = value;
        camera.update();
        camera.fitBox(2);
    });

  let xrayUpdate = cameraFolder.add(
    camUtils, 'xray', ['AP', 'lateral']);
  xrayUpdate.onChange(function(value) {
    loadXray(value)
  });

    cameraFolder.open();

    // of course we can do everything from lesson 01!
    var stackFolder = guiDat.addFolder('Stack');
    stackFolder
        .add(stackHelper, 'index', 0, stackHelper.stack.dimensionsIJK.z - 1)
        .step(1)
        .listen();
    stackFolder
        .add(stackHelper.slice, 'interpolation', 0, 1)
        .step(1)
        .listen();
  stackFolder.open();
}

/**
 * Start animation loop
 */
function animate() {
    controls.update();
    renderer.render(scene, camera);

    // request new frame
    requestAnimationFrame(function() {
        animate();
    });
}
animate();

function loadXray(plane) {
  if (plane === "AP") {
    maxWidgetCount = stageEnd
    loadFile('/lessons/03/CR1', doApTemplating)
  }
  else if (plane === "lateral") {
    maxWidgetCount = 3
    loadFile('/lessons/03/CR2', getPelvicTilt)
  }
  else {
    // do nothing
  }
}

// Define the templating stages
let stageStart = 0
let stageEnd = 3
const ellipseRange = range(stageStart, stageEnd)
stageStart = stageEnd
stageEnd += 1
const femurHeadRange  = range(stageStart, stageEnd)
stageStart = stageEnd
stageEnd += 2
const femurShaftRange = range(stageStart, stageEnd)
stageStart = stageEnd
stageEnd += 2
const teardropRange = range(stageStart, stageEnd)

let maxWidgetCount = stageEnd

function doApTemplating (widgetNumber) {
  let last = arr => arr[arr.length-1];
  if (ellipseRange.includes(widgetNumber)) {
    drawEllipse()
  }
  else if (femurHeadRange.includes(widgetNumber)) {
    console.log('Femur head templating', widgetNumber)
  }
  else if (femurShaftRange.includes(widgetNumber)) {
    getFemurShaft(widgets.slice(femurShaftRange[0], last(femurShaftRange) + 1))
  }
  else if (teardropRange.includes(widgetNumber)) {
    getTeardropLine(widgets.slice(teardropRange[0], last(teardropRange) + 1))
  }
}

function drawEllipse () {
    // CREATE ELLIPSE
    // remove old ellipse
    if (ellipse != null) {
      scene.remove(ellipse);
    }
    // find the long axis
    // distances:
    let points = widgets.map(widget => widget.worldPosition)
    if (points.length < 3) {
      return
    } 
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
    //  console.log("0,1", dist01)
    //  console.log("1,2", dist12)
    //  console.log("2,0", dist20)
    //  console.log("long axis", longAxis)
    //  console.log("max dist", maxDist)
    // find get the other point
    let otherPoint = [0,1,2].filter(index => !longAxis.includes(index))[0]
    // console.log(otherPoint)
    // draw elipse with long axis that passes through other point
    // - get line of long axis
    let longLine = new THREE.Line3(points[longAxis[0]], points[longAxis[1]])
    // - get distance from line to 3rd point (using this for short radius instead of finding ellipse through 3rd point)
    let longRay = new THREE.Ray(points[longAxis[0]]).lookAt(points[longAxis[1]])
    let yRadius = longRay.distanceToPoint(points[otherPoint])
    // - get angle between line and x-axis
    let startPoint = points[longAxis[0]].clone()
    let endPoint = points[longAxis[1]].clone()
    if (startPoint.y > endPoint.y) {
      startPoint = points[longAxis[1]].clone()
      endPoint = points[longAxis[0]].clone()
    }

    let vector = endPoint.clone().sub(startPoint)
    //console.log("vector:", vector)
    let rotation = vector.angleTo(new THREE.Vector3(1,0,0))
    //console.log("roation:", rotation)
    // - create ellipse
    let centerPoint = longLine.getCenter()
    var curve = new THREE.EllipseCurve(
      centerPoint.x,  centerPoint.y,            // ax, aY
      longLine.distance() / 2, yRadius,           // xRadius, yRadius
      0,  2 * Math.PI,  // aStartAngle, aEndAngle
      false,            // aClockwise
      rotation                 // aRotation
    );

    curve.worldPosition = longLine.getCenter()
    var path = new THREE.Path( curve.getPoints( 50 ) );
    var geometry = path.createPointsGeometry( 50 );
    var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

    // Create the final object to add to the scene
    ellipse = new THREE.Line( geometry, material );
    // - get center

    scene.add(ellipse)
}

function drawLineSegment(startPoint, endPoint, linesObject, lineName) {
  if (linesObject[lineName] != null) {
    scene.remove(linesObject[lineName]);
  }
  let geometry = new THREE.Geometry();
  geometry.vertices.push(
    startPoint,
    endPoint
  );
  let material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
  linesObject[lineName] = new THREE.LineSegments( geometry, material );
  scene.add(linesObject[lineName])
}

function drawTeardropLine(startPoint, endPoint) {
  drawLineSegment(startPoint, endPoint, lines, 'teardrop')
}

function getTeardropLine(shaftWidgets) {
  let points = shaftWidgets.map(widget => widget.worldPosition)
  if (points.length < 2) {
    return
  } 
  let shaftVector = points[1].clone().sub(points[0])
  let tilt = THREE.Math.radToDeg(shaftVector.angleTo(new THREE.Vector3(0,-1,0)))
  // FOR DEBUGGING
  console.log("teardrop tilt:", tilt)
  drawTeardropLine(points[0], points[1])
  // END FOR DEBUGGING
  return tilt
}

function drawFemurShaftLine(startPoint, endPoint) {
  drawLineSegment(startPoint, endPoint, lines, 'femurShaft')
}

function getFemurShaft(shaftWidgets) {
  let points = shaftWidgets.map(widget => widget.worldPosition)
  if (points.length < 2) {
    return
  } 
  let shaftVector = points[1].clone().sub(points[0])
  let femurTilt = THREE.Math.radToDeg(shaftVector.angleTo(new THREE.Vector3(0,-1,0)))
  // FOR DEBUGGING
  console.log("femur tilt:", femurTilt)
  drawFemurShaftLine(points[0], points[1])
  // END FOR DEBUGGING
  return femurTilt
}

function drawPelvicTiltLine(startPoint, endPoint) {
  drawLineSegment(startPoint, endPoint, lines, 'pelvicTilt')
}

function getPelvicTilt() {
  let points = widgets.map(widget => widget.worldPosition)
  if (points.length < 3) {
    return
  } 
  let midpoint = points[1].clone().add(points[2]).divideScalar(2)
  let middleVector = midpoint.clone().sub(points[0])
  let pelvicTilt = THREE.Math.radToDeg(middleVector.angleTo(new THREE.Vector3(0,-1,0)))
  // FOR DEBUGGING
  console.log("pelvic tilt:", pelvicTilt)
  drawPelvicTiltLine(points[0], midpoint)
  // END FOR DEBUGGING
  return pelvicTilt
}

let stackHelper;
let mouseEventListeners;

function loadFile(file, templatingFunction){
  // Setup loader
  var loader = new LoadersVolume(container);
  //var file = 'https://cdn.rawgit.com/FNNDSC/data/master/nifti/adi_brain/adi_brain.nii.gz';

  loader.load(file)
  .then( function() {
      if (stackHelper != null) {
        scene.remove(stackHelper);
        for (let widget of widgets) {
          scene.remove(widget);
          widget.free()
        }
        widgets = [];
        if (ellipse != null) {
          scene.remove(ellipse);
        }
        for (let line of Object.values(lines)) {
          if (line != null) {
            scene.remove(line);
          }
        }
      }
      // merge files into clean series/stack/frame structure
      var series = loader.data[0].mergeSeries(loader.data);
      var stack = series[0].stack[0];
      loader.free();
      loader = null;
      // be carefull that series and target stack exist!
      stackHelper = new HelpersStack(stack);
      // stackHelper.orientation = 2;
      // stackHelper.index = 56;

      // tune bounding box
      stackHelper.bbox.visible = false;

      // tune slice border
      stackHelper.border.color = 0xFF9800;
      // stackHelper.border.visible = false;

      scene.add(stackHelper);

      // build the gui
      gui(stackHelper);

      // center camera and interactor to center of bouding box
      // for nicer experience
      // set camera
      var worldbb = stack.worldBoundingBox();
      var lpsDims = new THREE.Vector3(
        worldbb[1] - worldbb[0],
        worldbb[3] - worldbb[2],
        worldbb[5] - worldbb[4]
      );

      // box: {halfDimensions, center}
      var box = {
        center: stack.worldCenter().clone(),
        halfDimensions:
          new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10),
      };

      // init and zoom
      var canvas = {
          width: container.clientWidth,
          height: container.clientHeight,
      };

      camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
      camera.box = box;
      camera.canvas = canvas;
      camera.update();
      camera.fitBox(2);
   
      let mouseUpListener = function(evt) {
        for (let widget of widgets) {
          if (widget.active) {
            widget.onEnd(evt);
            return;
          }
        }
      }
      let mouseMoveListener = function(evt) {
        let cursor = 'default';
        for (let i = 0; i < widgets.length; ++i) {
          let widget = widgets[i]
          widget.onMove(evt);
          if (widget.hovered) {
            cursor = 'pointer';
          }
          if (widget.dragged) {
            templatingFunction(i)
          }
        }

        container.style.cursor = cursor;
      }
      let mouseDownListener = function(evt) {
        // if something hovered, exit
        for (let widget of widgets) {
          if (widget.hovered) {
            widget.onStart(evt);
            return;
          }
        }

        if (widgets.length >= maxWidgetCount) {
          return;
        }
        container.style.cursor = 'default';

        // mouse position
        let mouse = {
          x: (event.clientX) / container.offsetWidth * 2 - 1,
          y: -((event.clientY) / container.offsetHeight)
            * 2 + 1,
        };

        // update the raycaster
        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        let intersects = raycaster.intersectObject(stackHelper.slice.mesh);

        if (intersects.length <= 0) {
          return;
        }

        let widget = new WidgetsHandle(stackHelper.slice.mesh, controls, camera, container);
        widget.worldPosition = intersects[0].point;

        widgets.push(widget);
        scene.add(widget);
        templatingFunction(widgets.length - 1)
      }
      if (mouseEventListeners != null) {
        for (let evt in mouseEventListeners) {
          container.removeEventListener(evt, mouseEventListeners[evt])
        }
      }
      mouseEventListeners = {
        'mouseup': mouseUpListener,
        'mousemove': mouseMoveListener,
        'mousedown': mouseDownListener,
      }
      for (let evt in mouseEventListeners) {
        container.addEventListener(evt, mouseEventListeners[evt])
      }
  })
  .catch(function(error) {
      window.console.log('oops... something went wrong...');
      window.console.log(error);
  });
}

loadXray("AP")
