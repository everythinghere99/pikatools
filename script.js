(() => {
    "use strict";

    /**
     * @typedef {Object} Tool
     * @property {string} name
     * @property {string} description
     * @property {string} url
     * @property {string} keywords
     */

    /** @type {Tool[]} */
    const tools = [
        {
            name: "Image Compressor",
            description: "Make images smaller.",
            url: "tools/image-compressor.html",
            keywords: "image compress compressor smaller reduce size 200kb 100kb 50kb"
        },
        {
            name: "Image Resizer",
            description: "Change image dimensions.",
            url: "tools/image-resizer.html",
            keywords: "image resize resizer dimensions size"
        },
        {
            name: "Image Cropper",
            description: "Crop photos easily.",
            url: "tools/image-cropper.html",
            keywords: "image crop cropper photo"
        },
        {
            name: "Image Converter",
            description: "JPG, PNG & WebP.",
            url: "tools/image-converter.html",
            keywords: "image convert converter jpg png webp format jpg to png png to jpg webp"
        },
        {
            name: "PDF Compressor",
            description: "Reduce PDF file size.",
            url: "tools/pdf-compressor.html",
            keywords: "pdf compress compressor reduce size"
        },
        {
            name: "PDF Merger",
            description: "Combine PDFs together.",
            url: "tools/pdf-merger.html",
            keywords: "pdf merge merger combine join"
        },
        {
            name: "PDF Organize",
            description: "Reorder, rotate and organize pages.",
            url: "tools/pdf-organize.html",
            keywords: "pdf organize organizer rearrange reorder pages"
        },
        {
            name: "PDF Splitter",
            description: "Split a PDF into separate files.",
            url: "tools/pdf-splitter.html",
            keywords: "pdf split splitter separate pages"
        },
        {
            name: "PDF Rotate",
            description: "Rotate PDF pages.",
            url: "tools/pdf-rotate.html",
            keywords: "pdf rotate rotation pages"
        },
        {
            name: "PDF Page Numbers",
            description: "Add page numbers to PDFs.",
            url: "tools/pdf-page-numbers.html",
            keywords: "pdf page numbers numbering pages"
        },
        {
            name: "PDF Password",
            description: "Protect a PDF with a password.",
            url: "tools/pdf-password.html",
            keywords: "pdf password protect lock secure"
        },
        {
            name: "PDF Unlock",
            description: "Remove PDF restrictions.",
            url: "tools/pdf-unlock.html",
            keywords: "pdf unlock restrictions remove password"
        },
        {
            name: "PDF Watermark",
            description: "Add a watermark to PDF pages.",
            url: "tools/pdf-watermark.html",
            keywords: "pdf watermark stamp mark"
        },
        {
            name: "PDF Signature",
            description: "Add a signature to a PDF.",
            url: "tools/pdf-signature.html",
            keywords: "pdf signature sign signing"
        },
        {
            name: "PDF to JPG",
            description: "Turn PDF pages into images.",
            url: "tools/pdf-to-jpg.html",
            keywords: "pdf jpg convert pdf to image"
        },
        {
            name: "JPG to PDF",
            description: "Make a PDF from images.",
            url: "tools/jpg-to-pdf.html",
            keywords: "jpg pdf convert image to pdf"
        },
        {
            name: "Signature Resizer",
            description: "Resize your signature.",
            url: "tools/signature-resizer.html",
            keywords: "signature resize resizer dimensions"
        }
    ];

    const searchInput = document.getElementById("toolSearch");
    const searchResults = document.getElementById("searchResults");
    const clearSearch = document.getElementById("clearSearch");
    const searchHints = document.getElementById("searchHints");
    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!searchInput || !searchResults) return;

    /**
     * @param {string} value
     * @returns {string}
     */
    const normalize = value =>
        String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[→–—]/g, " ")
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ");

    /**
     * @param {Tool} tool
     * @param {string} query
     * @returns {number}
     */
    function scoreTool(tool, query) {
        const q = normalize(query);

        if (!q) return 0;

        const name = normalize(tool.name);

        const haystack = normalize(
            `${tool.name} ${tool.description} ${tool.keywords}`
        );

        let score = 0;

        if (name === q) score += 100;
        if (name.includes(q)) score += 50;
        if (haystack.includes(q)) score += 25;

        for (const word of q.split(" ")) {
            if (word.length < 2) continue;

            if (name.includes(word)) {
                score += 10;
            } else if (haystack.includes(word)) {
                score += 4;
            }
        }

        return score;
    }

    /**
     * @param {boolean} visible
     */
    function setClearButton(visible) {
        if (!clearSearch) return;

        clearSearch.style.display = visible ? "grid" : "none";
    }

    /**
     * @param {string} query
     */
    function renderResults(query) {
        const q = normalize(query);

        searchResults.innerHTML = "";

        if (!q) {
            setClearButton(false);
            return;
        }

        const results = tools
            .map(tool => ({
                tool,
                score: scoreTool(tool, q)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);

        if (!results.length) {
            const empty = document.createElement("div");

            empty.className = "search-result-item";

            empty.innerHTML = `
                <div>
                    <strong class="result-name">No tool found</strong>
                    <span class="result-desc">Try another search.</span>
                </div>
            `;

            searchResults.appendChild(empty);
        } else {
            results.forEach(({ tool }) => {
                const item = document.createElement("a");

                item.className = "search-result-item";
                item.href = tool.url;

                item.innerHTML = `
                    <div class="result-icon">🛠️</div>
                    <div>
                        <strong class="result-name">${tool.name}</strong>
                        <span class="result-desc">${tool.description}</span>
                    </div>
                `;

                searchResults.appendChild(item);
            });
        }

        setClearButton(true);
    }

    searchInput.addEventListener("input", () => {
        renderResults(searchInput.value);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            searchInput.value = "";
            renderResults("");
            searchInput.blur();
        }
    });

    if (clearSearch) {
        clearSearch.addEventListener("click", () => {
            searchInput.value = "";
            renderResults("");
            searchInput.focus();
        });
    }

    if (searchHints) {
        searchHints
            .querySelectorAll("button[data-query]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    const query = button.dataset.query || "";

                    searchInput.value = query;

                    renderResults(query);

                    searchInput.focus();
                });
            });
    }

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener("click", () => {
            const isOpen = mobileMenu.classList.toggle("open");

            menuBtn.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        mobileMenu
            .querySelectorAll("a")
            .forEach(link => {
                link.addEventListener("click", () => {
                    mobileMenu.classList.remove("open");

                    menuBtn.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                });
            });
    }

    document.addEventListener("click", event => {
        const searchArea = document.querySelector(".search-area");

        if (
            searchArea &&
            !searchArea.contains(event.target)
        ) {
            searchResults.innerHTML = "";
        }
    });
})();