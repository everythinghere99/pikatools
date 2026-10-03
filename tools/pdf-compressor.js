var API_URL = "https://pikatools-pdf-backend.pikaboy.blitz.cloud/api/pdf/compress";

var input = document.querySelector("#fileInput");
var drop = document.querySelector("#dropZone");
var list = document.querySelector("#fileList");
var fileSection = document.querySelector("#fileSection");
var compressBtn = document.querySelector("#compressBtn");
var results = document.querySelector("#results");
var allBtn = document.querySelector("#downloadAllBtn");
var resetBtn = document.querySelector("#resetBtn");
var clearBtn = document.querySelector("#clearBtn");
var engineStatus = document.querySelector("#engineStatus");

var files = [];
var outputs = [];
var busy = false;
var cancelled = false;
var activeController = null;
var progressTimers = [];


/* =========================
   HELPERS
========================= */

function size(n) {
    if (n < 1024) {
        return n + " B";
    }

    if (n < 1048576) {
        return (n / 1024).toFixed(1) + " KB";
    }

    return (n / 1048576).toFixed(2) + " MB";
}


/* =========================
   PROGRESS
========================= */

function stopProgressAnimations() {
    var i;

    for (i = 0; i < progressTimers.length; i++) {
        clearInterval(progressTimers[i]);
    }

    progressTimers = [];
}


function updateProgress(index, percent) {
    var item = document.querySelector("#file-" + index);

    if (!item) {
        return;
    }

    var circle = item.querySelector(".progress-circle");
    var text = item.querySelector(".progress-circle span");

    if (!circle || !text) {
        return;
    }

    if (percent < 0) {
        percent = 0;
    }

    if (percent > 100) {
        percent = 100;
    }

    circle.style.setProperty(
        "--progress",
        percent + "%"
    );

    text.textContent = Math.round(percent) + "%";
}


function addProgressCircle(index) {
    var item = document.querySelector("#file-" + index);

    if (!item) {
        return;
    }

    if (item.querySelector(".progress-wrap")) {
        return;
    }

    var wrap = document.createElement("div");
    wrap.className = "progress-wrap";

    var circle = document.createElement("div");
    circle.className = "progress-circle";
    circle.style.setProperty("--progress", "3%");

    var text = document.createElement("span");
    text.textContent = "3%";

    circle.appendChild(text);
    wrap.appendChild(circle);
    item.appendChild(wrap);
}


function startProgress(index) {
    var progress = 3;

    updateProgress(index, progress);

    var timer = setInterval(function () {

        if (cancelled || !busy) {
            clearInterval(timer);
            return;
        }

        if (progress < 35) {
            progress += 2.2;
        } else if (progress < 60) {
            progress += 1.3;
        } else if (progress < 80) {
            progress += 0.7;
        } else if (progress < 92) {
            progress += 0.3;
        } else if (progress < 97) {
            progress += 0.08;
        }

        if (progress > 97) {
            progress = 97;
        }

        updateProgress(index, progress);

    }, 350);

    progressTimers.push(timer);

    return function () {
        clearInterval(timer);

        var newTimers = [];

        for (var i = 0; i < progressTimers.length; i++) {
            if (progressTimers[i] !== timer) {
                newTimers.push(progressTimers[i]);
            }
        }

        progressTimers = newTimers;
    };
}


function completeProgress(index) {
    updateProgress(index, 100);

    var item = document.querySelector("#file-" + index);

    if (!item) {
        return;
    }

    var circle = item.querySelector(".progress-circle");

    if (circle) {
        circle.classList.add("complete");
    }
}


/* =========================
   FILE LIST
========================= */

function render() {
    list.innerHTML = "";

    for (var i = 0; i < files.length; i++) {

        var f = files[i];

        var item = document.createElement("div");
        item.className = "file-item";
        item.id = "file-" + i;

        var icon = document.createElement("div");
        icon.className = "file-icon";
        icon.textContent = "PDF";

        var info = document.createElement("div");
        info.className = "file-info";

        var name = document.createElement("div");
        name.className = "file-name";
        name.textContent = f.name;

        var meta = document.createElement("div");
        meta.className = "file-meta";
        meta.textContent = size(f.size);

        info.appendChild(name);
        info.appendChild(meta);

        var status = document.createElement("div");
        status.className = "file-status";
        status.id = "status-" + i;
        status.textContent = "Ready";

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(status);

        list.appendChild(item);
    }

    var show = files.length > 0;

    fileSection.classList.toggle(
        "hidden",
        !show
    );

    compressBtn.classList.toggle(
        "hidden",
        !show
    );
}


/* =========================
   ADD FILES
========================= */

function addFiles(newFiles) {
    var pdfs = [];

    for (var i = 0; i < newFiles.length; i++) {

        var f = newFiles[i];

        if (
            f.type === "application/pdf" ||
            f.name.toLowerCase().endsWith(".pdf")
        ) {
            pdfs.push(f);
        }
    }

    if (!pdfs.length) {
        return;
    }

    files = files.concat(pdfs);

    render();
}


input.onchange = function (e) {
    addFiles(Array.from(e.target.files));
    input.value = "";
};


/* =========================
   DRAG & DROP
========================= */

drop.addEventListener("dragenter", function (e) {
    e.preventDefault();
    drop.style.borderColor = "#a98c76";
});


drop.addEventListener("dragover", function (e) {
    e.preventDefault();
    drop.style.borderColor = "#a98c76";
});


drop.addEventListener("dragleave", function (e) {
    e.preventDefault();
    drop.style.borderColor = "";
});


drop.addEventListener("drop", function (e) {
    e.preventDefault();
    drop.style.borderColor = "";

    addFiles(Array.from(e.dataTransfer.files));
});


/* =========================
   CLEAR
========================= */

clearBtn.onclick = function () {

    cancelled = true;
    busy = false;

    stopProgressAnimations();

    if (activeController) {
        activeController.abort();
        activeController = null;
    }

    compressBtn.disabled = false;

    files = [];
    outputs = [];

    render();

    results.classList.add("hidden");
    allBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");

    engineStatus.textContent = "";
};


/* =========================
   COMPRESS ONE
========================= */

async function compressOne(file, signal) {

    var formData = new FormData();

    formData.append(
        "file",
        file,
        file.name
    );

    var response = await fetch(
        API_URL,
        {
            method: "POST",
            body: formData,
            signal: signal
        }
    );

    if (!response.ok) {

        var message = "PDF compression failed.";

        try {

            var data = await response.json();

            if (data && data.error) {
                message = data.error;
            }

        } catch (e) {
        }

        throw new Error(message);
    }

    var blob = await response.blob();

    if (!blob.size) {
        throw new Error(
            "Empty PDF received from server."
        );
    }

    return blob;
}


/* =========================
   COMPRESS ALL
========================= */

async function compress() {

    if (!files.length || busy) {
        return;
    }

    cancelled = false;
    busy = true;

    compressBtn.disabled = true;

    outputs = [];

    stopProgressAnimations();

    results.classList.remove("hidden");

    allBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");

    results.innerHTML = "";

    var title = document.createElement("h3");
    title.className = "result-title";
    title.textContent = "Compressed PDFs";

    results.appendChild(title);


    for (var i = 0; i < files.length; i++) {

        if (cancelled || !busy) {
            break;
        }

        var file = files[i];

        var status =
            document.querySelector("#status-" + i);

        if (status) {

            status.className = "file-status";

            status.textContent =
                "Compressing " +
                (i + 1) +
                " of " +
                files.length +
                "...";
        }

        addProgressCircle(i);

        engineStatus.textContent =
            "Compressing " +
            (i + 1) +
            " of " +
            files.length +
            "...";

        var stopCurrentProgress =
            startProgress(i);

        activeController =
            new AbortController();


        try {

            var output =
                await compressOne(
                    file,
                    activeController.signal
                );

            activeController = null;

            stopCurrentProgress();

            if (cancelled || !busy) {
                break;
            }

            completeProgress(i);

            var smaller =
                output.size < file.size;

            var finalBlob =
                smaller ? output : file;

            var finalName =
                file.name.replace(
                    /\.pdf$/i,
                    ""
                ) +
                (
                    smaller
                        ? "-compressed.pdf"
                        : ".pdf"
                );


            outputs.push({
                name: finalName,
                blob: finalBlob,
                original: file.size
            });


            if (status) {

                status.className =
                    "file-status done";

                status.textContent =
                    "Done";
            }


            var row =
                document.createElement("div");

            row.className =
                "result-item";


            var resultIcon =
                document.createElement("div");

            resultIcon.className =
                "file-icon";

            resultIcon.textContent =
                "PDF";


            var grow =
                document.createElement("div");

            grow.className =
                "grow";


            var resultName =
                document.createElement("div");

            resultName.className =
                "file-name";

            resultName.textContent =
                finalName;


            var resultSize =
                document.createElement("div");

            resultSize.className =
                "result-size";

            resultSize.textContent =
                size(file.size) +
                " -> " +
                size(finalBlob.size);


            grow.appendChild(resultName);
            grow.appendChild(resultSize);


            var downloadButton =
                document.createElement("button");

            downloadButton.className =
                "download-one";

            downloadButton.textContent =
                "Download";


            downloadButton.onclick =
                function (
                    blob,
                    name,
                    button
                ) {

                    return function () {

                        downloadBlob(
                            blob,
                            name,
                            button
                        );

                    };

                }(
                    finalBlob,
                    finalName,
                    downloadButton
                );


            row.appendChild(resultIcon);
            row.appendChild(grow);
            row.appendChild(downloadButton);

            results.appendChild(row);


        } catch (e) {

            activeController = null;

            stopCurrentProgress();

            if (
                cancelled ||
                !busy ||
                e.name === "AbortError"
            ) {
                break;
            }

            console.error(e);


            if (status) {

                status.className =
                    "file-status error";

                status.textContent =
                    "Failed";
            }


            var errorRow =
                document.createElement("div");

            errorRow.className =
                "result-item";


            var errorIcon =
                document.createElement("div");

            errorIcon.className =
                "file-icon";

            errorIcon.textContent =
                "ERROR";


            var errorGrow =
                document.createElement("div");

            errorGrow.className =
                "grow";


            var errorName =
                document.createElement("div");

            errorName.className =
                "file-name";

            errorName.textContent =
                file.name;


            var errorText =
                document.createElement("div");

            errorText.className =
                "result-size";

            errorText.textContent =
                e.message ||
                "Compression failed.";


            errorGrow.appendChild(errorName);
            errorGrow.appendChild(errorText);

            errorRow.appendChild(errorIcon);
            errorRow.appendChild(errorGrow);

            results.appendChild(errorRow);
        }
    }


    activeController = null;

    if (cancelled || !busy) {
        return;
    }

    busy = false;

    compressBtn.disabled = false;


    if (outputs.length) {

        engineStatus.textContent =
            "All PDFs processed successfully!";

        allBtn.classList.remove("hidden");

        resetBtn.classList.remove("hidden");

    } else {

        engineStatus.textContent =
            "No PDFs were compressed.";
    }
}


/* =========================
   DOWNLOAD
========================= */

function downloadBlob(
    blob,
    name,
    button
) {

    var url =
        URL.createObjectURL(blob);

    var a =
        document.createElement("a");

    a.href = url;
    a.download = name;

    document.body.appendChild(a);

    a.click();

    a.remove();


    setTimeout(function () {

        URL.revokeObjectURL(url);

    }, 1500);


    if (button) {

        var old =
            button.textContent;

        button.textContent =
            "Downloaded successfully!";


        setTimeout(function () {

            button.textContent = old;

        }, 1800);
    }
}


/* =========================
   DOWNLOAD ALL
========================= */

allBtn.onclick = async function () {

    if (!outputs.length) {
        return;
    }

    allBtn.disabled = true;

    allBtn.textContent =
        "Preparing ZIP...";


    try {

        var mod =
            await import(
                "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm"
            );

        var zip =
            new mod.default();


        outputs.forEach(function (o) {

            zip.file(
                o.name,
                o.blob
            );

        });


        var blob =
            await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6
                }
            });


        downloadBlob(
            blob,
            "PikaTools-Compressed-PDFs.zip"
        );


        allBtn.textContent =
            "Downloaded successfully!";


        setTimeout(function () {

            allBtn.textContent =
                "Download All PDFs (ZIP)";

            allBtn.disabled = false;

        }, 1800);


    } catch (e) {

        allBtn.disabled = false;

        allBtn.textContent =
            "Download All PDFs (ZIP)";

        alert(
            "ZIP could not be created. Download PDFs individually."
        );
    }
};


/* =========================
   RESET
========================= */

resetBtn.onclick = function () {

    cancelled = true;
    busy = false;

    stopProgressAnimations();

    if (activeController) {

        activeController.abort();

        activeController = null;
    }

    compressBtn.disabled = false;

    files = [];
    outputs = [];

    render();

    results.classList.add("hidden");
    allBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");

    engineStatus.textContent = "";
};


/* =========================
   START
========================= */

compressBtn.onclick = compress;
