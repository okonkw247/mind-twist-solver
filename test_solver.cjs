console.log('Starting Cube.initSolver()...');
const start = Date.now();

const Cube = require('cubejs');
Cube.initSolver();

const elapsed = (Date.now() - start) / 1000;
console.log(`Done in ${elapsed.toFixed(1)} seconds`);

// Try solving a simple scramble too
const cube = new Cube();
cube.move("R U R' U'");
const solution = cube.solve();
console.log('Test solve result:', solution);
