const Cube = require('cubejs');
Cube.initSolver();

const c = new Cube();
const solution = c.solve();
console.log('Solution for already-solved cube:', solution);

// Apply that "solution" and see if the cube is still solved afterward
c.move(solution);
console.log('Still solved after applying it?', c.isSolved());
