const { createSwaggerSpec } = require('next-swagger-doc');
const fs = require('fs');
const path = require('path');

const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
        openapi: '3.0.3',
        info: { title: 'BDP API', version: '1.0.0', description: 'Generated API spec' },
        servers: [{ url: 'http://localhost:3000' }],
    },
});

const outPath = path.resolve(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf8');
console.log('Wrote OpenAPI JSON to', outPath);
