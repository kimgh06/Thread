<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Viewport} from '@babylonjs/core';
  import { RopeSimulator } from './RopeSimulator';

  const moveSpeed = 0.1; // 이동 속도
  let canvas: HTMLCanvasElement;
  let flyCam: ArcRotateCamera;
  let outCam: ArcRotateCamera;
  let engine: Engine;
  let scene: Scene;
  let rope: RopeSimulator;
  let box: Mesh;

  const startIndex = 0; // 첫 번째 파티클 (로프 시작)
  const endIndex = 99; // 마지막 파티클 (로프 끝)

  function move(dx: number, dy: number, dz: number) {
    if (!rope) return;
    const p = rope.particles[endIndex];
    flyCam.setTarget(new Vector3(rope.particles[endIndex].position.x, rope.particles[endIndex].position.y, rope.particles[endIndex].position.z));

    // p.locked = true; // 움직이는 동안 고정
    p.position.x += dx;
    p.position.y += dy;
    p.position.z += dz;
    rope = rope;
  }

  function endRelease() {
    rope.particles[endIndex].locked = !rope.particles[endIndex].locked;
  }

  onMount(() => {
    engine = new Engine(canvas, true);
    scene = new Scene(engine);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    
    rope = new RopeSimulator(scene, { x: 0, y: 5, z: 0 }, 0.1, endIndex + 1);
    flyCam = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, Vector3.Zero(), scene
    );
    flyCam.viewport = new Viewport(0, 0, 0.5, 1);
    flyCam.setTarget(new Vector3(rope.particles[endIndex].position.x, rope.particles[endIndex].position.y, rope.particles[endIndex].position.z));
    flyCam.attachControl(canvas, true);

    outCam = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, Vector3.Zero(), scene
    );
    outCam.viewport = new Viewport(0.5, 0, 0.5, 1);
    outCam.setPosition(new Vector3(0, 2, -10));
    outCam.setTarget(Vector3.Zero())

    // flyCamera.attachControl(canvas, true);

    scene.activeCameras = [flyCam, outCam];

    scene.onBeforeRenderObservable.add(() => rope.update());
    engine.runRenderLoop(() => {
      scene.render();
    });

    box = MeshBuilder.CreateBox("box", {}, scene);

    window.addEventListener('resize', () => engine.resize());
    return () => engine.dispose();
  });
</script>

<div style="position: absolute; top: 1rem; left: 1rem; z-index: 10;">
  <button on:click={() => move(-moveSpeed, 0, 0)}>←</button>
  <button on:click={() => move(moveSpeed, 0, 0)}>→</button>
  <button on:click={() => move(0, moveSpeed, 0)}>↑</button>
  <button on:click={() => move(0, -moveSpeed, 0)}>↓</button>
  <button on:click={endRelease}>
    End {rope?.particles[endIndex].locked ? 'Release' : 'Lock'}
  </button>
</div>

<canvas
  bind:this={canvas}
  style="width: 100vw; height: 100vh; display: block; touch-action: none;"
></canvas>
