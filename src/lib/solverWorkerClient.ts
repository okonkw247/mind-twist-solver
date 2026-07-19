let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let requestCounter = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

export function ensureSolverWorkerReady(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve) => {
    const w = getWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        w.removeEventListener('message', handler);
        resolve();
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'init' });
  });

  return readyPromise;
}

export function solveInWorker(facelets: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const requestId = ++requestCounter;

    const handler = (e: MessageEvent) => {
      if (e.data.requestId !== requestId) return;
      if (e.data.type === 'solved') {
        w.removeEventListener('message', handler);
        resolve(e.data.solution);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'solve', facelets, requestId });
  });
}
