import {
  PDFDocument,
  rgb
} from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";


import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";


pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


/* --------------------------------------------------
   ELEMENTS
-------------------------------------------------- */

const uploadCard =
  document.getElementById("uploadCard");

const dropZone =
  document.getElementById("dropZone");

const fileInput =
  document.getElementById("fileInput");

const workspace =
  document.getElementById("workspace");

const fileName =
  document.getElementById("fileName");

const pageCount =
  document.getElementById("pageCount");

const changePdfBtn =
  document.getElementById("changePdfBtn");

const startNumber =
  document.getElementById("startNumber");

const fontSize =
  document.getElementById("fontSize");

const position =
  document.getElementById("position");

const margin =
  document.getElementById("margin");

const numberColor =
  document.getElementById("numberColor");

const colorValue =
  document.getElementById("colorValue");

const allPagesBtn =
  document.getElementById("allPagesBtn");

const selectPagesBtn =
  document.getElementById("selectPagesBtn");

const selectedInfo =
  document.getElementById("selectedInfo");

const pageSelection =
  document.getElementById("pageSelection");

const selectAllBtn =
  document.getElementById("selectAllBtn");

const clearBtn =
  document.getElementById("clearBtn");

const pageGrid =
  document.getElementById("pageGrid");

const previewPrev =
  document.getElementById("previewPrev");

const previewNext =
  document.getElementById("previewNext");

const previewStage =
  document.querySelector(".preview-stage");

const previewPaper =
  document.getElementById("previewPaper");

const previewCanvas =
  document.getElementById("previewCanvas");

const previewPageNumber =
  document.getElementById("previewPageNumber");

const previewPageInfo =
  document.getElementById("previewPageInfo");

const applyBtn =
  document.getElementById("applyBtn");

const status =
  document.getElementById("status");

const downloadBtn =
  document.getElementById("downloadBtn");

const anotherBtn =
  document.getElementById("anotherBtn");


/* --------------------------------------------------
   STATE
-------------------------------------------------- */

let currentFile = null;

let sourcePdfBytes = null;

let pdfDocument = null;

let totalPages = 0;

let currentPage = 1;

let selectedPages = new Set();

let applyMode = "current";

let generatedPdfBytes = null;

let previewRenderToken = 0;


/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function setStatus(message) {

  status.textContent = message || "";

}


function clamp(value, min, max) {

  return Math.min(
    Math.max(value, min),
    max
  );

}


function getStartingNumber() {

  const value =
    Number.parseInt(
      startNumber.value,
      10
    );

  if (!Number.isFinite(value)) {
    return 1;
  }

  return clamp(
    value,
    0,
    999999
  );

}


function hexToRgb(hex) {

  const clean =
    hex.replace("#", "");

  const number =
    Number.parseInt(
      clean,
      16
    );

  return {
    r: ((number >> 16) & 255) / 255,
    g: ((number >> 8) & 255) / 255,
    b: (number & 255) / 255
  };

}


function getPageNumber(pageIndex) {

  return (
    getStartingNumber() +
    pageIndex
  );

}


function getSelectedCount() {

  return selectedPages.size;

}


/* --------------------------------------------------
   PREVIEW POSITION
-------------------------------------------------- */

function getPreviewPosition() {

  const selectedPosition =
    position.value;

  const pageWidth =
    previewPaper.clientWidth;

  const pageHeight =
    previewPaper.clientHeight;

  const numberWidth =
    previewPageNumber.offsetWidth;

  const numberHeight =
    previewPageNumber.offsetHeight;

  const selectedMargin =
    Number(margin.value) || 24;


  const scale =
    pageWidth > 0
      ? pageWidth / 612
      : 1;

  const visualMargin =
    Math.max(
      4,
      selectedMargin * scale
    );


  let left = 0;
  let top = 0;


  if (
    selectedPosition ===
    "bottom-left"
  ) {

    left =
      visualMargin;

    top =
      pageHeight -
      numberHeight -
      visualMargin;

  }


  else if (
    selectedPosition ===
    "bottom-right"
  ) {

    left =
      pageWidth -
      numberWidth -
      visualMargin;

    top =
      pageHeight -
      numberHeight -
      visualMargin;

  }


  else if (
    selectedPosition ===
    "top-left"
  ) {

    left =
      visualMargin;

    top =
      visualMargin;

  }


  else if (
    selectedPosition ===
    "top-right"
  ) {

    left =
      pageWidth -
      numberWidth -
      visualMargin;

    top =
      visualMargin;

  }


  else if (
    selectedPosition ===
    "top-center"
  ) {

    left =
      (pageWidth -
        numberWidth) / 2;

    top =
      visualMargin;

  }


  else {

    left =
      (pageWidth -
        numberWidth) / 2;

    top =
      pageHeight -
      numberHeight -
      visualMargin;

  }


  return {
    left,
    top
  };

}


/* --------------------------------------------------
   PREVIEW STYLE
-------------------------------------------------- */

function updatePreviewNumber() {

  const number =
    getPageNumber(
      currentPage - 1
    );

  previewPageNumber.textContent =
    String(number);


  const selectedFontSize =
    Number(fontSize.value) || 18;


  const previewWidth =
    previewPaper.clientWidth || 100;

  const scale =
    previewWidth / 612;


  const visualFontSize =
    Math.max(
      6,
      selectedFontSize * scale
    );


  previewPageNumber.style.fontSize =
    `${visualFontSize}px`;


  const color =
    numberColor.value || "#76594b";

  previewPageNumber.style.color =
    color;


  requestAnimationFrame(() => {

    const point =
      getPreviewPosition();

    previewPageNumber.style.left =
      `${point.left}px`;

    previewPageNumber.style.top =
      `${point.top}px`;

  });


  const shouldShow =
    applyMode === "current"
      ? true
      : selectedPages.has(currentPage);


  previewPageNumber.style.display =
    shouldShow
      ? "block"
      : "none";

}


/* --------------------------------------------------
   PREVIEW PAPER SIZE
-------------------------------------------------- */

function getPreviewSize(
  pageWidth,
  pageHeight
) {

  const availableWidth =
    Math.max(
      80,
      previewStage.clientWidth - 36
    );

  const availableHeight =
    Math.max(
      160,
      previewStage.clientHeight - 36
    );


  const ratio =
    pageWidth / pageHeight;


  let width =
    availableWidth;

  let height =
    width / ratio;


  if (height > availableHeight) {

    height =
      availableHeight;

    width =
      height * ratio;

  }


  return {
    width,
    height
  };

}


/* --------------------------------------------------
   RENDER PREVIEW
-------------------------------------------------- */

async function renderPreview() {

  if (!pdfDocument) {
    return;
  }


  const token =
    ++previewRenderToken;


  try {

    const page =
      await pdfDocument.getPage(
        currentPage
      );


    if (token !== previewRenderToken) {
      return;
    }


    const baseViewport =
      page.getViewport({
        scale: 1
      });


    const size =
      getPreviewSize(
        baseViewport.width,
        baseViewport.height
      );


    const scale =
      size.width /
      baseViewport.width;


    const viewport =
      page.getViewport({
        scale
      });


    previewPaper.style.width =
      `${viewport.width}px`;

    previewPaper.style.height =
      `${viewport.height}px`;


    const deviceScale =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );


    previewCanvas.width =
      Math.round(
        viewport.width *
        deviceScale
      );

    previewCanvas.height =
      Math.round(
        viewport.height *
        deviceScale
      );


    previewCanvas.style.width =
      `${viewport.width}px`;

    previewCanvas.style.height =
      `${viewport.height}px`;


    const context =
      previewCanvas.getContext(
        "2d",
        {
          alpha: false
        }
      );


    context.setTransform(
      deviceScale,
      0,
      0,
      deviceScale,
      0,
      0
    );


    await page.render({
      canvasContext: context,
      viewport
    }).promise;


    if (token !== previewRenderToken) {
      return;
    }


    previewPageInfo.textContent =
      `Page ${currentPage} of ${totalPages}`;


    previewPrev.disabled =
      currentPage <= 1;


    previewNext.disabled =
      currentPage >= totalPages;


    updatePreviewNumber();


  } catch (error) {

    console.error(error);

    setStatus(
      "Could not preview this PDF page."
    );

  }

}


/* --------------------------------------------------
   PAGE THUMBNAILS
-------------------------------------------------- */

async function buildPageGrid() {

  pageGrid.innerHTML = "";


  if (!pdfDocument) {
    return;
  }


  for (
    let pageIndex = 1;
    pageIndex <= totalPages;
    pageIndex++
  ) {

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "page-thumb";


    if (
      selectedPages.has(pageIndex)
    ) {

      wrapper.classList.add(
        "selected"
      );

    }


    const canvas =
      document.createElement("canvas");


    const label =
      document.createElement("div");

    label.className =
      "page-number";

    label.textContent =
      `Page ${pageIndex}`;


    wrapper.appendChild(canvas);

    wrapper.appendChild(label);


    wrapper.addEventListener(
      "click",
      () => {

        if (
          selectedPages.has(
            pageIndex
          )
        ) {

          selectedPages.delete(
            pageIndex
          );

        } else {

          selectedPages.add(
            pageIndex
          );

        }


        updateSelectionUI();

      }
    );


    pageGrid.appendChild(
      wrapper
    );


    try {

      const page =
        await pdfDocument.getPage(
          pageIndex
        );


      const viewport =
        page.getViewport({
          scale: 0.22
        });


      const dpr =
        Math.min(
          window.devicePixelRatio || 1,
          2
        );


      canvas.width =
        Math.round(
          viewport.width * dpr
        );

      canvas.height =
        Math.round(
          viewport.height * dpr
        );


      canvas.style.width =
        `${viewport.width}px`;

      canvas.style.height =
        `${viewport.height}px`;


      const context =
        canvas.getContext(
          "2d"
        );


      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );


      await page.render({
        canvasContext: context,
        viewport
      }).promise;


    } catch (error) {

      console.error(
        "Thumbnail error:",
        error
      );

    }

  }

}


/* --------------------------------------------------
   SELECTION UI
-------------------------------------------------- */

function updateSelectionUI() {

  if (applyMode === "current") {

    selectedInfo.textContent =
      `Current page (${currentPage})`;

  }


  else {

    selectedInfo.textContent =
      `${getSelectedCount()} page${
        getSelectedCount() === 1
          ? ""
          : "s"
      } selected`;

  }


  const thumbs =
    pageGrid.querySelectorAll(
      ".page-thumb"
    );


  thumbs.forEach(
    (thumb, index) => {

      const pageNumber =
        index + 1;


      thumb.classList.toggle(
        "selected",
        selectedPages.has(
          pageNumber
        )
      );

    }
  );


  updatePreviewNumber();

}


/* --------------------------------------------------
   LOAD PDF
-------------------------------------------------- */

async function loadPdf(file) {

  if (
    !file ||
    file.type !== "application/pdf"
  ) {

    setStatus(
      "Please choose a valid PDF file."
    );

    return;

  }


  try {

    setStatus(
      "Loading PDF..."
    );


    currentFile = file;


    const originalBuffer =
      await file.arrayBuffer();


    sourcePdfBytes =
      new Uint8Array(
        originalBuffer.slice(0)
      );


    const pdfJsBytes =
      new Uint8Array(
        originalBuffer.slice(0)
      );


    pdfDocument =
      await pdfjsLib
        .getDocument({
          data: pdfJsBytes
        })
        .promise;


    totalPages =
      pdfDocument.numPages;


    currentPage = 1;


    selectedPages =
      new Set(
        Array.from(
          {
            length: totalPages
          },
          (_, index) =>
            index + 1
        )
      );


    applyMode =
      "selected";


    generatedPdfBytes =
      null;


    fileName.textContent =
      file.name;


    pageCount.textContent =
      `${totalPages} ${
        totalPages === 1
          ? "page"
          : "pages"
      }`;


    uploadCard.classList.add(
      "hidden"
    );


    workspace.classList.remove(
      "hidden"
    );


    downloadBtn.classList.add(
      "hidden"
    );


    anotherBtn.classList.add(
      "hidden"
    );


    pageSelection.classList.add(
      "hidden"
    );


    startNumber.value = "1";

    fontSize.value = "18";

    position.value =
      "bottom-center";

    margin.value = "24";

    numberColor.value =
      "#76594b";

    colorValue.textContent =
      "#76594B";


    updateSelectionUI();


    await renderPreview();


    setStatus("");


  } catch (error) {

    console.error(error);

    resetTool();

    setStatus(
      "Could not load this PDF."
    );

  }

}


/* --------------------------------------------------
   FILE INPUT
-------------------------------------------------- */

fileInput.addEventListener(
  "change",
  () => {

    const file =
      fileInput.files?.[0];

    if (file) {
      loadPdf(file);
    }

  }
);


/* --------------------------------------------------
   DRAG & DROP
-------------------------------------------------- */

dropZone.addEventListener(
  "dragover",
  (event) => {

    event.preventDefault();

    dropZone.classList.add(
      "dragover"
    );

  }
);


dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove(
      "dragover"
    );

  }
);


dropZone.addEventListener(
  "drop",
  (event) => {

    event.preventDefault();

    dropZone.classList.remove(
      "dragover"
    );


    const file =
      event.dataTransfer
        ?.files?.[0];


    if (file) {
      loadPdf(file);
    }

  }
);


/* --------------------------------------------------
   CHANGE PDF
-------------------------------------------------- */

changePdfBtn.addEventListener(
  "click",
  () => {

    fileInput.value = "";

    fileInput.click();

  }
);


/* --------------------------------------------------
   PREVIEW NAVIGATION
-------------------------------------------------- */

previewPrev.addEventListener(
  "click",
  async () => {

    if (
      !pdfDocument ||
      currentPage <= 1
    ) {
      return;
    }


    currentPage--;

    updateSelectionUI();

    await renderPreview();

  }
);


previewNext.addEventListener(
  "click",
  async () => {

    if (
      !pdfDocument ||
      currentPage >= totalPages
    ) {
      return;
    }


    currentPage++;

    updateSelectionUI();

    await renderPreview();

  }
);


/* --------------------------------------------------
   SETTINGS CHANGES
-------------------------------------------------- */

/*
  IMPORTANT:
  Do NOT force the input back to 1 while
  the user is deleting it.

  This allows mobile keyboard backspace / ×
  to completely clear the field.
*/

startNumber.addEventListener(
  "input",
  () => {

    const rawValue =
      startNumber.value.trim();


    if (rawValue === "") {

      updatePreviewNumber();

      return;

    }


    let value =
      Number.parseInt(
        rawValue,
        10
      );


    if (!Number.isFinite(value)) {
      return;
    }


    value =
      clamp(
        value,
        0,
        999999
      );


    startNumber.value =
      String(value);


    updatePreviewNumber();

  }
);


fontSize.addEventListener(
  "change",
  updatePreviewNumber
);


position.addEventListener(
  "change",
  updatePreviewNumber
);


margin.addEventListener(
  "change",
  updatePreviewNumber
);


numberColor.addEventListener(
  "input",
  () => {

    colorValue.textContent =
      numberColor.value
        .toUpperCase();


    updatePreviewNumber();

  }
);


/* --------------------------------------------------
   SELECT ALL MODE
-------------------------------------------------- */

allPagesBtn.addEventListener(
  "click",
  () => {

    applyMode =
      "selected";


    selectedPages =
      new Set(
        Array.from(
          {
            length: totalPages
          },
          (_, index) =>
            index + 1
        )
      );


    pageSelection.classList.add(
      "hidden"
    );


    updateSelectionUI();

  }
);


/* --------------------------------------------------
   SELECT PAGES MODE
-------------------------------------------------- */

selectPagesBtn.addEventListener(
  "click",
  () => {

    applyMode =
      "selected";


    pageSelection.classList.remove(
      "hidden"
    );


    updateSelectionUI();

  }
);


/* --------------------------------------------------
   SELECT ALL INSIDE PAGE PICKER
-------------------------------------------------- */

selectAllBtn.addEventListener(
  "click",
  () => {

    selectedPages =
      new Set(
        Array.from(
          {
            length: totalPages
          },
          (_, index) =>
            index + 1
        )
      );


    updateSelectionUI();

  }
);


/* --------------------------------------------------
   CLEAR
-------------------------------------------------- */

clearBtn.addEventListener(
  "click",
  () => {

    selectedPages.clear();

    updateSelectionUI();

  }
);


/* --------------------------------------------------
   APPLY PAGE NUMBERS
-------------------------------------------------- */

applyBtn.addEventListener(
  "click",
  async () => {

    if (
      !sourcePdfBytes ||
      !totalPages
    ) {

      setStatus(
        "Please choose a PDF first."
      );

      return;

    }


    if (
      applyMode === "selected" &&
      selectedPages.size === 0
    ) {

      setStatus(
        "Please select at least one page."
      );

      return;

    }


    try {

      applyBtn.disabled =
        true;


      downloadBtn.classList.add(
        "hidden"
      );


      setStatus(
        "Adding page numbers..."
      );


      const pdfBytes =
        new Uint8Array(
          sourcePdfBytes
        );


      const pdf =
        await PDFDocument.load(
          pdfBytes
        );


      const pages =
        pdf.getPages();


      const selectedFontSize =
        Number(fontSize.value) || 18;


      const selectedMargin =
        Number(margin.value) || 24;


      const selectedPosition =
        position.value;


      const color =
        hexToRgb(
          numberColor.value
        );


      const textColor =
        rgb(
          color.r,
          color.g,
          color.b
        );


      for (
        let index = 0;
        index < pages.length;
        index++
      ) {

        const pageNumber =
          index + 1;


        const shouldApply =
          applyMode === "current"
            ? pageNumber === currentPage
            : selectedPages.has(
                pageNumber
              );


        if (!shouldApply) {
          continue;
        }


        const page =
          pages[index];


        const {
          width,
          height
        } =
          page.getSize();


        const text =
          String(
            getStartingNumber() +
            index
          );


        const textWidth =
          selectedFontSize *
          0.56 *
          text.length;


        let x =
          (width -
            textWidth) / 2;


        let y =
          selectedMargin;


        if (
          selectedPosition ===
          "bottom-left"
        ) {

          x =
            selectedMargin;

          y =
            selectedMargin;

        }


        else if (
          selectedPosition ===
          "bottom-right"
        ) {

          x =
            width -
            textWidth -
            selectedMargin;

          y =
            selectedMargin;

        }


        else if (
          selectedPosition ===
          "top-left"
        ) {

          x =
            selectedMargin;

          y =
            height -
            selectedMargin -
            selectedFontSize;

        }


        else if (
          selectedPosition ===
          "top-right"
        ) {

          x =
            width -
            textWidth -
            selectedMargin;

          y =
            height -
            selectedMargin -
            selectedFontSize;

        }


        else if (
          selectedPosition ===
          "top-center"
        ) {

          x =
            (width -
              textWidth) / 2;

          y =
            height -
            selectedMargin -
            selectedFontSize;

        }


        else {

          x =
            (width -
              textWidth) / 2;

          y =
            selectedMargin;

        }


        x =
          Math.max(
            0,
            x
          );


        y =
          Math.max(
            0,
            y
          );


        page.drawText(
          text,
          {
            x,
            y,

            size:
              selectedFontSize,

            color:
              textColor
          }
        );

      }


      generatedPdfBytes =
        await pdf.save();


      downloadBtn.classList.remove(
        "hidden"
      );


      anotherBtn.classList.remove(
        "hidden"
      );


      setStatus(
        "Page numbers added successfully."
      );


    } catch (error) {

      console.error(error);

      setStatus(
        "Could not add page numbers."
      );

    } finally {

      applyBtn.disabled =
        false;

    }

  }
);


/* --------------------------------------------------
   DOWNLOAD
-------------------------------------------------- */

downloadBtn.addEventListener(
  "click",
  () => {

    if (!generatedPdfBytes) {
      return;
    }


    const blob =
      new Blob(
        [
          generatedPdfBytes
        ],
        {
          type:
            "application/pdf"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      currentFile
        ? currentFile.name.replace(
            /\.pdf$/i,
            ""
          ) +
          "-numbered.pdf"
        : "numbered.pdf";


    document.body.appendChild(
      link
    );


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


/* --------------------------------------------------
   ANOTHER PDF
-------------------------------------------------- */

anotherBtn.addEventListener(
  "click",
  () => {

    resetTool();

    fileInput.value = "";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


/* --------------------------------------------------
   RESET
-------------------------------------------------- */

function resetTool() {

  currentFile = null;

  sourcePdfBytes = null;

  pdfDocument = null;

  totalPages = 0;

  currentPage = 1;

  selectedPages.clear();

  applyMode = "current";

  generatedPdfBytes = null;

  previewRenderToken++;


  uploadCard.classList.remove(
    "hidden"
  );

  workspace.classList.add(
    "hidden"
  );


  pageSelection.classList.add(
    "hidden"
  );


  downloadBtn.classList.add(
    "hidden"
  );


  anotherBtn.classList.add(
    "hidden"
  );


  pageGrid.innerHTML = "";


  fileName.textContent =
    "Your PDF";

  pageCount.textContent =
    "0 pages";

  previewPageInfo.textContent =
    "Page 1 of 1";

  previewPageNumber.textContent =
    "1";


  setStatus("");


  applyBtn.disabled =
    false;

}


/* --------------------------------------------------
   RESIZE
-------------------------------------------------- */

let resizeTimer = null;


window.addEventListener(
  "resize",
  () => {

    clearTimeout(
      resizeTimer
    );


    resizeTimer =
      setTimeout(
        () => {

          if (pdfDocument) {
            renderPreview();
          }

        },
        120
      );

  }
);
