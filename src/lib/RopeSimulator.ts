import * as BABYLON from "@babylonjs/core";

// ====== 파티클 (질량점) ======
class Particle {
  locked: boolean = false;
  mesh: BABYLON.Mesh;
  // For Verlet integration we keep a copy of the previous mesh position.
  prevMesh: BABYLON.Vector3;

  constructor(pos: BABYLON.Vector3) {
    // Create a temporary mesh – it will be replaced in initializeMeshes.
    this.mesh = new BABYLON.Mesh("dummy", undefined!);
    this.mesh.isPickable = true;
    this.mesh.position = pos.clone();
    this.prevMesh = pos.clone();
  }

  applyVerlet(gravity: BABYLON.Vector3) {
    if (this.locked) return;
    const temp = this.mesh.position.clone();
    const velocity = this.mesh.position.subtract(this.prevMesh);
    this.mesh.position.addInPlace(velocity).addInPlace(gravity);
    this.prevMesh = temp;
  }
}

// ====== 제약 (거리 유지) ======
class Constraint {
  p1: Particle;
  p2: Particle;
  restLength: number;

  constructor(p1: Particle, p2: Particle) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLength = BABYLON.Vector3.Distance(
      p2.mesh.position,
      p1.mesh.position
    );
  }

  satisfy() {
    const delta = this.p2.mesh.position.subtract(this.p1.mesh.position);
    const dist = delta.length();
    if (dist === 0) return; // avoid divide-by-zero
    const diff = (dist - this.restLength) / dist;
    const stiffness = 0.5;
    const correction = delta.scale(diff * stiffness);

    if (!this.p1.locked && !this.p2.locked) {
      this.p1.mesh.position.addInPlace(correction.scale(0.5));
      this.p2.mesh.position.subtractInPlace(correction.scale(0.5));
    } else if (this.p1.locked && !this.p2.locked) {
      this.p2.mesh.position.subtractInPlace(correction);
    } else if (!this.p1.locked && this.p2.locked) {
      this.p1.mesh.position.addInPlace(correction);
    }

    // Damping to reduce energy.
    const damping = 0.99;
    if (!this.p1.locked) {
      const velocity1 = this.p1.prevMesh.subtract(this.p1.mesh.position);
      this.p1.prevMesh = this.p1.mesh.position.add(velocity1.scale(damping));
    }
    if (!this.p2.locked) {
      const velocity2 = this.p2.prevMesh.subtract(this.p2.mesh.position);
      this.p2.prevMesh = this.p2.mesh.position.add(velocity2.scale(damping));
    }
  }
}

// ====== 시뮬레이터 클래스 ======
export class RopeSimulator {
  particles: Particle[] = [];
  constraints: Constraint[] = [];
  gravity: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);

  private initializeMeshes(scene: BABYLON.Scene, selectedIndex: number) {
    for (let i = 0; i < this.particles.length; i++) {
      let sphere: BABYLON.Mesh;
      if (i !== selectedIndex) {
        sphere = BABYLON.MeshBuilder.CreateSphere(
          "mesh" + i,
          { diameter: 0.05 },
          scene
        );
        const greenMaterial = new BABYLON.StandardMaterial(
          "greenMaterial" + i,
          scene
        );
        greenMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        sphere.material = greenMaterial;
      } else if (this.particles[i].locked) {
        // yellow for locked particles
        sphere = BABYLON.MeshBuilder.CreateSphere(
          "mesh" + i,
          { diameter: 0.05 },
          scene
        );
        const yellowMaterial = new BABYLON.StandardMaterial(
          "yellowMaterial" + i,
          scene
        );
        yellowMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
        sphere.material = yellowMaterial;
      } else {
        sphere = BABYLON.MeshBuilder.CreateSphere(
          "mesh" + i,
          { diameter: 0.05 },
          scene
        );
        const redMaterial = new BABYLON.StandardMaterial(
          "redMaterial" + i,
          scene
        );
        redMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        sphere.material = redMaterial;
      }
      sphere.position = this.particles[i].mesh.position.clone();
      sphere.isPickable = true;
      sphere.isVisible = true;
      // 기존 메시 삭제
      this.particles[i].mesh.dispose();
      this.particles[i].mesh = sphere;
      // Sync previous mesh position with the new mesh position.
      this.particles[i].prevMesh = sphere.position.clone();
    }
  }

  private updateParticles(selectedIndex: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const material = this.particles[i].mesh
        .material as BABYLON.StandardMaterial;

      material.diffuseColor =
        i === selectedIndex
          ? new BABYLON.Color3(1, 0, 0) // red for selected particle
          : this.particles[i].locked
            ? new BABYLON.Color3(1, 1, 0) // yellow for locked particles
            : new BABYLON.Color3(0, 1, 0); // green for other particles
    }
  }

  constructor(
    scene: BABYLON.Scene,
    start: BABYLON.Vector3,
    segmentLength = 1,
    count = 10
  ) {
    // Create particles using the starting position.
    for (let i = 0; i < count; i++) {
      const pos = start.add(new BABYLON.Vector3(0, -i * segmentLength, 0));
      this.particles.push(new Particle(pos));
    }

    // Lock the first particle.
    this.particles[0].locked = true;

    // Create constraints between consecutive particles.
    for (let i = 0; i < count - 1; i++) {
      this.constraints.push(
        new Constraint(this.particles[i], this.particles[i + 1])
      );
    }

    this.initializeMeshes(scene, count - 1);
  }

  update(selectedIndex: number) {
    // Verlet integration update.
    for (const p of this.particles) {
      p.applyVerlet(this.gravity);
    }

    // Self-collision resolution.
    for (let times = 0; times < 3; times++) {
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 2; j < this.particles.length; j++) {
          const delta = this.particles[j].mesh.position.subtract(
            this.particles[i].mesh.position
          );
          const dist = delta.length();
          const minDist = 0.05;
          if (dist < minDist && dist > 0) {
            const diff = (minDist - dist) / dist;
            const correction = delta.scale(diff * 0.5);
            if (!this.particles[i].locked)
              this.particles[i].mesh.position.subtractInPlace(correction);
            if (!this.particles[j].locked)
              this.particles[j].mesh.position.addInPlace(correction);
          }
        }
      }
    }

    // Constraint satisfaction.
    for (let i = 0; i < 5; i++) {
      for (const c of this.constraints) {
        c.satisfy();
      }
    }

    this.updateParticles(selectedIndex);
  }
}
