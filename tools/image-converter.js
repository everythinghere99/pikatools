const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");

const filesSection = document.getElementById("filesSection");
const fileList = document.getElementById("fileList");

const settings = document.getElementById("settings");
const resultSection = document.getElementById("resultSection");

const resultList = document.getElementById("resultList");
const resultText = document.getElementById("resultText");

const convertBtn = document.getElementById("convertBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");

const clearFilesBtn = document.getElementById("clearFilesBtn");
const newFilesBtn = document.getElementById("newFilesBtn");

const statusBox = document.getElementById("status");
const formatButtons = document.querySelectorAll(".format-btn");
const pdfOptions = document.getElementById("pdfOptions");
const pageSize = document.getElementById("pageSize");
const orientation = document.getElementById("orientation");
const quality = document.getElementById("quality");
const qualityValue = document.getElementById("qualityValue");
const qualityTitle = document.getElementById("qualityTitle");

let selectedFiles = [];
let selectedFormat = "pdf";
let convertedFiles = [];
let thumbURLs = [];

function clearThumbURLs() {
    thumbURLs.forEach(url => URL.revokeObjectURL(url));
    thumbURLs = [];
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function baseName(name) {
    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w\- ]/g, "")
        .trim() || "converted-image";
}

function setStatus(message) {
    statusBox.textContent = message;
}

fileInput.addEventListener("change", function () {
    if (!this.files.length) return;
    addFiles(Array.from(this.files));
    this.value = "";
});

["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropZone.classList.add("dragover");
    });
});

["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropZone.classList.remove("dragover");
    });
});

dropZone.addEventListener("drop", function (event) {
    const files = Array.from(event.dataTransfer.files).filter(file =>
        file.type.startsWith("image/")
    );
    if (files.length) addFiles(files);
});

function addFiles(files) {
    const validFiles = files.filter(file =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (!validFiles.length) {
        setStatus("Please choose JPG, PNG or WebP images.");
        return;
    }

    selectedFiles = [...selectedFiles, ...validFiles];
    renderFiles();

    filesSection.classList.remove("hidden");
    settings.classList.remove("hidden");
    resultSection.classList.add("hidden");

    setStatus(`${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} selected.`);
}

function renderFiles() {
    clearThumbURLs();
    fileList.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "file-item";

        const thumb = document.createElement("img");
        thumb.className = "file-thumb";
        const thumbUrl = URL.createObjectURL(file);
        thumbURLs.push(thumbUrl);
        thumb.src = thumbUrl;

        const info = document.createElement("div");
        info.className = "file-info";

        const name = document.createElement("div");
        name.className = "file-name";
        name.textContent = file.name;

        const size = document.createElement("div");
        size.className = "file-size";
        size.textContent = formatBytes(file.size);

        info.appendChild(name);
        info.appendChild(size);

        const number = document.createElement("div");
        number.className = "file-number";
        number.textContent = "#" + (index + 1);

        item.appendChild(thumb);
        item.appendChild(info);
        item.appendChild(number);
        fileList.appendChild(item);
    });
}

formatButtons.forEach(button => {
    button.addEventListener("click", function () {
        formatButtons.forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        selectedFormat = this.dataset.format;
        updateFormatUI();
    });
});

function updateFormatUI() {
    if (selectedFormat === "pdf") {
        pdfOptions.classList.remove("hidden");
        qualityTitle.textContent = "PDF Quality";
        convertBtn.textContent = "✨ Convert to PDF";
        quality.disabled = false;
    } else {
        pdfOptions.classList.add("hidden");
        qualityTitle.textContent = "Image Quality";
        convertBtn.textContent = `✨ Convert to ${selectedFormat.toUpperCase()}`;
        quality.disabled = selectedFormat === "png";
    }
}

quality.addEventListener("input", function () {
    qualityValue.textContent = this.value + "%";
});

clearFilesBtn.addEventListener("click", resetAll);
newFilesBtn.addEventListener("click", resetAll);

function resetAll() {
    clearThumbURLs();
    selectedFiles = [];
    convertedFiles = [];
    fileList.innerHTML = "";
    resultList.innerHTML = "";
    filesSection.classList.add("hidden");
    settings.classList.add("hidden");
    resultSection.classList.add("hidden");
    setStatus("");
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function () {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read image."));
        };
        img.src = url;
    });
}

function imageToCanvas(img, outputFormat) {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    const maxDimension = 4000;
    if (Math.max(width, height) > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (outputFormat === "jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

async function convertSingleImage(file, format, qualityPercent) {
    const img = await loadImage(file);
    const canvas = imageToCanvas(img, format);

    const mime =
        format === "jpg" ? "image/jpeg" :
        format === "png" ? "image/png" : "image/webp";

    const qualityNumber = qualityPercent / 100;
    const blob = await new Promise(resolve => {
        canvas.toBlob(
            resolve,
            mime,
            format === "png" ? undefined : qualityNumber
        );
    });

    if (!blob) throw new Error("Image conversion failed.");

    const extension = format === "jpg" ? "jpg" : format;
    const filename = `${baseName(file.name)}.${extension}`;

    return { blob, name: filename, size: blob.size };
}

function getPageDimensions(imageWidth, imageHeight) {
    let width = pageSize.value === "letter" ? 612 : 595.28;
    let height = pageSize.value === "letter" ? 792 : 841.89;

    if (orientation.value === "landscape") {
        return { width: Math.max(width, height), height: Math.min(width, height) };
    }
    if (orientation.value === "portrait") {
        return { width: Math.min(width, height), height: Math.max(width, height) };
    }
    if (imageWidth > imageHeight) {
        return { width: Math.max(width, height), height: Math.min(width, height) };
    }
    return { width: Math.min(width, height), height: Math.max(width, height) };
}

async function imageToPdfJpeg(img, qualityPercent) {
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    const maxDimension = 2400;
    if (Math.max(width, height) > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataURL = canvas.toDataURL("image/jpeg", qualityPercent / 100);
    const base64 = dataURL.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return { bytes, width, height };
}

async function buildPDF(files, qualityPercent) {
    const encoder = new TextEncoder();
    const chunks = [];
    let currentOffset = 0;

    function addText(text) {
        const bytes = encoder.encode(text);
        chunks.push(bytes);
        currentOffset += bytes.length;
    }

    function addBytes(bytes) {
        chunks.push(bytes);
        currentOffset += bytes.length;
    }

    const totalObjects = 2 + files.length * 3;
    const offsets = new Array(totalObjects + 1).fill(0);

    addBytes(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]));

    const pageObjects = [];
    for (let i = 0; i < files.length; i++) {
        pageObjects.push(3 + i * 3);
    }

    offsets[1] = currentOffset;
    addText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    offsets[2] = currentOffset;
    const kids = pageObjects.map(num => `${num} 0 R`).join(" ");
    addText(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${files.length} >>\nendobj\n`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Creating PDF page ${i + 1} of ${files.length}...`);

        const img = await loadImage(file);
        const jpeg = await imageToPdfJpeg(img, qualityPercent);
        const dimensions = getPageDimensions(jpeg.width, jpeg.height);

        const pageWidth = dimensions.width;
        const pageHeight = dimensions.height;
        const margin = 24;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        const scale = Math.min(availableWidth / jpeg.width, availableHeight / jpeg.height);
        const drawWidth = jpeg.width * scale;
        const drawHeight = jpeg.height * scale;
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        const pageObject = 3 + i * 3;
        const contentObject = 4 + i * 3;
        const imageObject = 5 + i * 3;

        offsets[pageObject] = currentOffset;
        addText(
            `${pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>\nendobj\n`
        );

        const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
        const contentBytes = encoder.encode(content);

        offsets[contentObject] = currentOffset;
        addText(`${contentObject} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
        addBytes(contentBytes);
        addText("endstream\nendobj\n");

        offsets[imageObject] = currentOffset;
        addText(
            `${imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.bytes.length} >>\nstream\n`
        );
        addBytes(jpeg.bytes);
        addText("\nendstream\nendobj\n");
    }

    const xrefOffset = currentOffset;
    addText(`xref\n0 ${totalObjects + 1}\n`);
    addText("0000000000 65535 f \n");
    for (let i = 1; i <= totalObjects; i++) {
        addText(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
    }

    addText(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks, { type: "application/pdf" });
}

convertBtn.addEventListener("click", async function () {
    if (!selectedFiles.length) {
        setStatus("Please select at least one image.");
        return;
    }

    convertBtn.disabled = true;
    convertedFiles = [];
    resultList.innerHTML = "";
    resultSection.classList.add("hidden");

    try {
        const qualityNumber = Number(quality.value);
        if (selectedFormat === "pdf") {
            const pdf = await buildPDF(selectedFiles, qualityNumber);
            convertedFiles.push({ blob: pdf, name: "pikatools-images.pdf", size: pdf.size });
            setStatus("✓ PDF created successfully!");
        } else {
            for (let i = 0; i < selectedFiles.length; i++) {
                setStatus(`Converting image ${i + 1} of ${selectedFiles.length}...`);
                const converted = await convertSingleImage(selectedFiles[i], selectedFormat, qualityNumber);
                convertedFiles.push(converted);
            }
            setStatus("✓ Conversion completed successfully!");
        }
        showResults();
    } catch (error) {
        console.error(error);
        setStatus("Something went wrong while converting. Please try again.");
    }

    convertBtn.disabled = false;
});

function showResults() {
    resultList.innerHTML = "";
    convertedFiles.forEach(file => {
        const item = document.createElement("div");
        item.className = "result-item";

        const icon = document.createElement("div");
        icon.className = "result-icon";
        icon.textContent = file.name.endsWith(".pdf") ? "📄" : "🖼️";

        const info = document.createElement("div");
        info.className = "result-info";

        const name = document.createElement("div");
        name.className = "result-name";
        name.textContent = file.name;

        const size = document.createElement("div");
        size.className = "result-size";
        size.textContent = formatBytes(file.size);

        info.appendChild(name);
        info.appendChild(size);
        item.appendChild(icon);
        item.appendChild(info);
        resultList.appendChild(item);
    });

    if (selectedFormat === "pdf") {
        resultText.textContent = `${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} combined into one PDF.`;
    } else {
        resultText.textContent = `${convertedFiles.length} converted file${convertedFiles.length > 1 ? "s" : ""} ready to download.`;
    }

    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

downloadAllBtn.addEventListener("click", async function () {
    if (!convertedFiles.length) return;
    downloadAllBtn.disabled = true;

    for (let i = 0; i < convertedFiles.length; i++) {
        setStatus(`Downloading ${i + 1} of ${convertedFiles.length}...`);
        downloadBlob(convertedFiles[i].blob, convertedFiles[i].name);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    setStatus("✓ Downloaded successfully!");
    downloadAllBtn.disabled = false;
});

updateFormatUI();
