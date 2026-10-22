import JSZip from 'jszip';
import { validateComponentBundle, slugifyKey, titleizeKey } from './componentValidator.js';

/**
 * Checks if a filename is an image asset
 */
function isImageFile(filename = '') {
  return /\.(png|jpe?g|webp|svg|gif|ico)$/i.test(filename);
}

/**
 * Convert File object to Base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parses dropped items or file list from HTML5 Drag and Drop or <input type="file">
 * Supports:
 * 1. .zip archives (extracted in-memory via JSZip)
 * 2. Multi-directory drag & drop via webkitGetAsEntry
 * 3. Flat file arrays
 *
 * @param {FileList|DataTransferItemList|File[]} items
 * @returns {Promise<Array<object>>} List of normalized & validated component objects
 */
export async function parseComponentUpload(items) {
  const componentMap = new Map(); // key -> { key, template, schema, defaults, css, images: [] }

  // Helper to ensure component bucket exists
  function getBucket(compKey) {
    const cleanKey = slugifyKey(compKey);
    if (!componentMap.has(cleanKey)) {
      componentMap.set(cleanKey, {
        key: cleanKey,
        name: titleizeKey(cleanKey),
        template: '',
        schema: null,
        defaults: null,
        css: '',
        images: []
      });
    }
    return componentMap.get(cleanKey);
  }

  // 1. Process files if passed as FileList or Array<File>
  const fileArray = [];

  if (items instanceof DataTransferItemList) {
    // Traverse entries
    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
      if (entry) {
        entries.push(entry);
      } else {
        const file = items[i].getAsFile ? items[i].getAsFile() : null;
        if (file) fileArray.push({ file, path: file.name });
      }
    }

    if (entries.length > 0) {
      await traverseFileSystemEntries(entries, fileArray);
    }
  } else if (items) {
    const rawFiles = Array.from(items);
    for (const f of rawFiles) {
      // webkitRelativePath is available when using <input webkitdirectory>
      const relPath = f.webkitRelativePath || f.name;
      fileArray.push({ file: f, path: relPath });
    }
  }

  // 2. Separate .zip files from regular directory files
  for (const { file, path: filePath } of fileArray) {
    if (file.name.endsWith('.zip') || file.type === 'application/zip') {
      await parseZipFile(file, componentMap);
    } else {
      await processFlatFile(file, filePath, componentMap);
    }
  }

  // 3. Validate each collected component bucket
  const results = [];
  for (const [key, rawBundle] of componentMap.entries()) {
    // Only process if at least template or schema is present
    if (!rawBundle.template && !rawBundle.schema) continue;

    const validated = validateComponentBundle(rawBundle);
    results.push(validated);
  }

  return results;
}

/**
 * Recursively traverses HTML5 FileSystemEntry tree
 */
async function traverseFileSystemEntries(entries, outputFiles, currentPath = '') {
  for (const entry of entries) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      outputFiles.push({
        file,
        path: currentPath ? `${currentPath}/${entry.name}` : entry.name
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const childEntries = await new Promise((resolve, reject) => {
        const collected = [];
        function readBatch() {
          dirReader.readEntries(batch => {
            if (batch.length === 0) {
              resolve(collected);
            } else {
              collected.push(...batch);
              readBatch();
            }
          }, reject);
        }
        readBatch();
      });

      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      await traverseFileSystemEntries(childEntries, outputFiles, nextPath);
    }
  }
}

/**
 * Processes a single non-zip file into the componentMap
 */
async function processFlatFile(file, relPath, componentMap) {
  const parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts[parts.length - 1];

  // Determine component key from parent directory (e.g. "plumbing-hero/template.html" -> "plumbing-hero")
  let compKey = parts.length > 1 ? parts[parts.length - 2] : 'uploaded-component';
  if (compKey === 'components' && parts.length > 2) {
    compKey = parts[parts.length - 2];
  } else if (compKey === 'theme' && parts.length > 2) {
    compKey = parts[parts.length - 2];
  }

  const cleanKey = slugifyKey(compKey);
  if (!componentMap.has(cleanKey)) {
    componentMap.set(cleanKey, {
      key: cleanKey,
      name: titleizeKey(cleanKey),
      template: '',
      schema: null,
      defaults: null,
      css: '',
      images: []
    });
  }
  const bucket = componentMap.get(cleanKey);

  if (fileName === 'template.html') {
    bucket.template = await file.text();
  } else if (fileName === 'schema.json') {
    try {
      bucket.schema = JSON.parse(await file.text());
    } catch (_) {
      bucket.schema = await file.text();
    }
  } else if (fileName === 'defaults.json') {
    try {
      bucket.defaults = JSON.parse(await file.text());
    } catch (_) {
      bucket.defaults = await file.text();
    }
  } else if (fileName === 'style.css') {
    bucket.css = await file.text();
  } else if (isImageFile(fileName)) {
    const base64 = await fileToBase64(file);
    bucket.images.push({
      name: fileName,
      path: relPath,
      base64
    });
  }
}

/**
 * Extracts and parses a .zip file in memory via JSZip
 */
async function parseZipFile(zipFile, componentMap) {
  const zip = await JSZip.loadAsync(zipFile);

  // Group zip entries by component folder
  const entriesByFolder = new Map();

  zip.forEach((relPath, entry) => {
    if (entry.dir) return;
    const parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length === 0) return;

    const fileName = parts[parts.length - 1];
    // Skip macOS metadata files
    if (fileName.startsWith('._') || relPath.includes('__MACOSX/')) return;

    let compKey = 'component';
    if (parts.length === 1) {
      compKey = slugifyKey(zipFile.name.replace(/\.zip$/i, ''));
    } else {
      // Find segment before the file
      const parentDir = parts[parts.length - 2];
      if (['img', 'images', 'assets'].includes(parentDir) && parts.length >= 3) {
        compKey = parts[parts.length - 3];
      } else if (parentDir === 'components' || parentDir === 'theme') {
        compKey = parts[parts.length - 1].replace(/\.[^.]+$/, '');
      } else {
        compKey = parentDir;
      }
    }

    compKey = slugifyKey(compKey);
    if (!entriesByFolder.has(compKey)) {
      entriesByFolder.set(compKey, []);
    }
    entriesByFolder.get(compKey).push({ fileName, relPath, entry });
  });

  // Extract each component's files
  for (const [compKey, entries] of entriesByFolder.entries()) {
    if (!componentMap.has(compKey)) {
      componentMap.set(compKey, {
        key: compKey,
        name: titleizeKey(compKey),
        template: '',
        schema: null,
        defaults: null,
        css: '',
        images: []
      });
    }
    const bucket = componentMap.get(compKey);

    for (const { fileName, relPath, entry } of entries) {
      if (fileName === 'template.html') {
        bucket.template = await entry.async('text');
      } else if (fileName === 'schema.json') {
        const text = await entry.async('text');
        try {
          bucket.schema = JSON.parse(text);
        } catch (_) {
          bucket.schema = text;
        }
      } else if (fileName === 'defaults.json') {
        const text = await entry.async('text');
        try {
          bucket.defaults = JSON.parse(text);
        } catch (_) {
          bucket.defaults = text;
        }
      } else if (fileName === 'style.css') {
        bucket.css = await entry.async('text');
      } else if (isImageFile(fileName)) {
        const base64 = await entry.async('base64');
        bucket.images.push({
          name: fileName,
          path: relPath,
          base64
        });
      }
    }
  }
}
