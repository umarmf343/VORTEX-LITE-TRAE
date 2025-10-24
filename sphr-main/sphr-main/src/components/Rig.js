import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import Skybox from './Skybox';
import Store from '../Store';




/**
 * Convert azimuth and polar angles to a quaternion.
 *
 * @param {number} azimuth - The azimuth angle in degrees.
 * @param {number} polar - The polar angle in degrees.
 * @return {THREE.Quaternion} - The resulting quaternion.
 */
function azimuthPolarToQuaternion(azimuth, polar) {
  // Create a new quaternion to hold the result
  const targetQuaternion = new THREE.Quaternion();

  // Create a rotation matrix
  const rotationMatrix = new THREE.Matrix4();

  // Convert angles to radians and create Euler angles
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(polar),
    THREE.MathUtils.degToRad(azimuth),
    0,
    'YXZ'
  );

  // Populate the rotation matrix from Euler angles
  rotationMatrix.makeRotationFromEuler(euler);

  // Convert the rotation matrix to a quaternion
  targetQuaternion.setFromRotationMatrix(rotationMatrix);

  return targetQuaternion;
}


export default class Rig {
  constructor() {
    // global store
    const { 
      camera, viewMode, canvas, currentNode, orbitControlsTarget,
      scene, isMobile, space,
    } = Store.getState();

    // Create OrbitControls
    this.orbitControls = new OrbitControls(camera, canvas);
    this.orbitControls.target.fromArray(orbitControlsTarget.toArray());
    this.orbitControls.enableRotate = true;
    this.orbitControls.enablePan = viewMode === "ORBIT";
    this.orbitControls.enableZoom = viewMode === "ORBIT";
    this.orbitControls.rotateSpeed = viewMode === "ORBIT" ? 0.4 : -0.25;
    this.orbitControls.dampingFactor = 1;
    this.orbitControls.maxDistance = viewMode === "ORBIT" ? 150 : 0.1;
    this.orbitControls.minDistance = viewMode === "ORBIT" ? 1 : 0.1;

    if (isMobile) {
      this.orbitControls.rotateSpeed *= 1.7; // Increase rotate speed
      // You can also adjust panSpeed or other parameters if needed
    }

    // Define lerp properties
    this.lerp = {
      from: currentNode.position,
      to: currentNode.position,
      rotateTo: space.space_data.initialRotation,
      alpha: 1.1,
    };

    // add skybox background if needed
    this.skybox = new Skybox();
    // this.flashlight = new Flashlight();

    // set the initial camera rotation
    this.setInitialCameraRotation();

    // setup logging for debug mode
    this.orbitControls.addEventListener('change', this.logCameraAngles.bind(this));

    this.initialized = false;
    setTimeout(() => {
      this.initialized = true;
    }, 600);
  } 

  // Method to set a new lerp target
  setLerpTarget(targetPosition, targetRotation=null) { 
    const { app, camera, debugMode } = Store.getState();
    this.lerp.from = camera.position.clone();
    this.lerp.to = targetPosition;
    this.lerp.alpha = 0; // Reset alpha

    // if needed, slerp rotation too
    this.lerp.rotateTo = targetRotation;

    if (debugMode) {
      console.log('Camera rig: start lerp');
    }
  }

  setInitialCameraRotation() {
    const { 
      camera, 
      tourSpaceActiveIdx, 
      tourPointActiveIdx, 
      space,
      tour,
    } = Store.getState();

    let rotation = space.space_data.initialRotation; 

    // if has tour UI
    if (tour) {
      rotation = tour.tour_data.spaces[tourSpaceActiveIdx].tourpoints[tourPointActiveIdx].rotation;
    }

    const targetQuaternion = azimuthPolarToQuaternion(rotation.azimuth, rotation.polar);

    // Set the camera's quaternion to the target quaternion
    camera.quaternion.copy(targetQuaternion);

    // Update the camera's matrix world
    camera.updateMatrixWorld(true);
  }


  slerpCameraRotation() {
    const { camera, } = Store.getState();
    const rotation = this.lerp.rotateTo;
    const targetQuaternion = azimuthPolarToQuaternion(rotation.azimuth, rotation.polar);

    // Slerp from the camera's current quaternion to the target quaternion
    camera.quaternion.slerp(targetQuaternion, this.lerp.alpha);

    // Update the camera's matrix world
    camera.updateMatrixWorld(true);
  }

  updateOrbitControlsViewMode() {
    const { 
      viewMode, isMobile
    } = Store.getState();

    if (viewMode === "ORBIT") {
      this.orbitControls.enablePan = true; 
      this.orbitControls.enableZoom = true; 
      this.orbitControls.rotateSpeed = 0.4;
      this.orbitControls.maxDistance = 150;
      this.orbitControls.minDistance = 1;

    } else {
      this.orbitControls.enablePan = false; 
      this.orbitControls.enableZoom = false; 
      this.orbitControls.rotateSpeed = -0.25;
      this.orbitControls.maxDistance = 0.1;
      this.orbitControls.minDistance = 0.1;

    }
    
    if (isMobile) {
      this.orbitControls.rotateSpeed *= 1.7; // Increase rotate speed
      // You can also adjust panSpeed or other parameters if needed
    }
  }

  logCameraAngles() {
    const { camera, debugMode, currentNode } = Store.getState();

    // Create a rotation matrix from the camera's quaternion
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromQuaternion(camera.quaternion);

    // Create Euler angles from the rotation matrix
    const euler = new THREE.Euler();
    euler.setFromRotationMatrix(rotationMatrix, 'YXZ');

    // Convert Euler angles to azimuth and polar angles in degrees
    const azimuthInDegrees = THREE.MathUtils.radToDeg(euler.y);
    const polarInDegrees = THREE.MathUtils.radToDeg(euler.x);

    if (debugMode) {
      console.log(`Node ID: ${currentNode.uuid}`);
      console.log(`Camera Position: ${camera.position.x}, ${camera.position.y}, ${camera.position.z}`);
      console.log(`Polar: ${polarInDegrees} Azimuth: ${azimuthInDegrees}`);
    }
  }

  // Method to update lerp
  update() {
    const { 
      app, camera, viewMode, orbitControlsTarget, tourLightMode, debugMode,
      tourGuidedMode, tourGuidedAutoplay,
    } = Store.getState();


    // update the flashlight position 
    if (this.flashlight) {
      this.flashlight.update();
    }

    // Update position if lerp is not complete
    if (this.lerp.alpha <= 1) { 
      this.lerp.alpha += 0.05; // Control the speed by changing this value

      // lerp the vectors 
      camera.position.lerpVectors(this.lerp.from, this.lerp.to, this.lerp.alpha);

      if (this.lerp.alpha > 1) {
        if (debugMode) {
          console.log('Camera rig: end lerp');
        }

        camera.position.copy(this.lerp.to);
      }

      // Update the group's position to match the camera's position
      app.envCube.setPosition(camera.position);

      if (this.lerp.rotateTo) {
        this.slerpCameraRotation();
      }

      if (tourLightMode) {
        // Calculate the direction in which the camera should be looking at
        const lookAtDirection = new THREE.Vector3(0, 0, -0.1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);

        // Update the OrbitControls target
        this.orbitControls.target.copy(orbitControlsTarget);
        this.orbitControls.update();
      }
    } 

    // // if in fpv mode update controls based on prexisting camera rotation
    if (viewMode === "FPV") {

      if (tourGuidedMode && Store.getState().tourGuidedAutoplay && this.initialized) {
        const rotationIncrement = 0.0001; // Small increment to make the rotation smooth
        this.azimuth += rotationIncrement;

        // Calculate the new spherical coordinates
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(this.orbitControls.target));
        spherical.theta += rotationIncrement;

        // Update the camera's position
        const newPosition = new THREE.Vector3();
        newPosition.setFromSpherical(spherical).add(this.orbitControls.target);
        camera.position.copy(newPosition);
      } else {
        const lookAtDirection = new THREE.Vector3(0, 0, -0.1)
            .applyQuaternion(camera.quaternion)
            .add(camera.position);
        this.orbitControls.target.copy(lookAtDirection);
      }

      this.orbitControls.update();
    }

  }
}


