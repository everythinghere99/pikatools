const fileInput = document.getElementById("fileInput");
if (fileInput) { fileInput.multiple = true; fileInput.setAttribute("multiple", "multiple"); }
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");

const workspace = document.getElementById("workspace");
const selectionCount = document.getElementById("selectionCount");
const addMoreBtn = document.getElementById("addMoreBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const singlePreviewBox = document.getElementById("singlePreviewBox");
const previewImage = document.getElementById("previewImage");
const originalName = document.getElementById("originalName");
const originalDimensions = document.getElementById("originalDimensions");

const multiListBox = document.getElementById("multiListBox");
const fileList = document.getElementById("fileList");

const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const lockRatio = document.getElementById("lockRatio");

const format = document.getElementById("format");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const resizeBtn = document.getElementById("resizeBtn");

const result = document.getElementById("result");
const singleSummary = document.getElementById("singleSummary");
const resultOriginal = document.getElementById("resultOriginal");
const resultNewSize = document.getElementById("resultNewSize");
const resultFileSize = document.getElementById("resultFileSize");
const resultList = document.getElementById("resultList");

const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("status");

let selectedItems = [];
let resizedOutputs = [];
let objectURLs = [];

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

function loadImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                file,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Could not read ${file.name}.`));
        };
        img.src = url;
    });
}

async function addFiles(fileCollection) {
    const incoming = Array.from(fileCollection || []);
    if (!incoming.length) return;

    const valid = incoming.filter(file => file.type.startsWith("image/") && file.size <= 50 * 1024 * 1024);
    if (!valid.length) {
        setStatus("Please choose valid JPG, PNG or WebP images (max 50 MB each).");
        return;
    }

    setStatus("Loading images...");
    try {
        const loaded = await Promise.all(valid.map(loadImageDimensions));
        selectedItems = selectedItems.concat(loaded);
        resizedOutputs = [];
        result.classList.add("hidden");
        renderSelectionUI();
        setStatus("");
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Could not load selected images.");
    }
}

function renderSelectionUI() {
    revokeAllURLs();
    fileList.innerHTML = "";

    if (!selectedItems.length) {
        previewImage.removeAttribute("src");
        workspace.classList.add("hidden");
        dropZone.classList.remove("hidden");
        result.classList.add("hidden");
        return;
    }

    dropZone.classList.add("hidden");
    workspace.classList.remove("hidden");

    const count = selectedItems.length;
    selectionCount.textContent = `${count} image${count === 1 ? "" : "s"} selected`;
    resizeBtn.textContent = count === 1 ? "Resize Image" : `Resize ${count} Images`;

    const first = selectedItems[0];
    if (!widthInput.value || count === 1) {
        widthInput.value = first.width;
        heightInput.value = first.height;
    }

    if (count === 1) {
        singlePreviewBox.classList.remove("hidden");
        multiListBox.classList.add("hidden");
        previewImage.src = trackURL(first.file);
        originalName.textContent = first.file.name;
        originalDimensions.textContent = `${first.width} × ${first.height} px`;
    } else {
        singlePreviewBox.classList.add("hidden");
        multiListBox.classList.remove("hidden");

        selectedItems.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "file-item";

            const thumb = document.createElement("img");
            thumb.className = "file-thumb";
            thumb.src = trackURL(item.file);
            thumb.alt = item.file.name;

            const meta = document.createElement("div");
            meta.className = "file-meta";

            const name = document.createElement("strong");
            name.textContent = item.file.name;

            const dims = document.createElement("span");
            dims.textContent = `${item.width} × ${item.height} px • ${formatSize(item.file.size)}`;

            meta.appendChild(name);
            meta.appendChild(dims);

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-item-btn";
            removeBtn.textContent = "×";
            removeBtn.setAttribute("aria-label", `Remove ${item.file.name}`);
            removeBtn.addEventListener("click", () => {
                selectedItems.splice(index, 1);
                resizedOutputs = [];
                result.classList.add("hidden");
                renderSelectionUI();
            });

            row.appendChild(thumb);
            row.appendChild(meta);
            row.appendChild(removeBtn);
            fileList.appendChild(row);
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
    selectedItems = [];
    resizedOutputs = [];
    fileInput.value = "";
    widthInput.value = "";
    heightInput.value = "";
    renderSelectionUI();
    setStatus("");
});

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
});

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    addFiles(e.dataTransfer.files);
});

widthInput.addEventListener("input", () => {
    if (!lockRatio.checked || !selectedItems.length) return;
    const width = Number(widthInput.value);
    if (!width || width <= 0) return;
    const first = selectedItems[0];
    const ratio = first.height / first.width;
    heightInput.value = Math.max(1, Math.round(width * ratio));
});

heightInput.addEventListener("input", () => {
    if (!lockRatio.checked || !selectedItems.length) return;
    const height = Number(heightInput.value);
    if (!height || height <= 0) return;
    const first = selectedItems[0];
    const ratio = first.width / first.height;
    widthInput.value = Math.max(1, Math.round(height * ratio));
});

document.querySelectorAll(".quick-sizes button").forEach(button => {
    button.addEventListener("click", () => {
        widthInput.value = button.dataset.width;
        heightInput.value = button.dataset.height;
        lockRatio.checked = false;
    });
});

quality.addEventListener("input", () => {
    qualityValue.textContent = quality.value + "%";
});

function resizeSingleFile(item, targetW, targetH, keepRatio, mime, qualityNum) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(item.file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            const finalW = targetW;
            const finalH = keepRatio
                ? Math.max(1, Math.round(targetW * (img.naturalHeight / img.naturalWidth)))
                : targetH;

            let currW = img.naturalWidth;
            let currH = img.naturalHeight;
            let src = img;

            while (currW * 0.5 > finalW && currH * 0.5 > finalH) {
                const nextW = Math.max(finalW, Math.round(currW * 0.5));
                const nextH = Math.max(finalH, Math.round(currH * 0.5));
                const stepCanvas = document.createElement("canvas");
                stepCanvas.width = nextW;
                stepCanvas.height = nextH;
                const stepCtx = stepCanvas.getContext("2d");
                stepCtx.imageSmoothingEnabled = true;
                stepCtx.imageSmoothingQuality = "high";
                stepCtx.drawImage(src, 0, 0, nextW, nextH);
                src = stepCanvas;
                currW = nextW;
                currH = nextH;
            }

            const canvas = document.createElement("canvas");
            canvas.width = finalW;
            canvas.height = finalH;

            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            if (mime === "image/jpeg") {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, finalW, finalH);
            }

            ctx.drawImage(src, 0, 0, finalW, finalH);

            canvas.toBlob(blob => {
                if (!blob) return reject(new Error(`Could not resize ${item.file.name}.`));
                const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
                const base = item.file.name.replace(/\.[^/.]+$/, "");
                resolve({
                    blob,
                    name: `${base}-${finalW}x${finalH}.${ext}`,
                    origW: img.naturalWidth,
                    origH: img.naturalHeight,
                    newW: finalW,
                    newH: finalH,
                    size: blob.size
                });
            }, mime, mime === "image/png" ? undefined : qualityNum);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Could not read ${item.file.name}.`));
        };

        img.src = url;
    });
}

resizeBtn.addEventListener("click", async () => {
    if (!selectedItems.length) return;

    const targetW = Number(widthInput.value);
    const targetH = Number(heightInput.value);

    if (!targetW || !targetH || targetW < 1 || targetH < 1) {
        setStatus("Please enter valid dimensions.");
        return;
    }

    if (targetW > 10000 || targetH > 10000) {
        setStatus("Maximum dimension is 10,000 px.");
        return;
    }

    resizeBtn.disabled = true;
    addMoreBtn.disabled = true;
    clearAllBtn.disabled = true;
    resizeBtn.textContent = "Resizing...";
    result.classList.add("hidden");
    resultList.innerHTML = "";
    resizedOutputs = [];

    const mime = format.value;
    const qualityNum = Number(quality.value) / 100;
    const keepRatio = lockRatio.checked;

    try {
        for (let i = 0; i < selectedItems.length; i++) {
            setStatus(
                selectedItems.length === 1
                    ? "✦ Please wait, resizing your image..."
                    : `✦ Resizing image ${i + 1} of ${selectedItems.length}...`
            );
            const out = await resizeSingleFile(selectedItems[i], targetW, targetH, keepRatio, mime, qualityNum);
            resizedOutputs.push(out);
        }

        renderResults();
        setStatus(
            resizedOutputs.length === 1
                ? "✓ Image resized successfully!"
                : `✓ ${resizedOutputs.length} images resized successfully!`
        );

    } catch (error) {
        console.error(error);
        setStatus(error.message || "Something went wrong.");
    } finally {
        resizeBtn.disabled = false;
        addMoreBtn.disabled = false;
        clearAllBtn.disabled = false;
        const count = selectedItems.length;
        resizeBtn.textContent = count === 1 ? "Resize Image" : `Resize ${count} Images`;
    }
});

function renderResults() {
    resultList.innerHTML = "";

    if (resizedOutputs.length === 1) {
        const single = resizedOutputs[0];
        singleSummary.classList.remove("hidden");
        resultList.classList.add("hidden");
        resultOriginal.textContent = `${single.origW} × ${single.origH} px`;
        resultNewSize.textContent = `${single.newW} × ${single.newH} px`;
        resultFileSize.textContent = formatSize(single.size);
        downloadBtn.textContent = "↓ Download Resized Image";
    } else {
        singleSummary.classList.add("hidden");
        resultList.classList.remove("hidden");

        resizedOutputs.forEach(item => {
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

            const meta = document.createElement("span");
            meta.textContent = `${item.origW}×${item.origH} → ${item.newW}×${item.newH} px • ${formatSize(item.size)}`;

            info.appendChild(name);
            info.appendChild(meta);

            const oneBtn = document.createElement("button");
            oneBtn.type = "button";
            oneBtn.className = "result-one-btn";
            oneBtn.textContent = "↓ Download";
            oneBtn.addEventListener("click", () => triggerDownload(item.blob, item.name));

            row.appendChild(thumb);
            row.appendChild(info);
            row.appendChild(oneBtn);
            resultList.appendChild(row);
        });

        downloadBtn.textContent = `↓ Download All (${resizedOutputs.length} Images ZIP)`;
    }

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

downloadBtn.addEventListener("click", async () => {
    if (!resizedOutputs.length) {
        setStatus("Please resize the images first.");
        return;
    }

    if (resizedOutputs.length === 1) {
        const single = resizedOutputs[0];
        triggerDownload(single.blob, single.name);
        setStatus("✓ Downloaded successfully!");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing ZIP...";
    setStatus("↓ Creating ZIP archive...");

    try {
        const mod = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
        const JSZip = mod.default;
        const zip = new JSZip();

        const usedNames = new Set();
        resizedOutputs.forEach((item) => {
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

        triggerDownload(zipBlob, "PikaTools-Resized-Images.zip");
        setStatus("✓ ZIP downloaded successfully!");
    } catch (error) {
        console.error(error);
        setStatus("ZIP failed. Please download images individually above.");
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = `↓ Download All (${resizedOutputs.length} Images ZIP)`;
    }
});

resetBtn.addEventListener("click", () => {
    revokeAllURLs();
    selectedItems = [];
    resizedOutputs = [];
    fileInput.value = "";
    widthInput.value = "";
    heightInput.value = "";
    previewImage.removeAttribute("src");
    fileList.innerHTML = "";
    resultList.innerHTML = "";
    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");
    result.classList.add("hidden");
    downloadBtn.disabled = false;
    setStatus("");
});
