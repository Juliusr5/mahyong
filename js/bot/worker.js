// Web Worker: menjalankan keputusan bot (termasuk Monte Carlo) di luar thread UI.
import { decide } from './brain.js';

self.onmessage = (e) => {
  const { id, view, req, opts } = e.data;
  let action;
  try {
    action = decide(view, req, opts);
  } catch (err) {
    action = null;
    console.error(err);
  }
  self.postMessage({ id, action });
};
