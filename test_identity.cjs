const Cube = require('cubejs');
Cube.initSolver();

// Test 1: solve a fresh Cube object directly, no string conversion at all
const c1 = new Cube();
console.log('Direct solve() on new Cube():', JSON.stringify(c1.solve()));

// Test 2: solve after going through asString/fromString round trip
const c2 = Cube.fromString(new Cube().asString());
console.log('Solve after asString/fromString round trip:', JSON.stringify(c2.solve()));

// Test 3: is the cube actually recognized as solved?
console.log('isSolved (if this method exists):', typeof c1.isSolved === 'function' ? c1.isSolved() : 'no isSolved method');
