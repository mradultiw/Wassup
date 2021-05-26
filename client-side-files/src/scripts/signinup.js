const $ = require("jquery");
require("jquery-validation");
require("dotenv").config();
const { ipcRenderer } = require("electron");
const path = require("path");
const io = require("socket.io-client");
const port = 3000;
const socket = io(`http://localhost:${port}/`);

$("#signup").on("click", function () {
  $("#first").fadeOut("fast", function () {
    $("#second").fadeIn("fast");
  });
});

$("#signin").on("click", function () {
  $("#second").fadeOut("fast", function () {
    $("#first").fadeIn("fast");
  });
});

$("#minimize").on("click", () => {
  ipcRenderer.invoke("window-minimize");
});

$("#maximize").on("click", () => {
  ipcRenderer.invoke("window-maximize");
});

$("#quit").on("click", () => {
  ipcRenderer.invoke("window-quit");
});

const allowEntry = (user) => {
  // invoke ipcMain to do tasks on behalf of this Rendered process.
  ipcRenderer
    .invoke("update-login-credentials", user)
    .then((res) => {
      console.log("update-login-credentila: resolved: ", res);
    })
    .catch((err) => {
      console.log("update-login-credentila: err: ", err);
    });
};

$(function () {
  let validationResult = $("form[name='login']").validate({
    rules: {
      email: {
        required: true,
        email: true,
      },
      password: {
        required: true,
      },
    },
    messages: {
      email: "Please enter a valid email address",
      password: {
        required: "Please enter password",
      },
    },
    submitHandler: function (form, event) {
      let formdata = $("form[name='login']").serialize();
      console.log("login submithandler: ", formdata);
      if (!socket.connected) {
        alert(
          "Server connection failed!\nTry reloading (Ctrl+R) or reopening app"
        );
        socket.connect();
        return;
      } else {
        socket.emit(
          "check-account",
          formdata
          // AES.encrypt(formdata, process.env.SECRET_KEY)
        );
        event.preventDefault();
      }
    },
  });

  socket.on("valid-user-credentials", (user) => {
    console.log("valid-user: ", user);
    allowEntry(user);
  });

  socket.on("wrong-user-credentials", () => {
    validationResult.showErrors({
      email: "This might be wrong",
      password: "This might be wrong",
    });
  });

  socket.on("user-not-registered", () => {
    console.log("user not registered");
    validationResult.showErrors({ email: "This account is not registerd yet" });
  });
});

$(function () {
  let validationResult = $("form[name='registration']").validate({
    rules: {
      name: "required",
      email: {
        required: true,
        email: true,
      },
      password: {
        required: true,
        minlength: 5,
      },
    },

    messages: {
      name: "Please enter your name",
      password: {
        required: "Please provide a password",
        minlength: "Your password must be at least 5 characters long",
      },
      email: "Please enter a valid email address",
    },

    submitHandler: function (form, event) {
      let formdata = $("form[name='registration']").serialize();
      if (!socket.connected) {
        alert("Server connection failed");
        socket.connect();
        return;
      } else {
        socket.emit(
          "new-user-registration",
          formdata
          // AES.encrypt(formdata, process.env.SECRET_KEY)
        );
        event.preventDefault();
      }
    },
  });

  socket.on("user-registration-successfull", (user) => {
    allowEntry(user);
  });

  socket.on("user-already-registered", () => {
    validationResult.showErrors({
      email: "email already exist, please login instead!",
    });
  });

  socket.on("user-registration-failed", (err) => {
    validationResult.showErrors({ email: "some error occured, try later!" });
    console.error(err);
  });
});

socket.on("disconnect", () => {
  console.log("signinup socket disconnected");
});
