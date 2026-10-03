import {
PDFDocument,
rgb,
degrees
} from "https:/cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
import * as pdfjsLib from
"https:/cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
"https:/cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
/* =========================================================
ELEMENTS
========================================================= */
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
const watermarkText =
document.getElementById("watermarkText");
const fontSize =
document.getElementById("fontSize");
const position =
document.getElementById("position");const rotation =
document.getElementById("rotation");
const opacity =
document.getElementById("opacity");
const watermarkColor =
document.getElementById("watermarkColor");
const colorValue =
document.getElementById("colorValue");
/*
The old "All Pages" button is now used as
"Select All".
*/
const allPagesBtn =
document.getElementById("allPagesBtn");
const selectPagesBtn =
document.getElementById("selectPagesBtn");
const pageSelection =
document.getElementById("pageSelection");
const selectAllBtn =
document.getElementById("selectAllBtn");
const clearBtn =
document.getElementById("clearBtn");
const pageGrid =
document.getElementById("pageGrid");
const selectedInfo =
document.getElementById("selectedInfo");
const previewPrev =
document.getElementById("previewPrev");
const previewNext =
document.getElementById("previewNext");
const previewPaper =
document.getElementById("previewPaper");
const previewCanvas =document.getElementById("previewCanvas");
const previewWatermark =
document.getElementById("previewWatermark");
const previewWatermarkText =
document.getElementById("previewWatermarkText");
const resizeHandle =
document.getElementById("resizeHandle");
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
/* =========================================================
APPLY TO ALL BUTTON
========================================================= */
/*
Create "Apply to All" beside the existing
"Apply Watermark" button if it does not already
exist in HTML.
*/
let applyToAllBtn =
document.getElementById("applyToAllBtn");
if (
!applyToAllBtn &&
applyBtn
) {
applyToAllBtn =
document.createElement("button");applyToAllBtn.type =
"button";
applyToAllBtn.id =
"applyToAllBtn";
applyToAllBtn.className =
applyBtn.className;
applyToAllBtn.textContent =
"Apply to All";
/*
Put the new button immediately beside
Apply Watermark.
*/
const applyParent =
applyBtn.parentElement;
if (applyParent) {
const computedStyle =
window.getComputedStyle(
applyParent
);
if (
computedStyle.display ===
"flex"
) {
applyParent.appendChild(
applyToAllBtn
);
} else {
const applyActions =
document.createElement(
"div"
);
applyActions.style.display =
"flex";applyActions.style.alignItems =
"center";
applyActions.style.gap =
"10px";
applyActions.style.width =
"100%";
applyBtn.parentNode.insertBefore(
applyActions,
applyBtn
);
applyActions.appendChild(
applyBtn
);
applyActions.appendChild(
applyToAllBtn
);
}
}
}
/* =========================================================
STATE
========================================================= */
let currentFile = null;
let sourcePdfBytes = null;
let pdfDocument = null;
let generatedPdfBytes = null;
let isBusy = false;
let previewPageIndex = 1;
let previewScale = 1;/*
Every page has its OWN independent watermark state.
*/
const pageStates = new Map();
/*
current = only current preview page
all = all pages
selected = selected pages only
*/
let applyMode = "current";
let selectedPages = new Set();
/*
watermarkState always represents ONLY
previewPageIndex.
*/
let watermarkState = null;
/*
Tracks which page watermarkState belongs to.
*/
let watermarkStatePage = null;
let watermarkSelected = false;
/* =========================================================
DRAG
========================================================= */
let dragging = false;
let dragPointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartWatermarkX = 50;
let dragStartWatermarkY = 50;/* =========================================================
RESIZE
========================================================= */
let resizing = false;
let resizePointerId = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartScale = 1;
/* =========================================================
PINCH
========================================================= */
const activePointers = new Map();
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchActive = false;
let previewRenderToken = 0;
/* =========================================================
HELPERS
========================================================= */
function clamp(value, min, max) {
return Math.min(max, Math.max(min, value));
}
function setStatus(message) {
status.textContent = message;
}
function escapeFileName(name) {return name
.replace(/\.pdf$/i, "")
.replace(/[^\w\-]+/g, "-")
.replace(/-+/g, "-")
.replace(/^-|-$/g, "");
}
function createDefaultState() {
return {
text: "PikaTools",
fontSize: 36,
position: "center",
rotation: 0,
opacity: 0.5,
color: "#76594b",
x: 50,
y: 50,
scale: 1
};
}
function cloneState(state) {
reftoetuxnrttn : Ss{
iztaet: es.tteaxtet,
.fontSize,
position: state.position,
rotation: state.rotation,
opacity: state.opacity,color: state.color,
x: state.x,
y: state.y,
scale: state.scale
};
}
/* =========================================================
POSITION PRESETS
========================================================= */
function getPresetPosition(value) {
switch (value) {
case "top-left":
return {
x: 14,
y: 12
};
case "top-right":
return {
x: 86,
y: 12
};
case "bottom-left":
return {
x: 14,
y: 88
};
case "bottom-right":
return {
x: 86,
y: 88
};
case "center":
default:
return {
x: 50,y: 50
};
}
}
/* =========================================================
PAGE STATE
========================================================= */
function ensurePageState(pageNumber) {
if (!pageStates.has(pageNumber)) {
pageStates.set(
pageNumber,
createDefaultState()
);
}
return pageStates.get(pageNumber);
}
/*
SAVE ONLY THE PAGE THAT watermarkState BELONGS TO.
*/
function saveCurrentState() {
if (
!watermarkState ||
!pdfDocument ||
!watermarkStatePage
) {
return;
}
/*
Safety check:
Never allow an old page's state to be written
into another page.
*/
if (watermarkStatePage !==
previewPageIndex
) {
return;
}
pageStates.set(
watermarkStatePage,
cloneState(
watermarkState
)
);
}
/*
LOAD ONE PAGE'S STATE ONLY.
*/
function loadPageState(pageNumber) {
const state =
ensurePageState(pageNumber);
watermarkState =
cloneState(state);
watermarkStatePage =
pageNumber;
syncControlsFromState();
}
/* =========================================================
CONTROL SYNC
========================================================= */
function syncControlsFromState() {
if (!watermarkState) {
return;
}watermarkText.value =
watermarkState.text;
fontSize.value =
String(
watermarkState.fontSize
);
position.value =
watermarkState.position;
rotation.value =
String(
watermarkState.rotation
);
opacity.value =
String(
watermarkState.opacity
);
watermarkColor.value =
watermarkState.color;
colorValue.textContent =
watermarkState.color.toUpperCase();
}
/* =========================================================
PREVIEW WATERMARK VISIBILITY
========================================================= */
function shouldShowPreviewWatermark() {
if (!pdfDocument) {
return false;
}
if (applyMode === "all") {
return true;
}if (applyMode === "selected") {
return selectedPages.has(
previewPageIndex
);
}
return true;
}
function updatePreviewWatermarkVisibility() {
const shouldShow =
shouldShowPreviewWatermark();
previewWatermark.classList.toggle(
"hidden",
!shouldShow
);
if (!shouldShow) {
setWatermarkSelected(false);
}
}
/* =========================================================
UPLOAD
========================================================= */
fileInput.addEventListener(
"change",
async event => {
const file =
event.target.files?.[0];
if (!file) {
return;}
await loadPdf(file);
}
);
dropZone.addEventListener(
"dragover",
event => {
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
async event => {
event.preventDefault();
dropZone.classList.remove(
"dragover"
);
const file =
event.dataTransfer.files?.[0];if (!file) {
return;
}
if (
file.type !== "application/pdf" &&
!file.name
.toLowerCase()
.endsWith(".pdf")
) {
setStatus(
"Please choose a PDF file."
);
return;
}
await loadPdf(file);
}
);
/* =========================================================
LOAD PDF
========================================================= */
async function loadPdf(file) {
try {
setStatus(
"Loading PDF..."
);
currentFile = file;
generatedPdfBytes = null;
downloadBtn.classList.add(
"hidden"
);anotherBtn.classList.add(
"hidden"
);
const originalBufer =
await file.arrayBufer();
sourcePdfBytes =
new Uint8Array(
originalBufer.slice(0)
);
const pdfJsBytes =
new Uint8Array(
originalBufer.slice(0)
);
pdfDocument =
await pdfjsLib
.getDocument({
data: pdfJsBytes
})
.promise;
pageStates.clear();
for (
let pageNumber = 1;
pageNumber <= pdfDocument.numPages;
pageNumber++
) {
pageStates.set(
pageNumber,
createDefaultState()
);
}
selectedPages =new Set([1]);
applyMode = "current";
previewPageIndex = 1;
loadPageState(1);
setWatermarkSelected(false);
fileName.textContent =
file.name;
pageCount.textContent =
`${pdfDocument.numPages} ${
pdfDocument.numPages === 1
? "page"
: "pages"
}`;
uploadCard.classList.add(
"hidden"
);
workspace.classList.remove(
"hidden"
);
pageSelection.classList.add(
"hidden"
);
updateSelectionInfo();
await renderPageGrid();
await renderPreviewPage();
updateWatermarkVisual();
updatePreviewWatermarkVisibility();setStatus("");
workspace.scrollIntoView({
behavior: "smooth",
block: "start"
});
} catch (error) {
console.error(error);
resetTool();
setStatus(
"Could not open this PDF. Please try another PDF."
);
}
}
/* =========================================================
PAGE GRID
========================================================= */
async function renderPageGrid() {
pageGrid.innerHTML = "";
if (!pdfDocument) {
return;
}
for (
let pageNumber = 1;
pageNumber <= pdfDocument.numPages;
pageNumber++
) {
const card =
document.createElement("button");
card.type = "button";card.className =
"page-thumb";
card.dataset.page =
String(pageNumber);
const canvas =
document.createElement("canvas");
const number =
document.createElement("div");
number.className =
"page-number";
number.textContent =
`Page ${pageNumber}`;
card.appendChild(canvas);
card.appendChild(number);
pageGrid.appendChild(card);
card.addEventListener(
"click",
() => {
if (
selectedPages.has(
pageNumber
)
) {
selectedPages.delete(
pageNumber
);
} else {
selectedPages.add(
pageNumber
);}
applyMode =
"selected";
pageSelection.classList.remove(
"hidden"
);
updatePageSelectionUI();
updateSelectionInfo();
updatePreviewWatermarkVisibility();
updateWatermarkVisual();
}
);
try {
const page =
await pdfDocument.getPage(
pageNumber
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
viewport.width * dpr);
canvas.height =
Math.round(
viewport.height * dpr
);
canvas.style.width =
`${viewport.width}px`;
canvas.style.height =
`${viewport.height}px`;
const context =
canvas.getContext("2d");
const renderViewport =
page.getViewport({
scale:
0.22 * dpr
});
await page.render({
canvasContext: context,
viewport: renderViewport
}).promise;
} catch (error) {
console.error(
"Thumbnail error:",
error
);
}
}
updatePageSelectionUI();
}/* =========================================================
PAGE SELECTION UI
========================================================= */
function updatePageSelectionUI() {
const cards =
pageGrid.querySelectorAll(
".page-thumb"
);
cards.forEach(card => {
const pageNumber =
Number(
card.dataset.page
);
card.classList.toggle(
"selected",
selectedPages.has(
pageNumber
)
);
});
}
function updateSelectionInfo() {
if (!pdfDocument) {
selectedInfo.textContent =
"Current page";
return;
}
if (applyMode === "all") {
selectedInfo.textContent =
"All pages";return;
}
if (applyMode === "selected") {
const count =
selectedPages.size;
if (count === 0) {
selectedInfo.textContent =
"No pages selected";
return;
}
selectedInfo.textContent =
`${count} ${
count === 1
? "page"
: "pages"
} selected`;
return;
}
selectedInfo.textContent =
`Current page • Page ${previewPageIndex}`;
}
/* =========================================================
SELECT ALL
========================================================= */
/*
The old "All Pages" control now means
"Select All".IMPORTANT:
This selects every page AND hides the
Select Pages selection box + thumbnails.
It does NOT copy Page 1 watermark state.
*/
if (allPagesBtn) {
allPagesBtn.addEventListener(
"click",
() => {
if (!pdfDocument) {
return;
}
selectedPages =
new Set(
Array.from(
{
length:
pdfDocument.numPages
},
(_, index) =>
index + 1
)
);
applyMode =
"selected";
/*
Hide the complete Select Pages
section. Since pageGrid is inside
this section, its thumbnails also
disappear.
*/
pageSelection.classList.add(
"hidden"
);
updatePageSelectionUI();
updateSelectionInfo();updatePreviewWatermarkVisibility();
updateWatermarkVisual();
setStatus("");
}
);
}
/* =========================================================
SELECT PAGES
========================================================= */
selectPagesBtn.addEventListener(
"click",
() => {
applyMode = "selected";
/*
Show the complete Select Pages
section again, including thumbnails.
*/
pageSelection.classList.remove(
"hidden"
);
if (
selectedPages.size === 0
) {
selectedPages.add(
previewPageIndex
);
}
updateSelectionInfo();
updatePageSelectionUI();updatePreviewWatermarkVisibility();
updateWatermarkVisual();
setStatus("");
}
);
/* =========================================================
SELECT ALL
========================================================= */
/*
Keep compatibility with the existing
selectAllBtn if it is still present in HTML.
This internal button remains a normal
"select all pages" action.
*/
if (selectAllBtn) {
selectAllBtn.addEventListener(
"click",
() => {
if (!pdfDocument) {
return;
}
selectedPages =
new Set(
Array.from(
{
length:
pdfDocument.numPages
},
(_, index) =>
index + 1
)
);
applyMode =
"selected";updatePageSelectionUI();
updateSelectionInfo();
updatePreviewWatermarkVisibility();
updateWatermarkVisual();
setStatus("");
}
);
}
/* =========================================================
CLEAR
========================================================= */
clearBtn.addEventListener(
"click",
() => {
selectedPages.clear();
applyMode = "selected";
updatePageSelectionUI();
updateSelectionInfo();
updatePreviewWatermarkVisibility();
updateWatermarkVisual();
}
);
/* =========================================================
APPLY TO ALL
========================================================= */
/*
IMPORTANT BEHAVIOR:Page 1 is the MASTER watermark.
Apply to All copies Page 1's exact watermark state
to every page:
- text
- font size
- scale
- position
- rotation
- opacity
- color
Nothing is recalculated or changed.
Every page simply receives an exact clone of
Page 1's state.
*/
if (applyToAllBtn) {
applyToAllBtn.addEventListener(
"click",
() => {
if (!pdfDocument) {
return;
}
/*
Save the currently edited page first.
This is important when Page 1 itself
is currently being edited.
*/
saveCurrentState();
/*
Page 1 becomes the master.
*/
const firstPageState =
cloneState(
ensurePageState(1)
);
/*
Copy the EXACT same state to every page.*/
for (
let pageNumber = 1;
pageNumber <= pdfDocument.numPages;
pageNumber++
) {
pageStates.set(
pageNumber,
cloneState(
firstPageState
)
);
}
/*
All pages now have the same watermark.
*/
selectedPages =
new Set(
Array.from(
{
length:
pdfDocument.numPages
},
(_, index) =>
index + 1
)
);
applyMode =
"all";
/*
Load the copied state for whichever
page is currently being previewed.
*/
loadPageState(
previewPageIndex
);
setWatermarkSelected(false);updatePageSelectionUI();
updateSelectionInfo();
updateWatermarkVisual();
updatePreviewWatermarkVisibility();
setStatus(
"Page 1 watermark applied to all pages."
);
}
);
}
/* =========================================================
PREVIEW PAGE
========================================================= */
async function renderPreviewPage() {
if (!pdfDocument) {
return;
}
if (
watermarkStatePage !==
previewPageIndex
) {
loadPageState(
previewPageIndex
);
}
const token =
++previewRenderToken;
try {const page =
await pdfDocument.getPage(
previewPageIndex
);
if (
token !== previewRenderToken
) {
return;
}
const baseViewport =
page.getViewport({
scale: 1
});
const stage =
previewPaper.parentElement;
const stageWidth =
Math.max(
150,
stage.clientWidth - 20
);
const stageHeight =
Math.max(
230,
Math.min(
window.innerWidth < 520
? 390
: 520,
window.innerHeight * 0.68
)
);
const scaleByWidth =
stageWidth /
baseViewport.width;const scaleByHeight =
stageHeight /
baseViewport.height;
previewScale =
Math.max(
0.05,
Math.min(
scaleByWidth,
scaleByHeight
)
);
const viewport =
page.getViewport({
scale:
previewScale
});
const dpr =
Math.min(
window.devicePixelRatio || 1,
2
);
previewPaper.style.width =
`${viewport.width}px`;
previewPaper.style.height =
`${viewport.height}px`;
previewCanvas.width =
Math.round(
viewport.width * dpr
);
previewCanvas.height =
Math.round(
viewport.height * dpr
);
previewCanvas.style.width =`${viewport.width}px`;
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
if (
token !== previewRenderToken
) {
return;
}
previewPageInfo.textContent =
`Page ${previewPageIndex} of ${pdfDocument.numPages}`;
previewPrev.disabled =
previewPageIndex <= 1;
previewNext.disabled =
previewPageIndex >=pdfDocument.numPages;
updateWatermarkVisual();
updatePreviewWatermarkVisibility();
updateSelectionInfo();
} catch (error) {
console.error(
"Preview render error:",
error
);
}
}
/* =========================================================
PREVIEW NAVIGATION
========================================================= */
previewPrev.addEventListener(
"click",
async () => {
if (
!pdfDocument ||
previewPageIndex <= 1
) {
return;
}
saveCurrentState();
setWatermarkSelected(false);
previewPageIndex--;
loadPageState(
previewPageIndex
);await renderPreviewPage();
}
);
previewNext.addEventListener(
"click",
async () => {
if (
!pdfDocument ||
previewPageIndex >=
pdfDocument.numPages
) {
return;
}
saveCurrentState();
setWatermarkSelected(false);
previewPageIndex++;
loadPageState(
previewPageIndex
);
await renderPreviewPage();
}
);
/* =========================================================
VISUAL WATERMARK
========================================================= */
function updateWatermarkVisual() {
if (!watermarkState) {
return;}
previewWatermarkText.textContent =
watermarkState.text ||
"PikaTools";
const previewFontSize =
Math.max(
8,
watermarkState.fontSize *
previewScale *
watermarkState.scale
);
previewWatermarkText.style.fontSize =
`${previewFontSize}px`;
previewWatermark.style.color =
watermarkState.color;
previewWatermark.style.opacity =
watermarkState.opacity;
previewWatermark.style.left =
`${watermarkState.x}%`;
previewWatermark.style.top =
`${watermarkState.y}%`;
previewWatermark.style.transform =
`translate(-50%, -50%) rotate(${watermarkState.rotation}deg)`;
previewWatermark.classList.toggle(
"selected",
watermarkSelected
);
colorValue.textContent =watermarkState.color.toUpperCase();
updatePreviewWatermarkVisibility();
}
/* =========================================================
SELECT / DESELECT WATERMARK
========================================================= */
function setWatermarkSelected(value) {
watermarkSelected = value;
previewWatermark.classList.toggle(
"selected",
value
);
}
previewWatermark.addEventListener(
"pointerdown",
event => {
if (
!shouldShowPreviewWatermark()
) {
return;
}
if (
event.target ===
resizeHandle
) {
return;
}
setWatermarkSelected(true);
}
);document.addEventListener(
"pointerdown",
event => {
if (
previewWatermark.contains(
event.target
)
) {
return;
}
setWatermarkSelected(false);
}
);
/* =========================================================
DRAG
========================================================= */
previewWatermark.addEventListener(
"pointerdown",
event => {
if (
!shouldShowPreviewWatermark()
) {
return;
}
if (
event.target ===
resizeHandle
) {
return;
}
if (
event.pointerType === "mouse" &&
event.button !== 0
) {
return;
}if (
watermarkStatePage !==
previewPageIndex
) {
loadPageState(
previewPageIndex
);
}
setWatermarkSelected(true);
dragging = true;
dragPointerId =
event.pointerId;
dragStartX =
event.clientX;
dragStartY =
event.clientY;
dragStartWatermarkX =
watermarkState.x;
dragStartWatermarkY =
watermarkState.y;
activePointers.set(
event.pointerId,
{
x: event.clientX,
y: event.clientY
}
);
try {
previewWatermark.setPointerCapture(event.pointerId
);
} catch (_) {}
event.preventDefault();
}
);
/* =========================================================
POINTER MOVE
========================================================= */
previewWatermark.addEventListener(
"pointermove",
event => {
activePointers.set(
event.pointerId,
{
x: event.clientX,
y: event.clientY
}
);
if (
activePointers.size >= 2 &&
shouldShowPreviewWatermark()
) {
const points =
Array.from(
activePointers.values()
).slice(0, 2);
const distance =
Math.hypot(
points[1].x -
points[0].x,
points[1].y -
points[0].y
);if (!pinchActive) {
pinchActive = true;
pinchStartDistance =
Math.max(
1,
distance
);
pinchStartScale =
watermarkState.scale;
}
const ratio =
distance /
pinchStartDistance;
watermarkState.scale =
clamp(
pinchStartScale *
ratio,
0.15,
8
);
saveCurrentState();
updateWatermarkVisual();
event.preventDefault();
return;
}
if (
!dragging ||
event.pointerId !==
dragPointerId ||
!shouldShowPreviewWatermark()
) {return;
}
const rect =
previewPaper.getBoundingClientRect();
if (
rect.width <= 0 ||
rect.height <= 0
) {
return;
}
const dx =
event.clientX -
dragStartX;
const dy =
event.clientY -
dragStartY;
watermarkState.x =
clamp(
dragStartWatermarkX +
(
dx /
rect.width
) *
100,
-5,
105
);
watermarkState.y =
clamp(
dragStartWatermarkY +
(
dy /
rect.height
) *
100,
-5,105
);
saveCurrentState();
updateWatermarkVisual();
event.preventDefault();
}
);
/* =========================================================
POINTER END
========================================================= */
function finishPointer(event) {
activePointers.delete(
event.pointerId
);
if (
activePointers.size < 2
) {
pinchActive = false;
}
if (
event.pointerId ===
dragPointerId
) {
dragging = false;
dragPointerId = null;
}
if (
event.pointerId ===resizePointerId
) {
resizing = false;
resizePointerId = null;
}
saveCurrentState();
try {
previewWatermark.releasePointerCapture(
event.pointerId
);
} catch (_) {}
}
previewWatermark.addEventListener(
"pointerup",
finishPointer
);
previewWatermark.addEventListener(
"pointercancel",
finishPointer
);
/* =========================================================
RESIZE HANDLE
========================================================= */
resizeHandle.addEventListener(
"pointerdown",
event => {
if (
!shouldShowPreviewWatermark()
) {
return;}
if (
event.pointerType === "mouse" &&
event.button !== 0
) {
return;
}
if (
watermarkStatePage !==
previewPageIndex
) {
loadPageState(
previewPageIndex
);
}
setWatermarkSelected(true);
resizing = true;
resizePointerId =
event.pointerId;
const rect =
previewWatermark.getBoundingClientRect();
const centerX =
rect.left +
rect.width / 2;
const centerY =
rect.top +
rect.height / 2;
resizeStartX =
event.clientX -centerX;
resizeStartY =
event.clientY -
centerY;
resizeStartScale =
watermarkState.scale;
try {
resizeHandle.setPointerCapture(
event.pointerId
);
} catch (_) {}
event.stopPropagation();
event.preventDefault();
}
);
resizeHandle.addEventListener(
"pointermove",
event => {
if (
!resizing ||
event.pointerId !==
resizePointerId ||
!shouldShowPreviewWatermark()
) {
return;
}
const rect =
previewWatermark.getBoundingClientRect();
const centerX =
rect.left +rect.width / 2;
const centerY =
rect.top +
rect.height / 2;
const currentX =
event.clientX -
centerX;
const currentY =
event.clientY -
centerY;
const startDistance =
Math.max(
12,
Math.hypot(
resizeStartX,
resizeStartY
)
);
const currentDistance =
Math.max(
12,
Math.hypot(
currentX,
currentY
)
);
const ratio =
currentDistance /
startDistance;
watermarkState.scale =
clamp(
resizeStartScale *
ratio,
0.15,8
);
saveCurrentState();
updateWatermarkVisual();
event.preventDefault();
}
);
resizeHandle.addEventListener(
"pointerup",
event => {
resizing = false;
resizePointerId = null;
saveCurrentState();
try {
resizeHandle.releasePointerCapture(
event.pointerId
);
} catch (_) {}
event.stopPropagation();
}
);
resizeHandle.addEventListener(
"pointercancel",
event => {
resizing = false;
resizePointerId = null;saveCurrentState();
event.stopPropagation();
}
);
/* =========================================================
SETTINGS CHANGES
========================================================= */
watermarkText.addEventListener(
"input",
() => {
if (!watermarkState) {
return;
}
watermarkState.text =
watermarkText.value;
saveCurrentState();
updateWatermarkVisual();
}
);
fontSize.addEventListener(
"change",
() => {
if (!watermarkState) {
return;
}
watermarkState.fontSize =
Number(
fontSize.value
);saveCurrentState();
updateWatermarkVisual();
}
);
position.addEventListener(
"change",
() => {
if (!watermarkState) {
return;
}
watermarkState.position =
position.value;
const preset =
getPresetPosition(
position.value
);
watermarkState.x =
preset.x;
watermarkState.y =
preset.y;
saveCurrentState();
updateWatermarkVisual();
}
);
rotation.addEventListener(
"change",
() => {
if (!watermarkState) {
return;}
watermarkState.rotation =
Number(
rotation.value
);
saveCurrentState();
updateWatermarkVisual();
}
);
opacity.addEventListener(
"change",
() => {
if (!watermarkState) {
return;
}
watermarkState.opacity =
Number(
opacity.value
);
saveCurrentState();
updateWatermarkVisual();
}
);
watermarkColor.addEventListener(
"input",
() => {
if (!watermarkState) {
return;
}watermarkState.color =
watermarkColor.value;
saveCurrentState();
updateWatermarkVisual();
}
);
/* =========================================================
APPLY WATERMARK
========================================================= */
applyBtn.addEventListener(
"click",
async () => {
await generateWatermarkedPdf();
}
);
/* =========================================================
GENERATE PDF
========================================================= */
async function generateWatermarkedPdf() {
if (
!pdfDocument ||
!sourcePdfBytes ||
isBusy
) {
return;
}
saveCurrentState();
try {
isBusy = true;applyBtn.disabled = true;
if (applyToAllBtn) {
applyToAllBtn.disabled = true;
}
downloadBtn.classList.add(
"hidden"
);
setStatus(
"Applying watermark..."
);
const pdfBytes =
new Uint8Array(
sourcePdfBytes
);
const pdf =
await PDFDocument.load(
pdfBytes
);
const font =
await pdf.embedFont(
"Helvetica-Bold"
);
const pages =
pdf.getPages();
let pagesToApply = [];
/*
ALL PAGES
*/
if (
applyMode === "all") {
pagesToApply =
Array.from(
{
length:
pdfDocument.numPages
},
(_, index) =>
index + 1
);
}
/*
SELECTED PAGES ONLY
*/
else if (
applyMode === "selected"
) {
pagesToApply =
Array.from(
selectedPages
)
.sort(
(a, b) => a - b
);
}
/*
CURRENT PAGE
*/
else {
pagesToApply =
[
previewPageIndex
];
}
if (
pagesToApply.length === 0) {
setStatus(
"Please select at least one page."
);
return;
}
/*
Apply only to requested pages.
Every other page remains untouched.
*/
for (
const pageNumber
of pagesToApply
) {
const page =
pages[
pageNumber - 1
];
const state =
cloneState(
ensurePageState(
pageNumber
)
);
const text =
state.text.trim();
if (!text) {
continue;
}
const finalFontSize =
state.fontSize *
state.scale;const color =
hexToRgb(
state.color
);
const {
width,
height
} =
page.getSize();
const textWidth =
font.widthOfTextAtSize(
text,
finalFontSize
);
const textHeight =
font.heightAtSize(
finalFontSize
);
const centerX =
(
state.x /
100
) *
width;
const centerY =
height -
(
(
state.y /
100
) *
height
);
const drawX =
centerX -
textWidth / 2;const drawY =
centerY -
textHeight / 2;
page.drawText(
text,
{
x: drawX,
y: drawY,
size: finalFontSize,
font,
color: rgb(
color.r / 255,
color.g / 255,
color.b / 255
),
opacity:
state.opacity,
rotate:
degrees(
state.rotation
)
}
);
}
generatedPdfBytes =
await pdf.save();
setStatus(
"Watermark applied successfully."
);updateWatermarkVisual();
downloadBtn.classList.remove(
"hidden"
);
anotherBtn.classList.remove(
"hidden"
);
} catch (error) {
console.error(
"Watermark generation error:",
error
);
setStatus(
"Could not apply watermark. Please try again."
);
} finally {
isBusy = false;
applyBtn.disabled = false;
if (applyToAllBtn) {
applyToAllBtn.disabled = false;
}
}
}
/* =========================================================
COLOR
========================================================= */
function hexToRgb(hex) {
const clean =
hex.replace(
"#",
"");
const value =
parseInt(
clean,
16
);
return {
r:
(value >> 16) & 255,
g:
(value >> 8) & 255,
b:
value & 255
};
}
/* =========================================================
DOWNLOAD
========================================================= */
downloadBtn.addEventListener(
"click",
() => {
if (!generatedPdfBytes) {
return;
}
const blob =
new Blob(
[generatedPdfBytes],
{
}
type:
"application/pdf"
);const url =
URL.createObjectURL(
blob
);
const baseName =
escapeFileName(
currentFile?.name ||
"document"
);
const link =
document.createElement("a");
link.href =
url;
link.download =
`${baseName}-watermarked.pdf`;
document.body.appendChild(
link
);
link.click();
link.remove();
setTimeout(
() => {
URL.revokeObjectURL(
url
);
},
1000
);
});
/* =========================================================
CHANGE PDF
========================================================= */
changePdfBtn.addEventListener(
"click",
() => {
fileInput.value = "";
fileInput.click();
}
);
/* =========================================================
ANOTHER PDF
========================================================= */
anotherBtn.addEventListener(
"click",
() => {
resetTool();
fileInput.value = "";
uploadCard.scrollIntoView({
behavior: "smooth",
block: "start"
});
}
);
/* =========================================================
RESIZE WINDOW
========================================================= */
let resizeTimer = null;
window.addEventListener(
"resize",() => {
clearTimeout(
resizeTimer
);
resizeTimer =
setTimeout(
() => {
renderPreviewPage();
},
120
);
}
);
/* =========================================================
RESET
========================================================= */
function resetTool() {
currentFile = null;
sourcePdfBytes = null;
pdfDocument = null;
generatedPdfBytes = null;
pageStates.clear();
selectedPages.clear();
watermarkState = null;
watermarkStatePage = null;
applyMode = "current";
previewPageIndex = 1;
setWatermarkSelected(false);pageGrid.innerHTML = "";
pageSelection.classList.add(
"hidden"
);
workspace.classList.add(
"hidden"
);
uploadCard.classList.remove(
"hidden"
);
downloadBtn.classList.add(
"hidden"
);
anotherBtn.classList.add(
"hidden"
);
previewWatermark.classList.remove(
"hidden"
);
setStatus("");
selectedInfo.textContent =
"Current page";
}
/* =========================================================
INITIAL
========================================================= */previewPrev.disabled = true;
previewNext.disabled = true;