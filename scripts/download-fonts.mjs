import { mkdir, writeFile } from "node:fs/promises";

const directory = new URL("../assets/fonts/", import.meta.url);
await mkdir(directory, { recursive: true });
const sources = [
  {
    family: "Comic Neue",
    weight: 400,
    filename: "comic-neue-latin-400.woff2",
    license: "comicneue",
  },
  {
    family: "Comic Neue",
    weight: 700,
    filename: "comic-neue-latin-700.woff2",
    license: "comicneue",
  },
  {
    family: "Barlow Condensed",
    weight: 800,
    filename: "barlow-condensed-latin-800.woff2",
    license: "barlowcondensed",
  },
  {
    family: "IBM Plex Mono",
    weight: 400,
    filename: "ibm-plex-mono-latin-400.woff2",
    license: "ibmplexmono",
  },
  {
    family: "IBM Plex Mono",
    weight: 500,
    filename: "ibm-plex-mono-latin-500.woff2",
    license: "ibmplexmono",
  },
];
for (const font of sources) {
  if (process.argv[2] && font.family !== process.argv[2]) continue;
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@${font.weight}&display=swap`;
  const stylesheet = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });
  if (!stylesheet.ok) throw new Error(`Cannot fetch ${font.family}`);
  const css = await stylesheet.text();
  const latin = css.split("/* latin */")[1];
  const fontUrl = latin?.match(
    /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/,
  )?.[1];
  if (!fontUrl)
    throw new Error(`Cannot find the Latin WOFF2 for ${font.family}`);
  const response = await fetch(fontUrl);
  if (!response.ok) throw new Error(`Cannot download ${font.filename}`);
  await writeFile(
    new URL(font.filename, directory),
    Buffer.from(await response.arrayBuffer()),
  );
  const license = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${font.license}/OFL.txt`,
  );
  if (!license.ok) throw new Error(`Cannot fetch ${font.family} license`);
  await writeFile(
    new URL(`${font.license}-OFL.txt`, directory),
    await license.text(),
  );
  console.log(`Downloaded ${font.filename} and its SIL Open Font License.`);
}

// Monocraft is used only for the volume label and End Poem quotation.
for (const [source, filename] of [
  ["dist/Monocraft-ttf/Monocraft.ttf", "Monocraft.ttf"],
  ["LICENSE", "monocraft-OFL.txt"],
]) {
  if (process.argv[2] && process.argv[2] !== "Monocraft") continue;
  const response = await fetch(
    `https://raw.githubusercontent.com/IdreesInc/Monocraft/main/${source}`,
  );
  if (!response.ok) throw new Error(`Cannot download ${filename}`);
  await writeFile(
    new URL(filename, directory),
    Buffer.from(await response.arrayBuffer()),
  );
}
