const Cube = require('cubejs');

const colorToFace = { white: 'U', red: 'R', green: 'F', yellow: 'D', orange: 'L', blue: 'B' };
const faceToColor = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
const faceOrder = ['up', 'right', 'front', 'down', 'left', 'back'];

function colorArraysToFacelets(state) {
  let result = '';
  for (const face of faceOrder) {
    for (const color of state[face]) result += colorToFace[color];
  }
  return result;
}

function faceletsToColorArrays(facelets) {
  const state = {};
  faceOrder.forEach((face, i) => {
    state[face] = facelets.slice(i * 9, i * 9 + 9).split('').map((f) => faceToColor[f]);
  });
  return state;
}

const scramble = process.argv[2] || '';

console.log('Initializing solver...');
const t0 = Date.now();
Cube.initSolver();
console.log(`Solver ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const cube = new Cube();
if (scramble) {
  console.log(`Applying scramble: ${scramble}`);
  cube.move(scramble);
}

const facelets = cube.asString();
console.log('\nFacelet string:', facelets);

const cubeState = faceletsToColorArrays(facelets);
console.log('\nColor arrays (this is what a real scan would produce):');
console.log(JSON.stringify(cubeState, null, 2));

// Round-trip: rebuild facelets from color arrays, exactly like the real app does
const rebuiltFacelets = colorArraysToFacelets(cubeState);
console.log('\nRound-trip matches original:', rebuiltFacelets === facelets);

const t1 = Date.now();
const solveCube = Cube.fromString(rebuiltFacelets);
const solution = solveCube.solve();
console.log(`\nSolved in ${((Date.now() - t1) / 1000).toFixed(2)}s`);
console.log('Solution:', solution);
console.log('Move count:', solution.trim().split(/\s+/).filter(Boolean).length);
