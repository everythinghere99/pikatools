import {
  PDFDocument
} from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";


/* =========================================================
   PikaTools - JPG to PDF
   ========================================================= */


let images = [];

let generatedPdfBytes = null;

let dragState = null;

let dragMoved = false;

let dragTimer = null;

let autoScrollFrame = null;


/* =========================================================
   DOM
   ========================================================= */

const fileInput =
  document.getElementById("fileInput");

const uploadCard =
  document.getElementById("uploadCard");

const dropZone =
  document.getElementById("dropZone");

const workspace =
  document.getElementById("workspace");

const imageList =
  document.getElementById("imageList");

const imageCount =
  document.getElementById("imageCount");

const addMoreBtn =
  document.getElementById("addMoreBtn");

const convertBtn =
  document.getElementById("convertBtn");

const downloadBtn =
  document.getElementById("downloadBtn");

const anotherBtn =
  document.getElementById("anotherBtn");

const status =
  document.getElementById("status");

const pageSize =
  document.getElementById("pageSize");

const orientation =
  document.getElementById("orientation");

const margin =
  document.getElementById("margin");


/* =========================================================
   FILE INPUT
   ========================================================= */

fileInput.addEventListener(
  "change",
  async (event) => {

    const files =
      Array.from(
        event.target.files || []
      );

    await addFiles(files);

    fileInput.value = "";

  }
);


/* =========================================================
   ADD MORE
   ========================================================= */

addMoreBtn.addEventListener(
  "click",
  () => {

    fileInput.click();

  }
);


/* =========================================================
   DRAG & DROP UPLOAD
   ========================================================= */

[
  "dragenter",
  "dragover"
].forEach(
  (eventName) => {

    dropZone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.add(
          "dragging"
        );

      }
    );

  }
);


[
  "dragleave",
  "drop"
].forEach(
  (eventName) => {

    dropZone.addEventListener(
      eventName,
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.remove(
          "dragging"
        );

      }
    );

  }
);


dropZone.addEventListener(
  "drop",
  async (event) => {

    const files =
      Array.from(
        event.dataTransfer.files || []
      );

    await addFiles(files);

  }
);


/* =========================================================
   ADD FILES
   ========================================================= */

async function addFiles(files) {

  const validFiles =
    files.filter(
      (file) => {

        const name =
          String(file.name || "")
            .toLowerCase();

        return (
          file.type === "image/jpeg" ||
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg")
        );

      }
    );


  if (!validFiles.length) {

    showStatus(
      "Please choose JPG or JPEG images.",
      "error"
    );

    return;

  }


  showStatus(
    "Loading images...",
    "info"
  );


  for (const file of validFiles) {

    try {

      const prepared =
        await prepareImage(file);

      images.push(prepared);

    } catch (error) {

      console.error(
        "Image load error:",
        error
      );

    }

  }


  if (!images.length) {

    showStatus(
      "Could not load the selected images.",
      "error"
    );

    return;

  }


  uploadCard.classList.add(
    "hidden"
  );

  workspace.classList.remove(
    "hidden"
  );


  generatedPdfBytes = null;

  downloadBtn.classList.add(
    "hidden"
  );

  anotherBtn.classList.add(
    "hidden"
  );


  renderImages();


  showStatus(
    "",
    ""
  );

}


/* =========================================================
   PREPARE IMAGE
   ========================================================= */

function prepareImage(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload = () => {

        const src =
          reader.result;


        const img =
          new Image();


        img.onload = () => {

          resolve({

            id:
              createId(),

            file,

            src,

            width:
              img.naturalWidth,

            height:
              img.naturalHeight

          });

        };


        img.onerror = () => {

          reject(
            new Error(
              "Could not decode image."
            )
          );

        };


        img.src = src;

      };


      reader.onerror = () => {

        reject(
          reader.error ||
          new Error(
            "Could not read image."
          )
        );

      };


      reader.readAsDataURL(file);

    }
  );

}


/* =========================================================
   RENDER IMAGES
   ========================================================= */

function renderImages() {

  imageList.innerHTML = "";


  images.forEach(
    (image) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "image-item";


      item.dataset.id =
        image.id;


      item.innerHTML = `

        <div class="image-preview">

          <img
            src="${image.src}"
            alt="${escapeHtml(image.file.name)}"
            draggable="false"
          >

        </div>


        <div class="image-info">

          <strong>
            ${escapeHtml(image.file.name)}
          </strong>

          <span>
            ${image.width} × ${image.height}px
          </span>

        </div>


        <button
          class="remove-btn"
          type="button"
          aria-label="Remove image"
          data-id="${image.id}"
        >
          ×
        </button>

      `;


      imageList.appendChild(item);


      const removeBtn =
        item.querySelector(
          ".remove-btn"
        );


      removeBtn.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          event.stopPropagation();

          removeImage(
            image.id
          );

        }
      );


      setupDrag(item);

    }
  );


  imageCount.textContent =
    `${images.length} ${
      images.length === 1
        ? "image"
        : "images"
    }`;

}


/* =========================================================
   REMOVE IMAGE
   ========================================================= */

function removeImage(id) {

  images =
    images.filter(
      (image) =>
        image.id !== id
    );


  generatedPdfBytes = null;


  downloadBtn.classList.add(
    "hidden"
  );


  anotherBtn.classList.add(
    "hidden"
  );


  if (!images.length) {

    resetTool();

    return;

  }


  renderImages();

}


/* =========================================================
   DRAG / REORDER
   ========================================================= */

function setupDrag(item) {

  let startX = 0;

  let startY = 0;

  let pointerId = null;

  let isDragging = false;

  let touchMode = false;


  item.addEventListener(
    "mousedown",
    (event) => {

      if (
        event.button !== 0 ||
        event.target.closest(
          ".remove-btn"
        )
      ) {
        return;
      }


      startX =
        event.clientX;

      startY =
        event.clientY;

      pointerId =
        event.pointerId ??
        null;

      isDragging = false;

      touchMode = false;


      dragState = {
        item,
        startX,
        startY
      };


      const moveHandler =
        (moveEvent) => {

          const dx =
            moveEvent.clientX -
            startX;

          const dy =
            moveEvent.clientY -
            startY;


          if (
            !isDragging &&
            Math.hypot(dx, dy) > 8
          ) {

            isDragging = true;

            dragMoved = true;

            item.classList.add(
              "dragging"
            );

          }


          if (!isDragging) {
            return;
          }


          moveItem(
            item,
            moveEvent.clientX,
            moveEvent.clientY
          );


          moveEvent.preventDefault();

        };


      const upHandler =
        () => {

          document.removeEventListener(
            "mousemove",
            moveHandler
          );

          document.removeEventListener(
            "mouseup",
            upHandler
          );


          if (isDragging) {

            item.classList.remove(
              "dragging"
            );

            syncImagesFromDOM();

          }


          dragState = null;

          isDragging = false;

        };


      document.addEventListener(
        "mousemove",
        moveHandler
      );


      document.addEventListener(
        "mouseup",
        upHandler
      );

    }
  );


  item.addEventListener(
    "touchstart",
    (event) => {

      if (
        event.target.closest(
          ".remove-btn"
        )
      ) {
        return;
      }


      const touch =
        event.touches[0];


      if (!touch) {
        return;
      }


      startX =
        touch.clientX;

      startY =
        touch.clientY;

      isDragging = false;

      touchMode = true;


      dragTimer =
        setTimeout(
          () => {

            isDragging = true;

            dragMoved = true;

            item.classList.add(
              "dragging"
            );

            if (
              navigator.vibrate
            ) {
              navigator.vibrate(20);
            }

          },
          300
        );

    },
    {
      passive: true
    }
  );


  item.addEventListener(
    "touchmove",
    (event) => {

      const touch =
        event.touches[0];


      if (!touch) {
        return;
      }


      const dx =
        touch.clientX -
        startX;

      const dy =
        touch.clientY -
        startY;


      /*
       * Before long press:
       * allow normal page scrolling.
       */

      if (!isDragging) {

        if (
          Math.hypot(dx, dy) > 10
        ) {

          clearTimeout(
            dragTimer
          );

        }

        return;

      }


      event.preventDefault();


      moveItem(
        item,
        touch.clientX,
        touch.clientY
      );

    },
    {
      passive: false
    }
  );


  item.addEventListener(
    "touchend",
    () => {

      clearTimeout(
        dragTimer
      );


      if (isDragging) {

        item.classList.remove(
          "dragging"
        );

        syncImagesFromDOM();

      }


      isDragging = false;

    }
  );


  item.addEventListener(
    "touchcancel",
    () => {

      clearTimeout(
        dragTimer
      );


      item.classList.remove(
        "dragging"
      );


      isDragging = false;

    }
  );

}


/* =========================================================
   MOVE ITEM
   ========================================================= */

function moveItem(
  item,
  clientX,
  clientY
) {

  const elements =
    Array.from(
      imageList.querySelectorAll(
        ".image-item"
      )
    );


  const target =
    elements.find(
      (element) => {

        if (
          element === item
        ) {
          return false;
        }


        const rect =
          element.getBoundingClientRect();


        return (
          clientY >= rect.top &&
          clientY <= rect.bottom
        );

      }
    );


  if (!target) {

    autoScroll(
      clientY
    );

    return;

  }


  const rect =
    target.getBoundingClientRect();


  const middle =
    rect.top +
    rect.height / 2;


  if (
    clientY < middle
  ) {

    imageList.insertBefore(
      item,
      target
    );

  } else {

    imageList.insertBefore(
      item,
      target.nextSibling
    );

  }


  autoScroll(
    clientY
  );

}


/* =========================================================
   AUTO SCROLL
   ========================================================= */

function autoScroll(clientY) {

  cancelAnimationFrame(
    autoScrollFrame
  );


  const edge =
    90;

  const speed =
    12;


  function scroll() {

    if (
      clientY < edge
    ) {

      window.scrollBy(
        0,
        -speed
      );

    } else if (
      clientY >
      window.innerHeight - edge
    ) {

      window.scrollBy(
        0,
        speed
      );

    }

  }


  autoScrollFrame =
    requestAnimationFrame(
      scroll
    );

}


/* =========================================================
   SYNC ARRAY WITH DOM
   ========================================================= */

function syncImagesFromDOM() {

  const order =
    Array.from(
      imageList.querySelectorAll(
        ".image-item"
      )
    )
      .map(
        (item) =>
          item.dataset.id
      );


  const map =
    new Map(
      images.map(
        (image) => [
          image.id,
          image
        ]
      )
    );


  images =
    order
      .map(
        (id) =>
          map.get(id)
      )
      .filter(Boolean);


  renderImages();

}


/* =========================================================
   CREATE PDF
   ========================================================= */

convertBtn.addEventListener(
  "click",
  async () => {

    if (
      !images.length
    ) {

      showStatus(
        "Please add at least one JPG image.",
        "error"
      );

      return;

    }


    if (
      convertBtn.disabled
    ) {
      return;
    }


    convertBtn.disabled =
      true;


    convertBtn.textContent =
      "Creating PDF...";


    generatedPdfBytes =
      null;


    downloadBtn.classList.add(
      "hidden"
    );


    try {

      showStatus(
        "Creating your PDF...",
        "info"
      );


      /*
       * Fresh PDFDocument instance.
       * No external window/global dependency.
       */

      const pdfDoc =
        await PDFDocument.create();


      for (
        let i = 0;
        i < images.length;
        i++
      ) {

        const image =
          images[i];


        showStatus(
          `Adding image ${i + 1} of ${images.length}...`,
          "info"
        );


        const imageBytes =
          await image.file.arrayBuffer();


        /*
         * pdf-lib expects actual JPEG bytes.
         */

        const jpgImage =
          await pdfDoc.embedJpg(
            new Uint8Array(
              imageBytes
            )
          );


        const originalWidth =
          image.width;

        const originalHeight =
          image.height;


        const selectedSize =
          pageSize.value;


        const selectedOrientation =
          orientation.value;


        const marginValue =
          Number(
            margin.value
          ) || 0;


        let pageWidth;

        let pageHeight;


        /* -----------------------------------------
           IMAGE SIZE
           ----------------------------------------- */

        if (
          selectedSize === "image"
        ) {

          pageWidth =
            originalWidth;

          pageHeight =
            originalHeight;


        } else {

          /* ---------------------------------------
             A4
             --------------------------------------- */

          if (
            selectedSize === "a4"
          ) {

            pageWidth =
              595.28;

            pageHeight =
              841.89;


          /* ---------------------------------------
             LETTER
             --------------------------------------- */

          } else {

            pageWidth =
              612;

            pageHeight =
              792;

          }


          /*
           * Auto orientation follows image.
           */

          if (
            selectedOrientation ===
            "landscape"
          ) {

            [
              pageWidth,
              pageHeight
            ] =
              [
                pageHeight,
                pageWidth
              ];

          }


          if (
            selectedOrientation ===
            "auto"
          ) {

            const imageLandscape =
              originalWidth >
              originalHeight;


            const pageLandscape =
              pageWidth >
              pageHeight;


            if (
              imageLandscape !==
              pageLandscape
            ) {

              [
                pageWidth,
                pageHeight
              ] =
                [
                  pageHeight,
                  pageWidth
                ];

            }

          }


          if (
            selectedOrientation ===
            "portrait"
          ) {

            if (
              pageWidth >
              pageHeight
            ) {

              [
                pageWidth,
                pageHeight
              ] =
                [
                  pageHeight,
                  pageWidth
                ];

            }

          }


          /*
           * Image Size selected separately
           * does not need orientation swapping.
           */

        }


        const usableWidth =
          Math.max(
            1,
            pageWidth -
            marginValue * 2
          );


        const usableHeight =
          Math.max(
            1,
            pageHeight -
            marginValue * 2
          );


        /*
         * Keep image aspect ratio.
         */

        const scale =
          Math.min(
            usableWidth /
              originalWidth,

            usableHeight /
              originalHeight
          );


        const drawWidth =
          originalWidth *
          scale;


        const drawHeight =
          originalHeight *
          scale;


        const x =
          (
            pageWidth -
            drawWidth
          ) / 2;


        const y =
          (
            pageHeight -
            drawHeight
          ) / 2;


        const page =
          pdfDoc.addPage(
            [
              pageWidth,
              pageHeight
            ]
          );


        page.drawImage(
          jpgImage,
          {
            x,
            y,
            width:
              drawWidth,
            height:
              drawHeight
          }
        );

      }


      showStatus(
        "Finalizing PDF...",
        "info"
      );


      generatedPdfBytes =
        await pdfDoc.save();


      if (
        !generatedPdfBytes ||
        !generatedPdfBytes.length
      ) {

        throw new Error(
          "PDF generation returned empty data."
        );

      }


      downloadBtn.classList.remove(
        "hidden"
      );


      anotherBtn.classList.remove(
        "hidden"
      );


      showStatus(
        "PDF created successfully ✨",
        "success"
      );


    } catch (error) {

      console.error(
        "PikaTools JPG → PDF ERROR:",
        error
      );


      generatedPdfBytes =
        null;


      downloadBtn.classList.add(
        "hidden"
      );


      let message =
        "Could not create PDF. Please try again.";


      if (
        error &&
        error.message
      ) {

        message =
          error.message;

      }


      showStatus(
        message,
        "error"
      );

    } finally {

      convertBtn.disabled =
        false;


      convertBtn.textContent =
        "Create PDF";

    }

  }
);


/* =========================================================
   DOWNLOAD PDF
   ========================================================= */

downloadBtn.addEventListener(
  "click",
  () => {

    if (
      !generatedPdfBytes
    ) {

      showStatus(
        "Please create the PDF first.",
        "error"
      );

      return;

    }


    try {

      const blob =
        new Blob(
          [
            generatedPdfBytes
          ],
          {
            type:
              "application/pdf"
          }
        );


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
        "pikatools-jpg-to-pdf.pdf";


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


      showStatus(
        "PDF downloaded successfully ✨",
        "success"
      );


    } catch (error) {

      console.error(
        "PDF download error:",
        error
      );


      showStatus(
        "Could not download PDF.",
        "error"
      );

    }

  }
);


/* =========================================================
   CONVERT ANOTHER
   ========================================================= */

anotherBtn.addEventListener(
  "click",
  () => {

    resetTool();

  }
);


/* =========================================================
   RESET
   ========================================================= */

function resetTool() {

  images = [];

  generatedPdfBytes =
    null;


  imageList.innerHTML =
    "";


  imageCount.textContent =
    "0 images";


  workspace.classList.add(
    "hidden"
  );


  uploadCard.classList.remove(
    "hidden"
  );


  downloadBtn.classList.add(
    "hidden"
  );


  anotherBtn.classList.add(
    "hidden"
  );


  status.textContent =
    "";


  status.className =
    "status";


  fileInput.value =
    "";

}


/* =========================================================
   STATUS
   ========================================================= */

function showStatus(
  message,
  type
) {

  status.textContent =
    message;


  status.className =
    "status";


  if (type) {

    status.classList.add(
      type
    );

  }

}


/* =========================================================
   ID
   ========================================================= */

function createId() {

  return (
    "img-" +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2)
  );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   PREVENT IMAGE GHOST DRAGGING
   ========================================================= */

document.addEventListener(
  "dragstart",
  (event) => {

    if (
      event.target.tagName ===
      "IMG"
    ) {

      event.preventDefault();

    }

  }
);
