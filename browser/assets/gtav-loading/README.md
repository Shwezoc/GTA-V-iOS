# GTA V loading-screen asset pack (local only)

This folder is intentionally excluded from Git. Do not upload or commit Rockstar game assets.

To enable the reconstructed `LOADINGSCREEN_STARTUP` browser sequence, place files obtained from a game copy you are legally entitled to use in this folder:

```
browser/assets/gtav-loading/title/
  logo.png
  spinner.png
  chalet.woff
  art/
    beach_bg.webp
    beach_fg.webp
    ls0_background.webp
    ls0_foreground.webp
    ls1_background.webp
    ls1_foreground.webp
    ls1_foreground_franklin.webp
```

The image names, 1280x720 stage layout, layer sizes/positions and transition approach are based on the public technical reconstruction in https://github.com/shadany7824/playgta5 (see `homepage.html`). That archive explicitly excludes Rockstar's copyrighted mirror/assets. This project therefore contains only the independently implemented loader and an asset manifest; it does not fetch or redistribute game textures from third-party servers.

Images must be exported as WebP at their intended dimensions. If these files are absent, the page deliberately shows an asset-missing diagnostic instead of drawing a fake GTA logo or pretending that the authentic loading screen is present.

Current browser implementation displays three documented loading compositions. It is an interface/asset test only; the percentage is illustrative and does not report RAGE or game-data loading.
