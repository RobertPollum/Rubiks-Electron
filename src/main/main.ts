import { BrowserWindow } from 'electron';

export class Main {
    static mainWindow: Electron.BrowserWindow | null;
    static application: Electron.App;
    static BrowserWindow: typeof BrowserWindow;
    private static onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            Main.application.quit();
        }
    }

    private static onClose() {
        // Dereference the window object. 
        Main.mainWindow = null;
    }

    private static onReady() {
        Main.mainWindow = new Main.BrowserWindow({ width: 800, height: 600 });
        if(Main.mainWindow !== null) {
            Main.mainWindow
                .loadURL('file://' + __dirname + '/../../public/index.html');
            Main.mainWindow.on('closed', Main.onClose);
        }
    }

    static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
        // we pass the Electron.App object and the  
        // Electron.BrowserWindow into this function 
        // so this class has no dependencies. This 
        // makes the code easier to write tests for 
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('window-all-closed', Main.onWindowAllClosed);
        Main.application.on('ready', Main.onReady);
    }
}

module.exports = {Main};