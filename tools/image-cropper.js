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


/* =========================
   FILE UPLOAD
========================= */

chooseBtn.addEventListener("click", () => {
    fileInput.click();
});

dropZone.addEventListener("click", (e) => {
    if (e.target !== chooseBtn) {
        fileInput.click();
    }
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


/* =========================
   LOAD IMAGE
========================= */

function loadImage(file) {

    originalFile = file;

    const reader = new FileReader();

    reader.onload = function (e) {

        const img = new Image();

        img.onload = function () {

            originalImage = img;

            imagePreview.src = e.target.result;

            fileName.textContent = file.name;
            originalSize.textContent =
                `${img.naturalWidth} × ${img.naturalHeight}`;

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


/* =========================
   RESET CROP BOX
========================= */

function resetCropBox() {

    rotation = 0;
    zoom = 1;

    zoomSlider.value = 100;
    zoomValue.textContent = "100%";

    imagePreview.style.transform =
        "rotate(0deg) scale(1)";

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


/* =========================
   RATIO BUTTONS
========================= */

ratioButtons.forEach(button => {

    button.addEventListener("click", () => {

        ratioButtons.forEach(btn =>
            btn.classList.remove("active")
        );

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


/* =========================
   CUSTOM RATIO
========================= */

applyRatio.addEventListener("click", () => {

    const w = parseFloat(customWidth.value);
    const h = parseFloat(customHeight.value);

    if (!w || !h || w <= 0 || h <= 0) {

        status.textContent =
            "⚠ Please enter a valid custom ratio.";

        return;
    }

    selectedRatio = w / h;

    ratioButtons.forEach(btn =>
        btn.classList.remove("active")
    );

    applyCropRatio(selectedRatio);

    status.textContent =
        `✓ Custom ratio ${w}:${h} applied.`;
});


/* =========================
   APPLY RATIO
========================= */

function applyCropRatio(ratio) {

    const boxWidth = previewBox.clientWidth;
    const boxHeight = previewBox.clientHeight;

    if (!boxWidth || !boxHeight) return;

    let width;
    let height;

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

    cropBox.style.left =
        `${(boxWidth - width) / 2}px`;

    cropBox.style.top =
        `${(boxHeight - height) / 2}px`;
}


/* =========================
   ZOOM
========================= */

zoomSlider.addEventListener("input", () => {

    zoom = parseInt(zoomSlider.value) / 100;

    zoomValue.textContent =
        `${zoomSlider.value}%`;

    imagePreview.style.transform =
        `rotate(${rotation}deg) scale(${zoom})`;
});


/* =========================
   ROTATE
========================= */

function updateRotation() {

    imagePreview.style.transform =
        `rotate(${rotation}deg) scale(${zoom})`;
}

rotateLeft.addEventListener("click", () => {

    rotation -= 90;

    updateRotation();
});

rotateRight.addEventListener("click", () => {

    rotation += 90;

    updateRotation();
});


/* =========================
   CROP BOX DRAG
========================= */

cropBox.addEventListener("pointerdown", (e) => {

    if (
        e.target.classList.contains("crop-handle")
    ) {

        resizing = true;

        resizeCorner =
            [...e.target.classList]
                .find(c =>
                    [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right"
                    ].includes(c)
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


    /* MOVE */

    if (dragging) {

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        newLeft = Math.max(
            0,
            Math.min(
                newLeft,
                containerWidth - cropBox.offsetWidth
            )
        );

        newTop = Math.max(
            0,
            Math.min(
                newTop,
                containerHeight - cropBox.offsetHeight
            )
        );

        cropBox.style.left = `${newLeft}px`;
        cropBox.style.top = `${newTop}px`;

        return;
    }


    /* RESIZE */

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;


    if (resizeCorner.includes("right")) {
        newWidth = startWidth + dx;
    }

    if (resizeCorner.includes("left")) {
        newWidth = startWidth - dx;
        newLeft = startLeft + dx;
    }

    if (resizeCorner.includes("bottom")) {
        newHeight = startHeight + dy;
    }

    if (resizeCorner.includes("top")) {
        newHeight = startHeight - dy;
        newTop = startTop + dy;
    }


    /* Ratio lock */

    if (selectedRatio) {

        if (Math.abs(dx) >= Math.abs(dy)) {

            newHeight = newWidth / selectedRatio;

        } else {

            newWidth = newHeight * selectedRatio;
        }

        if (resizeCorner.includes("left")) {
            newLeft =
                startLeft + startWidth - newWidth;
        }

        if (resizeCorner.includes("top")) {
            newTop =
                startTop + startHeight - newHeight;
        }
    }


    const minSize = 60;

    if (newWidth < minSize) {
        newWidth = minSize;

        if (selectedRatio) {
            newHeight = newWidth / selectedRatio;
        }
    }

    if (newHeight < minSize) {
        newHeight = minSize;

        if (selectedRatio) {
            newWidth = newHeight * selectedRatio;
        }
    }


    if (newLeft < 0) {
        newLeft = 0;
    }

    if (newTop < 0) {
        newTop = 0;
    }

    if (
        newLeft + newWidth >
        containerWidth
    ) {
        newWidth =
            containerWidth - newLeft;

        if (selectedRatio) {
            newHeight =
                newWidth / selectedRatio;
        }
    }

    if (
        newTop + newHeight >
        containerHeight
    ) {
        newHeight =
            containerHeight - newTop;

        if (selectedRatio) {
            newWidth =
                newHeight * selectedRatio;
        }
    }


    cropBox.style.width =
        `${newWidth}px`;

    cropBox.style.height =
        `${newHeight}px`;

    cropBox.style.left =
        `${newLeft}px`;

    cropBox.style.top =
        `${newTop}px`;
});


cropBox.addEventListener("pointerup", () => {

    dragging = false;
    resizing = false;
    resizeCorner = null;
});


/* =========================
   CREATE CROPPED IMAGE
========================= */

cropBtn.addEventListener("click", () => {

    if (!originalImage) return;

    status.textContent =
        "✦ Please wait, cropping your image...";

    setTimeout(() => {

        try {

            const rect =
                cropBox.getBoundingClientRect();

            const imageRect =
                imagePreview.getBoundingClientRect();

            const scaleX =
                originalImage.naturalWidth /
                imageRect.width;

            const scaleY =
                originalImage.naturalHeight /
                imageRect.height;


            const x =
                (rect.left - imageRect.left) *
                scaleX;

            const y =
                (rect.top - imageRect.top) *
                scaleY;

            const width =
                rect.width * scaleX;

            const height =
                rect.height * scaleY;


            const canvas =
                document.createElement("canvas");

            canvas.width =
                Math.max(1, Math.round(width));

            canvas.height =
                Math.max(1, Math.round(height));

            const ctx =
                canvas.getContext("2d");


            ctx.drawImage(
                originalImage,
                Math.max(0, x),
                Math.max(0, y),
                Math.min(
                    width,
                    originalImage.naturalWidth
                ),
                Math.min(
                    height,
                    originalImage.naturalHeight
                ),
                0,
                0,
                canvas.width,
                canvas.height
            );


            const format =
                outputFormat.value;

            const quality =
                format === "image/png"
                    ? undefined
                    : 0.92;


            canvas.toBlob(
                (blob) => {

                    if (!blob) {

                        status.textContent =
                            "⚠ Could not create the cropped image.";

                        return;
                    }

                    outputBlob = blob;

                    resultOriginal.textContent =
                        `${originalImage.naturalWidth} × ${originalImage.naturalHeight}`;

                    resultCropped.textContent =
                        `${canvas.width} × ${canvas.height}`;

                    resultSize.textContent =
                        formatBytes(blob.size);

                    result.style.display = "block";

                    status.textContent =
                        "✓ Image cropped successfully!";

                },
                format,
                quality
            );

        } catch (error) {

            console.error(error);

            status.textContent =
                "⚠ Something went wrong. Please try again.";
        }

    }, 80);
});


/* =========================
   DOWNLOAD
========================= */

downloadBtn.addEventListener("click", () => {

    if (!outputBlob) return;

    status.textContent =
        "↓ Downloading your cropped image...";

    const extension =
        outputFormat.value === "image/png"
            ? "png"
            : outputFormat.value === "image/webp"
                ? "webp"
                : "jpg";

    const url =
        URL.createObjectURL(outputBlob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `pikatools-cropped.${extension}`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {

        URL.revokeObjectURL(url);

        status.textContent =
            "✓ Downloaded successfully!";

    }, 500);
});


/* =========================
   RESET
========================= */

resetBtn.addEventListener("click", () => {

    fileInput.value = "";

    originalImage = null;
    originalFile = null;
    outputBlob = null;

    workspace.style.display = "none";
    dropZone.style.display = "flex";

    result.style.display = "none";

    status.textContent = "";

    customWidth.value = "";
    customHeight.value = "";

    resetCropBox();
});


/* =========================
   FILE SIZE
========================= */

function formatBytes(bytes) {

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* =========================
   ✨ SMART CROP
   Finds a visually interesting
   starting crop automatically
========================= */

function smartCrop() {

    if (!originalImage) return;

    const boxW = previewBox.clientWidth;
    const boxH = previewBox.clientHeight;

    if (!boxW || !boxH) return;

    /*
       Current ratio:
       - If user hasn't selected one,
         use a natural sensible crop.
       - If ratio selected, respect it.
    */
    const ratio = selectedRatio || getSmartRatio();

    const imgW = originalImage.naturalWidth;
    const imgH = originalImage.naturalHeight;

    /*
       Create a small thumbnail for analysis.
       This keeps the process fast even for
       very large phone screenshots.
    */
    const maxSide = 180;

    const scale =
        Math.min(maxSide / imgW, maxSide / imgH, 1);

    const smallW = Math.max(1, Math.round(imgW * scale));
    const smallH = Math.max(1, Math.round(imgH * scale));

    const canvas = document.createElement("canvas");

    canvas.width = smallW;
    canvas.height = smallH;

    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    ctx.drawImage(
        originalImage,
        0,
        0,
        smallW,
        smallH
    );

    const data =
        ctx.getImageData(
            0,
            0,
            smallW,
            smallH
        ).data;

    /*
       Build a simple visual-interest map.

       Strong edges / contrast generally indicate:
       - text
       - faces
       - objects
       - screenshots
       - important visual areas

       This is not cloud AI, so everything
       remains inside the browser.
    */
    const interest = new Float32Array(
        smallW * smallH
    );

    let total = 0;

    for (let y = 1; y < smallH - 1; y++) {

        for (let x = 1; x < smallW - 1; x++) {

            const i =
                (y * smallW + x) * 4;

            const left =
                ((y * smallW + (x - 1)) * 4);

            const right =
                ((y * smallW + (x + 1)) * 4);

            const up =
                (((y - 1) * smallW + x) * 4);

            const down =
                (((y + 1) * smallW + x) * 4);

            const current =
                (data[i] +
                 data[i + 1] +
                 data[i + 2]) / 3;

            const horizontal =
                Math.abs(
                    current -
                    (
                        data[left] +
                        data[left + 1] +
                        data[left + 2]
                    ) / 3
                ) +
                Math.abs(
                    current -
                    (
                        data[right] +
                        data[right + 1] +
                        data[right + 2]
                    ) / 3
                );

            const vertical =
                Math.abs(
                    current -
                    (
                        data[up] +
                        data[up + 1] +
                        data[up + 2]
                    ) / 3
                ) +
                Math.abs(
                    current -
                    (
                        data[down] +
                        data[down + 1] +
                        data[down + 2]
                    ) / 3
                );

            /*
               Slight preference for
               brighter/contrasty areas.
            */
            const contrast =
                (horizontal + vertical) / 255;

            interest[
                y * smallW + x
            ] = contrast;

            total += contrast;
        }
    }

    /*
       Determine crop dimensions in
       original-image coordinates.
    */
    let cropW;
    let cropH;

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

    /*
       Search multiple possible crop positions.
       We don't need hundreds of positions;
       a small grid is fast and works well.
    */
    const steps = 9;

    let bestScore = -Infinity;
    let bestX = (imgW - cropW) / 2;
    let bestY = (imgH - cropH) / 2;

    const maxX = Math.max(0, imgW - cropW);
    const maxY = Math.max(0, imgH - cropH);

    for (let sy = 0; sy < steps; sy++) {

        const y =
            maxY * sy / (steps - 1);

        for (let sx = 0; sx < steps; sx++) {

            const x =
                maxX * sx / (steps - 1);

            const sampleX =
                Math.max(
                    0,
                    Math.floor(
                        x * scale
                    )
                );

            const sampleY =
                Math.max(
                    0,
                    Math.floor(
                        y * scale
                    )
                );

            const sampleW =
                Math.max(
                    1,
                    Math.floor(
                        cropW * scale
                    )
                );

            const sampleH =
                Math.max(
                    1,
                    Math.floor(
                        cropH * scale
                    )
                );

            let score = 0;
            let count = 0;

            const jump = 4;

            for (
                let yy = sampleY;
                yy < Math.min(
                    smallH,
                    sampleY + sampleH
                );
                yy += jump
            ) {

                for (
                    let xx = sampleX;
                    xx < Math.min(
                        smallW,
                        sampleX + sampleW
                    );
                    xx += jump
                ) {

                    score +=
                        interest[
                            yy * smallW + xx
                        ];

                    count++;
                }
            }

            if (count > 0) {
                score /= count;
            }

            /*
               Keep the crop from becoming
               too close to the extreme edges.
            */
            const centerX =
                (x + cropW / 2) / imgW;

            const centerY =
                (y + cropH / 2) / imgH;

            const centerDistance =
                Math.abs(centerX - 0.5) +
                Math.abs(centerY - 0.5);

            /*
               Small center preference prevents
               weird edge crops when the image
               has uniform/high-contrast borders.
            */
            score -= centerDistance * 0.025;

            if (score > bestScore) {

                bestScore = score;
                bestX = x;
                bestY = y;
            }
        }
    }

    /*
       Convert original-image coordinates
       into the visible preview coordinates.
    */
    const imageRect =
        imagePreview.getBoundingClientRect();

    const previewRect =
        previewBox.getBoundingClientRect();

    const displayScaleX =
        imageRect.width / imgW;

    const displayScaleY =
        imageRect.height / imgH;

    const displayCropW =
        cropW * displayScaleX;

    const displayCropH =
        cropH * displayScaleY;

    const displayX =
        (imageRect.left - previewRect.left) +
        bestX * displayScaleX;

    const displayY =
        (imageRect.top - previewRect.top) +
        bestY * displayScaleY;

    /*
       Safety limits.
    */
    const finalW =
        Math.min(
            displayCropW,
            imageRect.width
        );

    const finalH =
        Math.min(
            displayCropH,
            imageRect.height
        );

    cropBox.style.width =
        `${finalW}px`;

    cropBox.style.height =
        `${finalH}px`;

    cropBox.style.left =
        `${Math.max(
            0,
            Math.min(
                displayX,
                boxW - finalW
            )
        )}px`;

    cropBox.style.top =
        `${Math.max(
            0,
            Math.min(
                displayY,
                boxH - finalH
            )
        )}px`;

    /*
       Reset zoom/rotation for the
       automatically suggested crop.
    */
    rotation = 0;
    zoom = 1;

    zoomSlider.value = 100;
    zoomValue.textContent = "100%";

    imagePreview.style.transform =
        "rotate(0deg) scale(1)";

    status.textContent =
        "✨ Smart Crop suggested a good starting area.";
}


/* =========================
   SMART DEFAULT RATIO
========================= */

function getSmartRatio() {

    const w = originalImage.naturalWidth;
    const h = originalImage.naturalHeight;

    /*
       Portrait image
    */
    if (h > w * 1.25) {
        return 0.75;
    }

    /*
       Landscape image
    */
    if (w > h * 1.25) {
        return 1.5;
    }

    /*
       Nearly square
    */
    return 1;
}
