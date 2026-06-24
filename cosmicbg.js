/*
  DreamX cosmic background, standalone version.
  No dependencies. Works with a normal <script> tag, file downloads, GitHub Pages,
  and GitHub-backed CDNs such as jsDelivr.

  Local/download use:
  <script src="cosmicbg.js" defer></script>

  GitHub CDN use:
  <script src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js" defer></script>

  Manual use:
  <script src="cosmicbg.js" data-auto-start="false" defer></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      CosmicBg.init({ theme: "dark" });
    });
  </script>

  Easy tuning:
  Values below are multipliers. 1 keeps the current/default look.
  Use 0.5 to reduce an effect, 1.5 to increase it, and 0 to turn it off
  where that makes sense.

  Script data attributes can tune these values too:
  <script src="cosmicbg.js" data-sliding-star-density="0.7" data-sliding-star-count="900"></script>
*/
(function (window, document) {
  "use strict";

  var STYLE_ID = "cosmic-bg-style";
  var DEFAULT_TUNING = {
    backgroundLight: 0.6,
    backgroundContrast: 1,
    backgroundSpeed: 0.8,
    starDensity: 2,
    // Extra controls for the smooth drifting star field.
    slidingStarDensity: 2,
    // 0 means automatic count based on screen size; any positive number is an exact target count.
    slidingStarCount: 0,
    starLight: 3,
    starContrast: 0.5,
    starSpeed: 0.2,
    starTwinkle: 1,
    starSize: 0.8,
    starGlow: 1,
    shootingStarLight: 1,
    shootingStarSpeed: 3,
    shootingStarFrequency: 1.3,
    shootingStarDensity: 3,
    shootingStarMaxCount: 2,
    shootingStarLength: 1,
    // Direction: down-left, down-right, up-left, up-right, left, right, down, up.
    shootingStarDirection: "down-left",
    shootingStarSpread: 1,
    mouseParallax: 0,
    motion: 1,
    lightThemeOpacity: 1
  };
  var DEFAULTS = {
    className: "cosmic-canvas",
    target: null,
    theme: "auto",
    zIndex: 0,
    autoStart: true,
    liftContent: true,
    lightOpacity: 0.4,
    maxDevicePixelRatio: 1.25,
    tuning: DEFAULT_TUNING
  };

  var activeInstance = null;

  function extend(base, extra) {
    var output = {};
    var key;
    for (key in base) output[key] = base[key];
    for (key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key) && extra[key] !== undefined) {
        output[key] = extra[key];
      }
    }
    return output;
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function normalizeTuning(value, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, number);
  }

  function normalizeTuningValue(value, fallback) {
    if (typeof fallback === "number") {
      return normalizeTuning(value, fallback);
    }
    if (typeof fallback === "string") {
      return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : fallback;
    }
    return value === undefined ? fallback : value;
  }

  function buildTuning(userTuning) {
    var merged = extend(DEFAULT_TUNING, userTuning || {});
    var key;
    for (key in DEFAULT_TUNING) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_TUNING, key)) {
        merged[key] = normalizeTuningValue(merged[key], DEFAULT_TUNING[key]);
      }
    }
    return merged;
  }

  function tuneAlpha(alpha, light, contrast) {
    return clampNumber((0.5 + (alpha - 0.5) * contrast) * light, 0, 1);
  }

  function scaledDelay(min, max, frequency) {
    if (frequency <= 0) return Number.POSITIVE_INFINITY;
    return random(min, max) / frequency;
  }

  function kebabCase(value) {
    return value.replace(/[A-Z]/g, function (match) {
      return "-" + match.toLowerCase();
    });
  }

  function readScriptTuning(script) {
    var tuning = {};
    var hasTuning = false;
    var key;
    var attr;

    for (key in DEFAULT_TUNING) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_TUNING, key)) {
        attr = "data-" + kebabCase(key);
        if (script.hasAttribute(attr)) {
          tuning[key] = script.getAttribute(attr);
          hasTuning = true;
        }
      }
    }

    return hasTuning ? tuning : undefined;
  }

  function getShootingFrequency(tuning) {
    return tuning.shootingStarFrequency * tuning.shootingStarDensity;
  }

  function getShootingStarVector(direction) {
    var presets = {
      "down-left": { x: -1, y: 0.62 },
      "down-right": { x: 1, y: 0.62 },
      "up-left": { x: -1, y: -0.62 },
      "up-right": { x: 1, y: -0.62 },
      "left": { x: -1, y: 0 },
      "right": { x: 1, y: 0 },
      "down": { x: 0, y: 1 },
      "up": { x: 0, y: -1 }
    };
    var value = presets[direction] || presets["down-left"];
    var length = Math.hypot(value.x, value.y) || 1;
    return {
      x: value.x / length,
      y: value.y / length
    };
  }

  function rotateVector(vector, degrees) {
    var radians = degrees * Math.PI / 180;
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos
    };
  }

  function getScriptOptions() {
    var script = document.currentScript;
    if (!script) return {};

    return {
      theme: script.getAttribute("data-theme") || undefined,
      zIndex: script.getAttribute("data-z-index") || undefined,
      autoStart: script.getAttribute("data-auto-start") !== "false",
      liftContent: script.getAttribute("data-lift-content") !== "false",
      lightOpacity: script.getAttribute("data-light-opacity")
        ? Number(script.getAttribute("data-light-opacity"))
        : undefined,
      tuning: readScriptTuning(script)
    };
  }

  function injectStyle(options) {
    var existing = document.getElementById(STYLE_ID);
    document.documentElement.style.setProperty(
      "--cosmic-bg-light-opacity",
      String(options.lightOpacity * options.tuning.lightThemeOpacity)
    );
    if (existing) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html.cosmic-bg-active{min-height:100%;background:#000000;}",
      "body.cosmic-bg-active{min-height:100%;background:transparent;}",
      "body.cosmic-bg-active.cosmic-bg-lift>*:not(.cosmic-canvas):not(script):not(style){position:relative;z-index:1;}",
      ".cosmic-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;background:#000000;transform:translate3d(0,0,0);}",
      ".cosmic-canvas.is-light,[data-theme='light'] .cosmic-canvas{opacity:var(--cosmic-bg-light-opacity,0.4);}"
    ].join("");

    document.head.appendChild(style);
  }

  function readTheme(options) {
    if (options.theme === "light" || options.theme === "dark") return options.theme;
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function createCosmicBackground(userOptions) {
    var options = extend(DEFAULTS, userOptions || {});
    options.tuning = buildTuning(options.tuning);
    var target = options.target || document.body;
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d", { alpha: true });

    if (!ctx) {
      throw new Error("CosmicBg needs a browser with canvas 2D support.");
    }

    injectStyle(options);

    canvas.className = options.className;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.zIndex = String(options.zIndex);
    target.insertBefore(canvas, target.firstChild);

    document.documentElement.classList.add("cosmic-bg-active");
    document.body.classList.add("cosmic-bg-active");
    document.body.classList.toggle("cosmic-bg-lift", Boolean(options.liftContent));

    var stars = [];
    var shootingStars = [];
    var shootingFlares = [];
    var starSpriteCache = {};
    var pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    var reducedMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };
    var width = 0;
    var height = 0;
    var dpr = 1;
    var frame = 0;
    var lastTime = performance.now();
    var nextShootingStar = lastTime + scaledDelay(2200, 6400, getShootingFrequency(options.tuning));
    var destroyed = false;

    function isLightTheme() {
      return readTheme(options) === "light";
    }

    function createStarSprite(hue, haloRadius, coreRadius) {
      var scale = Math.min(Math.max(dpr, 1), 1.5);
      var radius = Math.ceil(haloRadius);
      var size = Math.max(4, radius * 2);
      var canvasSprite = document.createElement("canvas");
      var spriteCtx = canvasSprite.getContext("2d");
      var center = size / 2;
      var halo;
      var core;

      canvasSprite.width = Math.ceil(size * scale);
      canvasSprite.height = Math.ceil(size * scale);
      spriteCtx.setTransform(scale, 0, 0, scale, 0, 0);

      halo = spriteCtx.createRadialGradient(center, center, 0, center, center, haloRadius);
      halo.addColorStop(0, "hsla(" + hue + ", 100%, 94%, 0.44)");
      halo.addColorStop(0.16, "hsla(" + hue + ", 100%, 84%, 0.2)");
      halo.addColorStop(0.54, "hsla(" + hue + ", 96%, 72%, 0.05)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      spriteCtx.fillStyle = halo;
      spriteCtx.fillRect(0, 0, size, size);

      core = spriteCtx.createRadialGradient(center, center, 0, center, center, coreRadius * 2);
      core.addColorStop(0, "rgba(255, 255, 255, 1)");
      core.addColorStop(0.38, "hsla(" + hue + ", 100%, 91%, 0.66)");
      core.addColorStop(1, "rgba(255, 255, 255, 0)");
      spriteCtx.fillStyle = core;
      spriteCtx.fillRect(center - coreRadius * 2, center - coreRadius * 2, coreRadius * 4, coreRadius * 4);

      return {
        canvas: canvasSprite,
        size: size,
        offset: size / 2
      };
    }

    function getStarSprite(star) {
      var hue = Math.round(star.hue / 6) * 6;
      var haloRadius = Math.round(star.haloRadius * 2) / 2;
      var coreRadius = Math.round(star.coreRadius * 4) / 4;
      var key = hue + ":" + haloRadius + ":" + coreRadius + ":" + Math.round(dpr * 100);

      if (!starSpriteCache[key]) {
        starSpriteCache[key] = createStarSprite(hue, haloRadius, coreRadius);
      }

      return starSpriteCache[key];
    }

    function createStar(layer) {
      var front = layer === "front";
      var middle = layer === "middle";
      var light = isLightTheme();
      var baseAlpha = light ? random(0.08, 0.2) : front ? random(0.45, 0.9) : middle ? random(0.28, 0.72) : random(0.12, 0.48);
      var baseGlow = light ? 0 : front ? random(7, 14) : middle ? random(3, 7) : 0;
      var tuning = options.tuning;
      var size = (front ? random(1.35, 2.9) : middle ? random(0.85, 1.7) : random(0.35, 0.95)) * tuning.starSize;
      var glow = baseGlow * tuning.starGlow;
      var hue = light ? 210 : front ? random(208, 222) : middle ? random(205, 226) : random(208, 238);
      var haloRadius = Math.max(glow * 0.52, size * 3.1, 1.35);
      var coreRadius = clampNumber(size * 0.42, 0.28, 0.95);

      return {
        layer: layer,
        x: Math.random() * width,
        y: Math.random() * height,
        size: size,
        alpha: tuneAlpha(baseAlpha, tuning.starLight, tuning.starContrast),
        phase: Math.random() * Math.PI * 2,
        twinkle: light ? 0 : front ? random(0.0012, 0.0026) : middle ? random(0.001, 0.002) : random(0.0006, 0.0015),
        speedX: light ? 0 : front ? random(-4, 4) : middle ? random(-2.4, 2.4) : random(-1.1, 1.1),
        speedY: light ? 0 : front ? random(10, 22) : middle ? random(4, 11) : random(1.2, 4.2),
        parallax: light ? 0 : front ? random(14, 24) : middle ? random(7, 13) : random(2, 5),
        glow: glow,
        hue: hue,
        color: "hsl(" + Math.round(hue) + ", 100%, 94%)",
        dotSize: clampNumber(size * 0.78, 0.45, 1.35),
        haloRadius: haloRadius,
        coreRadius: coreRadius
      };
    }

    function seedStars() {
      var area;
      var density;
      var targetCount;
      var tinyCount;
      var middleCount;
      var frontCount;
      var i;

      stars.length = 0;
      starSpriteCache = {};
      area = width * height;
      density = options.tuning.starDensity * options.tuning.slidingStarDensity;
      targetCount = Math.round(options.tuning.slidingStarCount);

      if (targetCount > 0) {
        targetCount = Math.round(clampNumber(targetCount, 0, 8000));
        tinyCount = Math.round(targetCount * 0.84);
        middleCount = Math.round(targetCount * 0.13);
        frontCount = Math.max(0, targetCount - tinyCount - middleCount);
      } else {
        tinyCount = Math.round(clampNumber(clampNumber(area / 1350, 420, 2200) * density, 0, 6000));
        middleCount = Math.round(clampNumber(clampNumber(area / 13000, 70, 260) * density, 0, 900));
        frontCount = Math.round(clampNumber(clampNumber(area / 60000, 14, 58) * density, 0, 220));
      }

      for (i = 0; i < tinyCount; i += 1) stars.push(createStar("back"));
      for (i = 0; i < middleCount; i += 1) stars.push(createStar("middle"));
      for (i = 0; i < frontCount; i += 1) stars.push(createStar("front"));
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, options.maxDevicePixelRatio);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
    }

    function applyBackgroundTone() {
      var light = options.tuning.backgroundLight;
      var contrast = options.tuning.backgroundContrast;
      var alpha;

      if (light < 1) {
        alpha = clampNumber((1 - light) * 0.45, 0, 0.78);
        ctx.fillStyle = "rgba(0, 0, 0, " + alpha + ")";
        ctx.fillRect(0, 0, width, height);
      } else if (light > 1) {
        alpha = clampNumber((light - 1) * 0.08, 0, 0.28);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(96, 165, 250, " + alpha + ")";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (contrast < 1) {
        alpha = clampNumber((1 - contrast) * 0.12, 0, 0.24);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(226, 232, 240, " + alpha + ")";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (contrast > 1) {
        alpha = clampNumber((contrast - 1) * 0.12, 0, 0.38);
        ctx.fillStyle = "rgba(0, 0, 0, " + alpha + ")";
        ctx.fillRect(0, 0, width, height);
      }
    }

    function drawAmbient(time) {
      var gradient;
      var patternGrad;
      var base;
      var drift;
      var glows;
      var i;
      var glow;

      canvas.classList.toggle("is-light", isLightTheme());

      if (isLightTheme()) {
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#f0f4fe");
        gradient.addColorStop(0.5, "#eef1f6");
        gradient.addColorStop(1, "#e8edf5");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        patternGrad = ctx.createRadialGradient(
          width * 0.3,
          height * 0.2,
          0,
          width * 0.3,
          height * 0.2,
          Math.max(width, height) * 0.5
        );
        patternGrad.addColorStop(0, "rgba(37, 99, 235, " + clampNumber(0.03 * options.tuning.backgroundLight, 0, 0.18) + ")");
        patternGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = patternGrad;
        ctx.fillRect(0, 0, width, height);
        applyBackgroundTone();
        return;
      }

      base = ctx.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, "#020617");
      base.addColorStop(0.34, "#0B1120");
      base.addColorStop(0.68, "#020617");
      base.addColorStop(1, "#000000");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      drift = Math.sin(time * 0.00008 * options.tuning.backgroundSpeed * options.tuning.motion) * 34;
      glows = [
        { x: width * 0.16 + pointer.x * 0.8, y: height * 0.24 + pointer.y * 0.55, radius: Math.min(width, height) * 0.58, alpha: 0.16 * options.tuning.backgroundLight },
        { x: width * 0.82 + pointer.x * 0.45 + drift, y: height * 0.12 + pointer.y * 0.35, radius: Math.min(width, height) * 0.45, alpha: 0.1 * options.tuning.backgroundLight },
        { x: width * 0.56 - pointer.x * 0.35, y: height * 0.9 - pointer.y * 0.25, radius: Math.min(width, height) * 0.62, alpha: 0.08 * options.tuning.backgroundLight }
      ];

      ctx.globalCompositeOperation = "screen";
      for (i = 0; i < glows.length; i += 1) {
        glow = glows[i];
        glow.alpha = clampNumber(glow.alpha, 0, 0.7);
        gradient = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.radius);
        gradient.addColorStop(0, "rgba(96, 165, 250, " + glow.alpha + ")");
        gradient.addColorStop(0.42, "rgba(30, 41, 59, " + glow.alpha * 0.35 + ")");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = "source-over";
      applyBackgroundTone();
    }

    function drawStar(star, time, dt) {
      var x;
      var y;
      var twinkle;
      var alpha;
      var sprite;
      var speedScale = options.tuning.starSpeed * options.tuning.motion;
      var minAlpha = 0.05 * Math.min(options.tuning.starLight, 1);
      var maxAlpha = options.tuning.starLight > 1 ? 1 : 0.95;

      if (!reducedMotion.matches) {
        star.x += star.speedX * dt * speedScale;
        star.y += star.speedY * dt * speedScale;
      }

      if (star.x > width + 24) star.x = -24;
      if (star.x < -24) star.x = width + 24;
      if (star.y > height + 24) star.y = -24;

      x = star.x + pointer.x * star.parallax * options.tuning.mouseParallax;
      y = star.y + pointer.y * star.parallax * options.tuning.mouseParallax;
      twinkle = 0.72 + Math.sin(time * star.twinkle * options.tuning.starTwinkle * options.tuning.motion + star.phase) * 0.28;
      alpha = clampNumber(star.alpha * twinkle, minAlpha, maxAlpha);

      ctx.globalAlpha = alpha;

      if (star.layer === "back" && star.glow <= 0) {
        ctx.fillStyle = star.color;
        ctx.fillRect(x - star.dotSize / 2, y - star.dotSize / 2, star.dotSize, star.dotSize);
        return;
      }

      sprite = getStarSprite(star);
      ctx.drawImage(sprite.canvas, x - sprite.offset, y - sprite.offset, sprite.size, sprite.size);
    }

    function spawnShootingStar(now) {
      var speed;
      var tuning = options.tuning;
      var frequency = getShootingFrequency(tuning);
      var maxCount = Math.round(clampNumber(tuning.shootingStarMaxCount, 0, 24));
      var margin;
      var x;
      var y;
      var vx;
      var vy;
      var direction;
      var spread;
      var perpendicular;
      var halfAlong;
      var halfAcross;
      var offset;
      var anchorX;
      var anchorY;
      var travelDistance;

      if (reducedMotion.matches || frequency <= 0 || maxCount <= 0 || shootingStars.length >= maxCount || now < nextShootingStar) return;

      speed = random(520, 780) * tuning.shootingStarSpeed * tuning.motion;
      if (speed <= 0) {
        nextShootingStar = now + scaledDelay(3600, 8200, frequency);
        return;
      }
      margin = Math.max(80, Math.min(width, height) * 0.14);
      direction = getShootingStarVector(tuning.shootingStarDirection);
      spread = random(-tuning.shootingStarSpread, tuning.shootingStarSpread);
      direction = rotateVector(direction, spread);
      perpendicular = { x: -direction.y, y: direction.x };
      halfAlong = width * 0.5 * Math.abs(direction.x) + height * 0.5 * Math.abs(direction.y);
      halfAcross = width * 0.5 * Math.abs(perpendicular.x) + height * 0.5 * Math.abs(perpendicular.y);
      offset = random(-halfAcross, halfAcross);
      anchorX = width * 0.5 + perpendicular.x * offset;
      anchorY = height * 0.5 + perpendicular.y * offset;
      travelDistance = (halfAlong + margin) * 2;
      x = anchorX - direction.x * (halfAlong + margin);
      y = anchorY - direction.y * (halfAlong + margin);
      vx = direction.x * speed;
      vy = direction.y * speed;

      shootingStars.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        life: 0,
        maxLife: travelDistance / speed,
        length: random(120, 230) * tuning.shootingStarLength,
        alpha: tuneAlpha(random(0.46, 0.82), tuning.shootingStarLight, tuning.starContrast)
      });
      nextShootingStar = now + scaledDelay(3600, 8200, frequency);
    }

    function addShootingFlare(x, y, alpha) {
      if (x < 0 || x > width || y < 0 || y > height) return;
      shootingFlares.push({
        x: x,
        y: y,
        life: 0,
        maxLife: 0.34,
        alpha: clampNumber(alpha, 0.12, 0.9)
      });
    }

    function drawShootingStars(dt) {
      var i;
      var item;
      var progress;
      var alpha;
      var angle;
      var tailX;
      var tailY;
      var gradient;

      for (i = shootingStars.length - 1; i >= 0; i -= 1) {
        item = shootingStars[i];
        item.life += dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        progress = item.life / item.maxLife;

        if (progress >= 1) {
          addShootingFlare(item.x, item.y, item.alpha * 0.72);
          shootingStars.splice(i, 1);
          continue;
        }

        alpha = item.alpha * Math.sin(progress * Math.PI);
        angle = Math.atan2(item.vy, item.vx);
        tailX = item.x - Math.cos(angle) * item.length;
        tailY = item.y - Math.sin(angle) * item.length;
        gradient = ctx.createLinearGradient(item.x, item.y, tailX, tailY);
        gradient.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
        gradient.addColorStop(0.18, "rgba(147, 197, 253, " + alpha * 0.76 + ")");
        gradient.addColorStop(1, "rgba(96, 165, 250, 0)");

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(96, 165, 250, 0.7)";
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawShootingFlares(dt) {
      var i;
      var item;
      var progress;
      var alpha;
      var radius;
      var gradient;

      for (i = shootingFlares.length - 1; i >= 0; i -= 1) {
        item = shootingFlares[i];
        item.life += dt;
        progress = item.life / item.maxLife;

        if (progress >= 1) {
          shootingFlares.splice(i, 1);
          continue;
        }

        alpha = item.alpha * Math.pow(1 - progress, 1.8);
        radius = 3 + progress * 18;
        gradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, radius);
        gradient.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
        gradient.addColorStop(0.25, "rgba(147, 197, 253, " + alpha * 0.44 + ")");
        gradient.addColorStop(1, "rgba(96, 165, 250, 0)");

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gradient;
        ctx.fillRect(item.x - radius, item.y - radius, radius * 2, radius * 2);
        ctx.restore();
      }
    }

    function render(now) {
      var deltaSeconds;
      var i;

      if (destroyed) return;

      deltaSeconds = Math.min((now - lastTime) / 1000, 0.034);
      lastTime = now;
      pointer.x += (pointer.targetX - pointer.x) * 0.045;
      pointer.y += (pointer.targetY - pointer.y) * 0.045;

      drawAmbient(now);
      ctx.globalCompositeOperation = "screen";
      for (i = 0; i < stars.length; i += 1) drawStar(stars[i], now, deltaSeconds);
      ctx.globalAlpha = 1;
      spawnShootingStar(now);
      drawShootingStars(deltaSeconds);
      drawShootingFlares(deltaSeconds);
      ctx.globalCompositeOperation = "source-over";
      frame = requestAnimationFrame(render);
    }

    function onPointerMove(event) {
      pointer.targetX = (event.clientX / Math.max(width, 1) - 0.5) * 1.8;
      pointer.targetY = (event.clientY / Math.max(height, 1) - 0.5) * 1.4;
    }

    function setTheme(theme) {
      if (theme === "light" || theme === "dark" || theme === "auto") {
        options.theme = theme;
        seedStars();
      }
    }

    function setTuning(tuning) {
      options.tuning = buildTuning(extend(options.tuning, tuning || {}));
      injectStyle(options);
      seedStars();
      nextShootingStar = performance.now() + scaledDelay(2200, 6400, getShootingFrequency(options.tuning));
    }

    function getTuning() {
      return extend({}, options.tuning);
    }

    function destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      if (activeInstance && activeInstance.canvas === canvas) activeInstance = null;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(render);

    return {
      canvas: canvas,
      resize: resize,
      destroy: destroy,
      setTheme: setTheme,
      setTuning: setTuning,
      getTuning: getTuning
    };
  }

  function init(options) {
    if (activeInstance) return activeInstance;
    activeInstance = createCosmicBackground(options);
    return activeInstance;
  }

  function destroy() {
    if (activeInstance) activeInstance.destroy();
  }

  function setTuning(tuning) {
    if (!activeInstance) init();
    activeInstance.setTuning(tuning);
    return activeInstance.getTuning();
  }

  function getTuning() {
    return activeInstance ? activeInstance.getTuning() : buildTuning();
  }

  window.CosmicBg = {
    init: init,
    create: createCosmicBackground,
    destroy: destroy,
    setTuning: setTuning,
    getTuning: getTuning,
    version: "1.0.0"
  };

  (function autoStart() {
    var options = extend(DEFAULTS, getScriptOptions());
    if (!options.autoStart) return;

    function start() {
      if (!activeInstance) init(options);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  })();
})(window, document);
