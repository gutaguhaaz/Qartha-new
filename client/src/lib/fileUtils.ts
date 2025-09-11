
export const FILE_CATEGORIES = {
  gallery: {
    accept: "image/*",
    label: "Gallery Images"
  },
  locationImages: {
    accept: "image/*", 
    label: "Location Images"
  },
  diagramImages: {
    accept: "image/*",
    label: "Diagram Images"
  },
  documents: {
    accept: ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Documents"
  }
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

export const isDocumentFile = (filename: string): boolean => {
  const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
  return docExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

export const getFileCategory = (filename: string): string => {
  if (isImageFile(filename)) return 'image';
  if (isDocumentFile(filename)) return 'document';
  return 'unknown';
};
