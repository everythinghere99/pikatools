const pdfInput = document.getElementById("pdfInput");

const uploadCard = document.getElementById("uploadCard");
const uploadBox = document.getElementById("uploadBox");

const fileSection = document.getElementById("fileSection");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFile = document.getElementById("removeFile");

const passwordCard = document.getElementById("passwordCard");

const passwordInput =
  document.getElementById("passwordInput");

const confirmPasswordInput =
  document.getElementById("confirmPasswordInput");

const togglePassword =
  document.getElementById("togglePassword");

const toggleConfirmPassword =
  document.getElementById("toggleConfirmPassword");

const passwordError =
  document.getElementById("passwordError");

const protectBtn =
  document.getElementById("protectBtn");

const processingCard =
  document.getElementById("processingCard");

const resultCard =
  document.getElementById("resultCard");

const downloadBtn =
  document.getElementById("downloadBtn");

const anotherBtn =
  document.getElementById("anotherBtn");


let selectedFile = null;
let protectedPdfBlob = null;


/* =========================================
   HELPERS
========================================= */

function formatFileSize(bytes) {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

}


function show(element) {
  element.classList.remove("hidden");
}


function hide(element) {
  element.classList.add("hidden");
}


function showError(message) {

  passwordError.textContent = message;

  show(passwordError);

}


function clearError() {

  passwordError.textContent = "";

  hide(passwordError);

}


function isPdf(file) {

  if (!file) {
    return false;
  }

  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );

}


/* =========================================
   FILE
========================================= */

function handleFile(file) {

  if (!file) {
    return;
  }

  if (!isPdf(file)) {

    alert("Please choose a PDF file.");

    return;

  }

  selectedFile = file;
  protectedPdfBlob = null;

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  hide(uploadCard);

  show(fileSection);
  show(passwordCard);

  hide(processingCard);
  hide(resultCard);

  passwordInput.value = "";
  confirmPasswordInput.value = "";

  clearError();

  passwordInput.focus();

}


pdfInput.addEventListener(
  "change",
  () => {

    const file = pdfInput.files?.[0];

    if (file) {
      handleFile(file);
    }

  }
);


/* =========================================
   DRAG & DROP
========================================= */

[
  "dragenter",
  "dragover"
].forEach(eventName => {

  uploadBox.addEventListener(
    eventName,
    event => {

      event.preventDefault();
      event.stopPropagation();

      uploadBox.classList.add("drag-over");

    }
  );

});


[
  "dragleave",
  "drop"
].forEach(eventName => {

  uploadBox.addEventListener(
    eventName,
    event => {

      event.preventDefault();
      event.stopPropagation();

      uploadBox.classList.remove("drag-over");

    }
  );

});


uploadBox.addEventListener(
  "drop",
  event => {

    const files =
      event.dataTransfer?.files;

    if (!files || !files.length) {
      return;
    }

    handleFile(files[0]);

  }
);


/* =========================================
   REMOVE FILE
========================================= */

removeFile.addEventListener(
  "click",
  () => {

    resetTool();

  }
);


/* =========================================
   PASSWORD VISIBILITY
========================================= */

function toggleInputVisibility(
  input,
  button
) {

  if (input.type === "password") {

    input.type = "text";

    button.textContent = "🙈";

  } else {

    input.type = "password";

    button.textContent = "👁";

  }

}


togglePassword.addEventListener(
  "click",
  () => {

    toggleInputVisibility(
      passwordInput,
      togglePassword
    );

  }
);


toggleConfirmPassword.addEventListener(
  "click",
  () => {

    toggleInputVisibility(
      confirmPasswordInput,
      toggleConfirmPassword
    );

  }
);


/* =========================================
   VALIDATION
========================================= */

function validatePassword() {

  clearError();

  if (!selectedFile) {

    showError(
      "Please choose a PDF first."
    );

    return false;

  }


  const password =
    passwordInput.value;

  const confirmPassword =
    confirmPasswordInput.value;


  if (!password) {

    showError(
      "Please enter a password."
    );

    passwordInput.focus();

    return false;

  }


  if (password.length < 4) {

    showError(
      "Password must be at least 4 characters."
    );

    passwordInput.focus();

    return false;

  }


  if (password.length > 128) {

    showError(
      "Password must not exceed 128 characters."
    );

    passwordInput.focus();

    return false;

  }


  if (!confirmPassword) {

    showError(
      "Please confirm your password."
    );

    confirmPasswordInput.focus();

    return false;

  }


  if (password !== confirmPassword) {

    showError(
      "Passwords do not match."
    );

    confirmPasswordInput.focus();

    return false;

  }


  return true;

}


/* =========================================
   PROTECT PDF
========================================= */

protectBtn.addEventListener(
  "click",
  async () => {

    if (!validatePassword()) {
      return;
    }


    clearError();

    hide(passwordCard);

    show(processingCard);

    protectBtn.disabled = true;


    try {

      const formData =
        new FormData();


      formData.append(
        "file",
        selectedFile
      );


      formData.append(
        "password",
        passwordInput.value
      );


      const response =
        await fetch(
          "https://pikatools-pdf-backend.pikaboy.blitz.cloud/api/pdf/protect",
          {
            method: "POST",
            body: formData
          }
        );


      if (!response.ok) {

        let message =
          "Unable to protect this PDF.";


        try {

          const data =
            await response.json();


          if (data?.error) {
            message = data.error;
          }

          if (data?.message) {
            message = data.message;
          }

        } catch (_) {
          // Keep default error.
        }


        throw new Error(message);

      }


      const blob =
        await response.blob();


      if (
        !blob ||
        blob.size === 0
      ) {

        throw new Error(
          "The protected PDF could not be created."
        );

      }


      protectedPdfBlob = blob;


      hide(processingCard);

      show(resultCard);


    } catch (error) {

      hide(processingCard);

      show(passwordCard);


      showError(
        error?.message ||
        "Something went wrong. Please try again."
      );


    } finally {

      protectBtn.disabled = false;

    }

  }
);


/* =========================================
   DOWNLOAD
========================================= */

downloadBtn.addEventListener(
  "click",
  () => {

    if (!protectedPdfBlob) {
      return;
    }


    const originalName =
      selectedFile
        ? selectedFile.name
            .replace(/\.pdf$/i, "")
        : "document";


    const downloadName =
      `${originalName}-protected.pdf`;


    const url =
      URL.createObjectURL(
        protectedPdfBlob
      );


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      downloadName;


    document.body.appendChild(link);

    link.click();

    link.remove();


    setTimeout(
      () => {
        URL.revokeObjectURL(url);
      },
      1000
    );

  }
);


/* =========================================
   ANOTHER PDF
========================================= */

anotherBtn.addEventListener(
  "click",
  () => {

    resetTool();

    setTimeout(
      () => {
        pdfInput.click();
      },
      50
    );

  }
);


/* =========================================
   RESET
========================================= */

function resetTool() {

  selectedFile = null;

  protectedPdfBlob = null;

  pdfInput.value = "";


  fileName.textContent =
    "document.pdf";

  fileSize.textContent =
    "0 KB";


  passwordInput.value = "";

  confirmPasswordInput.value = "";


  passwordInput.type =
    "password";

  confirmPasswordInput.type =
    "password";


  togglePassword.textContent =
    "👁";

  toggleConfirmPassword.textContent =
    "👁";


  clearError();


  hide(fileSection);

  hide(passwordCard);

  hide(processingCard);

  hide(resultCard);


  show(uploadCard);


  protectBtn.disabled = false;


  uploadBox.classList.remove(
    "drag-over"
  );

}


/* =========================================
   ENTER KEY
========================================= */

passwordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      confirmPasswordInput.focus();

    }

  }
);


confirmPasswordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      protectBtn.click();

    }

  }
);
