// Run this script with Node.js to convert your CSV to the required JSON format
// Usage: node csv-to-json.js input.csv output.json

const fs = require('fs');
const path = require('path');

// Read command line args
const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'methods_data.json';

if (!inputFile) {
    console.error('Please provide an input CSV file path');
    console.log('Usage: node csv-to-json.js input.csv output.json');
    process.exit(1);
}

// Read the CSV file
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading file: ${err.message}`);
        process.exit(1);
    }

    // Parse the CSV
    const lines = data.split('\n').map(line => line.trim()).filter(line => line);
    const headers = lines[0].split(';');
    
    console.log(`Found ${headers.length} columns in CSV`);
    console.log('Headers:', headers);
    
    // Extract category names and options from headers
    const categories = [];
    const categoryMap = {};
    
    // Process headers to identify categories and their options
    for (let i = 1; i < headers.length; i++) {
        const header = headers[i];
        
        // Skip the Link column as it's not a category-option pair
        const headerLower = header.toLowerCase().trim();
        if (headerLower === 'link' || headerLower === 'url' || headerLower === 'reference') {
            console.log(`Skipping special column: ${header}`);
            continue;
        }
        
        // Extract category and option from header format: "Category - Option"
        const match = header.match(/^(.+?)\s*-\s*(.+)$/);
        
        if (match) {
            const categoryName = match[1].trim();
            const optionName = match[2].trim();
            
            // Convert to safe category ID (same format as your existing app.js)
            const categoryId = categoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            // Create or update the category
            if (!categoryMap[categoryId]) {
                categoryMap[categoryId] = {
                    id: categoryId,
                    name: categoryName,
                    options: []
                };
                categories.push(categoryMap[categoryId]);
            }
            
            // Add option if not already present
            if (!categoryMap[categoryId].options.includes(optionName)) {
                categoryMap[categoryId].options.push(optionName);
            }
        } else {
            console.log(`Warning: Header "${header}" doesn't match expected "Category - Option" format`);
        }
    }
    
    console.log(`Processed ${categories.length} categories`);
    
    // Process the data rows to create methods
    const methods = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        const methodName = values[0].trim();
        
        // Skip empty method names
        if (!methodName) continue;
        
        const method = {
            name: methodName,
            description: '', // Will be filled from Description column or default
            attributes: {}
        };

        // Process each column
        for (let j = 1; j < values.length && j < headers.length; j++) {
            const value = values[j].trim();
            if (value === '') continue;

            const header = headers[j];
            const headerLower = header.toLowerCase().trim();

            // Handle Link column specially
            if (headerLower === 'link' || headerLower === 'url' || headerLower === 'reference') {
                // Basic URL validation and formatting - skip null/empty values
                if (value && value !== 'null' && value.trim() !== '') {
                    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('www.')) {
                        method.link = value.startsWith('www.') ? `https://${value}` : value;
                    } else if (value.includes('.') && !value.includes(' ')) {
                        // If it looks like it might be a URL but missing protocol, add https://
                        method.link = `https://${value}`;
                    }
                }
                continue;
            }

            // Handle Link2 column specially
            if (headerLower === 'link2') {
                // Basic URL validation and formatting - skip null/empty values
                if (value && value !== 'null' && value.trim() !== '') {
                    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('www.')) {
                        method.link2 = value.startsWith('www.') ? `https://${value}` : value;
                    } else if (value.includes('.') && !value.includes(' ')) {
                        // If it looks like it might be a URL but missing protocol, add https://
                        method.link2 = `https://${value}`;
                    }
                }
                continue;
            }

            // Handle Cost Tier column
            if (headerLower === 'cost tier') {
                if (value && value !== 'null') {
                    method.costTier = value;
                }
                continue;
            }

            // Handle Connectivity column
            if (headerLower === 'connectivity') {
                if (value && value !== 'null') {
                    method.connectivity = value;
                }
                continue;
            }

            // Handle Type column
            if (headerLower === 'type') {
                if (value && value !== 'null') {
                    method.type = value;
                }
                continue;
            }

            // Handle Description column
            if (headerLower === 'description') {
                if (value && value !== 'null' && value.trim() !== '') {
                    method.description = value;
                }
                continue;
            }
            
            // Handle category-option columns
            const match = header.match(/^(.+?)\s*-\s*(.+)$/);
            
            if (match) {
                const categoryName = match[1].trim();
                const optionName = match[2].trim();
                const categoryId = categoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                
                // Initialize array for this category if it doesn't exist
                if (!method.attributes[categoryId]) {
                    method.attributes[categoryId] = [];
                }
                
                // Check if this option should be included (handles various boolean representations)
                const truthyValues = ['true', 'yes', '1', 'x', 'TRUE', 'YES', 'X', 'True', 'Yes'];
                
                if (truthyValues.includes(value) || value === true) {
                    if (!method.attributes[categoryId].includes(optionName)) {
                        method.attributes[categoryId].push(optionName);
                    }
                }
            }
        }

        // Set default description if not provided in CSV
        if (!method.description || method.description.trim() === '') {
            method.description = `${methodName} methodology for adolescent girl empowerment research`;
        }

        methods.push(method);
    }
    
    // Create the final JSON object (matching your app.js format exactly)
    const jsonData = {
        categories,
        methods
    };
    
    // Write the JSON to file
    fs.writeFile(outputFile, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error(`Error writing JSON file: ${err.message}`);
            process.exit(1);
        }
        
        console.log(`✅ Successfully converted ${inputFile} to ${outputFile}`);
        console.log(`📊 Statistics:`);
        console.log(`   - Categories: ${categories.length}`);
        console.log(`   - Methods: ${methods.length}`);
        console.log(`   - Methods with links: ${methods.filter(m => m.link).length}`);
        console.log(`   - Methods with custom descriptions: ${methods.filter(m => !m.description.includes('methodology for adolescent girl empowerment research')).length}`);
        console.log(`   - Output file size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
        
        // Show sample of what was created
        console.log('\n📋 Sample method structure:');
        if (methods.length > 0) {
            const sampleMethod = methods[0];
            console.log(`Name: ${sampleMethod.name}`);
            console.log(`Description: ${sampleMethod.description.substring(0, 80)}${sampleMethod.description.length > 80 ? '...' : ''}`);
            if (sampleMethod.link) {
                console.log(`Link: ${sampleMethod.link}`);
            }
            console.log(`Categories: ${Object.keys(sampleMethod.attributes).join(', ')}`);
        }
        
        // Validate that we have the expected structure
        console.log('\n✅ Validation:');
        console.log(`   - Has categories array: ${Array.isArray(jsonData.categories)}`);
        console.log(`   - Has methods array: ${Array.isArray(jsonData.methods)}`);
        console.log(`   - All methods have name: ${methods.every(m => m.name)}`);
        console.log(`   - All methods have attributes: ${methods.every(m => m.attributes)}`);
    });
});