class TravelDataEditor {
    constructor() {
        this.data = {};
        this.currentImageTarget = null; // Track which input field is being updated
        this.selectedImagePath = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderData();
    }

    async loadData() {
        try {
            const response = await fetch('/api/data');
            this.data = await response.json();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('countries-container').style.display = 'block';
        } catch (error) {
            console.error('Failed to load data:', error);
            alert('Failed to load travel data');
        }
    }

    setupEventListeners() {
        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => this.saveData());
        
        // Add country button
        document.getElementById('addCountryBtn').addEventListener('click', () => this.showAddCountryModal());
        
        // Form submissions
        document.getElementById('addCountryForm').addEventListener('submit', (e) => this.handleAddCountry(e));
        document.getElementById('addCityForm').addEventListener('submit', (e) => this.handleAddCity(e));
        document.getElementById('addGuideForm').addEventListener('submit', (e) => this.handleAddGuide(e));
        document.getElementById('addItineraryForm').addEventListener('submit', (e) => this.handleAddItinerary(e));
        document.getElementById('addTransportForm').addEventListener('submit', (e) => this.handleAddTransport(e));
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    renderData() {
        const container = document.getElementById('countries-container');
        container.innerHTML = '';

        Object.entries(this.data).forEach(([countryKey, countryData]) => {
            const countryCard = this.createCountryCard(countryKey, countryData);
            container.appendChild(countryCard);
        });
    }

    createCountryCard(countryKey, countryData) {
        const card = document.createElement('div');
        card.className = 'country-card';
        
        card.innerHTML = `
            <div class="country-header">
                <div>
                    <h2>${countryData.name}</h2>
                    <p>${countryData.continent}</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="editor.showAddCityModal('${countryKey}')">
                        Add City
                    </button>
                    <button class="btn btn-secondary" onclick="editor.showAddItineraryModal('${countryKey}')">
                        Add Itinerary
                    </button>
                    <button class="btn btn-secondary" onclick="editor.showAddTransportModal('${countryKey}')">
                        Add Transport
                    </button>
                    <button class="btn btn-danger" onclick="editor.deleteCountry('${countryKey}')" title="Delete Country">
                        X
                    </button>
                </div>
            </div>
            <div class="country-content">
                <div class="section">
                    <p><strong>Description:</strong> ${countryData.description}</p>
                    <p><strong>Flag:</strong> ${countryData.flag}</p>
                    <p><strong>Hero Image:</strong> ${countryData.heroImage}</p>
                    ${countryData.heroImage ? `<img src="${countryData.heroImage}" alt="${countryData.name} hero" class="image-preview" style="margin-top: 10px;">` : ''}
                </div>
                
                ${this.renderCities(countryKey, countryData.cities || [])}
                ${this.renderItineraries(countryKey, countryData.itineraries)}
                ${this.renderTransport(countryKey, countryData.transport)}
            </div>
        `;
        
        return card;
    }

    renderCities(countryKey, cities) {
        if (!cities.length) return '<div class="section"><h3>Cities</h3><p>No cities added yet.</p></div>';
        
        const citiesHtml = cities.map((city, cityIndex) => `
            <div class="city-card">
                <div class="city-header">
                    <h4>${city.name}</h4>
                    <div class="city-actions">
                        <button class="btn btn-secondary btn-small" onclick="editor.showAddGuideModal('${countryKey}', '${city.slug}')">
                            Add Guide
                        </button>
                        <button class="btn btn-danger btn-small" onclick="editor.deleteCity('${countryKey}', '${city.slug}')" title="Delete City">
                            X
                        </button>
                    </div>
                </div>
                <div class="city-info">
                    <div class="city-details">
                        <p><strong>Slug:</strong> ${city.slug}</p>
                        <p><strong>Description:</strong> ${city.description}</p>
                        <p><strong>Image:</strong> ${city.image}</p>
                    </div>
                    ${city.image ? `<img src="${city.image}" alt="${city.name}" class="image-preview">` : ''}
                </div>
                ${this.renderGuides(countryKey, city.slug, city.guides || [])}
            </div>
        `).join('');
        
        return `
            <div class="section">
                <h3>Cities (${cities.length})</h3>
                <div class="cities-grid">${citiesHtml}</div>
            </div>
        `;
    }

    renderGuides(countryKey, citySlug, guides) {
        if (!guides.length) return '<p><em>No guides added yet.</em></p>';
        
        const guidesHtml = guides.map((guide, index) => `
            <div class="guide-item">
                <div class="guide-header">
                    <strong>${guide.title}</strong>
                    <button class="btn-delete" onclick="editor.deleteGuide('${countryKey}', '${citySlug}', ${index})">&times;</button>
                </div>
                ${guide.description ? `<p>${guide.description}</p>` : ''}
                ${guide.duration ? `<p><em>Duration: ${guide.duration}</em></p>` : ''}
            </div>
        `).join('');
        
        return `
            <div class="guides-section">
                <strong>Guides:</strong>
                ${guidesHtml}
            </div>
        `;
    }

    renderItineraries(countryKey, itineraries) {
        if (!itineraries || !itineraries.items?.length) {
            return `
                <div class="section">
                    <h3>Itineraries</h3>
                    <p>No itineraries added yet.</p>
                </div>
            `;
        }
        
        const itinerariesHtml = itineraries.items.map((item, index) => `
            <div class="itinerary-item">
                <div class="itinerary-header">
                    <strong>${item.title}</strong>
                    <button class="btn-delete" onclick="editor.deleteItinerary('${countryKey}', ${index})">&times;</button>
                </div>
                <p><strong>Cities:</strong> ${Array.isArray(item.cities) ? item.cities.join(', ') : item.cities}</p>
                ${item.duration ? `<p><strong>Duration:</strong> ${item.duration}</p>` : ''}
                ${item.description ? `<p>${item.description}</p>` : ''}
            </div>
        `).join('');
        
        return `
            <div class="section">
                <h3>${itineraries.title}</h3>
                <p>${itineraries.description}</p>
                ${itinerariesHtml}
            </div>
        `;
    }

    renderTransport(countryKey, transport) {
        if (!transport || !transport.modes?.length) {
            return `
                <div class="section">
                    <h3>Transportation</h3>
                    <p>No transport modes added yet.</p>
                </div>
            `;
        }
        
        const modesHtml = transport.modes.map((mode, index) => `
            <div class="transport-item">
                <div class="transport-header">
                    <strong>${mode.type}</strong>
                    <button class="btn-delete" onclick="editor.deleteTransport('${countryKey}', ${index})">&times;</button>
                </div>
                <p>${mode.details}</p>
                ${mode.image ? `
                    <div style="margin-top: 10px;">
                        <img src="${mode.image}" alt="${mode.type}" class="image-preview">
                        <p><small>Image: ${mode.image}</small></p>
                    </div>
                ` : ''}
                ${mode.cost ? `<p><strong>Cost:</strong> ${mode.cost}</p>` : ''}
            </div>
        `).join('');
        
        return `
            <div class="section">
                <h3>${transport.title}</h3>
                <p>${transport.description}</p>
                ${modesHtml}
            </div>
        `;
    }

    // Image upload functionality
    showImageUpload(targetInputId) {
        this.currentImageTarget = targetInputId;
        this.selectedImagePath = null;
        document.getElementById('imageUploadModal').style.display = 'block';
        this.loadImageGallery();
        this.setupImageUpload();
    }

    async loadImageGallery() {
        try {
            const response = await fetch('/api/images');
            const images = await response.json();
            
            const gallery = document.getElementById('imageGallery');
            gallery.innerHTML = '';
            
            if (images.length === 0) {
                gallery.innerHTML = '<p>No images uploaded yet. Upload your first image above!</p>';
                return;
            }
            
            images.forEach(image => {
                const imageElement = document.createElement('div');
                imageElement.className = 'gallery-image';
                imageElement.onclick = () => this.selectImage(image.path, imageElement);
                
                imageElement.innerHTML = `
                    <img src="${image.path}" alt="${image.filename}" loading="lazy">
                    <div class="image-overlay">${image.filename}</div>
                    <button class="delete-btn" onclick="event.stopPropagation(); editor.deleteImage('${image.filename}')" title="Delete image">&times;</button>
                `;
                
                gallery.appendChild(imageElement);
            });
        } catch (error) {
            console.error('Failed to load image gallery:', error);
            document.getElementById('imageGallery').innerHTML = '<p>Error loading images.</p>';
        }
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('imageUpload');
        
        // Remove existing event listeners
        uploadArea.replaceWith(uploadArea.cloneNode(true));
        const newUploadArea = document.getElementById('uploadArea');
        const newFileInput = document.getElementById('imageUpload');
        
        // Click to upload
        newUploadArea.addEventListener('click', () => {
            newFileInput.click();
        });
        
        // File input change
        newFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadImage(e.target.files[0]);
            }
        });
        
        // Drag and drop
        newUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            newUploadArea.classList.add('dragover');
        });
        
        newUploadArea.addEventListener('dragleave', () => {
            newUploadArea.classList.remove('dragover');
        });
        
        newUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            newUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.uploadImage(files[0]);
            } else {
                alert('Please drop an image file.');
            }
        });
    }

    async uploadImage(file) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Show progress
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressContainer.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';
        
        try {
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
                }
            });
            
            xhr.onload = () => {
                progressContainer.style.display = 'none';
                
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        this.showSuccessMessage('Image uploaded successfully!');
                        this.loadImageGallery(); // Refresh gallery
                        this.selectImage(result.filePath); // Auto-select the uploaded image
                    } else {
                        alert('Upload failed: ' + result.error);
                    }
                } else {
                    alert('Upload failed. Please try again.');
                }
            };
            
            xhr.onerror = () => {
                progressContainer.style.display = 'none';
                alert('Upload failed. Please check your connection and try again.');
            };
            
            xhr.open('POST', '/api/images');
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            progressContainer.style.display = 'none';
            alert('Upload failed: ' + error.message);
        }
    }

    selectImage(imagePath, imageElement = null) {
        this.selectedImagePath = imagePath;
        
        // Update UI to show selection
        document.querySelectorAll('.gallery-image').forEach(img => {
            img.classList.remove('selected');
        });
        
        if (imageElement) {
            imageElement.classList.add('selected');
        }
        
        // Show preview
        const preview = document.getElementById('selectedImagePreview');
        const previewImage = document.getElementById('previewImage');
        const previewPath = document.getElementById('selectedImagePath');
        
        previewImage.src = imagePath;
        previewPath.textContent = imagePath;
        preview.style.display = 'block';
    }

    confirmImageSelection() {
        if (this.selectedImagePath && this.currentImageTarget) {
            document.getElementById(this.currentImageTarget).value = this.selectedImagePath;
            document.getElementById('imageUploadModal').style.display = 'none';
            this.showSuccessMessage('Image selected successfully!');
        }
    }

    async deleteImage(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/images/${filename}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('Image deleted successfully!');
                this.loadImageGallery(); // Refresh gallery
            } else {
                alert('Failed to delete image: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
            alert('Failed to delete image');
        }
    }

    // Modal display methods
    showAddCountryModal() {
        document.getElementById('addCountryModal').style.display = 'block';
    }

    showAddCityModal(countryKey) {
        document.getElementById('cityCountryKey').value = countryKey;
        document.getElementById('addCityModal').style.display = 'block';
    }

    showAddGuideModal(countryKey, citySlug) {
        document.getElementById('guideCountryKey').value = countryKey;
        document.getElementById('guideCitySlug').value = citySlug;
        document.getElementById('addGuideModal').style.display = 'block';
    }

    showAddItineraryModal(countryKey) {
        document.getElementById('itineraryCountryKey').value = countryKey;
        document.getElementById('addItineraryModal').style.display = 'block';
    }

    showAddTransportModal(countryKey) {
        document.getElementById('transportCountryKey').value = countryKey;
        document.getElementById('addTransportModal').style.display = 'block';
    }

    // Form handlers
    async handleAddCountry(e) {
        e.preventDefault();
        
        const countryKey = document.getElementById('countryKey').value;
        const countryData = {
            name: document.getElementById('countryName').value,
            continent: document.getElementById('continent').value,
            flag: document.getElementById('flag').value,
            description: document.getElementById('description').value,
            heroImage: document.getElementById('heroImage').value,
            cities: []
        };
        
        try {
            const response = await fetch('/api/countries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryKey, countryData })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.data[countryKey] = countryData;
                this.renderData();
                document.getElementById('addCountryModal').style.display = 'none';
                e.target.reset();
                this.showSuccessMessage('Country added successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to add country:', error);
            alert('Failed to add country');
        }
    }

    async handleAddCity(e) {
        e.preventDefault();
        
        const countryKey = document.getElementById('cityCountryKey').value;
        const cityData = {
            slug: document.getElementById('citySlug').value,
            name: document.getElementById('cityName').value,
            description: document.getElementById('cityDescription').value,
            image: document.getElementById('cityImage').value,
            guides: []
        };
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/cities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cityData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (!this.data[countryKey].cities) this.data[countryKey].cities = [];
                this.data[countryKey].cities.push(cityData);
                this.renderData();
                document.getElementById('addCityModal').style.display = 'none';
                e.target.reset();
                this.showSuccessMessage('City added successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to add city:', error);
            alert('Failed to add city');
        }
    }

    async handleAddGuide(e) {
        e.preventDefault();
        
        const countryKey = document.getElementById('guideCountryKey').value;
        const citySlug = document.getElementById('guideCitySlug').value;
        
        const guideData = {
            title: document.getElementById('guideTitle').value,
            description: document.getElementById('guideDescription').value,
            duration: document.getElementById('guideDuration').value
        };
        
        // Remove empty fields
        Object.keys(guideData).forEach(key => {
            if (!guideData[key]) delete guideData[key];
        });
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/cities/${citySlug}/guides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guideData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                const city = this.data[countryKey].cities.find(c => c.slug === citySlug);
                if (!city.guides) city.guides = [];
                city.guides.push(guideData);
                
                this.renderData();
                document.getElementById('addGuideModal').style.display = 'none';
                e.target.reset();
                this.showSuccessMessage('Guide added successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to add guide:', error);
            alert('Failed to add guide');
        }
    }

    async handleAddItinerary(e) {
        e.preventDefault();
        
        const countryKey = document.getElementById('itineraryCountryKey').value;
        
        const citiesText = document.getElementById('itineraryCities').value;
        const cities = citiesText.split('\n').map(city => city.trim()).filter(city => city);
        
        const itineraryData = {
            title: document.getElementById('itineraryTitle').value,
            cities: cities,
            duration: document.getElementById('itineraryDuration').value,
            description: document.getElementById('itineraryDescription').value
        };
        
        // Remove empty fields
        Object.keys(itineraryData).forEach(key => {
            if (!itineraryData[key]) delete itineraryData[key];
        });
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/itineraries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itineraryData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (!this.data[countryKey].itineraries) {
                    this.data[countryKey].itineraries = {
                        title: `${this.data[countryKey].name} Itineraries`,
                        description: `Explore ${this.data[countryKey].name} with our curated itineraries.`,
                        items: []
                    };
                }
                this.data[countryKey].itineraries.items.push(itineraryData);
                
                this.renderData();
                document.getElementById('addItineraryModal').style.display = 'none';
                e.target.reset();
                this.showSuccessMessage('Itinerary added successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to add itinerary:', error);
            alert('Failed to add itinerary');
        }
    }

    async handleAddTransport(e) {
        e.preventDefault();
        
        const countryKey = document.getElementById('transportCountryKey').value;
        
        const transportData = {
            type: document.getElementById('transportType').value,
            details: document.getElementById('transportDetails').value,
            image: document.getElementById('transportImage').value,
            cost: document.getElementById('transportCost').value
        };
        
        // Remove empty fields
        Object.keys(transportData).forEach(key => {
            if (!transportData[key]) delete transportData[key];
        });
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/transport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transportData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (!this.data[countryKey].transport) {
                    this.data[countryKey].transport = {
                        title: `Getting Around ${this.data[countryKey].name}`,
                        description: `Transportation options in ${this.data[countryKey].name}.`,
                        modes: []
                    };
                }
                this.data[countryKey].transport.modes.push(transportData);
                
                this.renderData();
                document.getElementById('addTransportModal').style.display = 'none';
                e.target.reset();
                this.showSuccessMessage('Transport mode added successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to add transport mode:', error);
            alert('Failed to add transport mode');
        }
    }

    // Delete methods
    async deleteCountry(countryKey) {
        const countryName = this.data[countryKey]?.name || countryKey;
        
        if (!confirm(`Are you sure you want to delete the entire country "${countryName}"? This will remove all cities, itineraries, and transport information for this country. This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/countries/${countryKey}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                delete this.data[countryKey];
                this.renderData();
                this.showSuccessMessage(`Country "${countryName}" deleted successfully!`);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to delete country:', error);
            alert('Failed to delete country');
        }
    }

    async deleteCity(countryKey, citySlug) {
        const city = this.data[countryKey]?.cities?.find(c => c.slug === citySlug);
        const cityName = city?.name || citySlug;
        
        if (!confirm(`Are you sure you want to delete the city "${cityName}"? This will remove all guides for this city. This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/cities/${citySlug}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const cityIndex = this.data[countryKey].cities.findIndex(c => c.slug === citySlug);
                if (cityIndex !== -1) {
                    this.data[countryKey].cities.splice(cityIndex, 1);
                }
                this.renderData();
                this.showSuccessMessage(`City "${cityName}" deleted successfully!`);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to delete city:', error);
            alert('Failed to delete city');
        }
    }

    async deleteGuide(countryKey, citySlug, guideIndex) {
        const city = this.data[countryKey]?.cities?.find(c => c.slug === citySlug);
        const guideName = city?.guides?.[guideIndex]?.title || 'this guide';
        
        if (!confirm(`Are you sure you want to delete "${guideName}"?`)) return;
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/cities/${citySlug}/guides/${guideIndex}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                city.guides.splice(guideIndex, 1);
                this.renderData();
                this.showSuccessMessage('Guide deleted successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to delete guide:', error);
            alert('Failed to delete guide');
        }
    }

    async deleteItinerary(countryKey, itineraryIndex) {
        const itinerary = this.data[countryKey]?.itineraries?.items?.[itineraryIndex];
        const itineraryName = itinerary?.title || 'this itinerary';
        
        if (!confirm(`Are you sure you want to delete "${itineraryName}"?`)) return;
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/itineraries/${itineraryIndex}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.data[countryKey].itineraries.items.splice(itineraryIndex, 1);
                this.renderData();
                this.showSuccessMessage('Itinerary deleted successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to delete itinerary:', error);
            alert('Failed to delete itinerary');
        }
    }

    async deleteTransport(countryKey, transportIndex) {
        const transport = this.data[countryKey]?.transport?.modes?.[transportIndex];
        const transportName = transport?.type || 'this transport mode';
        
        if (!confirm(`Are you sure you want to delete "${transportName}"?`)) return;
        
        try {
            const response = await fetch(`/api/countries/${countryKey}/transport/${transportIndex}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.data[countryKey].transport.modes.splice(transportIndex, 1);
                this.renderData();
                this.showSuccessMessage('Transport mode deleted successfully!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to delete transport mode:', error);
            alert('Failed to delete transport mode');
        }
    }

    async saveData() {
        try {
            const response = await fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage('All data saved successfully!');
            } else {
                alert('Failed to save data: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to save data:', error);
            alert('Failed to save data');
        }
    }

    showSuccessMessage(message) {
        // Create temporary success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ACC9;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the editor when the page loads
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new TravelDataEditor();
});
