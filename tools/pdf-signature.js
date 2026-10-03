import * as pdfjsLib from "https:/cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
const { PDFDocument } =
await import("https:/cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
pdfjsLib.GlobalWorkerOptions.workerSrc =
"https:/cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
/* =========================================================
DOM
========================================================= */
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const workspace = document.getElementById("workspace");
const pdfCanvas = document.getElementById("pdfCanvas");
const pdfStage = document.getElementById("pdfStage");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageNumber = document.getElementById("pageNumber");
const pageCount = document.getElementById("pageCount");
const changePdfBtn = document.getElementById("changePdfBtn");
const signatureOverlay =
document.getElementById("signatureOverlay");
const signatureImage =
document.getElementById("signatureImage");
const rotateBtn =
document.getElementById("rotateBtn");
const removeSignatureBtn =
document.getElementById("removeSignatureBtn");
const placementHint =
document.getElementById("placementHint");
const statusEl =
document.getElementById("status");
const drawCanvas =
document.getElementById("drawCanvas");const drawPlaceholder =
document.getElementById("drawPlaceholder");
const clearDrawBtn =
document.getElementById("clearDrawBtn");
const useDrawBtn =
document.getElementById("useDrawBtn");
const typedName =
document.getElementById("typedName");
const typedPreview =
document.getElementById("typedPreview");
const useTypedBtn =
document.getElementById("useTypedBtn");
const signatureFileInput =
document.getElementById("signatureFileInput");
const uploadedName =
document.getElementById("uploadedName");
const useUploadedBtn =
document.getElementById("useUploadedBtn");
const applyBtn =
document.getElementById("applyBtn");
const resetBtn =
document.getElementById("resetBtn");
/* =========================================================
REMOVE OLD / UNWANTED UI
========================================================= */
/*
Change PDF button is no longer needed.
Sign Another PDF is the only reset option.
*/
if (changePdfBtn) {
changePdfBtn.style.display = "none";
}
const oldResizeHandle =signatureOverlay?.querySelector(".resize-handle");
if (oldResizeHandle) {
oldResizeHandle.remove();
}
if (rotateBtn) {
rotateBtn.remove();
}
if (typedPreview) {
typedPreview.style.display = "none";
}
signatureOverlay.style.border = "none";
signatureOverlay.style.outline = "none";
signatureOverlay.style.boxShadow = "none";
signatureOverlay.style.background = "transparent";
signatureOverlay.style.borderRadius = "0";
signatureOverlay.style.padding = "0";
signatureOverlay.style.touchAction = "none";
signatureOverlay.style.userSelect = "none";
signatureOverlay.style.webkitUserSelect = "none";
signatureOverlay.style.cursor = "move";
signatureImage.style.border = "none";
signatureImage.style.outline = "none";
signatureImage.style.boxShadow = "none";
signatureImage.style.userSelect = "none";
signatureImage.style.webkitUserSelect = "none";
signatureImage.style.pointerEvents = "none";
/* =========================================================
STATE
========================================================= */
let selectedFile = null;
let pdfDocument = null;
let currentPage = 1;
let currentPdfScale = 1;
let signatureDataUrl = null;
let signatureRotation = 0;
let uploadedSignatureDataUrl = null;const pageSignatures = new Map();
/* =========================================================
BASIC HELPERS
========================================================= */
function showStatus(message, type = "") {
if (!statusEl) return;
statusEl.textContent = message;
statusEl.className = "status";
if (type) {
statusEl.classList.add(type);
}
}
function clamp(value, min, max) {
return Math.max(min, Math.min(max, value));
}
function getStageSize() {
return {
width:
pdfStage.clientWidth ||
pdfCanvas.clientWidth ||
1,
height:
pdfStage.clientHeight ||
pdfCanvas.clientHeight ||
1
};
}
function getStageRect() {
return pdfStage.getBoundingClientRect();
}
function hasAppliedSignatures() {
for (const state of pageSignatures.values()) {
if (state?.applied) {
return true;
}
}
return false;}
/* =========================================================
CLEAN UPLOAD SCREEN FLOW
========================================================= */
/*
Before PDF:
Choose PDF screen visible.
After PDF:
Choose PDF screen hidden.
Sign Another PDF:
Choose PDF screen visible again.
*/
function showUploadScreen() {
if (dropZone) {
dropZone.classList.remove("hidden");
dropZone.style.display = "";
}
if (workspace) {
workspace.classList.add("hidden");
}
if (resetBtn) {
resetBtn.classList.add("hidden");
}
}
function showWorkspaceScreen() {
if (dropZone) {
dropZone.classList.add("hidden");
dropZone.style.display = "none";
}
if (workspace) {
workspace.classList.remove("hidden");
}
if (resetBtn) {
resetBtn.classList.remove("hidden");
}
}/*
Start in clean upload state.
*/
showUploadScreen();
/* =========================================================
PLACEMENT HINT
========================================================= */
if (placementHint) {
placementHint.innerHTML =
"<span>✦</span>Drag to move • pinch to resize • twist to rotate";
}
/* =========================================================
APPLY / DOWNLOAD
========================================================= */
let downloadBtn = null;
let actionRow = null;
function createDownloadButton() {
if (downloadBtn) return;
actionRow =
document.createElement("div");
actionRow.className =
"signature-action-row";
actionRow.style.display = "flex";
actionRow.style.gap = "10px";
actionRow.style.width = "100%";
actionRow.style.marginTop = "10px";
actionRow.style.flexWrap = "wrap";
applyBtn.parentNode.insertBefore(
actionRow,
applyBtn
);
actionRow.appendChild(
applyBtn
);downloadBtn =
document.createElement("button");
downloadBtn.type = "button";
downloadBtn.textContent =
"Download Signature";
downloadBtn.className =
"apply-btn";
downloadBtn.hidden = true;
downloadBtn.style.flex =
"1 1 220px";
downloadBtn.style.minHeight =
"48px";
downloadBtn.style.background =
"#66806b";
downloadBtn.style.color =
"#f";
downloadBtn.style.border =
"none";
downloadBtn.style.cursor =
"pointer";
actionRow.appendChild(
downloadBtn
);
applyBtn.style.flex =
"1 1 220px";
applyBtn.style.marginTop =
"0";
downloadBtn.addEventListener(
"click",
downloadSignedPdf
);
}
createDownloadButton();/* =========================================================
DRAW SIGNATURE
========================================================= */
const SIGNATURE_INK = "#111111";
const drawCtx =
drawCanvas.getContext("2d");
let drawing = false;
let activeDrawPointerId = null;
let drawHistory = [];
drawCanvas.style.touchAction = "none";
drawCanvas.style.userSelect = "none";
drawCanvas.style.webkitUserSelect = "none";
function setupDrawCanvas() {
drawing = false;
activeDrawPointerId = null;
drawCtx.clearRect(
0,
0,
drawCanvas.width,
drawCanvas.height
);
drawCtx.lineWidth = 3.2;
drawCtx.lineCap = "round";
drawCtx.lineJoin = "round";
drawCtx.strokeStyle = SIGNATURE_INK;
drawHistory = [];
}
setupDrawCanvas();
if (drawPlaceholder) {
drawPlaceholder.style.display = "none";
}
/* =========================================================
DRAW POSITION========================================================= */
function getDrawPosition(event) {
const rect =
drawCanvas.getBoundingClientRect();
const scaleX =
drawCanvas.width /
rect.width;
const scaleY =
drawCanvas.height /
rect.height;
return {
x:
(event.clientX - rect.left) *
scaleX,
y:
(event.clientY - rect.top) *
scaleY
};
}
/* =========================================================
DRAW HISTORY
========================================================= */
function saveDrawSnapshot() {
drawHistory.push(
drawCtx.getImageData(
0,
0,
drawCanvas.width,
drawCanvas.height
)
);
if (drawHistory.length > 50) {
drawHistory.shift();
}
}
/* =========================================================
DRAW========================================================= */
drawCanvas.addEventListener(
"pointerdown",
(event) => {
event.preventDefault();
drawing = true;
activeDrawPointerId =
event.pointerId;
saveDrawSnapshot();
const pos =
getDrawPosition(event);
drawCtx.beginPath();
drawCtx.moveTo(
pos.x,
pos.y
);
try {
drawCanvas.setPointerCapture(
event.pointerId
);
} catch (_) {}
}
);
drawCanvas.addEventListener(
"pointermove",
(event) => {
if (
!drawing ||
event.pointerId !==
activeDrawPointerId
) {
return;
}
event.preventDefault();
const pos =
getDrawPosition(event);drawCtx.lineTo(
pos.x,
pos.y
);
drawCtx.stroke();
}
);
function stopDrawing(event) {
if (
!drawing ||
event.pointerId !==
activeDrawPointerId
) {
return;
}
drawing = false;
drawCtx.closePath();
try {
drawCanvas.releasePointerCapture(
event.pointerId
);
} catch (_) {}
activeDrawPointerId = null;
}
drawCanvas.addEventListener(
"pointerup",
stopDrawing
);
drawCanvas.addEventListener(
"pointercancel",
stopDrawing
);
/* =========================================================
BACK / UNDO
========================================================= */const backDrawBtn =
document.createElement("button");
backDrawBtn.type = "button";
backDrawBtn.textContent = "← Back";
backDrawBtn.className = "secondary-btn";
clearDrawBtn.parentNode.insertBefore(
backDrawBtn,
clearDrawBtn
);
function undoLastStroke(event) {
if (event) {
event.preventDefault();
event.stopPropagation();
}
drawing = false;
activeDrawPointerId = null;
if (!drawHistory.length) {
return;
}
const previous =
drawHistory.pop();
drawCtx.putImageData(
previous,
0,
0
);
}
backDrawBtn.addEventListener(
"pointerdown",
undoLastStroke,
{
passive: false
}
);
backDrawBtn.addEventListener(
"keydown",
(event) => {if (
event.key === "Enter" ||
event.key === " "
) {
event.preventDefault();
undoLastStroke(event);
}
}
);
/* =========================================================
CLEAR DRAW
========================================================= */
function clearDraw(event) {
if (event) {
event.preventDefault();
event.stopPropagation();
}
drawing = false;
activeDrawPointerId = null;
setupDrawCanvas();
}
clearDrawBtn.addEventListener(
"pointerdown",
clearDraw,
{
passive: false
}
);
clearDrawBtn.addEventListener(
"keydown",
(event) => {
if (
event.key === "Enter" ||
event.key === " "
) {
event.preventDefault();
clearDraw(event);
}
}
);/* =========================================================
CROP DRAWN SIGNATURE
========================================================= */
useDrawBtn.addEventListener(
"click",
() => {
const pixels =
drawCtx.getImageData(
0,
0,
drawCanvas.width,
drawCanvas.height
).data;
let minX =
drawCanvas.width;
let minY =
drawCanvas.height;
let maxX = 0;
let maxY = 0;
let found = false;
for (
let y = 0;
y < drawCanvas.height;
y++
) {
for (
let x = 0;
x < drawCanvas.width;
x++
) {
const alpha =
pixels[
(y *
drawCanvas.width +
x) *
4 +
3
];
if (alpha > 10) {found = true;
minX =
Math.min(
minX,
x
);
minY =
Math.min(
minY,
y
);
maxX =
Math.max(
maxX,
x
);
maxY =
Math.max(
maxY,
y
);
}
}
}
if (!found) {
showStatus(
"Please draw your signature first.",
"error"
);
return;
}
const padding = 12;
minX =
Math.max(
0,
minX - padding
);
minY =
Math.max(0,
minY - padding
);
maxX =
Math.min(
drawCanvas.width - 1,
maxX + padding
);
maxY =
Math.min(
drawCanvas.height - 1,
maxY + padding
);
const width =
maxX - minX + 1;
const height =
maxY - minY + 1;
const tempCanvas =
document.createElement(
"canvas"
);
tempCanvas.width =
width;
tempCanvas.height =
height;
const tempCtx =
tempCanvas.getContext(
"2d"
);
tempCtx.drawImage(
drawCanvas,
minX,
minY,
width,
height,
0,
0,
width,
height);
signatureDataUrl =
tempCanvas.toDataURL(
"image/png"
);
showSignature(
signatureDataUrl
);
showStatus(
"Signature added. Drag it anywhere on the page."
);
}
);
/* =========================================================
TYPED SIGNATURE
CALIBRI ONLY
========================================================= */
const SIGNATURE_FONT =
"Calibri, Arial, sans-serif";
typedName.style.fontFamily =
SIGNATURE_FONT;
if (typedPreview) {
typedPreview.style.display =
"none";
}
useTypedBtn.addEventListener(
"click",
() => {
const text =
typedName.value.trim();
if (!text) {
showStatus(
"Please type your name first.",
"error"
);
return;}
const canvas =
document.createElement(
"canvas"
);
canvas.width = 1200;
canvas.height = 350;
const ctx =
canvas.getContext("2d");
ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);
ctx.fillStyle =
SIGNATURE_INK;
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";
let fontSize = 170;
if (text.length > 20) {
fontSize = 115;
} else if (text.length > 14) {
fontSize = 135;
}
ctx.font =
`${fontSize}px ${SIGNATURE_FONT}`;
ctx.fillText(
text,
canvas.width / 2,
canvas.height / 2
);
signatureDataUrl =
canvas.toDataURL("image/png"
);
showSignature(
signatureDataUrl
);
showStatus(
"Signature added. Drag it anywhere on the page."
);
}
);
/* =========================================================
UPLOAD SIGNATURE
========================================================= */
signatureFileInput.addEventListener(
"change",
() => {
const file =
signatureFileInput.files?.[0];
if (!file) return;
if (!file.type.startsWith("image/")) {
showStatus(
"Please choose an image file.",
"error"
);
return;
}
const reader =
new FileReader();
reader.onload = () => {
uploadedSignatureDataUrl =
reader.result;
uploadedName.textContent =
file.name;
uploadedName.classList.remove(
"hidden"
);useUploadedBtn.disabled =
false;
showStatus(
"Signature image ready."
);
};
reader.readAsDataURL(file);
}
);
useUploadedBtn.addEventListener(
"click",
() => {
if (!uploadedSignatureDataUrl) {
return;
}
signatureDataUrl =
uploadedSignatureDataUrl;
showSignature(
signatureDataUrl
);
showStatus(
"Signature added. Drag it anywhere on the page."
);
}
);
/* =========================================================
SIGNATURE VISIBILITY
========================================================= */
function setOverlayVisibility(
visible
) {
if (visible) {
signatureOverlay.classList.remove(
"hidden"
);
placementHint.classList.remove("hidden"
);
applyBtn.classList.remove(
"hidden"
);
} else {
signatureOverlay.classList.add(
"hidden"
);
placementHint.classList.add(
"hidden"
);
applyBtn.classList.add(
"hidden"
);
}
}
/* =========================================================
DEFAULT SIGNATURE
========================================================= */
function createDefaultSignatureState(
dataUrl
) {
const stage =
getStageSize();
const widthPx =
Math.min(
200,
Math.max(
120,
stage.width * 0.30
)
);
const heightPx =
Math.min(
80,
Math.max(
50,
stage.height * 0.10
));
const leftPx =
Math.max(
0,
(stage.width - widthPx) / 2
);
const topPx =
Math.max(
0,
(stage.height - heightPx) / 2
);
return {
dataUrl,
leftRatio:
leftPx / stage.width,
topRatio:
topPx / stage.height,
widthRatio:
widthPx / stage.width,
heightRatio:
heightPx / stage.height,
rotation: 0,
applied: false
};
}
/* =========================================================
SHOW SIGNATURE
========================================================= */
function showSignature(dataUrl) {
if (!dataUrl) return;
signatureDataUrl =
dataUrl;
const state =
createDefaultSignatureState(dataUrl
);
pageSignatures.set(
currentPage,
state
);
signatureRotation = 0;
signatureImage.src =
dataUrl;
signatureImage.style.width =
"100%";
signatureImage.style.height =
"100%";
signatureImage.style.objectFit =
"contain";
signatureImage.style.display =
"block";
signatureOverlay.style.left =
`${state.leftRatio * 100}%`;
signatureOverlay.style.top =
`${state.topRatio * 100}%`;
signatureOverlay.style.width =
`${state.widthRatio * 100}%`;
signatureOverlay.style.height =
`${state.heightRatio * 100}%`;
signatureOverlay.style.transform =
"rotate(0deg)";
setOverlayVisibility(true);
applyBtn.textContent =
"Apply Signature";
updateDownloadButton();
}/* =========================================================
RESTORE PAGE SIGNATURE
========================================================= */
function restorePageSignature(
pageNumberValue
) {
const state =
pageSignatures.get(
pageNumberValue
);
if (!state) {
signatureDataUrl = null;
signatureRotation = 0;
setOverlayVisibility(false);
return;
}
signatureDataUrl =
state.dataUrl;
signatureRotation =
state.rotation || 0;
signatureImage.src =
state.dataUrl;
signatureImage.style.width =
"100%";
signatureImage.style.height =
"100%";
signatureImage.style.objectFit =
"contain";
signatureOverlay.style.left =
`${state.leftRatio * 100}%`;
signatureOverlay.style.top =
`${state.topRatio * 100}%`;
signatureOverlay.style.width =
`${state.widthRatio * 100}%`;signatureOverlay.style.height =
`${state.heightRatio * 100}%`;
signatureOverlay.style.transform =
`rotate(${signatureRotation}deg)`;
setOverlayVisibility(true);
applyBtn.textContent =
state.applied
? "✓ Signature Applied"
: "Apply Signature";
}
/* =========================================================
SAVE CURRENT PAGE STATE
========================================================= */
function saveCurrentPageState(
appliedValue = null
) {
if (
signatureOverlay.classList.contains(
"hidden"
) ||
!signatureDataUrl
) {
return null;
}
const stage =
getStageSize();
const width =
signatureOverlay.ofsetWidth;
const height =
signatureOverlay.ofsetHeight;
const maxLeft =
Math.max(
0,
stage.width - width
);
const maxTop =Math.max(
0,
stage.height - height
);
const left =
clamp(
signatureOverlay.ofsetLeft,
0,
maxLeft
);
const top =
clamp(
signatureOverlay.ofsetTop,
0,
maxTop
);
const previous =
pageSignatures.get(
currentPage
);
const widthRatio =
clamp(
width / stage.width,
0.01,
1
);
const heightRatio =
clamp(
height / stage.height,
0.01,
1
);
const leftRatio =
clamp(
left / stage.width,
0,
Math.max(
0,
1 - widthRatio
)
);const topRatio =
clamp(
top / stage.height,
0,
Math.max(
0,
1 - heightRatio
)
);
const state = {
dataUrl:
signatureDataUrl,
leftRatio,
topRatio,
widthRatio,
heightRatio,
rotation:
signatureRotation || 0,
applied:
appliedValue === null
? previous?.applied ?? false
: appliedValue
};
pageSignatures.set(
currentPage,
state
);
return state;
}
/* =========================================================
SIGNATURE CHANGED
========================================================= */
function markSignatureChanged() {
saveCurrentPageState(false);
applyBtn.textContent ="Apply Signature";
updateDownloadButton();
}
/* =========================================================
EDGE SNAP
========================================================= */
const EDGE_SNAP_DISTANCE = 24;
function snapPosition(
value,
maxValue
) {
if (value <= EDGE_SNAP_DISTANCE) {
return 0;
}
if (
maxValue - value <=
EDGESNAPDISTANCE
__) {
return maxValue;
}
return clamp(
value,
0,
maxValue
);
}
/* =========================================================
POINTER / GESTURE STATE
========================================================= */
const activePointers =
new Map();
let dragStartX = 0;
let dragStartY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;let gestureStartDistance = 0;
let gestureStartAngle = 0;
let gestureStartWidth = 0;
let gestureStartHeight = 0;
let gestureStartRotation = 0;
let gestureCenterX = 0;
let gestureCenterY = 0;
function getDistance(a, b) {
return Math.hypot(
b.x - a.x,
b.y - a.y
);
}
function getAngle(a, b) {
return (
Math.atan2(
b.y - a.y,
b.x - a.x
) *
180 /
Math.PI
);
}
function getTwoPointers() {
return [
...activePointers.values()
].slice(0, 2);
}
/* =========================================================
POINTER DOWN
========================================================= */
signatureOverlay.addEventListener(
"pointerdown",
(event) => {
if (
event.target ===removeSignatureBtn
) {
return;
}
event.preventDefault();
try {
signatureOverlay.setPointerCapture(
event.pointerId
);
} catch (_) {}
activePointers.set(
event.pointerId,
{
x: event.clientX,
y: event.clientY
}
);
/* ONE FINGER = DRAG */
if (activePointers.size === 1) {
dragStartX =
event.clientX;
dragStartY =
event.clientY;
dragStartLeft =
signatureOverlay.ofsetLeft;
dragStartTop =
signatureOverlay.ofsetTop;
return;
}
/* TWO FINGERS = PINCH + ROTATE */
if (activePointers.size === 2) {
const [
a,
b
] =getTwoPointers();
gestureStartDistance =
getDistance(a, b);
gestureStartAngle =
getAngle(a, b);
gestureStartWidth =
signatureOverlay.ofsetWidth;
gestureStartHeight =
signatureOverlay.ofsetHeight;
gestureStartRotation =
signatureRotation;
const stageRect =
getStageRect();
gestureCenterX =
(a.x + b.x) / 2 -
stageRect.left;
gestureCenterY =
(a.y + b.y) / 2 -
stageRect.top;
}
}
);
/* =========================================================
POINTER MOVE
========================================================= */
signatureOverlay.addEventListener(
"pointermove",
(event) => {
if (
!activePointers.has(
event.pointerId
)
) {
return;
}
event.preventDefault();activePointers.set(
event.pointerId,
{
x: event.clientX,
y: event.clientY
}
);
/* ONE FINGER = DRAG */
if (activePointers.size === 1) {
const stage =
getStageSize();
const deltaX =
event.clientX -
dragStartX;
const deltaY =
event.clientY -
dragStartY;
const overlayWidth =
signatureOverlay.ofsetWidth;
const overlayHeight =
signatureOverlay.ofsetHeight;
const maxLeft =
Math.max(
0,
stage.width -
overlayWidth
);
const maxTop =
Math.max(
0,
stage.height -
overlayHeight
);
let newLeft =
dragStartLeft +
deltaX;let newTop =
dragStartTop +
deltaY;
newLeft =
clamp(
newLeft,
0,
maxLeft
);
newTop =
clamp(
newTop,
0,
maxTop
);
newLeft =
snapPosition(
newLeft,
maxLeft
);
newTop =
snapPosition(
newTop,
maxTop
);
signatureOverlay.style.left =
`${Math.round(newLeft)}px`;
signatureOverlay.style.top =
`${Math.round(newTop)}px`;
markSignatureChanged();
return;
}
/* TWO FINGERS = RESIZE + ROTATE */
if (activePointers.size >= 2) {
const [
a,
b] =
getTwoPointers();
if (
gestureStartDistance <= 0
) {
return;
}
const currentDistance =
getDistance(a, b);
let scale =
currentDistance /
gestureStartDistance;
const stage =
getStageSize();
const originalWidth =
gestureStartWidth;
const originalHeight =
gestureStartHeight;
const minWidth = 35;
const maxWidth =
Math.max(
minWidth,
stage.width * 0.95
);
let newWidth =
originalWidth *
scale;
newWidth =
clamp(
newWidth,
minWidth,
maxWidth
);
const aspectRatio =
originalHeight /
Math.max(
originalWidth,1
);
let newHeight =
newWidth *
aspectRatio;
const maxHeight =
stage.height * 0.95;
if (
newHeight >
maxHeight
) {
newHeight =
maxHeight;
newWidth =
newHeight /
Math.max(
aspectRatio,
0.01
);
}
const newLeft =
gestureCenterX -
newWidth / 2;
const newTop =
gestureCenterY -
newHeight / 2;
const maxLeft =
Math.max(
0,
stage.width -
newWidth
);
const maxTop =
Math.max(
0,
stage.height -
newHeight
);
let finalLeft =clamp(
newLeft,
0,
maxLeft
);
let finalTop =
clamp(
newTop,
0,
maxTop
);
finalLeft =
snapPosition(
finalLeft,
maxLeft
);
finalTop =
snapPosition(
finalTop,
maxTop
);
signatureOverlay.style.width =
`${Math.round(newWidth)}px`;
signatureOverlay.style.height =
`${Math.round(newHeight)}px`;
signatureOverlay.style.left =
`${Math.round(finalLeft)}px`;
signatureOverlay.style.top =
`${Math.round(finalTop)}px`;
/* ROTATE */
const currentAngle =
getAngle(a, b);
let angleDelta =
currentAngle -
gestureStartAngle;
while (angleDelta > 180) {angleDelta -= 360;
}
while (angleDelta < -180) {
angleDelta += 360;
}
signatureRotation =
gestureStartRotation +
angleDelta;
signatureOverlay.style.transform =
`rotate(${signatureRotation}deg)`;
markSignatureChanged();
}
}
);
/* =========================================================
POINTER UP
========================================================= */
function finishPointer(event) {
activePointers.delete(
event.pointerId
);
try {
signatureOverlay.releasePointerCapture(
event.pointerId
);
} catch (_) {}
if (activePointers.size === 1) {
const remaining =
[
...activePointers.values()
][0];
dragStartX =
remaining.x;
dragStartY =
remaining.y;
dragStartLeft =signatureOverlay.ofsetLeft;
dragStartTop =
signatureOverlay.ofsetTop;
}
if (activePointers.size === 0) {
saveCurrentPageState();
}
}
signatureOverlay.addEventListener(
"pointerup",
finishPointer
);
signatureOverlay.addEventListener(
"pointercancel",
finishPointer
);
signatureOverlay.addEventListener(
"lostpointercapture",
(event) => {
activePointers.delete(
event.pointerId
);
}
);
/* =========================================================
REMOVE SIGNATURE
========================================================= */
removeSignatureBtn.addEventListener(
"click",
(event) => {
event.stopPropagation();
pageSignatures.delete(
currentPage
);
signatureDataUrl = null;
signatureRotation = 0;setOverlayVisibility(false);
applyBtn.textContent =
"Apply Signature";
updateDownloadButton();
showStatus(
"Signature removed."
);
}
);
/* =========================================================
APPLY SIGNATURE
========================================================= */
applyBtn.addEventListener(
"click",
() => {
if (
signatureOverlay.classList.contains(
"hidden"
) ||
!signatureDataUrl
) {
showStatus(
"Add a signature first.",
"error"
);
return;
}
const state =
saveCurrentPageState(
true
);
if (!state) {
showStatus(
"Could not apply the signature.",
"error"
);
return;
}applyBtn.textContent =
"✓ Signature Applied";
updateDownloadButton();
showStatus(
`Signature applied to page ${currentPage}.`,
"success"
);
}
);
/* =========================================================
DOWNLOAD BUTTON VISIBILITY
========================================================= */
function updateDownloadButton() {
if (!downloadBtn) return;
downloadBtn.hidden =
!hasAppliedSignatures();
}
/* =========================================================
PDF UPLOAD
========================================================= */
dropZone.addEventListener(
"click",
() => {
fileInput.click();
}
);
dropZone.addEventListener(
"dragover",
(event) => {
event.preventDefault();
dropZone.classList.add(
"dragging"
);
}
);dropZone.addEventListener(
"dragleave",
() => {
dropZone.classList.remove(
"dragging"
);
}
);
dropZone.addEventListener(
"drop",
(event) => {
event.preventDefault();
dropZone.classList.remove(
"dragging"
);
const file =
event.dataTransfer.files?.[0];
if (file) {
handlePdfFile(file);
}
}
);
fileInput.addEventListener(
"change",
() => {
const file =
fileInput.files?.[0];
if (file) {
handlePdfFile(file);
}
}
);
/* =========================================================
HANDLE PDF
========================================================= */
async function handlePdfFile(file) {
if (
file.type !==
"application/pdf" &&!file.name
.toLowerCase()
.endsWith(".pdf")
) {
showStatus(
"Please choose a PDF file.",
"error"
);
return;
}
selectedFile = file;
pageSignatures.clear();
signatureDataUrl = null;
signatureRotation = 0;
setOverlayVisibility(false);
updateDownloadButton();
showStatus(
"Loading PDF..."
);
try {
const bufer =
await file.arrayBufer();
const loadingTask =
pdfjsLib.getDocument({
data:
new Uint8Array(
bufer
)
});
pdfDocument =
await loadingTask.promise;
currentPage = 1;
pageCount.textContent =
pdfDocument.numPages;
pageNumber.textContent =currentPage;
/*
IMPORTANT:
Upload screen disappears as soon
as PDF is successfully loaded.
*/
showWorkspaceScreen();
await renderPage(
currentPage
);
showStatus(
"PDF ready."
);
} catch (error) {
console.error(error);
/*
If loading fails, keep the
Choose PDF screen visible.
*/
showUploadScreen();
showStatus(
"Could not open this PDF.",
"error"
);
}
}
/* =========================================================
RENDER PAGE
========================================================= */
async function renderPage(
pageNumberValue
) {
if (!pdfDocument) return;
const page =
await pdfDocument.getPage(
pageNumberValue
);const containerWidth =
pdfStage.parentElement
?.clientWidth ||
700;
const baseViewport =
page.getViewport({
scale: 1
});
currentPdfScale =
containerWidth /
baseViewport.width;
currentPdfScale =
Math.min(
Math.max(
currentPdfScale,
0.5
),
1.8
);
const viewport =
page.getViewport({
scale:
currentPdfScale
});
pdfCanvas.width =
Math.floor(
viewport.width
);
pdfCanvas.height =
Math.floor(
viewport.height
);
pdfCanvas.style.width =
`${viewport.width}px`;
pdfCanvas.style.height =
`${viewport.height}px`;
pdfStage.style.width =
`${viewport.width}px`;pdfStage.style.height =
`${viewport.height}px`;
const ctx =
pdfCanvas.getContext("2d");
ctx.clearRect(
0,
0,
pdfCanvas.width,
pdfCanvas.height
);
await page.render({
canvasContext: ctx,
viewport
}).promise;
pageNumber.textContent =
pageNumberValue;
prevPageBtn.disabled =
pageNumberValue <= 1;
nextPageBtn.disabled =
pageNumberValue >=
pdfDocument.numPages;
currentPage =
pageNumberValue;
restorePageSignature(
pageNumberValue
);
}
/* =========================================================
PAGE NAVIGATION
========================================================= */
prevPageBtn.addEventListener(
"click",
async () => {
if (
!pdfDocument ||
currentPage <= 1) {
return;
}
saveCurrentPageState();
const targetPage =
currentPage - 1;
await renderPage(
targetPage
);
}
);
nextPageBtn.addEventListener(
"click",
async () => {
if (
!pdfDocument ||
currentPage >=
pdfDocument.numPages
) {
return;
}
saveCurrentPageState();
const targetPage =
currentPage + 1;
await renderPage(
targetPage
);
}
);
/* =========================================================
LOAD IMAGE
========================================================= */
function loadImage(dataUrl) {
return new Promise(
(resolve, reject) => {
const image =
new Image();image.onload = () =>
resolve(image);
image.onerror = reject;
image.src =
dataUrl;
}
);
}
/* =========================================================
CREATE ROTATED PNG
========================================================= */
async function createRotatedPng(
dataUrl,
rotation
) {
const image =
await loadImage(
dataUrl
);
const normalized =
(
rotation % 360 +
360
) % 360;
if (
Math.abs(normalized) <
0.01
) {
return dataUrl;
}
const radians =
normalized *
Math.PI /
180;
const sin =
Math.abs(
Math.sin(radians)
);const cos =
Math.abs(
Math.cos(radians)
);
const width =
Math.ceil(
image.width * cos +
image.height * sin
);
const height =
Math.ceil(
image.width * sin +
image.height * cos
);
const canvas =
document.createElement(
"canvas"
);
canvas.width =
width;
canvas.height =
height;
const ctx =
canvas.getContext(
"2d"
);
ctx.clearRect(
0,
0,
width,
height
);
ctx.translate(
width / 2,
height / 2
);
ctx.rotate(
radians);
ctx.drawImage(
image,
-image.width / 2,
-image.height / 2
);
return canvas.toDataURL(
"image/png"
);
}
/* =========================================================
DOWNLOAD SIGNED PDF
========================================================= */
async function downloadSignedPdf() {
saveCurrentPageState();
const appliedEntries =
[
...pageSignatures.entries()
].filter(
([, state]) =>
state?.applied
);
if (!appliedEntries.length) {
showStatus(
"Apply at least one signature first.",
"error"
);
return;
}
if (!selectedFile) {
showStatus(
"Please choose a PDF first.",
"error"
);
return;
}
const oldText =downloadBtn.textContent;
downloadBtn.disabled =
true;
downloadBtn.textContent =
"Downloading...";
try {
const originalBytes =
await selectedFile.arrayBufer();
const pdfDoc =
await PDFDocument.load(
originalBytes
);
const imageCache =
new Map();
for (
const [
pageNum,
state
f pageSignatures.entries()
) {
if (
!state ||
!state.applied ||
!state.dataUrl
) {
continue;
}
]
oif (
pageNum < 1 ||
pageNum >
pdfDoc.getPageCount()
) {
continue;
}
const pdfPage =
pdfDoc.getPage(
pageNum - 1
);const pageWidth =
pdfPage.getWidth();
const pageHeight =
pdfPage.getHeight();
const x =
state.leftRatio *
pageWidth;
const boxWidth =
state.widthRatio *
pageWidth;
const boxHeight =
state.heightRatio *
pageHeight;
const top =
state.topRatio *
pageHeight;
const boxBottom =
pageHeight -
top -
boxHeight;
const cacheKey =
`${state.dataUrl}|${Math.round(
state.rotation || 0
)}`;
let finalImageDataUrl =
imageCache.get(
cacheKey
);
if (!finalImageDataUrl) {
finalImageDataUrl =
await createRotatedPng(
state.dataUrl,
state.rotation || 0
);
imageCache.set(
cacheKey,
finalImageDataUrl
);}
const embeddedCacheKey =
`${cacheKey}|embedded`;
let embeddedImage =
imageCache.get(
embeddedCacheKey
);
if (!embeddedImage) {
embeddedImage =
await pdfDoc.embedPng(
finalImageDataUrl
);
imageCache.set(
embeddedCacheKey,
embeddedImage
);
}
const imageAspect =
embeddedImage.width /
Math.max(
embeddedImage.height,
1
);
const boxAspect =
boxWidth /
Math.max(
boxHeight,
1
);
let drawWidth =
boxWidth;
let drawHeight =
boxHeight;
if (
imageAspect >
boxAspect
) {
drawHeight =
boxWidth /imageAspect;
} else {
drawWidth =
boxHeight *
imageAspect;
}
const drawX =
x +
(
) /
2;
boxWidth -
drawWidth
const drawY =
boxBottom +
(
boxHeight -
drawHeight
) /
2;
pdfPage.drawImage(
embeddedImage,
{
x: drawX,
y: drawY,
width: drawWidth,
height: drawHeight
}
);
}
const signedBytes =
await pdfDoc.save({
useObjectStreams: true
});
const blob =
new Blob(
[signedBytes],
{
type:
"application/pdf"
}
);const url =
URL.createObjectURL(
blob
);
const link =
document.createElement(
"a"
);
link.href =
url;
const originalName =
selectedFile.name.replace(
/\.pdf$/i,
""
);
link.download =
`${originalName}-signed.pdf`;
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
1500
);
showStatus(
"Done! Your signed PDF has been downloaded.",
"success"
);
} catch (error) {
console.error(
"PDF signing error:",
error
);showStatus(
"Could not create the signed PDF. Please try again.",
"error"
);
} finally {
downloadBtn.disabled =
false;
downloadBtn.textContent =
oldText;
}
}
/* =========================================================
RESET / SIGN ANOTHER PDF
========================================================= */
resetBtn.addEventListener(
"click",
() => {
selectedFile = null;
pdfDocument = null;
currentPage = 1;
currentPdfScale = 1;
signatureDataUrl = null;
signatureRotation = 0;
uploadedSignatureDataUrl =
null;
pageSignatures.clear();
activePointers.clear();
setOverlayVisibility(
false
);
updateDownloadButton();
uploadedName.textContent =
"";
uploadedName.classList.add("hidden"
);
useUploadedBtn.disabled =
true;
setupDrawCanvas();
typedName.value =
"";
fileInput.value =
"";
/*
Hide workspace and bring back
ONLY the Choose PDF screen.
*/
showUploadScreen();
showStatus("");
}
);
/* =========================================================
RESPONSIVE RESIZE
========================================================= */
let resizeTimer = null;
window.addEventListener(
"resize",
() => {
if (!pdfDocument) {
return;
}
clearTimeout(
resizeTimer
);
resizeTimer =
setTimeout(
async () => {
saveCurrentPageState();await renderPage(
currentPage
);
},
120
);
}
);
/* =========================================================
TAB SWITCHING
========================================================= */
const tabs =
document.querySelectorAll(
".signature-tab"
);
const panels = {
draw:
document.getElementById(
"drawPanel"
),
type:
document.getElementById(
"typePanel"
),
upload:
document.getElementById(
"uploadPanel"
)
};
tabs.forEach(
(tab) => {
tab.addEventListener(
"click",
() => {
const target =
tab.dataset.tab;
tabs.forEach(
(item) => {
item.classList.toggle(
"active",item === tab
);
}
);
Object.entries(
panels
).forEach(
([name, panel]) => {
if (!panel) {
return;
}
panel.classList.toggle(
"active",
name === target
);
}
);
}
);
}
);
/* =========================================================
FINAL INITIAL STATE
========================================================= */
applyBtn.textContent =
"Apply Signature";
applyBtn.classList.add(
"hidden"
);
if (downloadBtn) {
downloadBtn.hidden =
true;
}
if (changePdfBtn) {
changePdfBtn.style.display =
"none";
}
console.log(
"PikaTools PDF Signature loaded.");