import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

import JSZip from
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";


pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";


const fileInput =
  document.getElementById("fileInput");

const uploadCard =
  document.getElementById("uploadCard");

const dropZone =
  document.getElementById("dropZone");

const workspace =
  document.getElementById("workspace");

const fileName =
  document.getElementById("fileName");

const pageCount =
  document.getElementById("pageCount");

const changePdfBtn =
  document.getElementById("changePdfBtn");

const pageGrid =
  document.getElementById("pageGrid");

const selectedInfo =
  document.getElementById("selectedInfo");

const selectAllBtn =
  document.getElementById("selectAllBtn");

const clearBtn =
  document.getElementById("clearBtn");

const quality =
  document.getElementById("quality");

const scale =
  document.getElementById("scale");

const convertBtn =
  document.getElementById("convertBtn");

const status =
  document.getElementById("status");

const results =
  document.getElementById("results");

const resultCount =
  document.getElementById("resultCount");

const resultList =
  document.getElementById("resultList");

const downloadAllBtn =
  document.getElementById("downloadAllBtn");

const anotherBtn =
  document.getElementById("anotherBtn");


let currentFile = null;
let sourcePdfBytes = null;
let pdfDocument = null;

let selectedPages = new Set();

let renderedPages = [];

let generatedImages = [];

let isBusy = false;


/* -----------------------------
   File helpers
----------------------------- */

function isPdf(file) {

  if (!file) {
    return false;
  }

  const name =
    file.name.toLowerCase();

  return (
    file.type === "application/pdf" ||
    name.endsWith(".pdf")
  );
}


function formatBytes(bytes) {

  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  const value =
    bytes /
    Math.pow(1024, index);

  return (
    `${value.toFixed(
      index === 0 ? 0 : 1
    )} ${units[index]}`
  );
}


function setStatus(message) {

  status.textContent =
    message || "";
}


/* -----------------------------
   Upload
----------------------------- */

fileInput.addEventListener(
  "change",
  async () => {

    const file =
      fileInput.files?.[0];

    if (!file) {
      return;
    }

    await loadPdf(file);

    fileInput.value = "";
  }
);


dropZone.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

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
  async event => {

    event.preventDefault();

    dropZone.classList.remove(
      "dragging"
    );

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    if (!isPdf(file)) {

      setStatus(
        "Please choose a PDF file."
      );

      return;
    }

    await loadPdf(file);
  }
);


/* -----------------------------
   Load PDF
----------------------------- */

async function loadPdf(file) {

  if (isBusy) {
    return;
  }

  try {

    isBusy = true;

    setStatus(
      "Loading PDF..."
    );

    currentFile = file;

    const originalBuffer =
      await file.arrayBuffer();

    /*
      Keep a separate copy.
      PDF.js can detach/use its ArrayBuffer.
    */

    sourcePdfBytes =
      new Uint8Array(
        originalBuffer.slice(0)
      );

    const pdfJsBytes =
      new Uint8Array(
        originalBuffer.slice(0)
      );

    pdfDocument =
      await pdfjsLib
        .getDocument({
          data: pdfJsBytes
        })
        .promise;

    selectedPages =
      new Set();

    renderedPages = [];

    generatedImages = [];

    fileName.textContent =
      file.name;

    pageCount.textContent =
      `${pdfDocument.numPages} ${
        pdfDocument.numPages === 1
          ? "page"
          : "pages"
      } • ${formatBytes(file.size)}`;

    uploadCard.classList.add(
      "hidden"
    );

    workspace.classList.remove(
      "hidden"
    );

    results.classList.add(
      "hidden"
    );

    anotherBtn.classList.add(
      "hidden"
    );

    renderPageGrid();

    updateSelectionInfo();

    setStatus("");

  } catch (error) {

    console.error(
      "PDF load error:",
      error
    );

    resetTool();

    setStatus(
      "Could not open this PDF. Please try another PDF."
    );

  } finally {

    isBusy = false;
  }
}


/* -----------------------------
   Render page grid
----------------------------- */

async function renderPageGrid() {

  pageGrid.innerHTML = "";

  const total =
    pdfDocument.numPages;

  for (
    let pageNumber = 1;
    pageNumber <= total;
    pageNumber++
  ) {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "page-card";

    card.dataset.page =
      pageNumber;

    card.innerHTML = `
      <div class="page-loading">
        <div class="spinner"></div>
        <div>Loading...</div>
      </div>
    `;

    pageGrid.appendChild(card);

    renderThumbnail(
      pageNumber,
      card
    );
  }
}


async function renderThumbnail(
  pageNumber,
  card
) {

  try {

    const page =
      await pdfDocument.getPage(
        pageNumber
      );

    const baseViewport =
      page.getViewport({
        scale: 1
      });

    const targetWidth = 260;

    const thumbnailScale =
      targetWidth /
      baseViewport.width;

    const viewport =
      page.getViewport({
        scale: thumbnailScale
      });

    const canvas =
      document.createElement(
        "canvas"
      );

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false
        }
      );

    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    card.innerHTML = "";

    card.appendChild(canvas);

    const number =
      document.createElement(
        "div"
      );

    number.className =
      "page-number";

    number.textContent =
      `Page ${pageNumber}`;

    card.appendChild(number);

    const check =
      document.createElement(
        "div"
      );

    check.className =
      "check-mark";

    check.textContent =
      "✓";

    card.appendChild(check);

    card.addEventListener(
      "click",
      () => {

        togglePage(
          pageNumber,
          card
        );
      }
    );

    renderedPages.push({
      pageNumber,
      card
    });

  } catch (error) {

    console.error(
      `Thumbnail error for page ${pageNumber}:`,
      error
    );

    card.innerHTML = `
      <div class="page-loading">
        Could not preview
      </div>
    `;
  }
}


/* -----------------------------
   Page selection
----------------------------- */

function togglePage(
  pageNumber,
  card
) {

  if (
    selectedPages.has(
      pageNumber
    )
  ) {

    selectedPages.delete(
      pageNumber
    );

    card.classList.remove(
      "selected"
    );

  } else {

    selectedPages.add(
      pageNumber
    );

    card.classList.add(
      "selected"
    );
  }

  updateSelectionInfo();
}


function updateSelectionInfo() {

  const count =
    selectedPages.size;

  selectedInfo.textContent =
    `${count} selected`;
}


selectAllBtn.addEventListener(
  "click",
  () => {

    if (!pdfDocument) {
      return;
    }

    selectedPages =
      new Set(
        Array.from(
          {
            length:
              pdfDocument.numPages
          },
          (_, index) =>
            index + 1
        )
      );

    document
      .querySelectorAll(
        ".page-card"
      )
      .forEach(card => {

        card.classList.add(
          "selected"
        );
      });

    updateSelectionInfo();
  }
);


clearBtn.addEventListener(
  "click",
  () => {

    selectedPages.clear();

    document
      .querySelectorAll(
        ".page-card"
      )
      .forEach(card => {

        card.classList.remove(
          "selected"
        );
      });

    updateSelectionInfo();
  }
);


/* -----------------------------
   Change PDF
----------------------------- */

changePdfBtn.addEventListener(
  "click",
  () => {

    if (isBusy) {
      return;
    }

    fileInput.click();
  }
);


/* -----------------------------
   Convert
----------------------------- */

convertBtn.addEventListener(
  "click",
  async () => {

    if (isBusy) {
      return;
    }

    if (!pdfDocument) {
      return;
    }

    if (
      selectedPages.size === 0
    ) {

      setStatus(
        "Please select at least one page."
      );

      return;
    }

    await convertSelectedPages();
  }
);


async function convertSelectedPages() {

  try {

    isBusy = true;

    convertBtn.disabled = true;

    downloadAllBtn.disabled =
      true;

    results.classList.add(
      "hidden"
    );

    resultList.innerHTML = "";

    generatedImages = [];

    const selected =
      Array.from(
        selectedPages
      ).sort(
        (a, b) => a - b
      );

    const jpgQuality =
      Number(
        quality.value
      );

    const renderScale =
      Number(
        scale.value
      );

    for (
      let index = 0;
      index < selected.length;
      index++
    ) {

      const pageNumber =
        selected[index];

      setStatus(
        `Converting page ${
          index + 1
        } of ${
          selected.length
        }...`
      );

      const page =
        await pdfDocument.getPage(
          pageNumber
        );

      const viewport =
        page.getViewport({
          scale: renderScale
        });

      const canvas =
        document.createElement(
          "canvas"
        );

      const context =
        canvas.getContext(
          "2d",
          {
            alpha: false
          }
        );

      canvas.width =
        Math.ceil(
          viewport.width
        );

      canvas.height =
        Math.ceil(
          viewport.height
        );

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      const blob =
        await new Promise(
          resolve => {

            canvas.toBlob(
              resolve,
              "image/jpeg",
              jpgQuality
            );
          }
        );

      if (!blob) {
        throw new Error(
          "Could not create JPG."
        );
      }

      const url =
        URL.createObjectURL(
          blob
        );

      generatedImages.push({
        pageNumber,
        blob,
        url,
        fileName:
          createFileName(
            currentFile.name,
            pageNumber
          )
      });
    }

    renderResults();

    results.classList.remove(
      "hidden"
    );

    anotherBtn.classList.remove(
      "hidden"
    );

    setStatus(
      `${generatedImages.length} ${
        generatedImages.length === 1
          ? "page"
          : "pages"
      } converted successfully ✨`
    );

    results.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    console.error(
      "JPG conversion error:",
      error
    );

    setStatus(
      "Could not convert the PDF to JPG. Please try again."
    );

  } finally {

    isBusy = false;

    convertBtn.disabled =
      false;

    downloadAllBtn.disabled =
      generatedImages.length === 0;
  }
}


/* -----------------------------
   File naming
----------------------------- */

function createFileName(
  pdfName,
  pageNumber
) {

  const base =
    pdfName
      .replace(
        /\.pdf$/i,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      ) ||
    "document";

  return (
    `${base}-page-${pageNumber}.jpg`
  );
}


/* -----------------------------
   Results
----------------------------- */

function renderResults() {

  resultList.innerHTML = "";

  resultCount.textContent =
    `${generatedImages.length} ${
      generatedImages.length === 1
        ? "image"
        : "images"
    } ready`;

  generatedImages.forEach(
    image => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "result-item";

      const thumb =
        document.createElement(
          "img"
        );

      thumb.className =
        "result-thumb";

      thumb.src =
        image.url;

      thumb.alt =
        `Page ${image.pageNumber}`;

      const info =
        document.createElement(
          "div"
        );

      info.className =
        "result-info";

      const name =
        document.createElement(
          "strong"
        );

      name.textContent =
        image.fileName;

      const size =
        document.createElement(
          "span"
        );

      size.textContent =
        formatBytes(
          image.blob.size
        );

      info.appendChild(
        name
      );

      info.appendChild(
        size
      );


      const download =
        document.createElement(
          "button"
        );

      download.type =
        "button";

      download.className =
        "result-download";

      download.textContent =
        "Download";

      download.addEventListener(
        "click",
        () => {

          downloadBlob(
            image.blob,
            image.fileName
          );
        }
      );


      item.appendChild(
        thumb
      );

      item.appendChild(
        info
      );

      item.appendChild(
        download
      );

      resultList.appendChild(
        item
      );
    }
  );
}


/* -----------------------------
   Download single
----------------------------- */

function downloadBlob(
  blob,
  fileName
) {

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    fileName;

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
    1000
  );
}


/* -----------------------------
   Download all as ZIP
----------------------------- */

downloadAllBtn.addEventListener(
  "click",
  async () => {

    if (
      isBusy ||
      generatedImages.length === 0
    ) {
      return;
    }

    try {

      isBusy = true;

      downloadAllBtn.disabled =
        true;

      setStatus(
        "Creating ZIP file..."
      );

      const zip =
        new JSZip();

      generatedImages.forEach(
        image => {

          zip.file(
            image.fileName,
            image.blob
          );
        }
      );

      const zipBlob =
        await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: {
            level: 6
          }
        });

      const base =
        currentFile.name
          .replace(
            /\.pdf$/i,
            ""
          )
          .replace(
            /[^a-zA-Z0-9_-]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          ) ||
        "document";

      downloadBlob(
        zipBlob,
        `${base}-jpgs.zip`
      );

      setStatus(
        "All JPGs downloaded as ZIP ✨"
      );

    } catch (error) {

      console.error(
        "ZIP error:",
        error
      );

      setStatus(
        "Could not create the ZIP file."
      );

    } finally {

      isBusy = false;

      downloadAllBtn.disabled =
        generatedImages.length === 0;
    }
  }
);


/* -----------------------------
   Convert another
----------------------------- */

anotherBtn.addEventListener(
  "click",
  () => {

    resetTool();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
);


/* -----------------------------
   Reset
----------------------------- */

function resetTool() {

  generatedImages.forEach(
    image => {

      if (image.url) {
        URL.revokeObjectURL(
          image.url
        );
      }
    }
  );

  currentFile = null;

  sourcePdfBytes = null;

  pdfDocument = null;

  selectedPages.clear();

  renderedPages = [];

  generatedImages = [];

  pageGrid.innerHTML = "";

  resultList.innerHTML = "";

  fileName.textContent =
    "Your PDF";

  pageCount.textContent =
    "0 pages";

  selectedInfo.textContent =
    "0 selected";

  setStatus("");

  results.classList.add(
    "hidden"
  );

  anotherBtn.classList.add(
    "hidden"
  );

  workspace.classList.add(
    "hidden"
  );

  uploadCard.classList.remove(
    "hidden"
  );

  convertBtn.disabled =
    false;

  downloadAllBtn.disabled =
    true;
}
