/* globals dat, AMI*/

var LoadersVolume = AMI.VolumeLoader;
import WidgetsHandle from 'base/widgets/widgets.handle';
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

var implantUtils = {
  dynamicNeckLength: false, 
}

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

  var implantFolder = guiDat.addFolder('Implant');
  implantFolder.add(implantUtils, 'dynamicNeckLength');
  implantFolder.open()
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
    loadFile('/CR1', doApTemplating)
  }
  else if (plane === "lateral") {
    maxWidgetCount = 3
    loadFile('/CR2', getPelvicTilt)
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
stageStart = stageEnd
stageEnd += 3
const appRange = range(stageStart, stageEnd)

let femurHeadPos;
let maxWidgetCount = stageEnd
let femurShaftPoints 

let teardropVector;
let majorAxisVector;

function doApTemplating (widgetNumber) {
  let last = arr => arr[arr.length-1];
  let inclinationChanged = false
  if (ellipseRange.includes(widgetNumber)) {
    let oldVector
    if (majorAxisVector != null) {
      oldVector = majorAxisVector.clone()
    } 
    majorAxisVector = drawEllipse()
    drawAcetabularOutlines()
    if (oldVector != null && !oldVector.equals(majorAxisVector)) { inclinationChanged = true; }
  }
  else if (femurHeadRange.includes(widgetNumber)) {
    femurHeadPos = widgets[widgetNumber].worldPosition
    console.log('Femur head templating', widgetNumber)
    drawEllipse()
    drawAcetabularOutlines()
    setFemoralOrientation(femurHeadPos, femurShaftPoints)
    drawFemoralOutlines()
  }
  else if (femurShaftRange.includes(widgetNumber)) {
    femurShaftPoints = getFemurShaft(widgets.slice(femurShaftRange[0], last(femurShaftRange) + 1))
    setFemoralOrientation(femurHeadPos, femurShaftPoints)
    drawFemoralOutlines()
  }
  else if (teardropRange.includes(widgetNumber)) {
    let oldVector
    if (teardropVector != null) {
      oldVector = teardropVector.clone()
    }
    teardropVector = getTeardropLine(widgets.slice(teardropRange[0], last(teardropRange) + 1))
    if (oldVector != null && !oldVector.equals(teardropVector) || 
        oldVector == null && teardropVector != null) { inclinationChanged = true; }
  }
  else if (appRange.includes(widgetNumber)) {
    console.log('APP (ASIS & Symphysis) templating', widgetNumber)
  }
  if (teardropVector != null && inclinationChanged) {
    let inclination = calculateInclination(majorAxisVector, teardropVector)
    drawInclination(inclination)
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
    // from Lewenick, anteversion is inverse sin of short diameter over long diameter
    //let anteversion = Math.asin( (yRadius * 2) / longLine.distance() )
    // Keep rotation from going upside down
    if (rotation < Math.PI / 2) {
      rotation += Math.PI
    }
    let anteversion = 0
    let cupPosition = femurHeadPos ? femurHeadPos : centerPoint
    setCupOrientation(cupPosition, rotation /*inclination*/, anteversion)

    //let angleToVertical = vector.angleTo(new THREE.Vector3(0,1,0))
    return vector // THREE.Math.radToDeg(angleToVertical)
}

function drawAcetabularOutlines() {
  cupLines = drawImplantIntersection(0, cupMesh, cupLines)
  linerLines = drawImplantIntersection(0, linerMesh, linerLines)
}
function drawFemoralOutlines() {
  headLines = drawImplantIntersection(0, headMesh, headLines)
  stemLines = drawImplantIntersection(0, stemMesh, stemLines)
}
function calculateInclination(majorAxisVector, teardropVector) {
  let rotation = Math.PI / 2
  if (teardropVector.x > 0) {
    rotation = -rotation
  }
  let perp = teardropVector.clone()
  perp.applyAxisAngle(new THREE.Vector3(0,0,-1), rotation)
  
  let inclination = THREE.Math.radToDeg(majorAxisVector.angleTo(perp))
  return inclination
}

function drawPelvicTilt(pelvicTilt) {
  let id = 'pelvicTiltDisplay'
  let text = "Pelvic tilt: " + pelvicTilt.toFixed(1) + " degrees";
  drawText(text, id, 100)
}
function drawInclination(inclination) {
  let id = 'inclinationDisplay'
  let text = "Inclination: " + inclination.toFixed(1) + " degrees";
  drawText(text, id, 60)
}
function drawText(text, id, yPos) {
  let text2 = document.getElementById(id)
  if (text2 == null) {
    text2 = document.createElement('div');
    text2.style.position = 'absolute';
    text2.id = id;
    //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
    text2.style.width = 260;
    text2.style.height = 25;
    text2.style.backgroundColor = "rgba(0,0,0,.5)";
    text2.style.top = yPos + 'px';
    text2.style.left = 100 + 'px';
  }
  text2.innerHTML = text;
  document.body.appendChild(text2);
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
  return shaftVector
}

function drawFemurShaftLine(startPoint, endPoint) {
  drawLineSegment(startPoint, endPoint, lines, 'femurShaft')
}

function getFemurShaft(shaftWidgets) {
  let points = shaftWidgets.map(widget => widget.worldPosition)
  if (points.length < 2) {
    return
  } 
  // FOR DEBUGGING
  drawFemurShaftLine(points[0], points[1])
  // END FOR DEBUGGING
  return points
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
  drawPelvicTilt(pelvicTilt)
  return pelvicTilt
}





// Load STL
let cupMesh
let linerMesh
let headMesh
let stemMesh
// Add lighting
scene.add(new THREE.AmbientLight(0xaaaaaa));

var RASToLPS = new THREE.Matrix4();
RASToLPS.set(-1, 0, 0, 0,
              0, -1, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1);

// Load STL model
var loaderSTL = new THREE.STLLoader();
loaderSTL.load('/cup-508-11-56f-ot.stl',
  function(geometry) {
    var material = new THREE.MeshBasicMaterial()
    cupMesh = new THREE.Mesh(geometry, material);
    // to LPS space
    cupMesh.applyMatrix(RASToLPS);
    scene.add(cupMesh);
    cupMesh.visible = false
});

// Load STL model
loaderSTL.load('/Liner-623-00-28f.stl',
  function(geometry) {
    var material = new THREE.MeshBasicMaterial()
    linerMesh = new THREE.Mesh(geometry, material);
    // to LPS space
    linerMesh.applyMatrix(RASToLPS);
    scene.add(linerMesh);
    linerMesh.visible = false
});

// Load STL model
loaderSTL.load('/Head-6260-9-128.stl',
  function(geometry) {
    var material = new THREE.MeshBasicMaterial()
    headMesh = new THREE.Mesh(geometry, material);
    // to LPS space
    headMesh.applyMatrix(RASToLPS);
    scene.add(headMesh);
    headMesh.visible = false
});

function loadStem(fileName) {
  let shouldDraw = false
  if (stemMesh != null) {
    scene.remove(stemMesh)
    shouldDraw = true
  }
  // Load STL model
  loaderSTL.load(fileName,
    function(geometry) {
      var material = new THREE.MeshBasicMaterial()
      stemMesh = new THREE.Mesh(geometry, material);
      // to LPS space
      stemMesh.applyMatrix(RASToLPS);
      scene.add(stemMesh);
      stemMesh.visible = false
      if(shouldDraw) { 
        setFemoralOrientation(femurHeadPos, femurShaftPoints)
        drawFemoralOutlines()
      }
  });
}
loadStem('/6020_0130.stl')

function setCupOrientation(position, inclination, anteversion) {
  cupMesh.matrix.copy(new THREE.Matrix4())
  linerMesh.matrix.copy(new THREE.Matrix4())
  let cupOrientation = RASToLPS.clone()
  //let cupOrientation = new THREE.Matrix4();
  var eul = new THREE.Euler( anteversion, 0, inclination, 'XYZ' );
  cupOrientation.makeRotationFromEuler(eul)
  cupOrientation.setPosition(position)
  cupMesh.applyMatrix(cupOrientation)
  cupMesh.updateMatrix();
  linerMesh.applyMatrix(cupOrientation)
  linerMesh.updateMatrix();
}

let neckLength = 0

function setFemoralOrientation(position, shaftPoints) {
  if (shaftPoints == null || shaftPoints.length < 2) { return; }
  // Set stem and head orientation
  headMesh.matrix.copy(new THREE.Matrix4())
  stemMesh.matrix.copy(new THREE.Matrix4())
  let stemOrientation = RASToLPS.clone()
  let superiorPoint, inferiorPoint
  if (shaftPoints[0].y < shaftPoints[1].y) {
    [superiorPoint, inferiorPoint] = shaftPoints
  }
  else {
    [superiorPoint, inferiorPoint] = [shaftPoints[1], shaftPoints[0]]
  }
  const shaftVector = superiorPoint.clone().sub(inferiorPoint)
  let femurShaftAngle = THREE.Math.radToDeg(shaftVector.angleTo(new THREE.Vector3(0,-1,0)))
  if (superiorPoint.x < inferiorPoint.x) {
    femurShaftAngle = -femurShaftAngle
  }
  const eul = new THREE.Euler( 0 * Math.PI / 2, -Math.PI / 2, THREE.Math.degToRad(132 + femurShaftAngle), 'ZYX' );
  stemOrientation.makeRotationFromEuler(eul)
  stemOrientation.setPosition(position)
  headMesh.applyMatrix(stemOrientation)
  headMesh.updateMatrix();
  stemMesh.applyMatrix(stemOrientation)
  stemMesh.updateMatrix();
  let ray = new THREE.Ray(inferiorPoint, shaftVector.normalize())
  const oldNeckLength = neckLength
  neckLength = ray.distanceToPoint(femurHeadPos)
  if (implantUtils.dynamicNeckLength) {
    if (neckLength < 44 && oldNeckLength >= 44) {
      loadStem('/6020_0130.stl')
    }
    else if ((neckLength >= 44 && neckLength < 48) &&
          (oldNeckLength < 44 || oldNeckLength >= 48)) {
      loadStem('/6020_0335.stl')
    }
    else if (neckLength >= 48 && oldNeckLength < 48) {
      loadStem('/6020_0537.stl')
    }
  }
  else if (oldNeckLength <= 0) {
    if (neckLength < 44) {
      loadStem('/6020_0130.stl')
    }
    else if (neckLength >= 44 && neckLength < 48) {
      loadStem('/6020_0335.stl')
    }
    else if (neckLength >= 48) {
      loadStem('/6020_0537.stl')
    } 
  }
  console.log("Neck length:", neckLength)
}

// Get STL intersection with plane
var pointsOfIntersection;
let cupLines, linerLines, headLines, stemLines;

function drawImplantIntersection(zPos, mesh, outline) {
  pointsOfIntersection = new THREE.Geometry();

  var mathPlane = new THREE.Plane();

  mathPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, zPos))
  var a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  let positionAttribute = mesh.geometry.attributes.position
  let positions = positionAttribute.array
  for (let i = 0; i < mesh.geometry.attributes.position.count; i += 3) {
    a.fromBufferAttribute( positionAttribute, i );
    b.fromBufferAttribute( positionAttribute, i + 1);
    c.fromBufferAttribute( positionAttribute, i + 2);
    a.applyMatrix4(mesh.matrix)
    b.applyMatrix4(mesh.matrix)
    c.applyMatrix4(mesh.matrix)
    let lineAB = new THREE.Line3(a, b);
    let lineBC = new THREE.Line3(b, c);
    let lineCA = new THREE.Line3(c, a);
    setPointOfIntersection(lineAB, mathPlane);
    setPointOfIntersection(lineBC, mathPlane);
    setPointOfIntersection(lineCA, mathPlane);
  }

  if (outline != null) {
    scene.remove(outline)
  }
  outline = new THREE.LineSegments(pointsOfIntersection, new THREE.LineBasicMaterial({
    color: 0x66ff66
  }));
  scene.add(outline);
  return outline
}

function setPointOfIntersection(line, plane) {
  let pointOfIntersection = plane.intersectLine(line);
  if (pointOfIntersection) {
    pointsOfIntersection.vertices.push(pointOfIntersection.clone());
  };
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
      stackHelper = new AMI.StackHelper(stack);
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
