import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

import {
  PDFDocument
} from
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";


/* --------------------------------
   PDF.JS WORKER
-------------------------------- */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const workspace = document.getElementById("workspace");

const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");

const pageGrid = document.getElementById("pageGrid");

const selectedCount = document.getElementById("selectedCount");

const selectAllBtn = document.getElementById("selectAllBtn");
const clearBtn = document.getElementById("clearBtn");

const splitBtn = document.getElementById("splitBtn");
const downloadBtn = document.getElementById("downloadBtn");

const resetTopBtn = document.getElementById("resetTopBtn");
const resetBtn = document.getElementById("resetBtn");

const status = document.getElementById("status");


let currentFile = null;
let pdfDocument = null;
let selectedPages = new Set();
let splitPdfBytes = null;
let isRendering = false;


/* --------------------------------
   HELPERS
-------------------------------- */

function setStatus(message = "", type = "") {

  status.textContent = message;
  status.className = "status";

  if (type) {
    status.classList.add(type);
  }
}


function formatFileSize(bytes) {

  if (!bytes) {
    return "0 KB";
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}


function isPdf(file) {

  return (
    file &&
    (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    )
  );
}


/* --------------------------------
   LOAD PDF
-------------------------------- */

async function loadPdf(file) {

  if (!isPdf(file)) {

    setStatus(
      "Please choose a PDF file.",
      "error"
    );

    return;
  }


  currentFile = file;
  splitPdfBytes = null;
  selectedPages.clear();

  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  dropZone.classList.add("hidden");
  workspace.classList.remove("hidden");

  fileName.textContent = file.name;
  fileName.title = file.name;

  fileMeta.textContent =
    `${formatFileSize(file.size)} • Loading pages…`;

  pageGrid.innerHTML = "";

  setStatus("Loading your PDF…");


  try {

    const arrayBuffer =
      await file.arrayBuffer();


    pdfDocument =
      await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;


    fileMeta.textContent =
      `${formatFileSize(file.size)} • ${pdfDocument.numPages} pages`;


    await renderPageGrid();


    setStatus("");

  } catch (error) {

    console.error("PDF load error:", error);

    pdfDocument = null;
    currentFile = null;

    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");

    setStatus(
      "Could not open this PDF. Please choose a valid PDF file.",
      "error"
    );
  }
}


/* --------------------------------
   RENDER PAGE GRID
-------------------------------- */

async function renderPageGrid() {

  if (!pdfDocument) {
    return;
  }

  isRendering = true;

  pageGrid.innerHTML = "";


  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber++
  ) {

    const pageCard =
      createPageCard(pageNumber);

    pageGrid.appendChild(pageCard);

    await renderPageThumbnail(
      pageNumber,
      pageCard
    );
  }


  isRendering = false;

  updateSelectionUI();
}


/* --------------------------------
   PAGE CARD
-------------------------------- */

function createPageCard(pageNumber) {

  const card =
    document.createElement("div");

  card.className = "page-card";
  card.dataset.page = String(pageNumber);


  const thumbnail =
    document.createElement("div");

  thumbnail.className =
    "page-thumbnail";


  const canvas =
    document.createElement("canvas");


  const loading =
    document.createElement("div");

  loading.className =
    "page-loading";


  const spinner =
    document.createElement("div");

  spinner.className =
    "page-spinner";


  loading.appendChild(spinner);

  thumbnail.appendChild(canvas);
  thumbnail.appendChild(loading);


  const check =
    document.createElement("div");

  check.className =
    "page-check";

  check.textContent = "✓";


  const number =
    document.createElement("div");

  number.className =
    "page-number";

  number.textContent =
    `Page ${pageNumber}`;


  card.appendChild(thumbnail);
  card.appendChild(check);
  card.appendChild(number);


  card.addEventListener(
    "click",
    () => togglePage(pageNumber)
  );


  return card;
}


/* --------------------------------
   PAGE THUMBNAIL
-------------------------------- */

async function renderPageThumbnail(
  pageNumber,
  card
) {

  try {

    const page =
      await pdfDocument.getPage(pageNumber);


    const baseViewport =
      page.getViewport({
        scale: 1
      });


    const targetWidth = 250;

    const scale =
      targetWidth /
      baseViewport.width;


    const viewport =
      page.getViewport({
        scale
      });


    const canvas =
      card.querySelector("canvas");

    const context =
      canvas.getContext("2d", {
        alpha: false
      });


    const outputScale =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );


    canvas.width =
      Math.floor(
        viewport.width * outputScale
      );

    canvas.height =
      Math.floor(
        viewport.height * outputScale
      );


    canvas.style.width =
      `${viewport.width}px`;

    canvas.style.height =
      `${viewport.height}px`;


    await page.render({
      canvasContext: context,
      viewport,
      transform: [
        outputScale,
        0,
        0,
        outputScale,
        0,
        0
      ]
    }).promise;


    const loader =
      card.querySelector(".page-loading");

    if (loader) {
      loader.remove();
    }

  } catch (error) {

    console.error(
      `Could not render page ${pageNumber}:`,
      error
    );

    const loader =
      card.querySelector(".page-loading");

    if (loader) {
      loader.remove();
    }
  }
}


/* --------------------------------
   PAGE SELECTION
-------------------------------- */

function togglePage(pageNumber) {

  if (selectedPages.has(pageNumber)) {
    selectedPages.delete(pageNumber);
  } else {
    selectedPages.add(pageNumber);
  }

  updateSelectionUI();
}


function updateSelectionUI() {

  selectedCount.textContent =
    selectedPages.size;


  document
    .querySelectorAll(".page-card")
    .forEach(card => {

      const pageNumber =
        Number(card.dataset.page);

      card.classList.toggle(
        "selected",
        selectedPages.has(pageNumber)
      );
    });


  splitBtn.disabled =
    selectedPages.size === 0;
}


/* --------------------------------
   SELECT ALL
-------------------------------- */

function selectAllPages() {

  if (!pdfDocument) {
    return;
  }


  selectedPages.clear();


  for (
    let i = 1;
    i <= pdfDocument.numPages;
    i++
  ) {

    selectedPages.add(i);
  }


  updateSelectionUI();
}


/* --------------------------------
   CLEAR
-------------------------------- */

function clearSelection() {

  selectedPages.clear();

  updateSelectionUI();
}


/* --------------------------------
   SPLIT PDF
-------------------------------- */

async function splitPdf() {

  if (!currentFile || !pdfDocument) {

    setStatus(
      "Please choose a PDF first.",
      "error"
    );

    return;
  }


  if (selectedPages.size === 0) {

    setStatus(
      "Please select at least one page.",
      "error"
    );

    return;
  }


  if (isRendering) {

    setStatus(
      "Please wait for the pages to finish loading.",
      "error"
    );

    return;
  }


  splitBtn.disabled = true;
  downloadBtn.classList.add("hidden");

  setStatus("Splitting your PDF…");


  try {

    const sourceBytes =
      await currentFile.arrayBuffer();


    const sourcePdf =
      await PDFDocument.load(
        sourceBytes
      );


    const newPdf =
      await PDFDocument.create();


    const pageNumbers =
      Array.from(selectedPages)
        .sort((a, b) => a - b);


    const pageIndices =
      pageNumbers.map(
        pageNumber => pageNumber - 1
      );


    const copiedPages =
      await newPdf.copyPages(
        sourcePdf,
        pageIndices
      );


    copiedPages.forEach(page => {
      newPdf.addPage(page);
    });


    splitPdfBytes =
      await newPdf.save({
        useObjectStreams: true
      });


    downloadBtn.classList.remove("hidden");
    resetBtn.classList.remove("hidden");

    setStatus(
      `${selectedPages.size} page${selectedPages.size === 1 ? "" : "s"} split successfully ✨`,
      "success"
    );


  } catch (error) {

    console.error(
      "PDF split error:",
      error
    );

    splitPdfBytes = null;

    setStatus(
      "Could not split this PDF. Please try another PDF.",
      "error"
    );

  } finally {

    splitBtn.disabled =
      selectedPages.size === 0;
  }
}


/* --------------------------------
   DOWNLOAD
-------------------------------- */

function downloadSplitPdf() {

  if (!splitPdfBytes) {
    return;
  }


  const blob =
    new Blob(
      [splitPdfBytes],
      {
        type: "application/pdf"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;
  link.download = "pikatools-split.pdf";


  document.body.appendChild(link);

  link.click();

  link.remove();


  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


/* --------------------------------
   RESET
-------------------------------- */

function resetSplitter() {

  currentFile = null;
  pdfDocument = null;

  selectedPages.clear();

  splitPdfBytes = null;

  pageGrid.innerHTML = "";

  fileInput.value = "";

  workspace.classList.add("hidden");
  dropZone.classList.remove("hidden");

  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  splitBtn.disabled = true;

  setStatus("");
}


/* --------------------------------
   FILE INPUT
-------------------------------- */

fileInput.addEventListener(
  "change",
  event => {

    const file =
      event.target.files?.[0];

    if (file) {
      loadPdf(file);
    }

    fileInput.value = "";
  }
);


/* --------------------------------
   DRAG & DROP
-------------------------------- */

dropZone.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

    dropZone.classList.add("dragging");
  }
);


dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove("dragging");
  }
);


dropZone.addEventListener(
  "drop",
  event => {

    event.preventDefault();

    dropZone.classList.remove("dragging");

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      loadPdf(file);
    }
  }
);


/* --------------------------------
   BUTTONS
-------------------------------- */

selectAllBtn.addEventListener(
  "click",
  selectAllPages
);


clearBtn.addEventListener(
  "click",
  clearSelection
);


splitBtn.addEventListener(
  "click",
  splitPdf
);


downloadBtn.addEventListener(
  "click",
  downloadSplitPdf
);


resetTopBtn.addEventListener(
  "click",
  resetSplitter
);


resetBtn.addEventListener(
  "click",
  resetSplitter
);
