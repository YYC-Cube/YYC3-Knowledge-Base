import { zip } from 'fflate';

export function useZipProcessor() {
  async function createZipFromFiles(files: File[], folderName: string): Promise<File> {
    try {
      const fileMap: { [key: string]: Uint8Array } = {};

      for (const file of files) {
        const path = file.webkitRelativePath || file.name;
        const arrayBuffer = await file.arrayBuffer();
        fileMap[path] = new Uint8Array(arrayBuffer);
      }

      return new Promise((resolve, reject) => {
        zip(fileMap, (err, data) => {
          if (err) {
            reject(new Error(`Failed to create ZIP file: ${err.message}`));
          } else {
            const zipBlob = new Blob([data as BlobPart], { type: 'application/zip' });
            resolve(new File([zipBlob], `${folderName}.zip`, { type: 'application/zip' }));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to create ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function validateZipFile(file: File): { valid: boolean; error?: string } {
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      return { valid: false, error: 'Please upload a ZIP file' };
    }
    return { valid: true };
  }

  return {
    createZipFromFiles,
    validateZipFile,
  };
}
