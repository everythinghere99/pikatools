const pdfInput = document.getElementById("pdfInput");
const uploadBox = document.getElementById("uploadBox");

const editorCard = document.getElementById("editorCard");
const pagesGrid = document.getElementById("pagesGrid");
const pageCount = document.getElementById("pageCount");

const removeAllBtn = document.getElementById("removeAllBtn");
const organizeBtn = document.getElementById("organizeBtn");

const processingCard = document.getElementById("processingCard");
const resultCard = document.getElementById("resultCard");

const downloadBtn = document.getElementById("downloadBtn");
const anotherBtn = document.getElementById("anotherBtn");


/* =========================
   STATE
========================= */

let selectedFile = null;
let sourcePdfBytes = null;
let sourcePdfDocument = null;
let organizedPdfBlob = null;

let pages = [];

let draggedPageId = null;

let touchPageId = null;
let touchTimer = null;
let touchDragging = false;

let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;

const LONG_PRESS_TIME = 450;
const MOVE_CANCEL_DISTANCE = 10;


/* =========================
   HELPERS
========================= */

function createId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}


function show(element) {
  element.classList.remove("hidden");
}


function hide(element) {
  element.classList.add("hidden");
}


function updatePageCount() {
  const count = pages.length;

  pageCount.textContent =
    `${count} ${count === 1 ? "page" : "pages"}`;
}


/* =========================
   FILE VALIDATION
========================= */

function isPdf(file) {
  if (!file) return false;

  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}


function validateFile(file) {

  if (!isPdf(file)) {
    alert("Please choose a PDF file.");
    return false;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert("PDF size must be 25 MB or less.");
    return false;
  }

  return true;
}


/* =========================
   LOAD PDF
========================= */

async function loadPdf(file) {

  if (!validateFile(file)) {
    return;
  }

  try {

    selectedFile = file;

    const originalBuffer =
      await file.arrayBuffer();

    /*
      Keep separate byte copies because
      pdf.js and pdf-lib both work with ArrayBuffers.
    */

    sourcePdfBytes =
      new Uint8Array(originalBuffer.slice(0));

    const pdfJsBytes =
      new Uint8Array(originalBuffer.slice(0));

    sourcePdfDocument =
      await window.pdfjsLib.getDocument({
        data: pdfJsBytes
      }).promise;


    pages = [];

    for (
      let i = 1;
      i <= sourcePdfDocument.numPages;
      i++
    ) {

      pages.push({
        id: createId(),

        originalIndex: i - 1,

        pageNumber: i,

        /*
          User-added rotation.
          Original PDF rotation remains separate.
        */
        rotation: 0
      });
    }


    renderPages();

    hide(uploadBox);
    hide(processingCard);
    hide(resultCard);

    show(editorCard);

  } catch (error) {

    console.error(error);

    alert(
      "This PDF could not be opened. Please try another PDF."
    );

    resetAll();
  }
}


/* =========================
   RENDER PAGE LIST
========================= */

function renderPages() {

  pagesGrid.innerHTML = "";

  updatePageCount();

  pages.forEach((pageData) => {

    const pageElement =
      createPageElement(pageData);

    pagesGrid.appendChild(pageElement);

  });
}


/* =========================
   CREATE PAGE CARD
========================= */

function createPageElement(pageData) {

  const item =
    document.createElement("div");

  item.className = "page-item";

  item.dataset.id = pageData.id;

  item.draggable = true;


  /* =====================
     PREVIEW
  ===================== */

  const previewWrap =
    document.createElement("div");

  previewWrap.className =
    "page-preview-wrap";


  const canvas =
    document.createElement("canvas");

  canvas.className =
    "page-preview";


  previewWrap.appendChild(canvas);


  /* =====================
     PAGE INFO
  ===================== */

  const info =
    document.createElement("div");

  info.className =
    "page-info";


  const pageNumber =
    document.createElement("div");

  pageNumber.className =
    "page-number";

  pageNumber.textContent =
    `Page ${pageData.pageNumber}`;


  info.appendChild(pageNumber);


  /* =====================
     ACTION BUTTONS
  ===================== */

  const actions =
    document.createElement("div");

  actions.className =
    "page-actions";


  const rotateButton =
    document.createElement("button");

  rotateButton.type = "button";

  rotateButton.className =
    "page-action rotate-page";

  rotateButton.textContent = "🔄";

  rotateButton.setAttribute(
    "aria-label",
    `Rotate page ${pageData.pageNumber}`
  );


  const removeButton =
    document.createElement("button");

  removeButton.type = "button";

  removeButton.className =
    "page-action remove-page";

  removeButton.textContent = "×";

  removeButton.setAttribute(
    "aria-label",
    `Remove page ${pageData.pageNumber}`
  );


  actions.appendChild(rotateButton);
  actions.appendChild(removeButton);


  /* =====================
     FOOTER
  ===================== */

  const footer =
    document.createElement("div");

  footer.className =
    "page-footer";


  const rotationStatus =
    document.createElement("div");

  rotationStatus.className =
    "rotation-status";


  const dragLabel =
    document.createElement("div");

  dragLabel.className =
    "drag-label";

  dragLabel.textContent =
    "Hold and drag to reorder";


  footer.appendChild(rotationStatus);
  footer.appendChild(dragLabel);


  /* =====================
     DRAG HANDLE
  ===================== */

  const dragHandle =
    document.createElement("div");

  dragHandle.className =
    "drag-handle";

  dragHandle.textContent =
    "⋮⋮";


  /* =====================
     APPEND
  ===================== */

  item.appendChild(previewWrap);
  item.appendChild(info);
  item.appendChild(actions);
  item.appendChild(footer);
  item.appendChild(dragHandle);


  /* =====================
     ROTATION UI
  ===================== */

  updateRotationUI(
    item,
    pageData
  );


  /* =====================
     ROTATE
  ===================== */

  rotateButton.addEventListener(
    "click",
    async (event) => {

      event.preventDefault();
      event.stopPropagation();

      pageData.rotation =
        (pageData.rotation + 90) % 360;

      updateRotationUI(
        item,
        pageData
      );

      await renderPagePreview(
        pageData,
        canvas
      );
    }
  );


  /*
    Prevent rotate button from
    starting mobile long-press drag.
  */

  rotateButton.addEventListener(
    "touchstart",
    (event) => {
      event.stopPropagation();
    },
    { passive: true }
  );


  /* =====================
     REMOVE
  ===================== */

  removeButton.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      removePage(pageData.id);
    }
  );


  removeButton.addEventListener(
    "touchstart",
    (event) => {
      event.stopPropagation();
    },
    { passive: true }
  );


  /* =====================
     DESKTOP DRAG
  ===================== */

  item.addEventListener(
    "dragstart",
    (event) => {

      draggedPageId =
        pageData.id;

      item.classList.add("dragging");

      event.dataTransfer.effectAllowed =
        "move";

      event.dataTransfer.setData(
        "text/plain",
        pageData.id
      );
    }
  );


  item.addEventListener(
    "dragover",
    (event) => {

      event.preventDefault();

      if (!draggedPageId) {
        return;
      }

      const draggedElement =
        pagesGrid.querySelector(
          `[data-id="${draggedPageId}"]`
        );

      if (!draggedElement ||
          draggedElement === item) {
        return;
      }


      const rect =
        item.getBoundingClientRect();

      const middle =
        rect.top + rect.height / 2;


      if (event.clientY < middle) {

        pagesGrid.insertBefore(
          draggedElement,
          item
        );

      } else {

        pagesGrid.insertBefore(
          draggedElement,
          item.nextSibling
        );
      }
    }
  );


  item.addEventListener(
    "dragend",
    () => {

      item.classList.remove("dragging");

      draggedPageId = null;

      syncPagesFromDOM();
    }
  );


  /* =====================
     MOBILE LONG PRESS
  ===================== */

  setupTouchDrag(item, pageData);


  /* =====================
     THUMBNAIL
  ===================== */

  renderPagePreview(
    pageData,
    canvas
  );


  return item;
}


/* =========================
   ROTATION UI
========================= */

function updateRotationUI(
  item,
  pageData
) {

  const status =
    item.querySelector(
      ".rotation-status"
    );

  if (!status) {
    return;
  }

  if (pageData.rotation === 0) {

    status.textContent = "";

    status.hidden = true;

  } else {

    status.textContent =
      `Rotated ${pageData.rotation}°`;

    status.hidden = false;
  }
}


/* =========================
   RENDER THUMBNAIL
========================= */

async function renderPagePreview(
  pageData,
  canvas
) {

  if (!sourcePdfDocument) {
    return;
  }

  try {

    const pdfPage =
      await sourcePdfDocument.getPage(
        pageData.pageNumber
      );


    /*
      Preserve the PDF's own rotation
      and add the user's rotation.
    */

    const originalRotation =
      Number(pdfPage.rotate || 0);

    const totalRotation =
      (
        originalRotation +
        pageData.rotation
      ) % 360;


    const baseViewport =
      pdfPage.getViewport({
        scale: 1,
        rotation: totalRotation
      });


    const targetWidth = 150;

    const scale =
      targetWidth /
      baseViewport.width;


    const viewport =
      pdfPage.getViewport({
        scale,
        rotation: totalRotation
      });


    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);


    canvas.style.width =
      `${Math.ceil(viewport.width)}px`;

    canvas.style.height =
      `${Math.ceil(viewport.height)}px`;


    const context =
      canvas.getContext("2d");


    await pdfPage.render({
      canvasContext: context,
      viewport
    }).promise;


  } catch (error) {

    console.error(
      "Preview render error:",
      error
    );
  }
}


/* =========================
   MOBILE TOUCH DRAG
========================= */

function setupTouchDrag(
  item,
  pageData
) {

  item.addEventListener(
    "touchstart",
    (event) => {

      /*
        Buttons should never start
        the long-press drag.
      */

      if (
        event.target.closest(
          ".page-action"
        )
      ) {
        return;
      }


      if (event.touches.length !== 1) {
        return;
      }


      const touch =
        event.touches[0];


      touchPageId =
        pageData.id;

      touchDragging = false;


      touchStartX =
        touch.clientX;

      touchStartY =
        touch.clientY;

      touchCurrentX =
        touch.clientX;

      touchCurrentY =
        touch.clientY;


      clearTimeout(touchTimer);


      touchTimer =
        setTimeout(() => {

          touchDragging = true;

          item.classList.add(
            "dragging"
          );

          item.classList.add(
            "long-pressed"
          );


          if (
            navigator.vibrate
          ) {
            navigator.vibrate(35);
          }

        }, LONG_PRESS_TIME);

    },
    {
      passive: true
    }
  );


  item.addEventListener(
    "touchmove",
    (event) => {

      if (
        !touchPageId ||
        event.touches.length !== 1
      ) {
        return;
      }


      const touch =
        event.touches[0];


      touchCurrentX =
        touch.clientX;

      touchCurrentY =
        touch.clientY;


      const deltaX =
        touchCurrentX -
        touchStartX;

      const deltaY =
        touchCurrentY -
        touchStartY;


      const distance =
        Math.sqrt(
          deltaX * deltaX +
          deltaY * deltaY
        );


      /*
        Before long press:
        allow normal page-list scrolling.
      */

      if (!touchDragging) {

        if (
          distance >
          MOVE_CANCEL_DISTANCE
        ) {

          clearTimeout(touchTimer);

          touchPageId = null;
        }

        return;
      }


      /*
        After long press:
        page is being dragged.
      */

      event.preventDefault();


      moveTouchPage(
        touchCurrentY
      );

    },
    {
      passive: false
    }
  );


  item.addEventListener(
    "touchend",
    () => {

      clearTimeout(touchTimer);


      if (touchDragging) {

        item.classList.remove(
          "dragging"
        );

        item.classList.remove(
          "long-pressed"
        );


        syncPagesFromDOM();
      }


      touchDragging = false;
      touchPageId = null;

    },
    {
      passive: true
    }
  );


  item.addEventListener(
    "touchcancel",
    () => {

      clearTimeout(touchTimer);


      item.classList.remove(
        "dragging"
      );

      item.classList.remove(
        "long-pressed"
      );


      touchDragging = false;
      touchPageId = null;

    },
    {
      passive: true
    }
  );
}


/* =========================
   MOVE TOUCH PAGE
========================= */

function moveTouchPage(
  clientY
) {

  if (!touchPageId) {
    return;
  }


  const draggedElement =
    pagesGrid.querySelector(
      `[data-id="${touchPageId}"]`
    );


  if (!draggedElement) {
    return;
  }


  const items =
    Array.from(
      pagesGrid.children
    ).filter(
      (element) =>
        element !== draggedElement
    );


  let inserted = false;


  for (const item of items) {

    const rect =
      item.getBoundingClientRect();


    const middle =
      rect.top +
      rect.height / 2;


    if (clientY < middle) {

      pagesGrid.insertBefore(
        draggedElement,
        item
      );

      inserted = true;

      break;
    }
  }


  if (!inserted) {

    pagesGrid.appendChild(
      draggedElement
    );
  }
}


/* =========================
   SYNC ARRAY FROM DOM
========================= */

function syncPagesFromDOM() {

  const orderedIds =
    Array.from(
      pagesGrid.children
    ).map(
      (element) =>
        element.dataset.id
    );


  pages =
    orderedIds
      .map(
        (id) =>
          pages.find(
            (page) =>
              page.id === id
          )
      )
      .filter(Boolean);


  updatePageCount();
}


/* =========================
   REMOVE PAGE
========================= */

function removePage(
  pageId
) {

  pages =
    pages.filter(
      (page) =>
        page.id !== pageId
    );


  renderPages();


  if (pages.length === 0) {

    show(uploadBox);
    hide(editorCard);
  }
}


/* =========================
   REMOVE ALL
========================= */

removeAllBtn.addEventListener(
  "click",
  () => {

    if (pages.length === 0) {
      return;
    }


    const confirmed =
      confirm(
        "Remove all pages?"
      );


    if (!confirmed) {
      return;
    }


    pages = [];

    pagesGrid.innerHTML = "";

    updatePageCount();


    hide(editorCard);
    show(uploadBox);
  }
);


/* =========================
   UPLOAD INPUT
========================= */

pdfInput.addEventListener(
  "change",
  () => {

    const file =
      pdfInput.files?.[0];

    if (file) {
      loadPdf(file);
    }
  }
);


/* =========================
   DROP ZONE
========================= */

uploadBox.addEventListener(
  "dragover",
  (event) => {

    event.preventDefault();

    uploadBox.classList.add(
      "dragover"
    );
  }
);


uploadBox.addEventListener(
  "dragleave",
  () => {

    uploadBox.classList.remove(
      "dragover"
    );
  }
);


uploadBox.addEventListener(
  "drop",
  (event) => {

    event.preventDefault();

    uploadBox.classList.remove(
      "dragover"
    );


    const file =
      event.dataTransfer.files?.[0];


    if (file) {
      loadPdf(file);
    }
  }
);


/* =========================
   ORGANIZE PDF
========================= */

organizeBtn.addEventListener(
  "click",
  async () => {

    if (
      !sourcePdfBytes ||
      pages.length === 0
    ) {
      return;
    }


    try {

      hide(editorCard);
      hide(resultCard);

      show(processingCard);


      /*
        Fresh PDFDocument instance.
      */

      const sourcePdf =
        await window.PDFDocument.load(
          sourcePdfBytes
        );


      const outputPdf =
        await window.PDFDocument.create();


      /*
        Copy pages in current DOM order.
      */

      for (
        const pageData of pages
      ) {

        const [
          copiedPage
        ] =
          await outputPdf.copyPages(
            sourcePdf,
            [pageData.originalIndex]
          );


        /*
          Preserve existing rotation
          and add user's rotation.
        */

        const existingRotation =
          copiedPage
            .getRotation()
            .angle || 0;


        const finalRotation =
          (
            existingRotation +
            pageData.rotation
          ) % 360;


        copiedPage.setRotation(
          window.pdfDegrees(
            finalRotation
          )
        );


        outputPdf.addPage(
          copiedPage
        );
      }


      const outputBytes =
        await outputPdf.save();


      organizedPdfBlob =
        new Blob(
          [outputBytes],
          {
            type: "application/pdf"
          }
        );


      hide(processingCard);

      show(resultCard);


    } catch (error) {

      console.error(error);

      hide(processingCard);
      show(editorCard);

      alert(
        "Something went wrong while creating the PDF."
      );
    }
  }
);


/* =========================
   DOWNLOAD
========================= */

downloadBtn.addEventListener(
  "click",
  () => {

    if (!organizedPdfBlob) {
      return;
    }


    const url =
      URL.createObjectURL(
        organizedPdfBlob
      );


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      "pikautools-organized.pdf";


    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    setTimeout(
      () => {
        URL.revokeObjectURL(url);
      },
      1000
    );
  }
);


/* =========================
   ORGANIZE ANOTHER
========================= */

anotherBtn.addEventListener(
  "click",
  () => {

    resetAll();

    show(uploadBox);
  }
);


/* =========================
   RESET
========================= */

function resetAll() {

  selectedFile = null;

  sourcePdfBytes = null;

  sourcePdfDocument = null;

  organizedPdfBlob = null;

  pages = [];

  draggedPageId = null;

  touchPageId = null;

  touchDragging = false;

  clearTimeout(touchTimer);

  pagesGrid.innerHTML = "";

  pdfInput.value = "";

  updatePageCount();

  hide(editorCard);
  hide(processingCard);
  hide(resultCard);

  show(uploadBox);
}
