const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");
const workspace = document.getElementById("workspace");

const imagePreview = document.getElementById("imagePreview");
const previewBox = document.getElementById("previewBox");
const cropBox = document.getElementById("cropBox");

const fileName = document.getElementById("fileName");
const originalSize = document.getElementById("originalSize");

const ratioButtons = document.querySelectorAll(".ratio-btn");
const customWidth = document.getElementById("customWidth");
const customHeight = document.getElementById("customHeight");
const applyRatio = document.getElementById("applyRatio");

const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");

const rotateLeft = document.getElementById("rotateLeft");
const rotateRight = document.getElementById("rotateRight");

const outputFormat = document.getElementById("outputFormat");
const cropBtn = document.getElementById("cropBtn");

const result = document.getElementById("result");
const resultOriginal = document.getElementById("resultOriginal");
const resultCropped = document.getElementById("resultCropped");
const resultSize = document.getElementById("resultSize");

const downloadBtn = document.getElementById("downloadBtn");
const status = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");

let originalImage = null;
let originalFile = null;
let orientedCanvas = null;

let selectedRatio = null;
let rotation = 0;
let zoom = 1;

let dragging = false;
let resizing = false;

let startX = 0;
let startY = 0;
let startLeft = 0;
let startTop = 0;
let startWidth = 0;
let startHeight = 0;

let resizeCorner = null;
let outputBlob = null;

chooseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
        loadImage(fileInput.files[0]);
    }
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--accent)";
});

dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "";
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "";
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
        loadImage(file);
    }
});

function buildOrientedCanvas(img, rotDeg) {
    const norm = ((rotDeg % 360) + 360) % 360;
    const swap = norm === 90 || norm === 270;
    const w = swap ? img.naturalHeight : img.naturalWidth;
    const h = swap ? img.naturalWidth : img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.translate(w / 2, h / 2);
    ctx.rotate((norm * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    return canvas;
}

function refreshOrientedPreview() {
    if (!originalImage) return;
    orientedCanvas = buildOrientedCanvas(originalImage, rotation);
    imagePreview.src = orientedCanvas.toDataURL("image/png");
    imagePreview.style.transform = `scale(${zoom})`;
}

function loadImage(file) {
    originalFile = file;
    const reader = new FileReader();

    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            originalImage = img;
            rotation = 0;
            zoom = 1;
            zoomSlider.value = 100;
            zoomValue.textContent = "100%";

            orientedCanvas = buildOrientedCanvas(img, 0);
            imagePreview.src = e.target.result;
            imagePreview.style.transform = "scale(1)";

            fileName.textContent = file.name;
            originalSize.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;

            dropZone.style.display = "none";
            workspace.style.display = "flex";

            requestAnimationFrame(() => {
                smartCrop();
            });

            status.textContent = "";
            result.style.display = "none";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetCropBox() {
    rotation = 0;
    zoom = 1;
    zoomSlider.value = 100;
    zoomValue.textContent = "100%";
    imagePreview.style.transform = "scale(1)";

    cropBox.style.left = "22.5%";
    cropBox.style.top = "22.5%";
    cropBox.style.width = "55%";
    cropBox.style.height = "55%";

    selectedRatio = null;
    ratioButtons.forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.ratio === "free") {
            btn.classList.add("active");
        }
    });
}

ratioButtons.forEach(button => {
    button.addEventListener("click", () => {
        ratioButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const ratio = button.dataset.ratio;
        if (ratio === "free") {
            selectedRatio = null;
            return;
        }
        selectedRatio = parseFloat(ratio);
        applyCropRatio(selectedRatio);
    });
});

applyRatio.addEventListener("click", () => {
    const w = parseFloat(customWidth.value);
    const h = parseFloat(customHeight.value);

    if (!w || !h || w <= 0 || h <= 0) {
        status.textContent = "⚠ Please enter a valid custom ratio.";
        return;
    }

    selectedRatio = w / h;
    ratioButtons.forEach(btn => btn.classList.remove("active"));
    applyCropRatio(selectedRatio);
    status.textContent = `✓ Custom ratio ${w}:${h} applied.`;
});

function applyCropRatio(ratio) {
    const boxWidth = previewBox.clientWidth;
    const boxHeight = previewBox.clientHeight;
    if (!boxWidth || !boxHeight) return;

    let width, height;
    if (boxWidth / boxHeight > ratio) {
        height = boxHeight * 0.55;
        width = height * ratio;
    } else {
        width = boxWidth * 0.55;
        height = width / ratio;
    }

    if (width > boxWidth * 0.9) {
        width = boxWidth * 0.9;
        height = width / ratio;
    }
    if (height > boxHeight * 0.9) {
        height = boxHeight * 0.9;
        width = height * ratio;
    }

    cropBox.style.width = `${width}px`;
    cropBox.style.height = `${height}px`;
    cropBox.style.left = `${(boxWidth - width) / 2}px`;
    cropBox.style.top = `${(boxHeight - height) / 2}px`;
}

zoomSlider.addEventListener("input", () => {
    zoom = parseInt(zoomSlider.value, 10) / 100;
    zoomValue.textContent = `${zoomSlider.value}%`;
    imagePreview.style.transform = `scale(${zoom})`;
});

rotateLeft.addEventListener("click", () => {
    rotation = (rotation - 90 + 360) % 360;
    refreshOrientedPreview();
});

rotateRight.addEventListener("click", () => {
    rotation = (rotation + 90) % 360;
    refreshOrientedPreview();
});

cropBox.addEventListener("pointerdown", (e) => {
    if (e.target.classList.contains("crop-handle")) {
        resizing = true;
        resizeCorner = [...e.target.classList].find(c =>
            ["top-left", "top-right", "bottom-left", "bottom-right"].includes(c)
        );
    } else {
        dragging = true;
    }

    startX = e.clientX;
    startY = e.clientY;
    startLeft = cropBox.offsetLeft;
    startTop = cropBox.offsetTop;
    startWidth = cropBox.offsetWidth;
    startHeight = cropBox.offsetHeight;

    cropBox.setPointerCapture(e.pointerId);
    e.preventDefault();
});

cropBox.addEventListener("pointermove", (e) => {
    if (!dragging && !resizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const containerWidth = previewBox.clientWidth;
    const containerHeight = previewBox.clientHeight;

    if (dragging) {
        let newLeft = Math.max(0, Math.min(startLeft + dx, containerWidth - cropBox.offsetWidth));
        let newTop = Math.max(0, Math.min(startTop + dy, containerHeight - cropBox.offsetHeight));
        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;
        return;
    }

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (resizeCorner.includes("right")) newWidth = startWidth + dx;
    if (resizeCorner.includes("left")) {
        newWidth = startWidth - dx;
        newLeft = startLeft + dx;
    }
    if (resizeCorner.includes("bottom")) newHeight = startHeight + dy;
    if (resizeCorner.includes("top")) {
        newHeight = startHeight - dy;
        newTop = startTop + dy;
    }

    if (selectedRatio) {
        if (Math.abs(dx) >= Math.abs(dy)) {
            newHeight = newWidth / selectedRatio;
        } else {
            newWidth = newHeight * selectedRatio;
        }
        if (resizeCorner.includes("left")) newLeft = startLeft + startWidth - newWidth;
        if (resizeCorner.includes("top")) newTop = startTop + startHeight - newHeight;
    }

    const minSize = 60;
    if (newWidth < minSize) {
        newWidth = minSize;
        if (selectedRatio) newHeight = newWidth / selectedRatio;
    }
    if (newHeight < minSize) {
        newHeight = minSize;
        if (selectedRatio) newWidth = newHeight * selectedRatio;
    }

    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;

    if (newLeft + newWidth > containerWidth) {
        newWidth = containerWidth - newLeft;
        if (selectedRatio) newHeight = newWidth / selectedRatio;
    }
    if (newTop + newHeight > containerHeight) {
        newHeight = containerHeight - newTop;
        if (selectedRatio) newWidth = newHeight * selectedRatio;
    }

    cropBox.style.width = `${newWidth}px`;
    cropBox.style.height = `${newHeight}px`;
    cropBox.style.left = `${newLeft}px`;
    cropBox.style.top = `${newTop}px`;
});

cropBox.addEventListener("pointerup", () => {
    dragging = false;
    resizing = false;
    resizeCorner = null;
});

cropBtn.addEventListener("click", () => {
    if (!originalImage) return;
    if (!orientedCanvas) {
        orientedCanvas = buildOrientedCanvas(originalImage, rotation);
    }

    status.textContent = "✦ Please wait, cropping your image...";

    setTimeout(() => {
        try {
            const rect = cropBox.getBoundingClientRect();
            const imageRect = imagePreview.getBoundingClientRect();

            const scaleX = orientedCanvas.width / imageRect.width;
            const scaleY = orientedCanvas.height / imageRect.height;

            const rawX = (rect.left - imageRect.left) * scaleX;
            const rawY = (rect.top - imageRect.top) * scaleY;
            const rawW = rect.width * scaleX;
            const rawH = rect.height * scaleY;

            const sx = Math.max(0, Math.min(orientedCanvas.width - 1, rawX));
            const sy = Math.max(0, Math.min(orientedCanvas.height - 1, rawY));
            const sw = Math.max(1, Math.min(orientedCanvas.width - sx, rawW - Math.max(0, -rawX)));
            const sh = Math.max(1, Math.min(orientedCanvas.height - sy, rawH - Math.max(0, -rawY)));

            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(sw));
            canvas.height = Math.max(1, Math.round(sh));

            const ctx = canvas.getContext("2d");
            const format = outputFormat.value;

            if (format === "image/jpeg") {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(orientedCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

            const quality = format === "image/png" ? undefined : 0.92;

            canvas.toBlob((blob) => {
                if (!blob) {
                    status.textContent = "⚠ Could not create the cropped image.";
                    return;
                }

                outputBlob = blob;
                resultOriginal.textContent = `${orientedCanvas.width} × ${orientedCanvas.height}`;
                resultCropped.textContent = `${canvas.width} × ${canvas.height}`;
                resultSize.textContent = formatBytes(blob.size);

                result.style.display = "block";
                status.textContent = "✓ Image cropped successfully!";
            }, format, quality);

        } catch (error) {
            console.error(error);
            status.textContent = "⚠ Something went wrong. Please try again.";
        }
    }, 80);
});

downloadBtn.addEventListener("click", () => {
    if (!outputBlob) return;
    status.textContent = "↓ Downloading your cropped image...";

    const extension =
        outputFormat.value === "image/png" ? "png" :
        outputFormat.value === "image/webp" ? "webp" : "jpg";

    const url = URL.createObjectURL(outputBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pikatools-cropped.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
        status.textContent = "✓ Downloaded successfully!";
    }, 500);
});

resetBtn.addEventListener("click", () => {
    fileInput.value = "";
    originalImage = null;
    originalFile = null;
    orientedCanvas = null;
    outputBlob = null;

    workspace.style.display = "none";
    dropZone.style.display = "flex";
    result.style.display = "none";
    status.textContent = "";
    customWidth.value = "";
    customHeight.value = "";

    resetCropBox();
});

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function smartCrop() {
    if (!originalImage) return;
    const boxW = previewBox.clientWidth;
    const boxH = previewBox.clientHeight;
    if (!boxW || !boxH) return;

    const ratio = selectedRatio || getSmartRatio();
    const imgW = originalImage.naturalWidth;
    const imgH = originalImage.naturalHeight;

    const maxSide = 180;
    const scale = Math.min(maxSide / imgW, maxSide / imgH, 1);
    const smallW = Math.max(1, Math.round(imgW * scale));
    const smallH = Math.max(1, Math.round(imgH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = smallW;
    canvas.height = smallH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(originalImage, 0, 0, smallW, smallH);

    const data = ctx.getImageData(0, 0, smallW, smallH).data;
    const interest = new Float32Array(smallW * smallH);

    for (let y = 1; y < smallH - 1; y++) {
        for (let x = 1; x < smallW - 1; x++) {
            const i = (y * smallW + x) * 4;
            const left = ((y * smallW + (x - 1)) * 4);
            const right = ((y * smallW + (x + 1)) * 4);
            const up = (((y - 1) * smallW + x) * 4);
            const down = (((y + 1) * smallW + x) * 4);

            const current = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const horizontal =
                Math.abs(current - (data[left] + data[left + 1] + data[left + 2]) / 3) +
                Math.abs(current - (data[right] + data[right + 1] + data[right + 2]) / 3);
            const vertical =
                Math.abs(current - (data[up] + data[up + 1] + data[up + 2]) / 3) +
                Math.abs(current - (data[down] + data[down + 1] + data[down + 2]) / 3);

            interest[y * smallW + x] = (horizontal + vertical) / 255;
        }
    }

    let cropW, cropH;
    if (imgW / imgH >= ratio) {
        cropH = imgH * 0.72;
        cropW = cropH * ratio;
        if (cropW > imgW * 0.9) {
            cropW = imgW * 0.9;
            cropH = cropW / ratio;
        }
    } else {
        cropW = imgW * 0.72;
        cropH = cropW / ratio;
        if (cropH > imgH * 0.9) {
            cropH = imgH * 0.9;
            cropW = cropH * ratio;
        }
    }

    const steps = 9;
    let bestScore = -Infinity;
    let bestX = (imgW - cropW) / 2;
    let bestY = (imgH - cropH) / 2;
    const maxX = Math.max(0, imgW - cropW);
    const maxY = Math.max(0, imgH - cropH);

    for (let sy = 0; sy < steps; sy++) {
        const y = (maxY * sy) / (steps - 1);
        for (let sx = 0; sx < steps; sx++) {
            const x = (maxX * sx) / (steps - 1);
            const sampleX = Math.max(0, Math.floor(x * scale));
            const sampleY = Math.max(0, Math.floor(y * scale));
            const sampleW = Math.max(1, Math.floor(cropW * scale));
            const sampleH = Math.max(1, Math.floor(cropH * scale));

            let score = 0;
            let count = 0;
            for (let yy = sampleY; yy < Math.min(smallH, sampleY + sampleH); yy += 4) {
                for (let xx = sampleX; xx < Math.min(smallW, sampleX + sampleW); xx += 4) {
                    score += interest[yy * smallW + xx];
                    count++;
                }
            }
            if (count > 0) score /= count;

            const centerX = (x + cropW / 2) / imgW;
            const centerY = (y + cropH / 2) / imgH;
            const centerDistance = Math.abs(centerX - 0.5) + Math.abs(centerY - 0.5);
            score -= centerDistance * 0.025;

            if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestY = y;
            }
        }
    }

    const imageRect = imagePreview.getBoundingClientRect();
    const previewRect = previewBox.getBoundingClientRect();

    const displayScaleX = imageRect.width / imgW;
    const displayScaleY = imageRect.height / imgH;
    const displayCropW = cropW * displayScaleX;
    const displayCropH = cropH * displayScaleY;
    const displayX = (imageRect.left - previewRect.left) + bestX * displayScaleX;
    const displayY = (imageRect.top - previewRect.top) + bestY * displayScaleY;

    const finalW = Math.min(displayCropW, imageRect.width);
    const finalH = Math.min(displayCropH, imageRect.height);

    cropBox.style.width = `${finalW}px`;
    cropBox.style.height = `${finalH}px`;
    cropBox.style.left = `${Math.max(0, Math.min(displayX, boxW - finalW))}px`;
    cropBox.style.top = `${Math.max(0, Math.min(displayY, boxH - finalH))}px`;

    status.textContent = "✨ Smart Crop suggested a good starting area.";
}

function getSmartRatio() {
    const w = originalImage.naturalWidth;
    const h = originalImage.naturalHeight;
    if (h > w * 1.25) return 0.75;
    if (w > h * 1.25) return 1.5;
    return 1;
}
