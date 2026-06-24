(function () {
    const totalGrids = 10;
    const initialMinLoad = 850;
    const initialMaxLoad = 1800;
    const exitDuration = 240;
    const enterDuration = 380;
    const mobileMenuIdleDelay = 1500;
    const swipeThreshold = 56;
    const swipeMaxTime = 900;
    const wheelThreshold = 48;
    const body = document.body;
    const container = document.getElementById("container");
    const mobileQuery = window.matchMedia ? window.matchMedia("(max-width: 700px)") : null;
    const match = location.pathname.match(/grid(\d+)\.htm$/i);
    let current = Number(body.dataset.grid || (match ? match[1] : 1));
    let navigating = false;
    let currentSource = "";
    let mobileMenuTimer = null;
    let touchStart = null;
    let wheelLocked = false;
    const pageLinks = [];

    const grids = {
        1: standardGrid("Grid 1", "#FDDB00", "70fr 272fr 60fr", "121fr 376fr 91fr", ["'h h h'", "'n m a'", "'f f f'"]),
        2: standardGrid("Grid 2", "#FDDB00", "70fr 272fr 60fr", "375fr 122fr 91fr", ["'h h h'", "'m n a'", "'f n a'"]),
        3: standardGrid("Grid 3", "#9BCF0B", "70fr 202fr 64fr 60fr", "121fr 473fr", ["'h h'", "'n m'", "'n a'", "'f f'"]),
        4: standardGrid("Grid 4", "#FDDB00", "70fr 272fr 60fr", "121fr 376fr 91fr", ["'n h h'", "'n m a'", "'n f f'"]),
        5: standardGrid("Grid 5", "#FDDB00", "70fr 274fr 58fr", "375fr 124fr 89fr", ["'h h h'", "'m n a'", "'f f f'"]),
        6: standardGrid("Grid 6", "#9BCF0B", "70fr 104fr 163fr 59fr", "121fr 473fr", ["'h h'", "'a m'", "'n m'", "'n f'"]),
        7: standardGrid("Grid 7", "#9BCF0B", "69fr 161fr 106fr 60fr", "121fr 473fr", ["'h h'", "'n m'", "'a m'", "'a f'"]),
        8: standardGrid("Grid 8", "#9BCF0B", "70fr 203fr 63fr 60fr", "121fr 473fr", ["'n h'", "'n m'", "'n a'", "'n f'"]),
        9: standardGrid("Grid 9", "#9BCF0B", "70fr 272fr 60fr", "121fr 376fr 91fr", ["'h h a'", "'n m m'", "'n f f'"]),
        10: {
            title: "Grid 10",
            labels: { header: "", nav: "", main: "", aside: "", footer: "" },
            style: [
                "body   { grid-area: b; background: silver; }",
                "header { grid-area: h; background: orange; }",
                "nav    { grid-area: n; background: yellow; }",
                "main   { grid-area: m; background: white; }",
                "aside  { grid-area: a; background: gray; }",
                "footer { grid-area: f; background: red; }",
                "",
                "#container {",
                "    display: grid;",
                "    gap: 0;",
                "    background: transparent;",
                "    grid-template-columns: auto;",
                "    grid-template-rows: 100fr 40fr 500fr 90fr 50fr;",
                "    grid-template-areas: 'h' 'n' 'm' 'a' 'f';",
                "}",
                "",
                "#container > * {",
                "    min-width: 0;",
                "    min-height: 0;",
                "    padding: 0;",
                "}",
                "",
                "@media only screen and (min-width: 768px) {",
                "    #container {",
                "        max-width: none;",
                "        margin: auto;",
                "        grid-template-rows: 100fr 500fr 50fr;",
                "        grid-template-columns: 25fr 59fr 16fr;",
                "        grid-template-areas: 'n h h' 'n m a' 'n f f';",
                "    }",
                "}"
            ].join("\n")
        }
    };

    if (!grids[current]) {
        current = 1;
    }

    disableInlineGridStyles();

    const runtimeStyle = document.createElement("style");
    runtimeStyle.id = "grid-runtime-style";
    document.head.appendChild(runtimeStyle);

    const preloader = document.createElement("div");
    preloader.className = "site-preloader";
    preloader.setAttribute("role", "status");
    preloader.setAttribute("aria-live", "polite");
    preloader.innerHTML = '<div class="site-preloader__box"><span>Loading G1-G10</span><i aria-hidden="true"></i></div>';
    body.prepend(preloader);
    body.classList.add("is-preloading");

    const dock = document.createElement("nav");
    dock.className = "site-dock";
    dock.setAttribute("aria-label", "Grid pages");

    dock.appendChild(makeButton("<", "Previous page", function () {
        navigateTo(wrapGrid(current - 1), true);
    }));

    for (let i = 1; i <= totalGrids; i += 1) {
        const link = document.createElement("a");
        link.href = "grid" + i + ".htm";
        link.dataset.grid = String(i);
        link.textContent = "G" + i;
        link.title = "Open grid " + i;
        link.addEventListener("click", handlePageLink);
        pageLinks.push(link);
        dock.appendChild(link);
    }

    dock.appendChild(makeButton(">", "Next page", function () {
        navigateTo(wrapGrid(current + 1), true);
    }));

    const codeButton = makeButton("Code", "View this page code", toggleCode);
    codeButton.dataset.action = "code";
    codeButton.setAttribute("aria-expanded", "false");
    dock.appendChild(codeButton);
    body.appendChild(dock);

    const swipeHintTop = makeSwipeHint("up", "Previous grid", -1);
    const swipeHintBottom = makeSwipeHint("down", "Next grid", 1);
    container.insertAdjacentElement("beforebegin", swipeHintTop);
    container.insertAdjacentElement("afterend", swipeHintBottom);

    const panel = document.createElement("section");
    panel.className = "code-panel";
    panel.setAttribute("aria-label", "Source code");
    panel.innerHTML =
        '<header><span></span><div><button type="button" data-copy>Copy</button><button type="button" data-close>X</button></div></header><pre></pre>';
    const panelTitle = panel.querySelector("header span");
    const panelCode = panel.querySelector("pre");
    panel.querySelector("[data-close]").addEventListener("click", closeCode);
    panel.querySelector("[data-copy]").addEventListener("click", function () {
        const copyButton = panel.querySelector("[data-copy]");
        copySource(currentSource).then(function (done) {
            copyButton.textContent = done ? "Copied" : "Select";
            setTimeout(function () {
                copyButton.textContent = "Copy";
            }, 900);
        });
    });
    body.appendChild(panel);

    applyGrid(current);
    const preloadReady = preloadGridPages();
    preloadReady.then(function () {
        if (!navigating) {
            applyGrid(current);
        }
    });
    finishInitialLoad(preloadReady);
    setupMobileInteractions();

    window.addEventListener("popstate", function () {
        const grid = getGridFromUrl();
        if (grids[grid] && grid !== current) {
            navigateTo(grid, false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeCode();
        }
    });

    let lastSpark = 0;
    let previousMouse = null;
    document.addEventListener("mousemove", function (event) {
        const now = performance.now();
        if (now - lastSpark < 70) {
            return;
        }
        lastSpark = now;
        const dx = previousMouse ? event.clientX - previousMouse.x : 18;
        const dy = previousMouse ? event.clientY - previousMouse.y : -4;
        previousMouse = { x: event.clientX, y: event.clientY };
        const distance = Math.max(1, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        const trail = Math.min(28, Math.max(10, distance * 1.6));
        const spark = document.createElement("i");
        spark.className = "cursor-spark";
        spark.style.left = event.clientX + "px";
        spark.style.top = event.clientY + "px";
        spark.style.setProperty("--angle", angle + "rad");
        spark.style.setProperty("--trail-x", Math.cos(angle) * trail + "px");
        spark.style.setProperty("--trail-y", Math.sin(angle) * trail + "px");
        body.appendChild(spark);
        setTimeout(function () {
            spark.remove();
        }, 500);
    });

    function standardGrid(title, panel, rows, columns, areas) {
        return {
            title: title,
            labels: { header: "Header", nav: "Nav", main: "Article", aside: "Ads", footer: "Footer" },
            style: [
                ":root { --panel: " + panel + "; }",
                "",
                "body   { grid-area: b; background: #151515; }",
                "header { grid-area: h; background: var(--panel); }",
                "nav    { grid-area: n; background: var(--panel); }",
                "main   { grid-area: m; background: var(--panel); }",
                "aside  { grid-area: a; background: var(--panel); }",
                "footer { grid-area: f; background: var(--panel); }",
                "",
                "#container {",
                "    display: grid;",
                "    gap: 6px;",
                "    background: white;",
                "    grid-template-rows: " + rows + ";",
                "    grid-template-columns: " + columns + ";",
                "    grid-template-areas: " + areas.join("\n                         ") + ";",
                "}",
                "",
                "#container > * {",
                "    box-sizing: border-box;",
                "    padding: 18px 16px;",
                "    font: 16px \"Times New Roman\", serif;",
                "}",
                "",
                "@media only screen and (max-width: 700px) {",
                "    #container > * { padding: 14px 12px; }",
                "}"
            ].join("\n")
        };
    }

    function disableInlineGridStyles() {
        Array.prototype.forEach.call(document.head.querySelectorAll("style"), function (style) {
            if (style.textContent.indexOf("#container") !== -1) {
                style.setAttribute("media", "not all");
            }
        });
    }

    function preloadGridPages() {
        if (!window.fetch || !window.DOMParser) {
            return Promise.resolve();
        }

        const jobs = [];
        for (let i = 1; i <= totalGrids; i += 1) {
            jobs.push(preloadGridPage(i));
        }

        return Promise.allSettled(jobs).then(function () {
            return true;
        });
    }

    function preloadGridPage(number) {
        return fetch("grid" + number + ".htm", { cache: "force-cache" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Grid page did not load");
                }
                return response.text();
            })
            .then(function (source) {
                const page = parseGridSource(number, source);
                if (page) {
                    grids[number] = page;
                }
            })
            .catch(function () {
                return false;
            });
    }

    function parseGridSource(number, source) {
        const doc = new DOMParser().parseFromString(source, "text/html");
        const style = Array.prototype.find.call(doc.head.querySelectorAll("style"), function (item) {
            return item.textContent.indexOf("#container") !== -1;
        });
        const pageContainer = doc.getElementById("container");
        if (!style || !pageContainer) {
            return null;
        }

        const titleElement = doc.querySelector("title");
        const title = titleElement && titleElement.textContent.trim()
            ? titleElement.textContent.trim()
            : "Grid " + number;

        return {
            title: title === "Document" ? "Grid " + number : title,
            labels: {
                header: getRegionText(pageContainer, "header"),
                nav: getRegionText(pageContainer, "nav"),
                main: getRegionText(pageContainer, "main"),
                aside: getRegionText(pageContainer, "aside"),
                footer: getRegionText(pageContainer, "footer")
            },
            style: style.textContent.trim(),
            source: source
        };
    }

    function getRegionText(pageContainer, selector) {
        const element = pageContainer.querySelector(selector);
        return element ? element.textContent : "";
    }

    function finishInitialLoad(preloadReady) {
        const startedAt = performance.now();
        const pageReady = document.readyState === "complete"
            ? Promise.resolve()
            : new Promise(function (resolve) {
                window.addEventListener("load", resolve, { once: true });
            });
        const maxWait = new Promise(function (resolve) {
            setTimeout(resolve, initialMaxLoad);
        });
        const startupReady = Promise.all([pageReady, preloadReady]);

        Promise.race([startupReady, maxWait]).then(function () {
            const remaining = Math.max(0, initialMinLoad - (performance.now() - startedAt));
            setTimeout(function () {
                body.classList.remove("is-preloading");
                preloader.classList.add("done");
                setTimeout(function () {
                    preloader.remove();
                    showMobileDock();
                }, 320);
            }, remaining);
        });
    }

    function applyGrid(number) {
        const page = grids[number];
        current = number;
        runtimeStyle.textContent = page.style;
        body.dataset.grid = String(number);
        document.title = page.title;
        renderContainer(page);
        updateDock();
        updateCodePanel();
    }

    function renderContainer(page) {
        container.replaceChildren(
            makeRegion("header", page.labels.header),
            makeRegion("nav", page.labels.nav),
            makeRegion("main", page.labels.main),
            makeRegion("aside", page.labels.aside),
            makeRegion("footer", page.labels.footer)
        );
    }

    function makeRegion(tagName, text) {
        const element = document.createElement(tagName);
        element.textContent = text;
        return element;
    }

    function updateDock() {
        pageLinks.forEach(function (link) {
            const isActive = Number(link.dataset.grid) === current;
            link.classList.toggle("active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function updateCodePanel() {
        currentSource = buildSource(current);
        panelTitle.textContent = "grid" + current + ".htm code";
        panelCode.textContent = currentSource;
    }

    function buildSource(number) {
        const page = grids[number];
        if (page.source) {
            return page.source;
        }

        return [
            "<!DOCTYPE html>",
            '<html lang="en">',
            "    <head>",
            '        <meta charset="UTF-8" />',
            '        <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            "        <title>" + escapeHtml(page.title) + "</title>",
            '        <link rel="stylesheet" href="site.css" />',
            "        <style>",
            indent(page.style, 12),
            "        </style>",
            "    </head>",
            '    <body class="grid-page" data-grid="' + number + '">',
            '        <div id="container">',
            regionSource("header", page.labels.header),
            regionSource("nav", page.labels.nav),
            regionSource("main", page.labels.main),
            regionSource("aside", page.labels.aside),
            regionSource("footer", page.labels.footer),
            "        </div>",
            '        <script src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js" data-lift-content="false" defer></script>',
            '        <script src="site.js"></script>',
            "    </body>",
            "</html>"
        ].join("\n");
    }

    function regionSource(tagName, text) {
        return "            <" + tagName + ">" + escapeHtml(text) + "</" + tagName + ">";
    }

    function indent(text, spaces) {
        const pad = new Array(spaces + 1).join(" ");
        return text.split("\n").map(function (line) {
            return pad + line;
        }).join("\n");
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function handlePageLink(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const grid = Number(event.currentTarget.dataset.grid);
        if (!grids[grid]) {
            return;
        }

        event.preventDefault();
        navigateTo(grid, true);
    }

    function navigateTo(number, pushUrl) {
        if (navigating || number === current || !grids[number]) {
            return;
        }

        navigating = true;
        showMobileDock();
        body.classList.remove("is-entering");
        body.classList.add("is-leaving");

        setTimeout(function () {
            applyGrid(number);
            showMobileDock();
            if (pushUrl) {
                pushGridUrl(number);
            }
            requestAnimationFrame(function () {
                body.classList.remove("is-leaving");
                body.classList.add("is-entering");
                setTimeout(function () {
                    body.classList.remove("is-entering");
                    navigating = false;
                }, enterDuration);
            });
        }, exitDuration);
    }

    function setupMobileInteractions() {
        dock.addEventListener("pointerdown", function () {
            showMobileDock(true);
        });
        dock.addEventListener("pointerenter", function () {
            showMobileDock(true);
        });
        dock.addEventListener("pointerleave", scheduleMobileDockHide);
        dock.addEventListener("focusin", function () {
            showMobileDock(true);
        });
        dock.addEventListener("focusout", scheduleMobileDockHide);

        document.addEventListener("pointerdown", function (event) {
            if (!isMobileView() || isPanelOpen() || isInside(event.target, dock)) {
                return;
            }
            showMobileDock();
        }, { passive: true });

        document.addEventListener("touchstart", handleTouchStart, { passive: true });
        document.addEventListener("touchend", handleTouchEnd, { passive: false });
        document.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("resize", handleViewportChange);

        if (mobileQuery && mobileQuery.addEventListener) {
            mobileQuery.addEventListener("change", handleViewportChange);
        } else if (mobileQuery && mobileQuery.addListener) {
            mobileQuery.addListener(handleViewportChange);
        }

        handleViewportChange();
    }

    function handleViewportChange() {
        if (isMobileView()) {
            showMobileDock();
            return;
        }

        clearTimeout(mobileMenuTimer);
        mobileMenuTimer = null;
        body.classList.remove("is-mobile-menu-active");
    }

    function handleTouchStart(event) {
        if (!isMobileView() || event.touches.length !== 1 || shouldIgnoreGesture(event.target)) {
            touchStart = null;
            return;
        }

        const touch = event.touches[0];
        touchStart = {
            x: touch.clientX,
            y: touch.clientY,
            time: performance.now()
        };
    }

    function handleTouchEnd(event) {
        if (!touchStart || !isMobileView() || shouldIgnoreGesture(event.target)) {
            touchStart = null;
            return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const elapsed = performance.now() - touchStart.time;
        touchStart = null;

        if (elapsed > swipeMaxTime || Math.abs(deltaY) < swipeThreshold || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
            return;
        }

        event.preventDefault();
        navigateByDirection(deltaY < 0 ? 1 : -1);
    }

    function handleWheel(event) {
        if (!isMobileView() || wheelLocked || shouldIgnoreGesture(event.target)) {
            return;
        }

        if (Math.abs(event.deltaY) < wheelThreshold || Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
            return;
        }

        event.preventDefault();
        wheelLocked = true;
        navigateByDirection(event.deltaY > 0 ? 1 : -1);
        setTimeout(function () {
            wheelLocked = false;
        }, exitDuration + enterDuration + 120);
    }

    function navigateByDirection(direction) {
        if (navigating) {
            return;
        }
        showMobileDock();
        navigateTo(wrapGrid(current + direction), true);
    }

    function shouldIgnoreGesture(target) {
        return isPanelOpen() || isInside(target, dock) || isInside(target, panel) || isInside(target, swipeHintTop) || isInside(target, swipeHintBottom);
    }

    function isInside(target, parent) {
        return Boolean(target && parent && parent.contains(target));
    }

    function isPanelOpen() {
        return panel.classList.contains("open");
    }

    function isMobileView() {
        return mobileQuery ? mobileQuery.matches : window.innerWidth <= 700;
    }

    function showMobileDock(keepOpen) {
        if (!isMobileView()) {
            return;
        }

        body.classList.add("is-mobile-menu-active");
        clearTimeout(mobileMenuTimer);
        mobileMenuTimer = null;

        if (!keepOpen) {
            scheduleMobileDockHide();
        }
    }

    function scheduleMobileDockHide() {
        clearTimeout(mobileMenuTimer);
        mobileMenuTimer = null;

        if (!isMobileView()) {
            body.classList.remove("is-mobile-menu-active");
            return;
        }

        mobileMenuTimer = setTimeout(function () {
            body.classList.remove("is-mobile-menu-active");
            mobileMenuTimer = null;
        }, mobileMenuIdleDelay);
    }

    function pushGridUrl(number) {
        try {
            history.pushState({ grid: number }, "", "grid" + number + ".htm");
        } catch (error) {
            return;
        }
    }

    function getGridFromUrl() {
        const urlMatch = location.pathname.match(/grid(\d+)\.htm$/i);
        return Number(urlMatch ? urlMatch[1] : body.dataset.grid || 1);
    }

    function wrapGrid(number) {
        if (number < 1) {
            return totalGrids;
        }
        if (number > totalGrids) {
            return 1;
        }
        return number;
    }

    function makeButton(text, title, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.title = title;
        button.addEventListener("click", onClick);
        return button;
    }

    function makeSwipeHint(direction, label, step) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mobile-swipe-hint mobile-swipe-hint--" + direction;
        button.title = label;
        button.setAttribute("aria-label", label);
        button.innerHTML = '<span aria-hidden="true"></span>';
        button.addEventListener("click", function () {
            navigateByDirection(step);
        });
        return button;
    }

    function toggleCode() {
        if (isPanelOpen()) {
            closeCode();
            return;
        }
        openCode();
    }

    function openCode() {
        panel.classList.add("open");
        codeButton.setAttribute("aria-expanded", "true");
        showMobileDock();
    }

    function closeCode() {
        panel.classList.remove("open");
        codeButton.setAttribute("aria-expanded", "false");
        scheduleMobileDockHide();
    }

    function copySource(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () {
                return true;
            }).catch(function () {
                return fallbackCopy(text);
            });
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function fallbackCopy(text) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        body.appendChild(area);
        area.select();
        let done = false;
        try {
            done = document.execCommand("copy");
        } catch (error) {
            done = false;
        }
        area.remove();
        return done;
    }
})();
