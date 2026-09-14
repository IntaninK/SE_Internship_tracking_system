function getCvDisplayUrl(cv) {
  if (!cv || !cv.fileUrl) return null;

  const isPdf = cv.fileUrl.toLowerCase().endsWith('.pdf') ||
                (cv.fileName && cv.fileName.toLowerCase().endsWith('.pdf'));

  if (isPdf && cv.fileUrl.includes('cloudinary.com')) {
    return cv.fileUrl.replace(/\.pdf$/i, '.jpg');
  }
  return cv.fileUrl; // รูปปกติ (jpg/png) ใช้ URL ตรงๆ ได้เลย
}