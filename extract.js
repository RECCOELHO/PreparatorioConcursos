const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Manual PEP Hospital Geral 2026 V02.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('manual_pep.txt', data.text);
    console.log('PDF extracted successfully to manual_pep.txt');
}).catch(function(err) {
    console.error('Error extracting PDF:', err);
});
