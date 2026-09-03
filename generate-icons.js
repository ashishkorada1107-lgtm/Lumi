const sharp = require('sharp');
const svg = `
<svg width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="background-color: #09090b;">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 2v2"></path>
  <path d="M12 20v2"></path>
  <path d="M4.93 4.93l1.41 1.41"></path>
  <path d="M17.66 17.66l1.41 1.41"></path>
  <path d="M2 12h2"></path>
  <path d="M20 12h2"></path>
  <path d="M6.34 17.66l-1.41 1.41"></path>
  <path d="M19.07 4.93l-1.41 1.41"></path>
</svg>
`;
sharp(Buffer.from(svg)).resize(192, 192).toFile('public/icon-192.png');
sharp(Buffer.from(svg)).resize(512, 512).toFile('public/icon-512.png');