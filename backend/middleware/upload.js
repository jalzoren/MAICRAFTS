import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidType = allowedTypes.includes(file.mimetype);
  const isValidExt = allowedExtensions.includes(ext);
  
  if (isValidType && isValidExt) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10  // ✅ FIXED: Changed from 1 to 10 to allow multiple images
  },
  fileFilter: fileFilter
});

// ✅ FIXED: Safer optimizeImage that doesn't delete original until temp is ready
export const optimizeImage = async (inputPath, outputPath = null) => {
  try {
    const targetPath = outputPath || inputPath;
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found for optimization: ${inputPath}`);
      return false;
    }
    
    const metadata = await sharp(inputPath).metadata();
    
    let width = metadata.width;
    let height = metadata.height;
    const maxDimension = 800;
    
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }
    
    const tempPath = inputPath + '.tmp';
    
    await sharp(inputPath)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .png({ quality: 80, compressionLevel: 9 })
      .webp({ quality: 80 })
      .toFile(tempPath);
    
    // Verify temp file was created
    if (!fs.existsSync(tempPath)) {
      console.error('Temp file was not created');
      return false;
    }
    
    // Replace original with optimized version
    fs.unlinkSync(inputPath);
    fs.renameSync(tempPath, inputPath);
    
    return true;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return false;
  }
};

// Virus scanning function
export const scanForVirus = async (filePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found for virus scan: ${filePath}`);
      return { isInfected: false, message: 'File not found', skipped: true };
    }
    
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const clamscan = spawn('clamscan', ['--no-summary', filePath]);
      
      let output = '';
      let errorOutput = '';
      
      clamscan.stdout.on('data', (data) => { output += data.toString(); });
      clamscan.stderr.on('data', (data) => { errorOutput += data.toString(); });
      
      clamscan.on('close', (code) => {
        if (code === 0) {
          resolve({ isInfected: false, message: 'File is clean' });
        } else if (code === 1) {
          resolve({ isInfected: true, message: output || 'Virus detected' });
        } else {
          console.warn('ClamAV scan error:', errorOutput);
          resolve({ isInfected: false, message: 'Virus scanning not available', skipped: true });
        }
      });
      
      clamscan.on('error', (error) => {
        console.error('ClamAV process error:', error);
        resolve({ isInfected: false, message: 'Virus scanning failed', skipped: true });
      });
    });
  } catch (error) {
    console.error('Virus scanning error:', error);
    return { isInfected: false, message: 'Virus scanning not configured', skipped: true };
  }
};

export const validateImageDimensions = async (filePath, maxWidth = 2000, maxHeight = 2000) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found for dimension validation: ${filePath}`);
      return { valid: false, message: 'File not found' };
    }
    
    const metadata = await sharp(filePath).metadata();
    
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      return { valid: false, message: `Image dimensions must be less than ${maxWidth}x${maxHeight} pixels` };
    }
    
    return { valid: true, message: 'Dimensions are valid' };
  } catch (error) {
    console.error('Error validating dimensions:', error);
    return { valid: false, message: 'Could not validate image dimensions' };
  }
};

export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

export default upload;