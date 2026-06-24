# Cosmic-BG

`Cosmic-BG` tək fayllıq, istifadəsi asan kosmik canvas background kitabxanasıdır. Heç bir paket, build prosesi və əlavə CSS tələb etmir. Sadəcə `cosmicbg.js` faylını qoşursan və fon avtomatik işləyir.

Repository: [github.com/emilhs9/Cosmic-BG](https://github.com/emilhs9/Cosmic-BG)

## Sürətli İstifadə

Ən rahat yol CDN ilə qoşmaqdır:

```html
<script src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js" defer></script>
```

Bu kodu HTML faylında `</body>` bağlanışından əvvəl və ya `<head>` daxilində `defer` ilə istifadə edə bilərsən.

## Endirib İstifadə

Faylı birbaşa endirmək üçün:

[cosmicbg.js raw download](https://raw.githubusercontent.com/emilhs9/Cosmic-BG/main/cosmicbg.js)

Sonra HTML faylının yanına qoy və belə qoş:

```html
<script src="cosmicbg.js" defer></script>
```

Tam repo ZIP kimi endirmək üçün:

[Download Cosmic-BG ZIP](https://github.com/emilhs9/Cosmic-BG/archive/refs/heads/main.zip)

## Stabil Versiya İstifadəsi

Əgər GitHub-da release/tag yaratsan, production üçün tag ilə istifadə etmək daha yaxşıdır:

```html
<script src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@v1.0.0/cosmicbg.js" defer></script>
```

`@main` həmişə son kodu çəkir. `@v1.0.0` isə həmin versiyada sabit qalır.

## GitHub Pages İlə İstifadə

Repository üçün GitHub Pages aktivdirsə, bu link də işləyə bilər:

```html
<script src="https://emilhs9.github.io/Cosmic-BG/cosmicbg.js" defer></script>
```

Qeyd: `raw.githubusercontent.com` linkini birbaşa `<script>` üçün istifadə etmək məsləhət deyil. Bəzi brauzerlər MIME tipinə görə bloklaya bilər. Script üçün jsDelivr və ya GitHub Pages daha uyğundur.

## Parametrlərlə İstifadə

Ulduzların sıxlığını, sayını, sürüşməni və axan ulduzları `data-*` atributları ilə idarə edə bilərsən:

```html
<script
  src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js"
  defer
  data-theme="dark"
  data-sliding-star-density="0.7"
  data-sliding-star-count="900"
  data-shooting-star-density="1.4"
  data-shooting-star-max-count="2">
</script>
```

Ən çox istifadə olunan parametrlər:

| Parametr | Nümunə | İzah |
| --- | --- | --- |
| `data-theme` | `dark`, `light`, `auto` | Fon temasını seçir |
| `data-z-index` | `-1`, `0`, `10` | Canvas qatını idarə edir |
| `data-lift-content` | `true`, `false` | Kontenti canvas-ın üstündə saxlayır |
| `data-light-opacity` | `0.4` | Light theme zamanı canvas şəffaflığı |
| `data-sliding-star-density` | `0.7` | Sürüşən ulduzların sıxlığı |
| `data-sliding-star-count` | `900` | Dəqiq sürüşən ulduz sayı. `0` avtomatikdir |
| `data-shooting-star-density` | `1.4` | Axan ulduzların çıxma sıxlığı |
| `data-shooting-star-max-count` | `2` | Eyni anda maksimum axan ulduz sayı |
| `data-shooting-star-direction` | `down-left` | Axan ulduz istiqaməti |
| `data-star-speed` | `0.8` | Ulduzların sürüşmə sürəti |
| `data-star-light` | `3` | Ulduz parlaqlığı |
| `data-star-size` | `0.8` | Ulduz ölçüsü |

`cosmicbg.js` daxilindəki bütün tuning açarları `data-*` formatında işləyir. Məsələn `shootingStarMaxCount` üçün `data-shooting-star-max-count`.

## Manual Başlatma

Fonun nə vaxt başlayacağını özün idarə etmək üçün `data-auto-start="false"` istifadə et:

```html
<script
  src="https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js"
  data-auto-start="false"
  defer>
</script>

<script>
  window.addEventListener("DOMContentLoaded", function () {
    CosmicBg.init({
      theme: "dark",
      tuning: {
        slidingStarDensity: 0.8,
        slidingStarCount: 700,
        shootingStarDensity: 1.2,
        shootingStarMaxCount: 2
      }
    });
  });
</script>
```

## JavaScript API

Canlı olaraq parametrləri dəyişmək:

```js
CosmicBg.setTuning({
  slidingStarDensity: 0.6,
  slidingStarCount: 700,
  shootingStarDensity: 1.3,
  shootingStarMaxCount: 2
});
```

Cari parametrləri oxumaq:

```js
console.log(CosmicBg.getTuning());
```

Fonu dayandırmaq və canvas-ı silmək:

```js
CosmicBg.destroy();
```

## React / Next.js İstifadəsi

Client tərəfdə script yüklə:

```js
useEffect(function () {
  var script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js";
  script.defer = true;
  document.body.appendChild(script);

  return function () {
    if (window.CosmicBg) window.CosmicBg.destroy();
    script.remove();
  };
}, []);
```

Next.js App Router istifadə edirsənsə, bu kod client component daxilində olmalıdır:

```js
"use client";

import { useEffect } from "react";

export default function CosmicBackground() {
  useEffect(function () {
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/emilhs9/Cosmic-BG@main/cosmicbg.js";
    script.defer = true;
    document.body.appendChild(script);

    return function () {
      if (window.CosmicBg) window.CosmicBg.destroy();
      script.remove();
    };
  }, []);

  return null;
}
```

## Fayllar

| Fayl | İzah |
| --- | --- |
| `cosmicbg.js` | Əsas background kitabxanası |
| `README.md` | İstifadə qaydası |
| `LICENSE` | MIT license |

## Qısa Qeydlər

- Yalnız `cosmicbg.js` faylı kifayətdir.
- Əlavə CSS faylı tələb etmir.
- Canvas və minimal style avtomatik yaradılır.
- `prefers-reduced-motion` aktivdirsə, hərəkət azaldılır.
- Kontent canvas arxasında qalarsa, `data-lift-content="true"` saxla və ya kontentə daha yüksək `z-index` ver.
- MIT license ilə şəxsi və kommersiya layihələrində rahat istifadə edilə bilər.

## License

MIT License. Daha ətraflı: [LICENSE](LICENSE)
