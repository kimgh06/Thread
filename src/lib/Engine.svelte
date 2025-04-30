<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Mesh } from '@babylonjs/core';
  import { RopeSimulator } from './RopeSimulator';

  const moveSpeed = 0.1; // 이동 속도
  let canvas: HTMLCanvasElement;
  let aroundCamera: ArcRotateCamera;
  let engine: Engine;
  let scene: Scene;
  let rope: RopeSimulator;
  let box: Mesh;

  const startIndex = 0; // 첫 번째 파티클 (로프 시작)
  const endIndex = 99; // 마지막 파티클 (로프 끝)

  function move(dx: number, dy: number, dz: number) {
    if (!rope) return;
    const p = rope.particles[endIndex];
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

    aroundCamera = new ArcRotateCamera(
      "camera", Math.PI / 2, Math.PI / 4, 12, Vector3.Zero(), scene
    );
    aroundCamera.attachControl(canvas, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    rope = new RopeSimulator(scene, { x: 0, y: 5, z: 0 }, 0.1, endIndex + 1);

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
