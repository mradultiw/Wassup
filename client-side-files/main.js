const $ = require("jquery");
require("dotenv").config();
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const internetAvailable = require("internet-available");
const PouchDB = require("pouchdb");
let dbState = new PouchDB("user-state"); // create, skip if already exist
let window = null;

ipcMain.handle("update-login-credentials", (event, user) => {
  // ... do actions on behalf of the Renderer
  // if dbState is destroyed, recreate (used when logout ->login without closing app)
  dbState = new PouchDB("user-state");
  dbState
    .put({
      _id: process.env.LOGIN_STATE,
      user: { email: user.email, _id: user._id },
    })
    .then(function (response) {
      console.log("update-login-pouchDB: resolved: ", response);
      window.loadFile(path.join(__dirname, "./src/htmls/homepage.html"));
    })
    .catch(function (err) {
      console.log("update-login-pouchDB: error: ", err);
    });
});

ipcMain.handle("remove-login-credentials", (event) => {
  dbState
    .destroy("user-state")
    .then(function (res) {
      window.loadFile(path.join(__dirname, "./src/htmls/singinup.html"));
    })
    .catch(function (err) {
      console.log(err);
      alert("Error logging out!\nTry reopening app and then logout");
    });
});

ipcMain.on("get-dbstate", async (event) => {
  let val = await dbState
    .get(process.env.LOGIN_STATE)
    .catch((err) => console.log("error fetching get-dbstate: ", err));
  event.returnValue = val.user;
});

ipcMain.handle("window-minimize", (event) => {
  window.minimize();
});

ipcMain.handle("window-maximize", (event) => {
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.handle("window-quit", (event) => {
  console.log("Closing...");
  window.close();
  app.quit();
  app.exit(0);
});

function createWindow() {
  window = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "./src/scripts/preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  // window.removeMenu(); // enable this to prevent access to Developers Tools

  dbState
    .get(process.env.LOGIN_STATE)
    .then((res) => {
      // console.log("(loggedin)", res);
      window.loadFile(path.join(__dirname, "./src/htmls/homepage.html"));
    })
    .catch((err) => {
      console.log("login state false: ", err);
      window.loadFile(path.join(__dirname, "./src/htmls/singinup.html"));
    });
} // createWindow

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  // throw "stop execution";
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });
}

app.whenReady().then(() => {
  // dbState
  //   .destroy("user-state")
  //   .then(function (response) {
  //     console.log(response);
  //   })
  //   .catch(function (err) {
  //     console.log(err);
  //   });

  // console.log("dbstate deleted: ", dbState);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  try {
    dbState.close();
  } catch (err) {
    console.log("dbclosed", err);
  }
  if (process.platform !== "darwin") {
    app.quit();
    app.exit(0);
  }
  app.quit();
  app.exit(0);
});
