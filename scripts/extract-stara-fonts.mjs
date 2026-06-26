#!/usr/bin/env node
/**
 * Extrae las fuentes Stara (OTF) embebidas en Terremoto Venezuela.html
 * hacia app/fonts/stara/. Ejecutar una vez si se actualiza el bundle de referencia.
 */
const fs = require("fs");
const zlib = require("zlib");
const { promisify } = require("util");

const gunzip = promisify(zlib.gunzip);

const FONT_MAP = {
  "f543ef74-db33-4954-a64d-177f92725857": "Stara-Medium.otf",
  "4a4e6bba-3229-4e24-b6c7-99827f37d913": "Stara-MediumItalic.otf",
  "8db399a2-7436-4005-8dee-c3c5bdb4c478": "Stara-SemiBold.otf",
  "64a4cf99-e453-46bf-80d5-43d7df5eb8a6": "Stara-SemiBoldItalic.otf",
  "9381ed8a-433f-40a3-9a51-cdeb221938c5": "Stara-Bold.otf",
  "cea700c0-7c29-43f5-b869-0bfd4359ef09": "Stara-BoldItalic.otf",
  "ebeac291-50ff-4e95-8fa6-fea3af4d3b60": "Stara-ExtraBold.otf",
  "895ffef2-70eb-4c6e-bdf0-bdd0f91d50a4": "Stara-Black.otf",
};

async function main() {
  const htmlPath =
    process.argv[2] ?? "Terremoto Venezuela.html";
  const html = fs.readFileSync(htmlPath, "utf8");
  const mm = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
  if (!mm) {
    console.error("No se encontró manifest en", htmlPath);
    process.exit(1);
  }
  const man = JSON.parse(mm[1]);
  fs.mkdirSync("app/fonts/stara", { recursive: true });

  for (const [uuid, name] of Object.entries(FONT_MAP)) {
    const entry = man[uuid];
    if (!entry) {
      console.warn("Asset ausente:", uuid);
      continue;
    }
    let buf = Buffer.from(entry.data, "base64");
    if (entry.compressed) buf = await gunzip(buf);
    const out = `app/fonts/stara/${name}`;
    fs.writeFileSync(out, buf);
    console.log("OK", out, buf.length, "bytes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
