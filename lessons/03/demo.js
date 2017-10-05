/* globals dat, AMI*/

// VJS classes we will be using in this lesson
var LoadersVolume = AMI.default.Loaders.Volume;
var CamerasOrthographic = AMI.default.Cameras.Orthographic;
var ControlsOrthographic = AMI.default.Controls.TrackballOrtho;
var HelpersStack = AMI.default.Helpers.Stack;
var WidgetsHandle = AMI.default.Widgets.Handle;
var widgets = [];
let ellipse;
let pelvicTiltLine;
// Setup renderer
var container = document.getElementById('container');
var renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
renderer.setSize(container.offsetWidth, container.offsetHeight);
renderer.setClearColor(0x353535, 1);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Setup scene
var scene = new THREE.Scene();

// Setup camera
var camera = new CamerasOrthographic(
  container.clientWidth / -2, container.clientWidth / 2,
  container.clientHeight / 2, container.clientHeight / -2,
  0.1, 10000);

// Setup controls
var controls = new ControlsOrthographic(camera, container);
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


/**
 * Build GUI
 */
function gui(stackHelper) {
  var gui = new dat.GUI({
    autoPlace: false,
  });

  var customContainer = document.getElementById('my-gui-container');
  customContainer.appendChild(gui.domElement);
  // only reason to use this object is to satusfy data.GUI
  var camUtils = {
    invertRows: false,
    invertColumns: false,
    rotate45: false,
    rotate: 0,
    orientation: 'default',
    convention: 'radio',
  };

  // camera
  var cameraFolder = gui.addFolder('Camera');
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

  cameraFolder.add(camera, 'angle', 0, 360).step(1).listen();

  let orientationUpdate = cameraFolder.add(
    camUtils, 'orientation', ['default', 'axial', 'coronal', 'sagittal']);
  orientationUpdate.onChange(function(value) {
      camera.orientation = value;
      camera.update();
      camera.fitBox(2);
      stackHelper.orientation = camera.stackOrientation;
  });

  let conventionUpdate = cameraFolder.add(
    camUtils, 'convention', ['radio', 'neuro']);
  conventionUpdate.onChange(function(value) {
      camera.convention = value;
      camera.update();
      camera.fitBox(2);
  });

  cameraFolder.open();

  // of course we can do everything from lesson 01!
  var stackFolder = gui.addFolder('Stack');
  stackFolder.add(
    stackHelper, 'index', 0, stackHelper.stack.dimensionsIJK.z - 1)
    .step(1).listen();
  stackFolder.add(stackHelper.slice, 'interpolation', 0, 1).step(1).listen();
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

// Setup loader
var loader = new LoadersVolume(container);
//var file = 'https://cdn.rawgit.com/FNNDSC/data/master/nifti/adi_brain/adi_brain.nii.gz';
let file = '/lessons/03/CR2'

loader.load(file)
.then(function() {
    // merge files into clean series/stack/frame structure
    var series = loader.data[0].mergeSeries(loader.data);
    var stack = series[0].stack[0];
    loader.free();
    loader = null;
    // be carefull that series and target stack exist!
    var stackHelper = new HelpersStack(stack);
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
    let drawEllipse = () => {
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

    let drawPelvicTiltLine = (startPoint, endPoint) => {
      if (pelvicTiltLine != null) {
        scene.remove(pelvicTiltLine);
      }
      let geometry = new THREE.Geometry();
      geometry.vertices.push(
        startPoint,
        endPoint
      );
      let material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
      pelvicTiltLine = new THREE.LineSegments( geometry, material );
      scene.add(pelvicTiltLine)
    }

    let getPelvicTilt = () => {
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
    
    container.addEventListener('mouseup', function(evt) {
      for (let widget of widgets) {
        if (widget.active) {
          widget.onEnd(evt);
          return;
        }
      }
    });

    container.addEventListener('mousemove', function(evt) {
      let cursor = 'default';
      for (let widget of widgets) {
        widget.onMove(evt);
        if (widget.hovered) {
          cursor = 'pointer';
        }
        if (widget.dragged) {
          //drawEllipse();
          getPelvicTilt() 
        }
      }

      container.style.cursor = cursor;
    });
    
    container.addEventListener('mousedown', function(evt) {
      // if something hovered, exit
      for (let widget of widgets) {
        if (widget.hovered) {
          widget.onStart(evt);
          return;
        }
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
      console.log(widgets.length)
      if (widgets.length >= 3) {
        //drawEllipse()
        getPelvicTilt() 
      }
    });
})
.catch(function(error) {
    window.console.log('oops... something went wrong...');
    window.console.log(error);
});

