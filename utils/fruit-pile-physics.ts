import Matter from "matter-js";

const { Bodies, Body, Composite, Engine, Sleeping } = Matter;
export const FRUIT_PHYSICS_STEP = 1000 / 120;

export const createFruitPilePhysics = (initialWidth: number, initialHeight: number, random = Math.random, entrance: "rain" | "right" = "rain") => {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1.65;
  let width = initialWidth;
  let height = initialHeight;
  let walls: Matter.Body[] = [];
  const fruits: { body: Matter.Body; delay: number; added: boolean }[] = [];
  let elapsed = 0;

  const setWalls = () => {
    walls.forEach((wall) => Composite.remove(engine.world, wall));
    const options = { isStatic: true, friction: 0.65, restitution: 0.12 };
    walls = [
      Bodies.rectangle(width / 2, height + 50, width + 200, 100, options),
      Bodies.rectangle(-50, height / 2 - 1000, 100, height + 2200, options),
      Bodies.rectangle(width + 50, height / 2 - 1000, 100, height + 2200, { ...options, collisionFilter: { category: 2 } }),
    ];
    Composite.add(engine.world, walls);
  };
  setWalls();

  return {
    fruits,
    add(vertices: Matter.Vector[], index: number, count: number) {
      const radius = Math.max(...vertices.map((point) => Math.hypot(point.x, point.y)));
      const body = Bodies.fromVertices(
        radius + random() * Math.max(0, width - radius * 2),
        -radius * 2 - random() * height * 0.2,
        [vertices],
        { friction: 0.55, frictionStatic: 0.85, frictionAir: 0.008, restitution: 0.28 + random() * 0.12, sleepThreshold: 80 },
      );
      Body.setAngle(body, (random() - 0.5) * Math.PI * 2);
      Body.setVelocity(body, { x: (random() - 0.5) * 4, y: random() * 2 });
      Body.setAngularVelocity(body, (random() - 0.5) * 0.09);
      if (entrance === "right") {
        // A packed cupboard empties in a brief burst through the open right edge.
        const lane = index % 4;
        Body.setPosition(body, {
          x: width + radius * 1.5 + random() * radius,
          y: height * 0.12 + lane * radius * 2.2,
        });
        Body.setVelocity(body, { x: -(10 + random() * 8) * Math.min(1.4, width / 800), y: 1 + random() * 3 });
        Body.setAngularVelocity(body, (random() - 0.5) * 0.18);
        body.collisionFilter.mask = 0;
      }
      fruits.push({ body, delay: entrance === "right" ? Math.floor(index / 4) * 75 + random() * 30 : (index / count) * 2200 + random() * 100, added: false });
      return body;
    },
    step() {
      elapsed += FRUIT_PHYSICS_STEP;
      for (const fruit of fruits) {
        if (!fruit.added && elapsed >= fruit.delay) {
          Composite.add(engine.world, fruit.body);
          fruit.added = true;
        }
        // Close the boundary behind each fruit only once its silhouette is inside.
        if (entrance === "right" && fruit.added && fruit.body.bounds.max.x < width - 2) {
          fruit.body.collisionFilter.mask = 0xFFFFFFFF;
        }
      }
      Engine.update(engine, FRUIT_PHYSICS_STEP);
    },
    get settled() {
      return fruits.length > 0 && fruits.every(({ added, body }) => added && body.isSleeping);
    },
    resize(nextWidth: number, nextHeight: number) {
      const scale = Math.min(nextWidth / width, nextHeight / height);
      fruits.forEach(({ body }) => {
        Body.scale(body, scale, scale);
        Body.setPosition(body, {
          x: body.position.x * nextWidth / width,
          y: nextHeight - (height - body.position.y) * scale,
        });
        Sleeping.set(body, false);
      });
      width = nextWidth;
      height = nextHeight;
      setWalls();
      return scale;
    },
    dispose() {
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      fruits.length = 0;
    },
  };
};
