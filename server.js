const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'travel-data.json');
const UPLOADS_DIR = path.join(__dirname, 'images');
const DATA_API_PATH = '/api/travel-data';

// Ensure uploads directory exists
async function ensureUploadsDir() {
    try {
        await fs.access(UPLOADS_DIR);
    } catch {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log('Created uploads directory');
    }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-originalname
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Initialize uploads directory
ensureUploadsDir();

// Add detailed logging
console.log('Data file path:', DATA_FILE);
console.log('Uploads directory:', UPLOADS_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded images
app.use('/images', express.static(UPLOADS_DIR));


// Get all travel data
app.get('/api/data', async (req, res) => {
    try {
        console.log('Attempting to read file:', DATA_FILE);
        
        // Check if file exists
        try {
            await fs.access(DATA_FILE);
        } catch (error) {
            console.error('File does not exist:', DATA_FILE);
            return res.status(404).json({ error: 'Data file not found' });
        }
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        console.log('File read successfully, size:', data.length);
        
        const parsedData = JSON.parse(data);
        console.log('JSON parsed successfully');
        
        res.json(parsedData);
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ 
            error: 'Failed to read data', 
            details: error.message,
            path: DATA_FILE 
        });
    }
});

// Save all travel data
app.put('/api/data', async (req, res) => {
    try {
        // Create backup before saving
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(__dirname, 'data', `backup-${timestamp}.json`);
        const currentData = await fs.readFile(DATA_FILE, 'utf8');
        await fs.writeFile(backupFile, currentData);
        
        // Save new data
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Image upload endpoint
app.post('/api/images', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return the file path that can be used in the frontend
        const filePath = `/images/${req.file.filename}`;
        res.json({ 
            success: true, 
            filePath: filePath,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Get all uploaded images (for image gallery/selection)
app.get('/api/images', async (req, res) => {
    try {
        const files = await fs.readdir(UPLOADS_DIR);
        const imageFiles = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                filename: file,
                path: `/images/${file}`,
                uploadDate: file.split('-')[0] // Extract timestamp from filename
            }))
            .sort((a, b) => parseInt(b.uploadDate) - parseInt(a.uploadDate)); // Sort by newest first
        
        res.json(imageFiles);
    } catch (error) {
        console.error('Failed to list images:', error);
        res.status(500).json({ error: 'Failed to list images' });
    }
});

// Delete uploaded image
app.delete('/api/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(UPLOADS_DIR, filename);
        
        await fs.unlink(filePath);
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Failed to delete image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Add new country
app.post('/api/countries', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, countryData } = req.body;
        
        if (data[countryKey]) {
            return res.status(400).json({ error: 'Country already exists' });
        }
        
        data[countryKey] = countryData;
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Country added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add country' });
    }
});

// Delete country
app.delete('/api/countries/:countryKey', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey } = req.params;
        
        if (!data[countryKey]) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        delete data[countryKey];
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Country deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete country' });
    }
});

// Add city to country
app.post('/api/countries/:countryKey/cities', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey } = req.params;
        const cityData = req.body;
        
        if (!data[countryKey]) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        if (!data[countryKey].cities) {
            data[countryKey].cities = [];
        }
        
        data[countryKey].cities.push(cityData);
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'City added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add city' });
    }
});

// Delete city
app.delete('/api/countries/:countryKey/cities/:citySlug', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, citySlug } = req.params;
        
        if (!data[countryKey] || !data[countryKey].cities) {
            return res.status(404).json({ error: 'Country or cities not found' });
        }
        
        const cityIndex = data[countryKey].cities.findIndex(c => c.slug === citySlug);
        if (cityIndex === -1) {
            return res.status(404).json({ error: 'City not found' });
        }
        
        data[countryKey].cities.splice(cityIndex, 1);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'City deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete city' });
    }
});

// Add guide to city
app.post('/api/countries/:countryKey/cities/:citySlug/guides', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, citySlug } = req.params;
        const guideData = req.body;
        
        if (!data[countryKey]) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        const city = data[countryKey].cities?.find(c => c.slug === citySlug);
        if (!city) {
            return res.status(404).json({ error: 'City not found' });
        }
        
        if (!city.guides) city.guides = [];
        city.guides.push(guideData);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Guide added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add guide' });
    }
});

// Delete guide
app.delete('/api/countries/:countryKey/cities/:citySlug/guides/:guideIndex', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, citySlug, guideIndex } = req.params;
        
        const city = data[countryKey]?.cities?.find(c => c.slug === citySlug);
        if (!city || !city.guides || !city.guides[guideIndex]) {
            return res.status(404).json({ error: 'Guide not found' });
        }
        
        city.guides.splice(guideIndex, 1);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Guide deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete guide' });
    }
});

// Add itinerary to country
app.post('/api/countries/:countryKey/itineraries', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey } = req.params;
        const itineraryData = req.body;
        
        if (!data[countryKey]) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        if (!data[countryKey].itineraries) {
            data[countryKey].itineraries = {
                title: `${data[countryKey].name} Itineraries`,
                description: `Explore ${data[countryKey].name} with our curated itineraries.`,
                items: []
            };
        }
        
        data[countryKey].itineraries.items.push(itineraryData);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Itinerary added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add itinerary' });
    }
});

// Delete itinerary
app.delete('/api/countries/:countryKey/itineraries/:itineraryIndex', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, itineraryIndex } = req.params;
        
        if (!data[countryKey] || !data[countryKey].itineraries || !data[countryKey].itineraries.items) {
            return res.status(404).json({ error: 'Country or itineraries not found' });
        }
        
        if (!data[countryKey].itineraries.items[itineraryIndex]) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }
        
        data[countryKey].itineraries.items.splice(itineraryIndex, 1);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Itinerary deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete itinerary' });
    }
});

// Add transport mode to country
app.post('/api/countries/:countryKey/transport', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey } = req.params;
        const transportData = req.body;
        
        if (!data[countryKey]) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        if (!data[countryKey].transport) {
            data[countryKey].transport = {
                title: `Getting Around ${data[countryKey].name}`,
                description: `Transportation options in ${data[countryKey].name}.`,
                modes: []
            };
        }
        
        data[countryKey].transport.modes.push(transportData);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Transport mode added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add transport mode' });
    }
});

// Delete transport mode
app.delete('/api/countries/:countryKey/transport/:transportIndex', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const { countryKey, transportIndex } = req.params;
        
        if (!data[countryKey] || !data[countryKey].transport || !data[countryKey].transport.modes) {
            return res.status(404).json({ error: 'Country or transport modes not found' });
        }
        
        if (!data[countryKey].transport.modes[transportIndex]) {
            return res.status(404).json({ error: 'Transport mode not found' });
        }
        
        data[countryKey].transport.modes.splice(transportIndex, 1);
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Transport mode deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transport mode' });
    }
});

app.get(DATA_API_PATH, async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error serving travel data:', error);
        res.status(500).json({ 
            error: 'Failed to read travel data', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Serve your "images" folder publicly
app.use('/images', express.static(path.join(__dirname, 'images')));