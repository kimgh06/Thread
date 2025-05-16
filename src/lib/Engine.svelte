<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Viewport } from '@babylonjs/core';
  import { RopeSimulator } from './RopeSimulator';

  const moveSpeed = 0.08; // 이동 속도
  const rotationSpeed = 0.05; // 회전 속도
  const zoomSpeed = 1.3;
  const pressedKeys = new Set<string>();
  const originPosition = Vector3.Zero();

  let canvas: HTMLCanvasElement;
  let flyCam: ArcRotateCamera;
  let outCam: ArcRotateCamera;
  let engine: Engine;
  let scene: Scene;
  let rope: RopeSimulator;
  let box: Mesh;

  // to do view locked particle list on screen

  const endIndex = 499;
  let selectedIndex = endIndex;

  function updateCamPosition() {
    if (!rope) return;
    const p = rope.particles[selectedIndex].mesh;
    // 카메라 타겟 업데이트
    // Calculate the current offset between the camera's position and its target
    const offset = flyCam.position.subtract(flyCam.getTarget());
    // Move the camera while preserving the original offset
    flyCam.setPosition(new Vector3(p.position.x, p.position.y, p.position.z).add(offset));
    flyCam.setTarget(new Vector3(p.position.x, p.position.y, p.position.z));
  }

  function zoom(arg: "in" | "out") {
    if (!rope) return;
    if (arg === "in") flyCam.radius /= zoomSpeed;
    if (arg === "out") flyCam.radius *= zoomSpeed;
  }

  function rotateCam(arg: "left" | "right" | "up" | "down") {
    if (!rope) return;
    if (arg === "left") flyCam.alpha += rotationSpeed;
    if (arg === "right") flyCam.alpha -= rotationSpeed;
    if (arg === "up") flyCam.beta += rotationSpeed;
    if (arg === "down") flyCam.beta -= rotationSpeed;
  }

  // up - down - left - right
  function move(direction: string) {
    if (!rope) return;
    const mesh = rope.particles[selectedIndex].mesh;
    const cameraMatrix = flyCam.getViewMatrix().invert();
    const  [row1, row2, row3] = [cameraMatrix.getRow(0), cameraMatrix.getRow(1), cameraMatrix.getRow(2)]

    const cameraDirection = new Vector3(row3!.x, row3!.y, row3!.z).scale(-1); // 카메라 앞 방향
    const cameraRight = new Vector3(row1!.x, row1!.y, row1!.z);               // 카메라 오른쪽
    const cameraUp = new Vector3(row2!.x, row2!.y, row2!.z);               // 카메라 위쪽

    let moveVec = new Vector3(0, 0, 0);

    if (direction === 'left') moveVec = cameraRight.scale(-moveSpeed);
    if (direction === 'right') moveVec = cameraRight.scale(moveSpeed);
    if (direction === 'up') moveVec = cameraUp.scale(moveSpeed);
    if (direction === 'down') moveVec = cameraUp.scale(-moveSpeed);
    if (direction === 'backward') moveVec = cameraDirection.scale(moveSpeed);
    if (direction === 'forward') moveVec = cameraDirection.scale(-moveSpeed);
    
    // 이동 적용
    mesh.position.x += moveVec.x;
    mesh.position.y += moveVec.y;
    mesh.position.z += moveVec.z;

    updateCamPosition(); 
  }
  
  const controlFunction = () =>{
    if (!rope) return;
    // Handle key presses for movement and camera rotation
    for (const key of pressedKeys) {
      switch (key) {
        case ' ': move("up"); break;
        case 'a': move("left"); break;
        case 'd': move("right"); break;
        case 'w': move("forward"); break;
        case 's': move("backward"); break;
        case 'Shift': move("down"); break;
        case 'u': zoom("in"); break;
        case 'o': zoom("out"); break;
        case 'i': rotateCam("up"); break;
        case 'k': rotateCam("down"); break;
        case 'j': rotateCam("left"); break;
        case 'l': rotateCam("right"); break;
        case 'r': endRelease(); break;
        default: break;
      }
    }
  }

  const renderScene = () => {
    engine.runRenderLoop(() => {
      scene.render();
      controlFunction();
    });
  };

  const stopRenderScene = () => {
    if (!engine) return;
    engine.stopRenderLoop();
  };  

  const endRelease = () => rope.particles[selectedIndex].locked = !rope.particles[selectedIndex].locked;

  onMount(() => {
    if (window === undefined) return;
    engine = new Engine(canvas, true);
    scene = new Scene(engine);

    // Enable picking on the scene
    scene.defaultCursor = "pointer";
    scene.constantlyUpdateMeshUnderPointer = true;

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    const count = endIndex + 1;
    
    rope = new RopeSimulator(scene, new Vector3(0, 5, 0), 10 / count, count);
    flyCam = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 12, originPosition, scene);
    const selectedParticleMesh = rope.particles[selectedIndex].mesh;
    flyCam.setTarget(new Vector3(selectedParticleMesh.position.x, selectedParticleMesh.position.y, selectedParticleMesh.position.z));
    flyCam.attachControl(canvas, true);
    flyCam.radius = 5; // set zoom level

    // right bottom of screen
    outCam = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, originPosition, scene
    );
    outCam.setPosition(new Vector3(0, 2, -10));
    outCam.setTarget(originPosition)
    outCam.viewport = new Viewport(0.75, 0.75, 0.25, 0.25); // right bottom of screen
    scene.activeCameras = [flyCam, outCam];

    scene.onBeforeRenderObservable.add(() => rope.update(selectedIndex));
    
    box = MeshBuilder.CreateBox("box", {}, scene); // Create a box mesh for testing

    // add keyboard controls
    window.addEventListener('keydown', (event) => {
      if (!pressedKeys.has(event.key)) pressedKeys.add(event.key);
    });
    window.addEventListener('keyup', (event) => pressedKeys.delete(event.key));
    window.addEventListener('blur', (event) => {
      // Pause the simulation when the window loses focus
      stopRenderScene();
    });
    window.addEventListener('focus', (event) => {
      // Resume the simulation when the window regains focus
      renderScene();
    });

    // 기준 카메라로 부터의 거리 계산
    scene.onPointerDown = (evt) => {
      const [x, y] = [scene.pointerX, scene.pointerY];
      const pickResult = scene.pick(x, y, undefined, false, flyCam);
      if (!pickResult || !pickResult.hit) return;
      const pickedMesh = pickResult.pickedMesh;
      if (!pickedMesh) return;
      selectedIndex = rope.particles.findIndex(p => p.mesh === pickedMesh);
    };

    renderScene();

    window.addEventListener('resize', () => engine.resize());
    return () => engine.dispose();
  });
</script>

<style>
  /* Container for all flight simulation controls */
  .flight-controls {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    display: flex;
    gap: 2rem;
    z-index: 100;
  }

  /* Movement controls styled as a D-pad */
  .movement {
    display: grid;
    grid-template-columns: 60px 60px 60px;
    grid-template-rows: 60px 60px 60px;
    grid-template-areas:
      ".    up    ."
      "left forward right"
      ".   down   .";
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  }

  .movement button {
    background: #222;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .movement button:hover {
    background: #444;
  }

  .movement button:active {
    transform: scale(0.95);
  }

  .movement button.up    { grid-area: up; }
  .movement button.left  { grid-area: left; }
  .movement button.forward { grid-area: forward; }
  .movement button.right { grid-area: right; }
  .movement button.down  { grid-area: down; }

  /* Camera and additional controls */
  .camera-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    min-width: 120px;
  }

  .camera-controls button {
    background: #222;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .camera-controls button:hover {
    background: #444;
  }

  .camera-controls button:active {
    transform: scale(0.95);
  }
</style>

<div class="flight-controls">
  <!-- Movement Control Panel -->
  <div class="movement">
    <button class="up" on:click={() => move("up")}>↑<br>(Space)</button>
    <button class="left" on:click={() => move("left")}>←<br>(A)</button>
    <button class="forward" on:click={() => move("forward")}>Fwd<br>(W)</button>
    <button class="right" on:click={() => move("right")}>→<br>(D)</button>
    <button class="down" on:click={() => move("down")}>↓<br>(Shift)</button>
  </div>

  <!-- Camera & Additional Controls -->
  <div class="camera-controls">
    <button on:click={() => move("backward")}>BackWard (S)</button>
    <button on:click={() => zoom("in")}>Zoom In (U)</button>
    <button on:click={() => zoom("out")}>Zoom Out (O)</button>
    <button on:click={() => rotateCam("up")}>Rotate Up (I)</button>
    <button on:click={() => rotateCam("down")}>Rotate Down (K)</button>
    <button on:click={() => rotateCam("left")}>Rotate Left (J)</button>
    <button on:click={() => rotateCam("right")}>Rotate Right (L)</button>
    <button on:click={endRelease}>
      {#if rope?.particles[selectedIndex]?.locked}
        Position Locked (R)
      {:else}
        Position Unlocked (R)
      {/if}
    </button>
  </div>
</div>

<canvas
  bind:this={canvas}
  style="width: 100vw; height: 100vh; display: block; touch-action: none;"
></canvas>
