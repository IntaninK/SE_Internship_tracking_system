// CV Upload and Preview Logic
const cvInput = document.getElementById('cv-upload-input');
const cvUploadContent = document.getElementById('cv-upload-content');
const cvPreviewContainer = document.getElementById('cv-preview-container');

// Preview Elements
const cvPreviewImg = document.getElementById('cv-preview-img');
const cvPreviewPdf = document.getElementById('cv-preview-pdf');
const cvPdfName = document.getElementById('cv-pdf-name');

// Modal Elements
const cvModal = document.getElementById('cv-modal');
const cvModalImg = document.getElementById('cv-modal-img');
const cvModalPdf = document.getElementById('cv-modal-pdf');

const cvUploadZone = document.getElementById('cv-upload-zone');

let currentFileUrl = null;

// Make the entire zone clickable for initial upload
if (cvUploadZone) {
  cvUploadZone.addEventListener('click', () => {
    if(cvPreviewContainer.style.display === 'none') {
      cvInput.click();
    }
  });
}

// Handle File Selection
if (cvInput) {
  cvInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    // Revoke previous URL to prevent memory leaks
    if (currentFileUrl) {
      URL.revokeObjectURL(currentFileUrl);
    }

    if (file) {
      currentFileUrl = URL.createObjectURL(file);

      if (file.type.startsWith('image/')) {
        // Handle Image
        cvPreviewImg.src = currentFileUrl;
        cvModalImg.src = currentFileUrl;
        
        cvPreviewImg.style.display = 'block';
        cvPreviewPdf.style.display = 'none';
        
        cvModalImg.style.display = 'block';
        cvModalPdf.style.display = 'none';

        cvUploadContent.style.display = 'none';
        cvPreviewContainer.style.display = 'flex';

      } else if (file.type === 'application/pdf') {
        // Handle PDF
        cvPdfName.textContent = file.name;
        cvModalPdf.src = currentFileUrl;

        cvPreviewImg.style.display = 'none';
        cvPreviewPdf.style.display = 'flex';
        
        cvModalImg.style.display = 'none';
        cvModalPdf.style.display = 'block';

        cvUploadContent.style.display = 'none';
        cvPreviewContainer.style.display = 'flex';
      } else {
        alert('กรุณาอัปโหลดไฟล์รูปภาพ (JPG, PNG) หรือ PDF');
      }
    }
  });
}

// Modal Controls
window.openCvModal = function() {
  if (cvModal) {
    cvModal.style.display = 'flex';
  }
};

window.closeCvModal = function() {
  if (cvModal) {
    cvModal.style.display = 'none';
  }
};
