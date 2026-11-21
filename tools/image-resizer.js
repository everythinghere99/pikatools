const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");

const workspace = document.getElementById("workspace");
const previewImage = document.getElementById("previewImage");

const originalName = document.getElementById("originalName");
const originalDimensions = document.getElementById("originalDimensions");

const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const lockRatio = document.getElementById("lockRatio");

const format = document.getElementById("format");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const resizeBtn = document.getElementById("resizeBtn");

const result = document.getElementById("result");
const resultOriginal = document.getElementById("resultOriginal");
const resultNewSize = document.getElementById("resultNewSize");
const resultFileSize = document.getElementById("resultFileSize");

const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("status");

let selectedFile = null;
let imageElement = null;
let resizedBlob = null;
let previewURL = null;

function formatKB(bytes) {
    return (bytes / 1024).toFixed(1) + " KB";
}

function setStatus(message) {
    statusText.textContent = message;
}

function selectFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        setStatus("Please choose a JPG, PNG or WebP image.");
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        setStatus("Image is too large. Maximum supported size is 50 MB.");
        return;
    }

    selectedFile = file;
    originalName.textContent = file.name;

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }

    previewURL = URL.createObjectURL(file);
    previewImage.src = previewURL;

    const img = new Image();
    img.onload = () => {
        imageElement = img;
        originalDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        widthInput.value = img.naturalWidth;
        heightInput.value = img.naturalHeight;
    };
    img.src = previewURL;

    dropZone.classList.add("hidden");
    workspace.classList.remove("hidden");
    result.classList.add("hidden");
    setStatus("");
}

chooseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));

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
    selectFile(e.dataTransfer.files[0]);
});

widthInput.addEventListener("input", () => {
    if (!lockRatio.checked || !imageElement) return;
    const width = Number(widthInput.value);
    if (!width || width <= 0) return;
    const ratio = imageElement.naturalHeight / imageElement.naturalWidth;
    heightInput.value = Math.max(1, Math.round(width * ratio));
});

heightInput.addEventListener("input", () => {
    if (!lockRatio.checked || !imageElement) return;
    const height = Number(heightInput.value);
    if (!height || height <= 0) return;
    const ratio = imageElement.naturalWidth / imageElement.naturalHeight;
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

resizeBtn.addEventListener("click", async () => {
    if (!selectedFile || !imageElement) return;

    if (lockRatio.checked && Number(widthInput.value) > 0) {
        const ratio = imageElement.naturalHeight / imageElement.naturalWidth;
        heightInput.value = Math.max(1, Math.round(Number(widthInput.value) * ratio));
    }

    const newWidth = Number(widthInput.value);
    const newHeight = Number(heightInput.value);

    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
        setStatus("Please enter valid dimensions.");
        return;
    }

    if (newWidth > 10000 || newHeight > 10000) {
        setStatus("Maximum dimension is 10,000 px.");
        return;
    }

    resizeBtn.disabled = true;
    resizeBtn.textContent = "Resizing...";
    result.classList.add("hidden");
    setStatus("✦ Please wait, resizing your image...");

    try {
        await new Promise(resolve => setTimeout(resolve, 80));

        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const mime = format.value;
        if (mime === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, newWidth, newHeight);
        }

        ctx.drawImage(imageElement, 0, 0, newWidth, newHeight);

        const qualityValueNumber = Number(quality.value) / 100;
        resizedBlob = await new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), mime, qualityValueNumber);
        });

        if (!resizedBlob) {
            throw new Error("Could not create resized image.");
        }

        resultOriginal.textContent = `${imageElement.naturalWidth} × ${imageElement.naturalHeight} px`;
        resultNewSize.textContent = `${newWidth} × ${newHeight} px`;
        resultFileSize.textContent = formatKB(resizedBlob.size);

        result.classList.remove("hidden");
        setStatus("✓ Image resized successfully!");

    } catch (error) {
        console.error(error);
        setStatus(error.message || "Something went wrong.");
    } finally {
        resizeBtn.disabled = false;
        resizeBtn.textContent = "Resize Image";
    }
});

downloadBtn.addEventListener("click", () => {
    if (!resizedBlob) {
        setStatus("Please resize the image first.");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Downloading...";
    setStatus("↓ Downloading your resized image...");

    const extension =
        format.value === "image/webp" ? "webp" :
        format.value === "image/png" ? "png" : "jpg";

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
    const filename = `${baseName}-${widthInput.value}x${heightInput.value}.${extension}`;

    const downloadURL = URL.createObjectURL(resizedBlob);
    const link = document.createElement("a");
    link.href = downloadURL;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(downloadURL);
        downloadBtn.disabled = false;
        downloadBtn.textContent = "↓ Download Resized Image";
        setStatus("✓ Downloaded successfully!");
    }, 800);
});

resetBtn.addEventListener("click", () => {
    selectedFile = null;
    imageElement = null;
    resizedBlob = null;

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    fileInput.value = "";
    previewImage.removeAttribute("src");
    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");
    result.classList.add("hidden");
    downloadBtn.disabled = false;
    downloadBtn.textContent = "↓ Download Resized Image";
    setStatus("");
});
