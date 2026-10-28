import sharp from 'sharp';
await sharp('C:/Users/jusan/AppData/Local/Temp/aethon-v4-icons/nextjs.svg').resize(160,160).png().toFile(new URL('./nextjs.png',import.meta.url).pathname.replace(/^\//,''));
console.log('Next.js original SVG rasterized');
