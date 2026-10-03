import { PDFDocument } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";


const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const workspace = document.getElementById("workspace");
const pdfList = document.getElementById("pdfList");
const fileCount = document.getElementById("fileCount");

const addMoreInput = document.getElementById("addMoreInput");

const mergeBtn = document.getElementById("mergeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");

const status = document.getElementById("status");


let pdfFiles = [];
let mergedPdfBytes = null;

let draggedIndex = null;


/* --------------------------------
   HELPERS
-------------------------------- */

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${Math.max(1, Math.round(kb))} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}


function setStatus(message = "", type = "") {
  status.textContent = message;
  status.className = "status";

  if (type) {
    status.classList.add(type);
  }
}


function isPdf(file) {
  return (
    file &&
    (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    )
  );
}


function createFileId(file) {
  return [
    file.name,
    file.size,
    file.lastModified,
    Math.random().toString(36).slice(2)
  ].join("-");
}


/* --------------------------------
   ADD FILES
-------------------------------- */

function addFiles(fileList) {

  const incoming = Array.from(fileList || []);

  if (!incoming.length) {
    return;
  }

  const validFiles = incoming.filter(isPdf);

  if (!validFiles.length) {
    setStatus("Please choose PDF files only.", "error");
    return;
  }

  const newFiles = validFiles.map(file => ({
    id: createFileId(file),
    file,
    loading: true
  }));

  pdfFiles.push(...newFiles);

  showWorkspace();
  renderList();

  setStatus("");

  /*
   * Small loader is intentionally shown for each newly
   * selected PDF, similar to the Compressor file rows.
   */
  setTimeout(() => {

    newFiles.forEach(item => {
      const found = pdfFiles.find(pdf => pdf.id === item.id);

      if (found) {
        found.loading = false;
      }
    });

    renderList();

  }, 450);
}


/* --------------------------------
   WORKSPACE
-------------------------------- */

function showWorkspace() {
  dropZone.classList.add("hidden");
  workspace.classList.remove("hidden");

  mergeBtn.classList.remove("hidden");
  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  mergedPdfBytes = null;
}


function updateCount() {

  const count = pdfFiles.length;

  fileCount.textContent =
    `${count} PDF${count === 1 ? "" : "s"} selected`;
}


/* --------------------------------
   RENDER LIST
-------------------------------- */

function renderList() {

  pdfList.innerHTML = "";

  updateCount();

  pdfFiles.forEach((item, index) => {

    const row = document.createElement("div");

    row.className = "pdf-item";
    row.draggable = true;
    row.dataset.index = String(index);

    if (draggedIndex === index) {
      row.classList.add("dragging");
    }


    const icon = document.createElement("div");

    icon.className = "pdf-icon";
    icon.textContent = "PDF";


    const info = document.createElement("div");

    info.className = "pdf-info";


    const name = document.createElement("div");

    name.className = "pdf-name";
    name.textContent = item.file.name;
    name.title = item.file.name;


    const meta = document.createElement("div");

    meta.className = "pdf-meta";
    meta.textContent =
      `${formatFileSize(item.file.size)} • PDF ${index + 1}`;


    info.appendChild(name);
    info.appendChild(meta);


    row.appendChild(icon);
    row.appendChild(info);


    if (item.loading) {

      const loader = document.createElement("div");

      loader.className = "file-loader";

      row.appendChild(loader);

    }


    const removeBtn = document.createElement("button");

    removeBtn.type = "button";
    removeBtn.className = "remove-file-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "Remove PDF";
    removeBtn.setAttribute("aria-label", `Remove ${item.file.name}`);


    removeBtn.addEventListener("click", event => {

      event.stopPropagation();

      removeFile(index);

    });


    row.appendChild(removeBtn);


    /* -----------------------------
       DRAG EVENTS
    ----------------------------- */

    row.addEventListener("dragstart", event => {

      draggedIndex = index;

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "text/plain",
        String(index)
      );

      row.classList.add("dragging");

    });


    row.addEventListener("dragend", () => {

      draggedIndex = null;

      document
        .querySelectorAll(".pdf-item")
        .forEach(item => {
          item.classList.remove("dragging", "drag-over");
        });

    });


    row.addEventListener("dragover", event => {

      event.preventDefault();

      if (
        draggedIndex === null ||
        draggedIndex === index
      ) {
        return;
      }

      row.classList.add("drag-over");

      event.dataTransfer.dropEffect = "move";

    });


    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });


    row.addEventListener("drop", event => {

      event.preventDefault();

      row.classList.remove("drag-over");

      const fromIndex = draggedIndex;

      if (
        fromIndex === null ||
        fromIndex === index
      ) {
        return;
      }

      moveFile(fromIndex, index);

    });


    pdfList.appendChild(row);

  });


  mergeBtn.disabled = pdfFiles.length < 2;
}


/* --------------------------------
   REMOVE FILE
-------------------------------- */

function removeFile(index) {

  if (
    index < 0 ||
    index >= pdfFiles.length
  ) {
    return;
  }

  pdfFiles.splice(index, 1);

  mergedPdfBytes = null;

  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  if (!pdfFiles.length) {

    workspace.classList.add("hidden");
    dropZone.classList.remove("hidden");

    setStatus("");

    return;
  }

  renderList();
}


/* --------------------------------
   MOVE FILE
-------------------------------- */

function moveFile(fromIndex, toIndex) {

  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pdfFiles.length ||
    toIndex >= pdfFiles.length
  ) {
    return;
  }

  const [moved] = pdfFiles.splice(fromIndex, 1);

  pdfFiles.splice(toIndex, 0, moved);

  draggedIndex = null;

  mergedPdfBytes = null;

  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  renderList();
}


/* --------------------------------
   MERGE
-------------------------------- */

async function mergePdfs() {

  if (pdfFiles.length < 2) {

    setStatus(
      "Please select at least 2 PDFs to merge.",
      "error"
    );

    return;
  }


  if (pdfFiles.some(item => item.loading)) {

    setStatus(
      "Please wait a moment for the PDFs to finish loading.",
      "error"
    );

    return;
  }


  mergeBtn.disabled = true;

  downloadBtn.classList.add("hidden");

  setStatus("Merging your PDFs…");


  try {

    const mergedPdf = await PDFDocument.create();


    for (const item of pdfFiles) {

      const arrayBuffer =
        await item.file.arrayBuffer();

      const sourcePdf =
        await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: false
        });


      const pageIndices =
        sourcePdf.getPageIndices();


      const copiedPages =
        await mergedPdf.copyPages(
          sourcePdf,
          pageIndices
        );


      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });

    }


    mergedPdfBytes =
      await mergedPdf.save({
        useObjectStreams: true
      });


    downloadBtn.classList.remove("hidden");
    resetBtn.classList.remove("hidden");

    mergeBtn.classList.add("hidden");

    setStatus(
      "PDFs merged successfully ✨",
      "success"
    );

  } catch (error) {

    console.error("PDF merge error:", error);

    mergedPdfBytes = null;

    setStatus(
      "Could not merge the PDFs. Please check that the files are valid PDFs.",
      "error"
    );

    mergeBtn.disabled = false;
  }
}


/* --------------------------------
   DOWNLOAD
-------------------------------- */

function downloadMergedPdf() {

  if (!mergedPdfBytes) {
    return;
  }


  const blob = new Blob(
    [mergedPdfBytes],
    { type: "application/pdf" }
  );


  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "pikatools-merged.pdf";

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


/* --------------------------------
   RESET
-------------------------------- */

function resetMerger() {

  pdfFiles = [];
  mergedPdfBytes = null;
  draggedIndex = null;

  fileInput.value = "";
  addMoreInput.value = "";

  pdfList.innerHTML = "";

  workspace.classList.add("hidden");
  dropZone.classList.remove("hidden");

  mergeBtn.classList.remove("hidden");
  downloadBtn.classList.add("hidden");
  resetBtn.classList.add("hidden");

  mergeBtn.disabled = true;

  setStatus("");
}


/* --------------------------------
   INITIAL CHOOSE PDFs
-------------------------------- */

fileInput.addEventListener("change", event => {

  addFiles(event.target.files);

  fileInput.value = "";

});


/* --------------------------------
   ADD MORE PDFs
-------------------------------- */

addMoreInput.addEventListener("change", event => {

  addFiles(event.target.files);

  addMoreInput.value = "";

});


/* --------------------------------
   DRAG & DROP UPLOAD
-------------------------------- */

dropZone.addEventListener("dragover", event => {

  event.preventDefault();

  dropZone.classList.add("drag-over");

});


dropZone.addEventListener("dragleave", () => {

  dropZone.classList.remove("drag-over");

});


dropZone.addEventListener("drop", event => {

  event.preventDefault();

  dropZone.classList.remove("drag-over");

  addFiles(event.dataTransfer.files);

});


/* --------------------------------
   BUTTONS
-------------------------------- */

mergeBtn.addEventListener("click", mergePdfs);

downloadBtn.addEventListener(
  "click",
  downloadMergedPdf
);

resetBtn.addEventListener(
  "click",
  resetMerger
);
