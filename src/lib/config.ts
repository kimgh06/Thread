export const PHYSICS_CONFIG = {
  GRAVITY: { x: 0, y: 0, z: 0 },
  DAMPING: 0.99,
  STIFFNESS: 0.5,
  MIN_DISTANCE: 0.05,
  CONSTRAINT_ITERATIONS: 5,
  COLLISION_ITERATIONS: 3,
};

export const CONTROL_CONFIG = {
  MOVE_SPEED: 0.08,
  ROTATION_SPEED: 0.05,
  ZOOM_SPEED: 1.3,
};

export const PARTICLE_CONFIG = {
  DIAMETER: 0.2,
  COLORS: {
    SELECTED: { r: 1, g: 0, b: 0 },
    DEFAULT: { r: 0, g: 1, b: 0 },
  },
};
