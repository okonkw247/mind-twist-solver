import Cube from 'cubejs';

let initialized = false;

self.onmessage = (e: MessageEvent) => {
  const { type, facelets, requestId } = e.data;

  if (type === 'init') {
    if (!initialized) {
      Cube.initSolver();
      initialized = true;
    }
    (self as unknown as Worker).postMessage({ type: 'ready' });
    return;
  }

  if (type === 'solve') {
    try {
      if (!initialized) {
        Cube.initSolver();
        initialized = true;
      }
      const cube = Cube.fromString(facelets);
      const solution = cube.solve();
      (self as unknown as Worker).postMessage({ type: 'solved', solution, requestId });
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        error: err instanceof Error ? err.message : 'Unknown solver error',
        requestId,
      });
    }
  }
};
