<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Viewport} from '@babylonjs/core';
  import { RopeSimulator } from './RopeSimulator';

  const moveSpeed = 0.1; // 이동 속도
  const zoomSpeed = 1.5;
  let canvas: HTMLCanvasElement;
  let secondCanvas: HTMLCanvasElement;
  let flyCam: ArcRotateCamera;
  let outCam: ArcRotateCamera;
  let engine: Engine;
  let scene: Scene;
  let rope: RopeSimulator;
  let box: Mesh;

  const startIndex = 0; // 첫 번째 파티클 (로프 시작)
  const endIndex = 499; // 마지막 파티클 (로프 끝)

  function zoom(arg: "in" | "out") {
    if (!rope) return;
    if (arg === "in") flyCam.radius /= zoomSpeed;
    if (arg === "out") flyCam.radius *= zoomSpeed;
  }

  // up - down - left - right
  function move(direction: string) {
    if (!rope) return;
    const p = rope.particles[endIndex];
    const cameraMatrix = flyCam.getViewMatrix().invert();

    const cameraDirection = new Vector3(
      cameraMatrix.getRow(2)!.x,
      cameraMatrix.getRow(2)!.y,
      cameraMatrix.getRow(2)!.z
    ).scale(-1); // 카메라 앞 방향
    const cameraRight = new Vector3(
      cameraMatrix.getRow(0)!.x,
      cameraMatrix.getRow(0)!.y,
      cameraMatrix.getRow(0)!.z
    );               // 카메라 오른쪽
    const cameraUp = new Vector3(
      cameraMatrix.getRow(1)!.x,
      cameraMatrix.getRow(1)!.y,
      cameraMatrix.getRow(1)!.z
    );               // 카메라 위쪽

    let moveVec = new Vector3(0, 0, 0);

    if (direction === 'left') {
      moveVec = cameraRight.scale(-moveSpeed);
    } else if (direction === 'right') {
      moveVec = cameraRight.scale(moveSpeed);
    } else if (direction === 'up') {
      moveVec = cameraUp.scale(moveSpeed);
    } else if (direction === 'down') {
      moveVec = cameraUp.scale(-moveSpeed);
    } else if (direction === 'backward') {
      moveVec = cameraDirection.scale(moveSpeed);
    } else if (direction === 'forward') {
      moveVec = cameraDirection.scale(-moveSpeed);
    }

    // 이동 적용
    p.position.x += moveVec.x;
    p.position.y += moveVec.y;
    p.position.z += moveVec.z;

    // 카메라 타겟 업데이트
    // Calculate the current offset between the camera's position and its target
    const offset = flyCam.position.subtract(flyCam.getTarget());
    // Move the camera while preserving the original offset
    flyCam.setPosition(new Vector3(p.position.x, p.position.y, p.position.z).add(offset));
    flyCam.setTarget(new Vector3(p.position.x, p.position.y, p.position.z));
  }

  function endRelease() {
    rope.particles[endIndex].locked = !rope.particles[endIndex].locked;
  }

  onMount(() => {
    if (window === undefined) return;
    engine = new Engine(canvas, true);
    scene = new Scene(engine);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    
    rope = new RopeSimulator(scene, { x: 0, y: 5, z: 0 }, 10/ (endIndex + 1), endIndex + 1);
    flyCam = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, Vector3.Zero(), scene
    );
    flyCam.setTarget(new Vector3(rope.particles[endIndex].position.x, rope.particles[endIndex].position.y, rope.particles[endIndex].position.z));
    flyCam.attachControl(canvas, true);

    // right bottom of screen
    outCam = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, Vector3.Zero(), scene
    );
    outCam.setPosition(new Vector3(0, 2, -10));
    outCam.setTarget(Vector3.Zero())
    outCam.viewport = new Viewport(0.75, 0.75, 0.25, 0.25); // right bottom of screen
    
    scene.activeCameras = [flyCam, outCam];

    scene.onBeforeRenderObservable.add(() => rope.update());
    engine.runRenderLoop(() => {
      scene.render();
    });

    box = MeshBuilder.CreateBox("box", {}, scene);

    // add keyboard controls
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'w':
          move("forward");
          break;
        case 's':
          move("backward");
          break;
        case 'a':
          move("left");
          break;
        case 'd':
          move("right");
          break;
        case ' ':
          move("up");
          break;
        case 'Shift':
          move("down");
          break;
      }
    });
    window.addEventListener('blur', () => {
      // Pause the simulation when the window loses focus
      engine.stopRenderLoop();
    });
    window.addEventListener('focus', () => {
      // Resume the simulation when the window regains focus
      engine.runRenderLoop(() => {
        scene.render();
      });
    });

    window.addEventListener('resize', () => engine.resize());
    return () => engine.dispose();
  });
</script>

<style>
  /* Flight Simulator Styled Controls */
  .controls {
    position: fixed;
    bottom: 2rem;
    left: 2rem;
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-rows: repeat(3, auto);
    grid-template-areas: 
      ".    up    ."
      "left forward right"
      ".   down   .";
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.5);
    z-index: 100;
  }

  .controls button {
    background: #222;
    color: #fff;
    border: 2px solid #444;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .controls button:hover {
    background: #333;
  }

  .controls button:active {
    transform: scale(0.95);
  }

  /* Assign grid areas to buttons */
  .controls button:nth-child(1) { grid-area: up; }
  .controls button:nth-child(2) { grid-area: left; }
  .controls button:nth-child(3) { grid-area: right; }
  .controls button:nth-child(4) { grid-area: down; }
  .controls button:nth-child(5) { grid-area: forward; }
  .controls button:nth-child(6) { grid-area: backward; }
  .controls button:nth-child(7) {
    grid-column: 2;
    align-self: center;
    justify-self: center;
  }
</style>

<div class="controls">
  <button on:click={() => move("up")}>↑(Space)</button>
  <button on:click={() => move("left")}>←(A)</button>
  <button on:click={() => move("right")}>→(D)</button>
  <button on:click={() => move("down")}>↓(Shift)</button>
  <button on:click={() => move("forward")}>Forward(W)</button>
  <button on:click={() => move("backward")}>Backward(D)</button>
  <button on:click={() => zoom("in")}>Zoom In</button>
  <button on:click={() => zoom("out")}>Zoom Out</button>
  <button on:click={endRelease}>
    End {rope?.particles[endIndex].locked ? 'Release' : 'Lock'}
  </button>
</div>

<canvas
  bind:this={canvas}
  style="width: 100vw; height: 100vh; display: block; touch-action: none;"
></canvas>
