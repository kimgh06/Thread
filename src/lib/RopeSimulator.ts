import * as BABYLON from "@babylonjs/core";

// ====== 벡터 연산 ======
type Vec3 = { x: number; y: number; z: number };

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function mul(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}
function length(v: Vec3): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}
function normalize(v: Vec3): Vec3 {
  const len = length(v);
  return len === 0 ? v : mul(v, 1 / len);
}

// ====== 파티클 (질량점) ======
class Particle {
  position: Vec3;
  prevPosition: Vec3;
  locked: boolean = false;

  constructor(pos: Vec3) {
    this.position = { ...pos };
    this.prevPosition = { ...pos };
  }

  applyVerlet(gravity: Vec3) {
    if (this.locked) return;
    const temp = { ...this.position };
    const velocity = sub(this.position, this.prevPosition);
    this.position = add(add(this.position, velocity), gravity);
    this.prevPosition = temp;
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
    this.restLength = length(sub(p2.position, p1.position));
  }

  satisfy() {
    const delta = sub(this.p2.position, this.p1.position);
    const dist = length(delta);
    const diff = (dist - this.restLength) / dist;
    const correction = mul(delta, 0.5 * diff);

    if (!this.p1.locked) this.p1.position = add(this.p1.position, correction);
    if (!this.p2.locked) this.p2.position = sub(this.p2.position, correction);
  }
}

// ====== 시뮬레이터 클래스 ======
export class RopeSimulator {
  particles: Particle[] = [];
  constraints: Constraint[] = [];
  // gravity: Vec3 = { x: 0, y: -0.02, z: 0 };
  gravity: Vec3 = { x: 0, y: 0, z: 0 };
  lineMesh: BABYLON.LinesMesh;
  public balls: BABYLON.Mesh[] = [];

  private initializeBalls(scene: BABYLON.Scene) {
    for (let i = 0; i < this.particles.length; i++) {
      const sphere = BABYLON.MeshBuilder.CreateSphere(
        "ball" + i,
        { diameter: 0.05 },
        scene
      );
      sphere.position = new BABYLON.Vector3(
        this.particles[i].position.x,
        this.particles[i].position.y,
        this.particles[i].position.z
      );
      const redMaterial = new BABYLON.StandardMaterial("redMaterial", scene);
      redMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
      sphere.material = redMaterial;
      this.balls.push(sphere);
    }
  }

  private updateBalls() {
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].position.copyFromFloats(
        this.particles[i].position.x,
        this.particles[i].position.y,
        this.particles[i].position.z
      );
    }
  }

  constructor(
    scene: BABYLON.Scene,
    start: Vec3,
    segmentLength = 1,
    count = 10
  ) {
    // 파티클 생성
    for (let i = 0; i < count; i++) {
      const pos = { x: start.x, y: start.y - i * segmentLength, z: start.z };
      this.particles.push(new Particle(pos));
    }

    // 첫 번째 파티클 고정
    this.particles[0].locked = true;

    // 제약 생성
    for (let i = 0; i < count - 1; i++) {
      this.constraints.push(
        new Constraint(this.particles[i], this.particles[i + 1])
      );
    }

    // Babylon.js 선 메쉬
    const linePoints = this.particles.map(
      (p) => new BABYLON.Vector3(p.position.x, p.position.y, p.position.z)
    );
    this.lineMesh = BABYLON.MeshBuilder.CreateLines(
      "rope",
      { points: linePoints, updatable: true },
      scene
    );

    // 공 메쉬 초기화
    this.initializeBalls(scene);
  }

  update(debug = false) {
    // Verlet integration
    for (const p of this.particles) p.applyVerlet(this.gravity);

    // 제약 반복 적용
    for (let i = 0; i < 5; i++) {
      for (const c of this.constraints) c.satisfy();
    }

    // 파티클 위치 공으로 표시
    if (debug) {
      this.updateBalls();
    } else {
      for (let i = 0; i < this.balls.length; i++) {
        this.balls[i].position.copyFromFloats(
          this.particles[i].position.x,
          this.particles[i].position.y,
          this.particles[i].position.z
        );
      }
    }

    // 선 메쉬 업데이트
    this.lineMesh = BABYLON.MeshBuilder.CreateLines("rope", {
      points: this.particles.map(
        (p) => new BABYLON.Vector3(p.position.x, p.position.y, p.position.z)
      ),
      instance: this.lineMesh,
    });
  }
}
