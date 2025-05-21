<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Viewport } from '@babylonjs/core';
  import { RopeSimulator } from './RopeSimulator';

  const moveSpeed = 0.1; // 이동 속도
  const rotationSpeed = 0.05; // 회전 속도
  const zoomSpeed = 1.05;
  const pressedKeys = {
    ' ': false,
    'a': false,
    'd': false,
    'w': false,
    's': false,
    'shift': false,
    'u': false,
    'o': false,
    'i': false,
    'k': false,
    'l': false,
    'j': false,
    'r': false
  }
  const unPressedKeys = { 'r': true }

  const originPosition = Vector3.Zero();

  let canvas: HTMLCanvasElement;
  let flyCam: ArcRotateCamera;
  let outCam: ArcRotateCamera;
  let engine: Engine;
  let scene: Scene;
  let rope: RopeSimulator;
  let box: Mesh;

  // to do view locked particle list on screen

  const endIndex = 999;
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
    if (pressedKeys[' ']) move("up");
    if (pressedKeys['a']) move("left");
    if (pressedKeys['d']) move("right");
    if (pressedKeys['w']) move("forward");
    if (pressedKeys['s']) move("backward");
    if (pressedKeys['shift']) move("down");
    if (pressedKeys['u']) zoom("in");
    if (pressedKeys['o']) zoom("out");
    if (pressedKeys['i']) rotateCam("up");
    if (pressedKeys['k']) rotateCam("down");
    if (pressedKeys['l']) rotateCam("right");
    if (pressedKeys['j']) rotateCam("left");
    if (pressedKeys['r'] && unPressedKeys['r']) {
      unPressedKeys['r'] = false;
      endRelease();
    } 
  }

  const renderScene = () => {
    engine.runRenderLoop(() => {
      scene.render();
      updateCamPosition();
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
    
    rope = new RopeSimulator(scene, new Vector3(0, count / 400, 0), 10 / count, count, []);
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
      const key = event.key.toLowerCase() as keyof typeof pressedKeys;
      if (!pressedKeys[key]) pressedKeys[key] = true;
    });
    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase() as keyof typeof pressedKeys;
      if (pressedKeys[key]) pressedKeys[key] = false;
      if (key === 'r') unPressedKeys['r'] = true; // Reset the unPressedKeys for 'r' when released
    });
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
  .flight-controls {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 100;
  }

  .control-container {
    display: flex;
    gap: 2rem;
    justify-content: center;
  }

  .control-section {
    display: grid;
    grid-template-columns: repeat(2, 40px);
    grid-template-rows: repeat(2, 40px);
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    transform: rotate(45deg);
  }

  .section-container{
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
  }

  .section-label {
    grid-column: span 3;
    text-align: center;
    color: white;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .action-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    width: 100%;
  }

  button {
    background: #222;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .control-section button div {
    color: red;
    transform: rotate(-45deg);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  button:hover {
    background: #444;
  }

  .particle-info {
    color: white;
    font-size: 0.7rem;
  }

  .active {
    background: #444;
    transform: scale(0.7);
  }
</style>

<div class="flight-controls">
  <div class="control-container">
    <!-- Movement Controls -->
    <div class="section-container">
      <div class="section-label">Move To</div>
      <div class="control-section">
        <button class:active={pressedKeys['w']} on:click={() => move("forward")}>
          <div>(W)</div>
        </button>
        <button class:active={pressedKeys['d']} on:click={() => move("right")}>
          <div>(D)</div>
        </button>
        <button class:active={pressedKeys['a']} on:click={() => move("left")}>
          <div>(A)</div>
        </button>
        <button class:active={pressedKeys['s']} on:click={() => move("backward")}>
          <div>(S)</div>
        </button>
      </div>
    </div>

    <!-- Look Controls -->
    <div class="section-container">
      <div class="section-label">Look At</div>
      <div class="control-section">
        <button class:active={pressedKeys['i']} on:click={() => rotateCam("up")}>
          <div>(I)</div>
        </button>
        <button class:active={pressedKeys['l']} on:click={() => rotateCam("right")}>
          <div>(L)</div>
        </button>
        <button class:active={pressedKeys['j']} on:click={() => rotateCam("left")}>
          <div>(J)</div>
        </button>
        <button class:active={pressedKeys['k']} on:click={() => rotateCam("down")}>
          <div>(K)</div>
        </button>
      </div>
    </div> 
  </div>

  <!-- Action Buttons -->
  <div class="action-buttons">
    <button class:active={pressedKeys[' ']} on:click={() => move("up")}>
      <div>↑ (Space)</div>
    </button>
    <button class:active={pressedKeys['r']} on:click={() => endRelease()}>
      <div>
        {#if rope?.particles[selectedIndex]?.locked}
        🔒
        {:else}
        🔓
        {/if} (R)</div>
      </button>
    <button class:active={pressedKeys['u']} on:click={() => zoom("in")}>
      <div>Zoom In (U)</div>
    </button>
    <button class:active={pressedKeys['shift']} on:click={() => move("down")}>
      <div>↓ (Shift)</div>
    </button>
    <div class="particle-info">
      {#if rope?.particles[selectedIndex]}
        <div>🟥 Selected: {selectedIndex}</div>
        <div>🟨 Locked: {rope.particles.filter(p => p.locked).length}</div>
        <div>🟩 Unlocked: {rope.particles.filter(p => !p.locked).length}</div>
      {/if}
    </div>
    <button class:active={pressedKeys['o']} on:click={() => zoom("out")}>
      <div>Zoom Out (O)</div>
    </button>
  </div>
</div>

<canvas
  bind:this={canvas}
  style="width: 100vw; height: 100vh; display: block; touch-action: none;"
></canvas>
