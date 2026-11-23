const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");

const workspace = document.getElementById("workspace");
const selectionCount = document.getElementById("selectionCount");
const addMoreBtn = document.getElementById("addMoreBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const singlePreviewBox = document.getElementById("singlePreviewBox");
const previewImage = document.getElementById("previewImage");
const originalName = document.getElementById("originalName");
const originalSize = document.getElementById("originalSize");

const multiListBox = document.getElementById("multiListBox");
const fileList = document.getElementById("fileList");

const targetSize = document.getElementById("targetSize");
const format = document.getElementById("format");
const compressBtn = document.getElementById("compressBtn");

const result = document.getElementById("result");
const resultOriginal = document.getElementById("resultOriginal");
const resultCompressed = document.getElementById("resultCompressed");
const resultReduction = document.getElementById("resultReduction");
const resultList = document.getElementById("resultList");

const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("status");

let selectedFiles = [];
let compressedOutputs = [];
let objectURLs = [];
let statusTimer = null;

function trackURL(fileOrBlob) {
    const url = URL.createObjectURL(fileOrBlob);
    objectURLs.push(url);
    return url;
}

function revokeAllURLs() {
    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs = [];
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function setStatus(message) {
    statusText.textContent = message;
}

function startWaiting(message) {
    let dots = 0;
    clearInterval(statusTimer);
    statusText.textContent = message;

    statusTimer = setInterval(() => {
        dots = (dots + 1) % 4;
        statusText.textContent = message + ".".repeat(dots);
    }, 450);
}

function stopWaiting() {
    clearInterval(statusTimer);
    statusTimer = null;
}

function addFiles(fileCollection) {
    const incoming = Array.from(fileCollection || []);
    if (!incoming.length) return;

    const valid = incoming.filter(file => {
        if (!file.type.startsWith("image/")) return false;
        if (file.size > 50 * 1024 * 1024) return false;
        return true;
    });

    if (!valid.length) {
        setStatus("Please choose valid JPG, PNG or WebP images (max 50 MB each).");
        return;
    }

    selectedFiles = selectedFiles.concat(valid);
    compressedOutputs = [];
    result.classList.add("hidden");
    renderSelectionUI();
    setStatus("");
}

function renderSelectionUI() {
    revokeAllURLs();
    fileList.innerHTML = "";

    if (!selectedFiles.length) {
        previewImage.removeAttribute("src");
        workspace.classList.add("hidden");
        dropZone.classList.remove("hidden");
        result.classList.add("hidden");
        return;
    }

    dropZone.classList.add("hidden");
    workspace.classList.remove("hidden");

    const count = selectedFiles.length;
    selectionCount.textContent = `${count} image${count === 1 ? "" : "s"} selected`;
    compressBtn.textContent = count === 1 ? "Compress Image" : `Compress ${count} Images`;

    if (count === 1) {
        const file = selectedFiles[0];
        singlePreviewBox.classList.remove("hidden");
        multiListBox.classList.add("hidden");
        previewImage.src = trackURL(file);
        originalName.textContent = file.name;
        originalSize.textContent = formatSize(file.size);
    } else {
        singlePreviewBox.classList.add("hidden");
        multiListBox.classList.remove("hidden");

        selectedFiles.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "file-item";

            const thumb = document.createElement("img");
            thumb.className = "file-thumb";
            thumb.src = trackURL(file);
            thumb.alt = file.name;

            const meta = document.createElement("div");
            meta.className = "file-meta";

            const name = document.createElement("strong");
            name.textContent = file.name;

            const size = document.createElement("span");
            size.textContent = formatSize(file.size);

            meta.appendChild(name);
            meta.appendChild(size);

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-item-btn";
            removeBtn.textContent = "×";
            removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
            removeBtn.addEventListener("click", () => {
                selectedFiles.splice(index, 1);
                compressedOutputs = [];
                result.classList.add("hidden");
                renderSelectionUI();
            });

            item.appendChild(thumb);
            item.appendChild(meta);
            item.appendChild(removeBtn);
            fileList.appendChild(item);
        });
    }
}

chooseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
});
dropZone.addEventListener("click", () => fileInput.click());
addMoreBtn.addEventListener("click", () => fileInput.click());

clearAllBtn.addEventListener("click", () => {
    selectedFiles = [];
    compressedOutputs = [];
    fileInput.value = "";
    renderSelectionUI();
    setStatus("");
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    addFiles(e.dataTransfer.files);
});

document.querySelectorAll(".quick-sizes button").forEach(button => {
    button.addEventListener("click", () => {
        targetSize.value = button.dataset.size;
    });
});

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Could not read ${file.name}.`));
        };

        img.src = url;
    });
}

function canvasBlob(canvas, mime, quality) {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), mime, quality);
    });
}

/* Progressive high-quality downscaling so handwriting & fine text stay sharp */
function renderScaledCanvas(img, targetW, targetH, mime) {
    let currW = img.naturalWidth;
    let currH = img.naturalHeight;
    let currentSource = img;

    while (currW * 0.5 > targetW && currH * 0.5 > targetH) {
        const nextW = Math.max(targetW, Math.round(currW * 0.5));
        const nextH = Math.max(targetH, Math.round(currH * 0.5));
        const stepCanvas = document.createElement("canvas");
        stepCanvas.width = nextW;
        stepCanvas.height = nextH;
        const stepCtx = stepCanvas.getContext("2d", { alpha: mime !== "image/jpeg" });
        stepCtx.imageSmoothingEnabled = true;
        stepCtx.imageSmoothingQuality = "high";
        stepCtx.drawImage(currentSource, 0, 0, nextW, nextH);
        currentSource = stepCanvas;
        currW = nextW;
        currH = nextH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(targetW));
    canvas.height = Math.max(1, Math.round(targetH));

    const ctx = canvas.getContext("2d", {
        alpha: mime !== "image/jpeg"
    });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(currentSource, 0, 0, canvas.width, canvas.height);
    return canvas;
}

async function createCompressedBlob(img, mime, quality, scale = 1) {
    let width = img.naturalWidth * scale;
    let height = img.naturalHeight * scale;

    const MAX_DIMENSION = 4000;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width *= ratio;
        height *= ratio;
    }

    const canvas = renderScaledCanvas(img, width, height, mime);
    return await canvasBlob(canvas, mime, mime === "image/png" ? undefined : quality);
}

async function compressSingleFile(file, mime, targetBytes) {
    const img = await loadImage(file);
    let bestBlob = null;

    /*
     * QUALITY-FIRST STRATEGY:
     * Keep JPEG/WebP quality >= 0.66 at full resolution so text & notes stay crisp.
     * If still above targetBytes, gently reduce resolution while maintaining 0.70-0.88 quality.
     */
    if (mime !== "image/png") {
        let low = 0.66;
        let high = 0.94;

        for (let i = 0; i < 6; i++) {
            const quality = (low + high) / 2;
            const blob = await createCompressedBlob(img, mime, quality, 1);

            if (blob && blob.size <= targetBytes) {
                bestBlob = blob;
                low = quality;
            } else {
                high = quality;
            }
        }
    } else {
        const fullPng = await createCompressedBlob(img, mime, 1, 1);
        if (fullPng && fullPng.size <= targetBytes) {
            bestBlob = fullPng;
        }
    }

    if (!bestBlob || bestBlob.size > targetBytes) {
        let scale = 0.88;

        for (let i = 0; i < 12; i++) {
            if (mime === "image/png") {
                const blob = await createCompressedBlob(img, mime, 1, scale);
                if (blob && blob.size <= targetBytes) {
                    bestBlob = blob;
                    break;
                }
            } else {
                let lowQ = 0.70;
                let highQ = 0.88;
                let localBest = null;

                for (let j = 0; j < 5; j++) {
                    const quality = (lowQ + highQ) / 2;
                    const blob = await createCompressedBlob(img, mime, quality, scale);

                    if (blob && blob.size <= targetBytes) {
                        localBest = blob;
                        lowQ = quality;
                    } else {
                        highQ = quality;
                    }
                }

                if (localBest) {
                    bestBlob = localBest;
                    break;
                }
            }

            scale *= 0.82;
        }
    }

    /* Last resort for extreme tiny targets (e.g., 15-30 KB form uploads) */
    if (!bestBlob) {
        let scale = 0.35;
        for (let i = 0; i < 6; i++) {
            const blob = await createCompressedBlob(img, mime, 0.52, scale);
            if (blob && blob.size <= targetBytes) {
                bestBlob = blob;
                break;
            }
            scale *= 0.75;
        }
    }

    if (!bestBlob) {
        throw new Error(`Target size too small for ${file.name}. Try a slightly higher KB.`);
    }

    /* Never bloat or ruin quality if original already fits target in same format */
    if (file.type === mime && file.size <= targetBytes && bestBlob.size >= file.size) {
        const gentleBlob = await createCompressedBlob(img, mime, 0.86, 1);
        if (gentleBlob && gentleBlob.size < file.size) {
            bestBlob = gentleBlob;
        } else {
            bestBlob = file;
        }
    }

    const extension =
        mime === "image/webp" ? "webp" :
        mime === "image/png" ? "png" : "jpg";
    const originalBase = file.name.replace(/\.[^/.]+$/, "");
    const filename = `${originalBase}-compressed.${extension}`;

    return {
        blob: bestBlob,
        name: filename,
        originalSize: file.size,
        compressedSize: bestBlob.size
    };
}

async function compressAllImages() {
    if (!selectedFiles.length) return;

    const wantedKB = Number(targetSize.value);
    if (!wantedKB || wantedKB < 10) {
        setStatus("Target size must be at least 10 KB.");
        return;
    }

    compressBtn.disabled = true;
    addMoreBtn.disabled = true;
    clearAllBtn.disabled = true;
    compressBtn.textContent = "Compressing...";
    result.classList.add("hidden");
    resultList.innerHTML = "";
    compressedOutputs = [];

    const mime = format.value;
    const targetBytes = wantedKB * 1024;

    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            startWaiting(
                selectedFiles.length === 1
                    ? "✦ Compressing your image"
                    : `✦ Compressing image ${i + 1} of ${selectedFiles.length}`
            );
            const output = await compressSingleFile(selectedFiles[i], mime, targetBytes);
            compressedOutputs.push(output);
        }

        renderResults();
        stopWaiting();
        setStatus(
            compressedOutputs.length === 1
                ? "✓ Compression completed successfully!"
                : `✓ ${compressedOutputs.length} images compressed successfully!`
        );

    } catch (error) {
        stopWaiting();
        console.error(error);
        setStatus(error.message || "Something went wrong. Please try again.");
    } finally {
        compressBtn.disabled = false;
        addMoreBtn.disabled = false;
        clearAllBtn.disabled = false;
        const count = selectedFiles.length;
        compressBtn.textContent = count === 1 ? "Compress Image" : `Compress ${count} Images`;
    }
}

function renderResults() {
    let totalOrig = 0;
    let totalComp = 0;
    resultList.innerHTML = "";

    compressedOutputs.forEach((item) => {
        totalOrig += item.originalSize;
        totalComp += item.compressedSize;

        const row = document.createElement("div");
        row.className = "result-item";

        const thumb = document.createElement("img");
        thumb.className = "file-thumb";
        thumb.src = trackURL(item.blob);
        thumb.alt = item.name;

        const info = document.createElement("div");
        info.className = "result-item-info";

        const name = document.createElement("strong");
        name.textContent = item.name;

        const reduction = ((item.originalSize - item.compressedSize) / item.originalSize) * 100;
        const badge = reduction > 0 ? ` (${reduction.toFixed(1)}% smaller)` : " (Already optimal)";

        const sizeText = document.createElement("span");
        sizeText.textContent = `${formatSize(item.originalSize)} → ${formatSize(item.compressedSize)}${badge}`;

        info.appendChild(name);
        info.appendChild(sizeText);

        const oneBtn = document.createElement("button");
        oneBtn.type = "button";
        oneBtn.className = "result-one-btn";
        oneBtn.textContent = "↓ Download";
        oneBtn.addEventListener("click", () => {
            triggerDownload(item.blob, item.name);
        });

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(oneBtn);
        resultList.appendChild(row);
    });

    const totalReduction = ((totalOrig - totalComp) / totalOrig) * 100;
    resultOriginal.textContent = formatSize(totalOrig);
    resultCompressed.textContent = formatSize(totalComp);
    resultReduction.textContent = totalReduction > 0 ? `${totalReduction.toFixed(1)}% smaller` : "Already optimal";

    downloadBtn.textContent = compressedOutputs.length === 1
        ? "↓ Download Compressed Image"
        : `↓ Download All (${compressedOutputs.length} Images ZIP)`;

    result.classList.remove("hidden");
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function triggerDownload(blob, filename) {
    const downloadURL = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadURL;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(downloadURL), 5000);
}

compressBtn.addEventListener("click", compressAllImages);

downloadBtn.addEventListener("click", async () => {
    if (!compressedOutputs.length) {
        setStatus("Please compress the images first.");
        return;
    }

    if (compressedOutputs.length === 1) {
        const single = compressedOutputs[0];
        triggerDownload(single.blob, single.name);
        setStatus("✓ Downloaded successfully!");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing ZIP...";
    startWaiting("↓ Creating ZIP archive");

    try {
        const mod = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
        const JSZip = mod.default;
        const zip = new JSZip();

        const usedNames = new Set();
        compressedOutputs.forEach((item) => {
            let finalName = item.name;
            let counter = 1;
            while (usedNames.has(finalName)) {
                const dot = item.name.lastIndexOf(".");
                finalName = `${item.name.slice(0, dot)}-${counter}${item.name.slice(dot)}`;
                counter++;
            }
            usedNames.add(finalName);
            zip.file(finalName, item.blob);
        });

        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });

        triggerDownload(zipBlob, "PikaTools-Compressed-Images.zip");
        stopWaiting();
        setStatus("✓ ZIP downloaded successfully!");
    } catch (error) {
        stopWaiting();
        console.error(error);
        setStatus("ZIP failed. Please download images individually above.");
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = `↓ Download All (${compressedOutputs.length} Images ZIP)`;
    }
});

resetBtn.addEventListener("click", () => {
    stopWaiting();
    revokeAllURLs();
    selectedFiles = [];
    compressedOutputs = [];
    fileInput.value = "";
    previewImage.removeAttribute("src");
    fileList.innerHTML = "";
    resultList.innerHTML = "";
    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");
    result.classList.add("hidden");
    downloadBtn.disabled = false;
    setStatus("");
});
