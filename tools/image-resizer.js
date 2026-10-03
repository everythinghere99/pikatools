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


// =========================
// HELPERS
// =========================

function formatKB(bytes) {
    return (bytes / 1024).toFixed(1) + " KB";
}

function setStatus(message) {
    statusText.textContent = message;
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


    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }


    previewURL =
        URL.createObjectURL(file);


    previewImage.src =
        previewURL;


    const img =
        new Image();


    img.onload = () => {

        imageElement = img;


        originalDimensions.textContent =
            img.naturalWidth +
            " × " +
            img.naturalHeight +
            " px";


        widthInput.value =
            img.naturalWidth;


        heightInput.value =
            img.naturalHeight;
    };


    img.src = previewURL;


    dropZone.classList.add(
        "hidden"
    );


    workspace.classList.remove(
        "hidden"
    );


    result.classList.add(
        "hidden"
    );


    setStatus("");
}


// =========================
// CHOOSE
// =========================

chooseBtn.addEventListener(
    "click",
    () => fileInput.click()
);


fileInput.addEventListener(
    "change",
    () => {
        selectFile(
            fileInput.files[0]
        );
    }
);


// =========================
// DRAG & DROP
// =========================

dropZone.addEventListener(
    "dragover",
    e => {

        e.preventDefault();

        dropZone.classList.add(
            "dragging"
        );
    }
);


dropZone.addEventListener(
    "dragleave",
    () => {

        dropZone.classList.remove(
            "dragging"
        );
    }
);


dropZone.addEventListener(
    "drop",
    e => {

        e.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );

        selectFile(
            e.dataTransfer.files[0]
        );
    }
);


// =========================
// KEEP ASPECT RATIO
// =========================

widthInput.addEventListener(
    "input",
    () => {

        if (
            !lockRatio.checked ||
            !imageElement
        ) {
            return;
        }


        const width =
            Number(widthInput.value);


        const ratio =
            imageElement.naturalHeight /
            imageElement.naturalWidth;


        heightInput.value =
            Math.round(width * ratio);
    }
);


heightInput.addEventListener(
    "input",
    () => {

        if (
            !lockRatio.checked ||
            !imageElement
        ) {
            return;
        }


        const height =
            Number(heightInput.value);


        const ratio =
            imageElement.naturalWidth /
            imageElement.naturalHeight;


        widthInput.value =
            Math.round(height * ratio);
    }
);


// =========================
// QUICK SIZES
// =========================

document.querySelectorAll(
    ".quick-sizes button"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            widthInput.value =
                button.dataset.width;

            heightInput.value =
                button.dataset.height;

            lockRatio.checked = false;
        }
    );

});


// =========================
// QUALITY
// =========================

quality.addEventListener(
    "input",
    () => {

        qualityValue.textContent =
            quality.value + "%";
    }
);


// =========================
// RESIZE
// =========================

resizeBtn.addEventListener(
    "click",
    async () => {

        if (
            !selectedFile ||
            !imageElement
        ) {
            return;
        }


        const newWidth =
            Number(widthInput.value);


        const newHeight =
            Number(heightInput.value);


        if (
            !newWidth ||
            !newHeight ||
            newWidth < 1 ||
            newHeight < 1
        ) {

            setStatus(
                "Please enter valid dimensions."
            );

            return;
        }


        if (
            newWidth > 10000 ||
            newHeight > 10000
        ) {

            setStatus(
                "Maximum dimension is 10,000 px."
            );

            return;
        }


        resizeBtn.disabled = true;

        resizeBtn.textContent =
            "Resizing...";


        result.classList.add(
            "hidden"
        );


        setStatus(
            "✦ Please wait, resizing your image..."
        );


        try {

            /*
             * Small delay allows the
             * status message to appear
             * before heavy canvas work.
             */
            await new Promise(
                resolve =>
                    setTimeout(resolve, 80)
            );


            const canvas =
                document.createElement(
                    "canvas"
                );


            canvas.width =
                newWidth;


            canvas.height =
                newHeight;


            const ctx =
                canvas.getContext(
                    "2d"
                );


            /*
             * Better image smoothing
             */
            ctx.imageSmoothingEnabled =
                true;

            ctx.imageSmoothingQuality =
                "high";


            /*
             * Draw resized image
             */
            ctx.drawImage(
                imageElement,
                0,
                0,
                newWidth,
                newHeight
            );


            const mime =
                format.value;


            const qualityValueNumber =
                Number(quality.value) / 100;


            resizedBlob =
                await new Promise(
                    resolve => {

                        canvas.toBlob(
                            blob => resolve(blob),
                            mime,
                            qualityValueNumber
                        );

                    }
                );


            if (!resizedBlob) {

                throw new Error(
                    "Could not create resized image."
                );
            }


            /*
             * Results
             */

            resultOriginal.textContent =
                imageElement.naturalWidth +
                " × " +
                imageElement.naturalHeight +
                " px";


            resultNewSize.textContent =
                newWidth +
                " × " +
                newHeight +
                " px";


            resultFileSize.textContent =
                formatKB(
                    resizedBlob.size
                );


            result.classList.remove(
                "hidden"
            );


            setStatus(
                "✓ Image resized successfully!"
            );


        } catch (error) {

            console.error(error);


            setStatus(
                error.message ||
                "Something went wrong."
            );

        } finally {

            resizeBtn.disabled = false;

            resizeBtn.textContent =
                "Resize Image";
        }

    }
);


// =========================
// DOWNLOAD
// =========================

downloadBtn.addEventListener(
    "click",
    () => {

        if (!resizedBlob) {

            setStatus(
                "Please resize the image first."
            );

            return;
        }


        downloadBtn.disabled = true;

        downloadBtn.textContent =
            "Downloading...";


        setStatus(
            "↓ Downloading your resized image..."
        );


        const extension =
            format.value === "image/webp"
                ? "webp"
                : format.value === "image/png"
                    ? "png"
                    : "jpg";


        const baseName =
            selectedFile.name
                .replace(
                    /\.[^/.]+$/,
                    ""
                );


        const filename =
            baseName +
            "-" +
            widthInput.value +
            "x" +
            heightInput.value +
            "." +
            extension;


        const downloadURL =
            URL.createObjectURL(
                resizedBlob
            );


        const link =
            document.createElement(
                "a"
            );


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


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    downloadURL
                );

                downloadBtn.disabled =
                    false;

                downloadBtn.textContent =
                    "↓ Download Resized Image";


                setStatus(
                    "✓ Downloaded successfully!"
                );

            },
            800
        );

    }
);


// =========================
// RESET
// =========================

resetBtn.addEventListener(
    "click",
    () => {

        selectedFile = null;
        imageElement = null;
        resizedBlob = null;


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
            "↓ Download Resized Image";


        setStatus("");
    }
);

/* 🔒 SMART ASPECT RATIO LOCK */
(function () {
    const widthInput = document.querySelector('input[type="number"]:first-of-type');
    const heightInput = document.querySelector('input[type="number"]:nth-of-type(2)');
    const ratioCheck = document.querySelector('input[type="checkbox"]');

    if (!widthInput || !heightInput || !ratioCheck) return;

    function getRatio() {
        const img = document.querySelector('.preview-box img');

        if (img && img.naturalWidth && img.naturalHeight) {
            return img.naturalWidth / img.naturalHeight;
        }

        const w = parseFloat(widthInput.value);
        const h = parseFloat(heightInput.value);

        return w > 0 && h > 0 ? w / h : 1;
    }

    let updating = false;

    /* Width change */
    widthInput.addEventListener('input', function () {
        if (!ratioCheck.checked || updating) return;

        const width = parseInt(this.value);
        if (!width || width <= 0) return;

        const ratio = getRatio();

        updating = true;
        heightInput.value = Math.round(width / ratio);
        updating = false;
    });

    /* Height change */
    heightInput.addEventListener('input', function () {
        if (!ratioCheck.checked || updating) return;

        const height = parseInt(this.value);
        if (!height || height <= 0) return;

        const ratio = getRatio();

        updating = true;
        widthInput.value = Math.round(height * ratio);
        updating = false;
    });

    /*
       Resize button click se JUST PEHLE
       dimensions ko correct kar do,
       taaki image kabhi distort na ho.
    */
    const resizeButton = document.querySelector('.primary-btn');

    if (resizeButton) {
        resizeButton.addEventListener('click', function () {

            if (!ratioCheck.checked) return;

            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);

            if (!width || !height) return;

            const ratio = getRatio();

            /*
               Width ko source of truth rakho.
               Height automatically correct hoga.
            */
            heightInput.value = Math.round(width / ratio);
        }, true);
    }

})();
