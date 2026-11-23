import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
import { PDFDocument, degrees } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const workspace = document.getElementById("workspace");
const fileName = document.getElementById("fileName");
const fileMeta = document.getElementById("fileMeta");
const pageGrid = document.getElementById("pageGrid");
const selectedCount = document.getElementById("selectedCount");
const selectAllBtn = document.getElementById("selectAllBtn");
const clearBtn = document.getElementById("clearBtn");
const rotateLeftBtn = document.getElementById("rotateLeftBtn");
const rotateRightBtn = document.getElementById("rotateRightBtn");
const rotateAllBtn = document.getElementById("rotateAllBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const status = document.getElementById("status");

let currentFile = null;
let sourcePdfBytes = null;
let pdfDocument = null;
let selectedPages = new Set();
let pageRotations = new Map();
let isBusy = false;

function setStatus(message = "", type = "") {
  status.textContent = message;
  status.className = "status";
  if (type) status.classList.add(type);
}

function isPdf(file) {
  return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function normalizeRotation(value) {
  return ((value % 360) + 360) % 360;
}

function hasAnyRotation() {
  return Array.from(pageRotations.values()).some(value => normalizeRotation(value) !== 0);
}

async function loadPdf(file) {
  if (!isPdf(file)) {
    setStatus("Please choose a PDF file.", "error");
    return;
  }

  if (pdfDocument && typeof pdfDocument.destroy === "function") {
    await pdfDocument.destroy().catch(() => {});
  }

  currentFile = file;
  selectedPages.clear();
  pageRotations.clear();
  sourcePdfBytes = null;
  pdfDocument = null;

  dropZone.classList.add("hidden");
  workspace.classList.remove("hidden");
  downloadBtn.disabled = true;
  resetBtn.classList.add("hidden");

  fileName.textContent = file.name;
  fileName.title = file.name;
  fileMeta.textContent = `${formatFileSize(file.size)} • Loading preview…`;
  pageGrid.innerHTML = "";
  setStatus("Loading PDF preview…");

  try {
    const originalBuffer = await file.arrayBuffer();
    sourcePdfBytes = new Uint8Array(originalBuffer.slice(0));
    const pdfJsBytes = new Uint8Array(originalBuffer.slice(0));

    pdfDocument = await pdfjsLib.getDocument({ data: pdfJsBytes }).promise;
    fileMeta.textContent = `${formatFileSize(file.size)} • ${pdfDocument.numPages} pages`;

    await renderAllPages();
    setStatus("");
  } catch (error) {
    console.error("PDF load error:", error);
    currentFile = null;
    sourcePdfBytes = null;
    pdfDocument = null;
    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");
    setStatus("Could not open this PDF. Please choose a valid PDF file.", "error");
  }
}

async function renderAllPages() {
  if (!pdfDocument) return;
  pageGrid.innerHTML = "";
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const card = createPageCard(pageNumber);
    pageGrid.appendChild(card);
    await renderPage(pageNumber, card);
  }
  updateSelectionUI();
}

function createPageCard(pageNumber) {
  const card = document.createElement("div");
  card.className = "page-card";
  card.dataset.page = String(pageNumber);

  const thumbnail = document.createElement("div");
  thumbnail.className = "page-thumbnail";

  const canvas = document.createElement("canvas");
  const loading = document.createElement("div");
  loading.className = "page-loading";
  const spinner = document.createElement("div");
  spinner.className = "page-spinner";

  loading.appendChild(spinner);
  thumbnail.appendChild(canvas);
  thumbnail.appendChild(loading);

  const check = document.createElement("div");
  check.className = "page-check";
  check.textContent = "✓";

  const pageNumberLabel = document.createElement("div");
  pageNumberLabel.className = "page-number";
  pageNumberLabel.textContent = `Page ${pageNumber}`;

  card.appendChild(thumbnail);
  card.appendChild(check);
  card.appendChild(pageNumberLabel);

  card.addEventListener("click", () => togglePage(pageNumber));
  return card;
}

async function renderPage(pageNumber, card) {
  try {
    const page = await pdfDocument.getPage(pageNumber);
    const baseRotation = Number(page.rotate || 0);
    const addedRotation = pageRotations.get(pageNumber) || 0;
    const totalRotation = normalizeRotation(baseRotation + addedRotation);

    const baseViewport = page.getViewport({ scale: 1, rotation: totalRotation });
    const targetWidth = 260;
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale, rotation: totalRotation });

    const canvas = card.querySelector("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.ceil(viewport.width * outputScale);
    canvas.height = Math.ceil(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    await page.render({
      canvasContext: context,
      viewport,
      transform: [outputScale, 0, 0, outputScale, 0, 0]
    }).promise;

    const oldBadge = card.querySelector(".rotation-badge");
    if (oldBadge) oldBadge.remove();

    if (addedRotation !== 0) {
      const badge = document.createElement("div");
      badge.className = "rotation-badge";
      badge.textContent = `${addedRotation}°`;
      card.appendChild(badge);
    }

    const loader = card.querySelector(".page-loading");
    if (loader) loader.remove();
  } catch (error) {
    console.error(`Could not render page ${pageNumber}:`, error);
    const loader = card.querySelector(".page-loading");
    if (loader) loader.remove();
  }
}

function togglePage(pageNumber) {
  if (selectedPages.has(pageNumber)) selectedPages.delete(pageNumber);
  else selectedPages.add(pageNumber);
  updateSelectionUI();
}

function updateSelectionUI() {
  selectedCount.textContent = selectedPages.size;
  document.querySelectorAll(".page-card").forEach(card => {
    const pageNumber = Number(card.dataset.page);
    card.classList.toggle("selected", selectedPages.has(pageNumber));
  });

  const hasSelection = selectedPages.size > 0;
  rotateLeftBtn.disabled = !hasSelection || isBusy;
  rotateRightBtn.disabled = !hasSelection || isBusy;
  rotateAllBtn.disabled = isBusy;
}

function selectAllPages() {
  if (!pdfDocument) return;
  selectedPages.clear();
  for (let i = 1; i <= pdfDocument.numPages; i++) selectedPages.add(i);
  updateSelectionUI();
}

function clearSelection() {
  selectedPages.clear();
  updateSelectionUI();
}

async function rotateSelected(amount) {
  if (!pdfDocument || selectedPages.size === 0 || isBusy) return;
  isBusy = true;
  updateSelectionUI();

  const pages = Array.from(selectedPages);
  pages.forEach(pageNumber => {
    const current = pageRotations.get(pageNumber) || 0;
    pageRotations.set(pageNumber, normalizeRotation(current + amount));
  });

  setStatus("Updating preview…");
  for (const pageNumber of pages) {
    const card = document.querySelector(`.page-card[data-page="${pageNumber}"]`);
    if (card) await renderPage(pageNumber, card);
  }

  downloadBtn.disabled = !hasAnyRotation();
  isBusy = false;
  updateSelectionUI();
  setStatus("Preview updated ✨", "success");
}

async function rotateAll() {
  if (!pdfDocument || isBusy) return;
  isBusy = true;
  updateSelectionUI();
  setStatus("Rotating all pages…");

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const current = pageRotations.get(pageNumber) || 0;
    pageRotations.set(pageNumber, normalizeRotation(current + 90));
    const card = document.querySelector(`.page-card[data-page="${pageNumber}"]`);
    if (card) await renderPage(pageNumber, card);
  }

  downloadBtn.disabled = false;
  isBusy = false;
  updateSelectionUI();
  setStatus("All pages rotated 90° clockwise ✨", "success");
}

async function createRotatedPdf() {
  if (!sourcePdfBytes || sourcePdfBytes.byteLength === 0) throw new Error("Source PDF bytes are unavailable.");
  if (!hasAnyRotation()) throw new Error("No pages have been rotated.");

  const pdfBytesForLib = new Uint8Array(sourcePdfBytes);
  const pdf = await PDFDocument.load(pdfBytesForLib);

  for (let index = 0; index < pdf.getPageCount(); index++) {
    const pageNumber = index + 1;
    const rotation = pageRotations.get(pageNumber) || 0;
    if (rotation === 0) continue;

    const page = pdf.getPage(index);
    const existingRotation = page.getRotation().angle;
    page.setRotation(degrees(normalizeRotation(existingRotation + rotation)));
  }

  return await pdf.save({ useObjectStreams: true });
}

async function downloadRotatedPdf() {
  if (isBusy) return;
  if (!hasAnyRotation()) {
    setStatus("Please rotate at least one page first.", "error");
    return;
  }

  try {
    isBusy = true;
    updateSelectionUI();
    downloadBtn.disabled = true;
    setStatus("Creating your rotated PDF…");

    const finalBytes = await createRotatedPdf();
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pikatools-rotated.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
    resetBtn.classList.remove("hidden");
    setStatus("PDF downloaded successfully ✨", "success");
  } catch (error) {
    console.error("PDF download error:", error);
    setStatus("Could not create the rotated PDF. Please try again.", "error");
  } finally {
    isBusy = false;
    downloadBtn.disabled = !hasAnyRotation();
    updateSelectionUI();
  }
}

function resetRotate() {
  if (pdfDocument && typeof pdfDocument.destroy === "function") {
    pdfDocument.destroy().catch(() => {});
  }
  currentFile = null;
  sourcePdfBytes = null;
  pdfDocument = null;
  selectedPages.clear();
  pageRotations.clear();
  pageGrid.innerHTML = "";
  fileInput.value = "";
  workspace.classList.add("hidden");
  dropZone.classList.remove("hidden");
  downloadBtn.disabled = true;
  resetBtn.classList.add("hidden");
  isBusy = false;
  setStatus("");
}

fileInput.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) loadPdf(file);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  const file = event.dataTransfer.files?.[0];
  if (file) loadPdf(file);
});

selectAllBtn.addEventListener("click", selectAllPages);
clearBtn.addEventListener("click", clearSelection);
rotateLeftBtn.addEventListener("click", () => rotateSelected(-90));
rotateRightBtn.addEventListener("click", () => rotateSelected(90));
rotateAllBtn.addEventListener("click", rotateAll);
downloadBtn.addEventListener("click", downloadRotatedPdf);
resetBtn.addEventListener("click", resetRotate);
