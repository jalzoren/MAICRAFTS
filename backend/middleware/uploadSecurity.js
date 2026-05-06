// middleware/uploadSecurity.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file types
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_REQUEST = 5;

// Custom file filter
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new Error(`Invalid file type. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`), false);
    return;
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = Object.values(ALLOWED_MIME_TYPES);
  if (!allowedExts.includes(ext)) {
    cb(new Error(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`), false);
    return;
  }

  // Sanitize filename - remove dangerous characters
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  file.originalname = sanitizedName;

  cb(null, true);
};

// Configure storage with security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const randomBytes = crypto.randomBytes(16);
    const hash = crypto.createHash('sha256');
    hash.update(randomBytes);
    hash.update(Date.now().toString());
    hash.update(file.originalname);
    
    const secureName = hash.digest('hex');
    const ext = path.extname(file.originalname);
    
    cb(null, `${secureName}${ext}`);
  }
});

// Validate image dimensions and content
const validateImageContent = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // Check minimum dimensions
    if (metadata.width < 100 || metadata.height < 100) {
      throw new Error('Image dimensions too small. Minimum 100x100 pixels');
    }
    
    // Check maximum dimensions
    if (metadata.width > 4000 || metadata.height > 4000) {
      throw new Error('Image dimensions too large. Maximum 4000x4000 pixels');
    }
    
    // Check file size again (double-check)
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Re-encode image to strip metadata and prevent exploits
    const sanitizedPath = filePath.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '_sanitized$&');
    await sharp(filePath)
      .resize(metadata.width, metadata.height, { fit: 'contain' })
      .jpeg({ quality: 80, progressive: true }) // Re-encode to strip malicious data
      .toFile(sanitizedPath);
    
    // Replace original with sanitized version
    fs.unlinkSync(filePath);
    fs.renameSync(sanitizedPath, filePath);
    
    return { valid: true, metadata };
  } catch (error) {
    console.error('Image validation error:', error);
    return { valid: false, error: error.message };
  }
};

// Simple file signature check (magic numbers)
const checkFileSignature = (filePath) => {
  const signatures = {
    'jpg': [0xFF, 0xD8, 0xFF],
    'jpeg': [0xFF, 0xD8, 0xFF],
    'png': [0x89, 0x50, 0x4E, 0x47],
    'gif': [0x47, 0x49, 0x46],
    'webp': [0x52, 0x49, 0x46, 0x46],
  };
  
  try {
    const buffer = fs.readFileSync(filePath);
    const bytes = Array.from(buffer.slice(0, 4));
    
    for (const [format, signature] of Object.entries(signatures)) {
      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  } catch (error) {
    console.error('Signature check error:', error);
    return false;
  }
};

// Main upload middleware configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST
  },
  fileFilter: fileFilter
});

// Enhanced upload middleware with security checks
const secureUpload = async (req, res, next) => {
  // Use multer first
  upload.array('images', MAX_FILES_PER_REQUEST)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(400).json({ 
            success: false, 
            error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
          });
        }
        if (err.code === 'TOO_MANY_FILES') {
          return res.status(400).json({ 
            success: false, 
            error: `Too many files. Max: ${MAX_FILES_PER_REQUEST}` 
          });
        }
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    
    // If no files uploaded, proceed
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    try {
      // Validate each uploaded file
      for (const file of req.files) {
        // Check for double extensions (exploit prevention)
        const dangerousExts = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.html', '.htm', '.xml'];
        const hasDangerousExt = dangerousExts.some(ext => 
          file.originalname.toLowerCase().includes(ext)
        );
        
        if (hasDangerousExt) {
          // Delete the file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid file name detected' 
          });
        }
        
        // Check file signature (magic numbers)
        const isValidSignature = checkFileSignature(file.path);
        if (!isValidSignature) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid or corrupted image file' 
          });
        }
        
        // Validate image content
        const validation = await validateImageContent(file.path);
        if (!validation.valid) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ 
            success: false, 
            error: `Invalid image: ${validation.error}` 
          });
        }
        
        console.log(`✅ File validated: ${file.originalname} (${file.size} bytes)`);
      }
      
      next();
    } catch (error) {
      // Clean up files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error('Error deleting file:', unlinkError);
            }
          }
        });
      }
      next(error);
    }
  });
};

// Clean up old temp files (run every hour)
const cleanupTempFiles = () => {
  const uploadDir = path.join(__dirname, '../uploads/products');
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  setInterval(() => {
    if (!fs.existsSync(uploadDir)) return;
    
    const now = Date.now();
    fs.readdir(uploadDir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          if (now - stats.mtimeMs > maxAge) {
            fs.unlink(filePath, (err) => {
              if (err) console.error(`Failed to delete ${filePath}:`, err);
            });
          }
        });
      });
    });
  }, 60 * 60 * 1000); // Run every hour
};

// Start cleanup in production
if (process.env.NODE_ENV === 'production') {
  cleanupTempFiles();
}

export {
  secureUpload,
  upload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REQUEST
};