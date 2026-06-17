import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('homebrewForgeDesktop', {
  getRuntimeInfo: () => ipcRenderer.invoke('desktop:get-runtime-info')
});
