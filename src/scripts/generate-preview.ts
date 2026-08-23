import opentype from "opentype.js";
import sharp from "sharp";
import { join } from "node:path";
import { decompress } from "woff2-encoder";
import { writeFile } from "node:fs/promises";

export async function generatePreview(fontCssUrl: string, fontName: string, outputPath: string) {
    const fontNameId = fontName.replace(/\s/g, '-').toLowerCase();
    const fontFiles = await fetch(fontCssUrl).then(res => res.text())

    const latinMatch = fontFiles.match(/\/\*\s*latin\s*\*\/[\s\S]*?url\(["']?(.*?)["']?\)/);
    let fontUrl: string | null = latinMatch?.[1] ?? null;

    if (!fontUrl) {
        const anyMatch = fontFiles.match(/\/\*\s*\w+\s*\*\/[\s\S]*?url\(["']?(.*?)["']?\)/);
        fontUrl = anyMatch?.[1] ?? null;
    }

    if (!fontUrl) throw new Error('No woff2 font found');

    const fontFile = await fetch(fontUrl).then(res => res.arrayBuffer());

    const sfnt = await decompress(fontFile);

    const font = opentype.parse(sfnt);
    const path = font.getPath(
        `${fontName} (regular)`,
        0,
        100,
        72
    );

    const svgPath = path.toPathData(2);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 150">
        <path d="${svgPath}" fill="black"/>
    </svg>
`;
    const PNG_PATH = join(outputPath, fontNameId, 'png', 'regular.png')
    const WEBP_PATH = join(outputPath, fontNameId, 'webp', 'regular.webp')
    const SVG_PATH = join(outputPath, fontNameId, 'svg', 'regular.svg')

    await sharp(Buffer.from(svg))
        .png()
        .toFile(PNG_PATH);

    await sharp(Buffer.from(svg))
        .webp()
        .toFile(WEBP_PATH);

    await writeFile(SVG_PATH, svg);
}