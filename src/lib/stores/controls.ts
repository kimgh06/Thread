import { writable } from "svelte/store";
import { Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import { CONTROL_CONFIG } from "../config";

interface ControlState {
  pressedKeys: Set<string>;
}

const createControlStore = () => {
  const { subscribe, set, update } = writable<ControlState>({
    pressedKeys: new Set(),
  });

  return {
    subscribe,
    addKey: (key: string) =>
      update((state) => {
        state.pressedKeys.add(key);
        return state;
      }),
    removeKey: (key: string) =>
      update((state) => {
        state.pressedKeys.delete(key);
        return state;
      }),
    reset: () => set({ pressedKeys: new Set() }),
  };
};

export const controlStore = createControlStore();

export class CameraController {
  constructor(
    private flyCam: ArcRotateCamera,
    private scene: Scene
  ) {}

  updatePosition(targetPosition: Vector3) {
    const offset = this.flyCam.position.subtract(this.flyCam.getTarget());
    this.flyCam.setPosition(targetPosition.add(offset));
    this.flyCam.setTarget(targetPosition);
  }

  zoom(direction: "in" | "out") {
    const { ZOOM_SPEED } = CONTROL_CONFIG;
    if (direction === "in") this.flyCam.radius /= ZOOM_SPEED;
    if (direction === "out") this.flyCam.radius *= ZOOM_SPEED;
  }

  rotate(direction: "left" | "right" | "up" | "down") {
    const { ROTATION_SPEED } = CONTROL_CONFIG;
    switch (direction) {
      case "left":
        this.flyCam.alpha += ROTATION_SPEED;
        break;
      case "right":
        this.flyCam.alpha -= ROTATION_SPEED;
        break;
      case "up":
        this.flyCam.beta += ROTATION_SPEED;
        break;
      case "down":
        this.flyCam.beta -= ROTATION_SPEED;
        break;
    }
  }

  getMovementVector(direction: string): Vector3 {
    const { MOVE_SPEED } = CONTROL_CONFIG;
    const cameraMatrix = this.flyCam.getViewMatrix().invert();
    const [row1, row2, row3] = [
      cameraMatrix.getRow(0),
      cameraMatrix.getRow(1),
      cameraMatrix.getRow(2),
    ];

    const cameraDirection = new Vector3(row3!.x, row3!.y, row3!.z).scale(-1);
    const cameraRight = new Vector3(row1!.x, row1!.y, row1!.z);
    const cameraUp = new Vector3(row2!.x, row2!.y, row2!.z);

    switch (direction) {
      case "left":
        return cameraRight.scale(-MOVE_SPEED);
      case "right":
        return cameraRight.scale(MOVE_SPEED);
      case "up":
        return cameraUp.scale(MOVE_SPEED);
      case "down":
        return cameraUp.scale(-MOVE_SPEED);
      case "backward":
        return cameraDirection.scale(MOVE_SPEED);
      case "forward":
        return cameraDirection.scale(-MOVE_SPEED);
      default:
        return Vector3.Zero();
    }
  }
}
