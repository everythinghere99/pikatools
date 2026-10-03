const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");

const workspace = document.getElementById("workspace");
const previewImage = document.getElementById("previewImage");

const originalName = document.getElementById("originalName");
const originalSize = document.getElementById("originalSize");

const targetSize = document.getElementById("targetSize");
const format = document.getElementById("format");
const compressBtn = document.getElementById("compressBtn");

const result = document.getElementById("result");
const resultOriginal = document.getElementById("resultOriginal");
const resultCompressed = document.getElementById("resultCompressed");
const resultReduction = document.getElementById("resultReduction");

const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("status");

let selectedFile = null;
let compressedBlob = null;
let compressedURL = null;
let previewURL = null;

let statusTimer = null;


// =========================
// HELPERS
// =========================

function formatKB(bytes) {
    return (bytes / 1024).toFixed(1) + " KB";
}

function setStatus(message) {
    statusText.textContent = message;
}

function startWaiting(message) {

    let dots = 0;

    clearInterval(statusTimer);

    statusText.textContent = message;

    statusTimer = setInterval(() => {

        dots++;

        if (dots > 3) {
            dots = 0;
        }

        statusText.textContent =
            message + ".".repeat(dots);

    }, 450);
}

function stopWaiting() {
    clearInterval(statusTimer);
    statusTimer = null;
}


// =========================
// SELECT IMAGE
// =========================

function selectFile(file) {

    if (!file) return;

    if (!file.type.startsWith("image/")) {

        setStatus(
            "Please choose a JPG, PNG or WebP image."
        );

        return;
    }

    if (file.size > 50 * 1024 * 1024) {

        setStatus(
            "Image is too large. Maximum supported size is 50 MB."
        );

        return;
    }

    selectedFile = file;

    originalName.textContent = file.name;
    originalSize.textContent = formatKB(file.size);

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }

    previewURL = URL.createObjectURL(file);

    previewImage.src = previewURL;

    dropZone.classList.add("hidden");
    workspace.classList.remove("hidden");

    result.classList.add("hidden");

    setStatus("");
}


// =========================
// CHOOSE IMAGE
// =========================

chooseBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    selectFile(fileInput.files[0]);
});


// =========================
// DRAG & DROP
// =========================

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

    selectFile(e.dataTransfer.files[0]);
});


// =========================
// QUICK SIZES
// =========================

document.querySelectorAll(".quick-sizes button")
.forEach(button => {

    button.addEventListener("click", () => {

        targetSize.value =
            button.dataset.size;
    });

});


// =========================
// LOAD IMAGE
// =========================

function loadImage(file) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = () => {

            reject(
                new Error("Could not read image.")
            );
        };

        img.src = URL.createObjectURL(file);
    });
}


// =========================
// CANVAS → BLOB
// =========================

function canvasBlob(
    canvas,
    mime,
    quality
) {

    return new Promise(resolve => {

        canvas.toBlob(
            blob => resolve(blob),
            mime,
            quality
        );

    });
}


// =========================
// CREATE COMPRESSED IMAGE
// =========================

async function createCompressedBlob(
    img,
    mime,
    quality,
    scale = 1
) {

    let width =
        img.naturalWidth * scale;

    let height =
        img.naturalHeight * scale;


    const MAX_DIMENSION = 4000;


    if (
        width > MAX_DIMENSION ||
        height > MAX_DIMENSION
    ) {

        const ratio = Math.min(
            MAX_DIMENSION / width,
            MAX_DIMENSION / height
        );

        width *= ratio;
        height *= ratio;
    }


    const canvas =
        document.createElement("canvas");


    canvas.width =
        Math.max(1, Math.round(width));

    canvas.height =
        Math.max(1, Math.round(height));


    const ctx =
        canvas.getContext("2d", {
            alpha: mime !== "image/jpeg"
        });


    ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
    );


    return await canvasBlob(
        canvas,
        mime,
        quality
    );
}


// =========================
// COMPRESS
// =========================

async function compressImage() {

    if (!selectedFile) return;


    const wantedKB =
        Number(targetSize.value);


    if (!wantedKB || wantedKB < 10) {

        setStatus(
            "Target size must be at least 10 KB."
        );

        return;
    }


    compressBtn.disabled = true;

    compressBtn.textContent =
        "Compressing...";


    result.classList.add("hidden");


    startWaiting(
        "✦ Please wait, compressing your image"
    );


    try {

        const img =
            await loadImage(selectedFile);


        const mime =
            format.value;


        const targetBytes =
            wantedKB * 1024;


        let bestBlob = null;


        // -------------------------
        // QUALITY SEARCH
        // -------------------------

        let low = 0.10;
        let high = 0.95;


        for (let i = 0; i < 6; i++) {

            const quality =
                (low + high) / 2;


            const blob =
                await createCompressedBlob(
                    img,
                    mime,
                    quality
                );


            if (blob.size <= targetBytes) {

                bestBlob = blob;

                low = quality;

            } else {

                high = quality;
            }
        }


        // -------------------------
        // REDUCE DIMENSIONS
        // -------------------------

        if (
            !bestBlob ||
            bestBlob.size > targetBytes
        ) {

            let scale = 0.85;


            for (let i = 0; i < 5; i++) {

                let lowQ = 0.10;
                let highQ = 0.90;

                let localBest = null;


                for (let j = 0; j < 5; j++) {

                    const quality =
                        (lowQ + highQ) / 2;


                    const blob =
                        await createCompressedBlob(
                            img,
                            mime,
                            quality,
                            scale
                        );


                    if (
                        blob.size <= targetBytes
                    ) {

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


                scale *= 0.75;
            }
        }


        if (!bestBlob) {

            throw new Error(
                "This target size is too small for this image."
            );
        }


        compressedBlob = bestBlob;


        if (compressedURL) {

            URL.revokeObjectURL(
                compressedURL
            );
        }


        compressedURL =
            URL.createObjectURL(
                compressedBlob
            );


        const reduction =
            (
                (
                    selectedFile.size -
                    compressedBlob.size
                ) /
                selectedFile.size
            ) * 100;


        resultOriginal.textContent =
            formatKB(selectedFile.size);


        resultCompressed.textContent =
            formatKB(compressedBlob.size);


        resultReduction.textContent =
            reduction > 0
                ? reduction.toFixed(1) +
                  "% smaller"
                : "No reduction";


        result.classList.remove(
            "hidden"
        );


        stopWaiting();


        setStatus(
            "✓ Compression completed successfully!"
        );


    } catch (error) {

        stopWaiting();

        console.error(error);


        setStatus(
            error.message ||
            "Something went wrong. Please try again."
        );


    } finally {

        compressBtn.disabled = false;

        compressBtn.textContent =
            "Compress Image";
    }
}


// =========================
// COMPRESS BUTTON
// =========================

compressBtn.addEventListener(
    "click",
    compressImage
);


// =========================
// DOWNLOAD
// =========================

downloadBtn.addEventListener(
    "click",
    async () => {

        if (!compressedBlob) {

            setStatus(
                "Please compress the image first."
            );

            return;
        }


        downloadBtn.disabled = true;

        downloadBtn.textContent =
            "Downloading...";


        startWaiting(
            "↓ Downloading your compressed image"
        );


        const extension =
            format.value === "image/webp"
                ? "webp"
                : format.value === "image/png"
                    ? "png"
                    : "jpg";


        const originalBase =
            selectedFile.name
                .replace(/\.[^/.]+$/, "");


        const filename =
            originalBase +
            "-compressed." +
            extension;


        try {

            /*
             * Fresh Blob URL
             */
            const downloadURL =
                URL.createObjectURL(
                    compressedBlob
                );


            const link =
                document.createElement("a");


            link.href =
                downloadURL;


            link.download =
                filename;


            link.style.display =
                "none";


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            /*
             * Give browser/WebView
             * time to start download
             */
            setTimeout(() => {

                URL.revokeObjectURL(
                    downloadURL
                );

            }, 5000);


            /*
             * Small delay so the user
             * actually sees the message
             */
            setTimeout(() => {

                stopWaiting();

                downloadBtn.disabled =
                    false;

                downloadBtn.textContent =
                    "↓ Download Compressed Image";


                setStatus(
                    "✓ Downloaded successfully!"
                );

            }, 800);


        } catch (error) {

            stopWaiting();


            downloadBtn.disabled =
                false;


            downloadBtn.textContent =
                "↓ Download Compressed Image";


            setStatus(
                "Download could not start. Please try again."
            );

        }

    }
);


// =========================
// RESET
// =========================

resetBtn.addEventListener(
    "click",
    () => {

        stopWaiting();


        selectedFile = null;

        compressedBlob = null;


        if (compressedURL) {

            URL.revokeObjectURL(
                compressedURL
            );

            compressedURL = null;
        }


        if (previewURL) {

            URL.revokeObjectURL(
                previewURL
            );

            previewURL = null;
        }


        fileInput.value = "";


        previewImage.removeAttribute(
            "src"
        );


        workspace.classList.add(
            "hidden"
        );


        dropZone.classList.remove(
            "hidden"
        );


        result.classList.add(
            "hidden"
        );


        downloadBtn.disabled =
            false;


        downloadBtn.textContent =
            "↓ Download Compressed Image";


        setStatus("");
    }
);
