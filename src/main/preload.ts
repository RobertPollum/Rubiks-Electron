import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Expose safe APIs
});