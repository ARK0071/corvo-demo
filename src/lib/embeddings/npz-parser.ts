// NPZ/NPY file parser using npyjs and jszip libraries
// NPZ files are ZIP archives containing .npy (NumPy array) files

import npyjs from "npyjs";
import JSZip from "jszip";

// Type for npyjs parsed result
interface NpyResult {
  data: Float32Array | Float64Array | Int32Array;
  shape: number[];
  dtype: string;
  fortranOrder: boolean;
}

// npyjs instance type (the library types are incomplete)
interface NpyParser {
  parse(buffer: ArrayBuffer): Promise<NpyResult>;
}

// Main NPZ parser function
// Returns a map of id -> embedding
export async function parseNpz(
  npzBytes: Uint8Array,
  ids: string[]
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();

  // Load the NPZ file (which is a ZIP archive)
  const jsZip = new JSZip();
  const npzFiles = await jsZip.loadAsync(npzBytes);

  // Find the embeddings array (usually "embeddings.npy" or "arr_0.npy")
  let embeddingsFile: JSZip.JSZipObject | null = null;

  for (const [filename, file] of Object.entries(npzFiles.files)) {
    if (
      filename.endsWith(".npy") &&
      (filename.includes("embedding") || filename.startsWith("arr_"))
    ) {
      embeddingsFile = file;
      break;
    }
  }

  // If no standard name found, take the first .npy file
  if (!embeddingsFile) {
    for (const [filename, file] of Object.entries(npzFiles.files)) {
      if (filename.endsWith(".npy")) {
        embeddingsFile = file;
        break;
      }
    }
  }

  if (!embeddingsFile) {
    throw new Error("No .npy file found in NPZ archive");
  }

  // Parse the NPY file
  const npyArrayBuffer = await embeddingsFile.async("arraybuffer");
  const npy = new npyjs() as unknown as NpyParser;
  const parsed = await npy.parse(npyArrayBuffer);

  // Extract embeddings from parsed data
  const { data, shape } = parsed;

  if (shape.length !== 2) {
    throw new Error(`Expected 2D array, got ${shape.length}D`);
  }

  const numRows = shape[0];
  const numCols = shape[1];

  // Map embeddings to IDs
  for (let i = 0; i < Math.min(ids.length, numRows); i++) {
    const embedding: number[] = [];
    for (let j = 0; j < numCols; j++) {
      embedding.push(data[i * numCols + j]);
    }
    result.set(ids[i], embedding);
  }

  return result;
}
