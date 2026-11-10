import { computed, ref } from 'vue';

export interface FileUploadOptions {
  maxFileSize?: number;
  acceptedTypes?: string[];
  accept?: string;
  multiple?: boolean;
  webkitdirectory?: boolean;
  validateFile?: (file: File) => { valid: boolean; error?: string };
  validateFiles?: (files: File[]) => { valid: boolean; error?: string };
  preprocessFiles?: (files: File[], folderName?: string) => Promise<File>;
}

export interface FileUploadConfig {
  mode: 'file' | 'folder';
  placeholder: string;
  icon: 'file' | 'folder';
  options: FileUploadOptions;
}

export function useFileUpload(config: FileUploadConfig) {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    acceptedTypes = [],
    accept = '',
    multiple = false,
    webkitdirectory = false,
    validateFile,
    validateFiles,
    preprocessFiles,
  } = config.options;

  // Reactive state
  const fileInput = ref<HTMLInputElement | null>(null);
  const dragActive = ref(false);
  const selectedItem = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);
  const isProcessing = ref(false);

  // Computed
  const hasError = computed(() => !!errorMessage.value);
  const hasSelection = computed(() => !!selectedItem.value);
  const isValid = computed(() => hasSelection.value && !hasError.value);

  // Default file validation
  function defaultValidateFile(file: File): { valid: boolean; error?: string } {
    if (acceptedTypes.length > 0) {
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type;
      });

      if (!isValidType) {
        return {
          valid: false,
          error: `Please upload a ${acceptedTypes.join(' or ')} file`,
        };
      }
    }

    if (file.size > maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (maxFileSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `File size (${sizeMB}MB) exceeds the ${limitMB}MB limit`,
      };
    }

    return { valid: true };
  }

  // Default files validation (for folder/multiple files)
  function defaultValidateFiles(files: File[]): { valid: boolean; error?: string } {
    if (files.length === 0) {
      return { valid: false, error: 'No files found' };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxFileSize) {
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      const limitMB = (maxFileSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `Total size (${sizeMB}MB) exceeds the ${limitMB}MB limit`,
      };
    }

    return { valid: true };
  }

  // Clear error and selection
  function clearError() {
    errorMessage.value = null;
  }

  function clearSelection() {
    selectedItem.value = null;
    errorMessage.value = null;
    // Clear file input to prevent re-selection issues
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }

  // Validate and process files
  async function processFiles(
    files: File[],
    folderName?: string,
  ): Promise<{ success: boolean; result?: File; error?: string }> {
    clearError();
    isProcessing.value = true;

    try {
      // Validation
      const validator =
        config.mode === 'folder' || multiple
          ? validateFiles || defaultValidateFiles
          : validateFile || defaultValidateFile;

      let validationResult: { valid: boolean; error?: string };
      if (config.mode === 'folder' || multiple) {
        validationResult = (validator as typeof defaultValidateFiles)(files);
      } else {
        validationResult = (validator as typeof defaultValidateFile)(files[0]);
      }

      if (!validationResult.valid) {
        errorMessage.value = validationResult.error || 'Validation failed';
        return { success: false, error: validationResult.error };
      }

      // Preprocessing (e.g., ZIP creation for folders)
      let resultFile: File;
      if (preprocessFiles) {
        resultFile = await preprocessFiles(files, folderName);
      } else {
        if ((config.mode === 'folder' || multiple) && files.length > 1) {
          throw new Error('Multiple files require a preprocessor function');
        }
        resultFile = files[0];
      }

      // Update selection
      selectedItem.value = folderName || resultFile.name;

      // Clear file input to prevent re-selection issues
      if (fileInput.value) {
        fileInput.value.value = '';
      }

      return { success: true, result: resultFile };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      errorMessage.value = errorMsg;
      return { success: false, error: errorMsg };
    } finally {
      isProcessing.value = false;
    }
  }

  // Handle file input selection
  async function handleFileSelect(
    files: FileList | null,
  ): Promise<{ success: boolean; result?: File; error?: string }> {
    if (!files || files.length === 0) {
      return { success: false, error: 'No files selected' };
    }

    const fileArray = Array.from(files);
    let folderName: string | undefined;

    if (config.mode === 'folder' && files[0].webkitRelativePath) {
      folderName = files[0].webkitRelativePath.split('/')[0];
    }

    return await processFiles(fileArray, folderName);
  }

  // Handle drag and drop
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive.value = true;
  }

  function handleDragLeave() {
    dragActive.value = false;
  }

  async function handleDrop(event: DragEvent): Promise<{ success: boolean; result?: File; error?: string }> {
    event.preventDefault();
    dragActive.value = false;

    if (config.mode === 'folder') {
      return await handleFolderDrop(event);
    }
    return await handleFileSelect(event.dataTransfer?.files || null);
  }

  // Specialized folder drop handling
  async function handleFolderDrop(event: DragEvent): Promise<{ success: boolean; result?: File; error?: string }> {
    if (!event.dataTransfer?.items?.length) {
      return { success: false, error: 'No items found' };
    }

    // Check directory reading capability
    if (!('webkitGetAsEntry' in DataTransferItem.prototype)) {
      const error = "Your browser doesn't support folder drop. Please use the browse button instead.";
      errorMessage.value = error;
      return { success: false, error };
    }

    const entry = event.dataTransfer.items[0].webkitGetAsEntry();
    if (!entry?.isDirectory) {
      const error = 'Please drop a folder, not a file.';
      errorMessage.value = error;
      return { success: false, error };
    }

    try {
      const files = await collectFilesFromEntry(entry);
      return await processFiles(files, entry.name);
    } catch {
      const errorMsg = 'Failed to process the folder. Please try again or use the browse button.';
      errorMessage.value = errorMsg;
      return { success: false, error: errorMsg };
    }
  }

  // Constants for safety limits
  const MAX_DEPTH = 20;
  const MAX_FILES = 10000;

  // Helper functions for folder processing
  async function collectFilesFromEntry(
    entry: FileSystemEntry,
    path = '',
    depth = 0,
    fileCount = { current: 0 },
  ): Promise<File[]> {
    // Check depth limit
    if (depth > MAX_DEPTH) {
      throw new Error(`Directory structure too deep (max depth: ${MAX_DEPTH})`);
    }

    // Check file count limit
    if (fileCount.current > MAX_FILES) {
      throw new Error(`Too many files in directory structure (max files: ${MAX_FILES})`);
    }

    if (entry.isFile) {
      return new Promise((resolve, reject) => {
        (entry as FileSystemFileEntry).file((file: File) => {
          // Check file count before adding
          if (fileCount.current >= MAX_FILES) {
            reject(new Error(`Too many files in directory structure (max files: ${MAX_FILES})`));
            return;
          }

          fileCount.current++;

          const customFile = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });

          Object.defineProperty(customFile, 'webkitRelativePath', {
            value: path ? `${path}/${file.name}` : file.name,
          });

          resolve([customFile]);
        }, reject);
      });
    }

    if (entry.isDirectory && (entry as FileSystemDirectoryEntry).createReader) {
      return new Promise((resolve, reject) => {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const allFiles: File[] = [];

        function readEntries() {
          dirReader.readEntries(async (entries: FileSystemEntry[]) => {
            if (entries.length === 0) {
              resolve(allFiles);
            } else {
              try {
                for (const childEntry of entries) {
                  // Check limits before processing each entry
                  if (depth + 1 > MAX_DEPTH) {
                    throw new Error(`Directory structure too deep (max depth: ${MAX_DEPTH})`);
                  }
                  if (fileCount.current > MAX_FILES) {
                    throw new Error(`Too many files in directory structure (max files: ${MAX_FILES})`);
                  }

                  const newPath = path ? `${path}/${childEntry.name}` : childEntry.name;
                  const files = await collectFilesFromEntry(childEntry, newPath, depth + 1, fileCount);
                  allFiles.push(...files);
                }
                readEntries();
              } catch (error) {
                reject(error);
              }
            }
          }, reject);
        }

        readEntries();
      });
    }

    return [];
  }

  // Trigger file input
  function triggerFileInput() {
    fileInput.value?.click();
  }

  // Input attributes for template
  const inputAttributes = computed(() => ({
    type: 'file',
    accept,
    multiple,
    webkitdirectory: webkitdirectory || config.mode === 'folder',
    ...(config.mode === 'folder' && {
      directory: true,
      mozdirectory: true,
    }),
  }));

  return {
    // Refs
    fileInput,
    dragActive,
    selectedItem,
    errorMessage,
    isProcessing,

    // Computed
    hasError,
    hasSelection,
    isValid,
    inputAttributes,

    // Methods
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    triggerFileInput,
    clearError,
    clearSelection,
    processFiles,
  };
}
