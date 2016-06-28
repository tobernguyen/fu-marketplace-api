# FU Marketplace API

## Prerequirement
- PostgreSQL 9.1 or higher
- GraphicMagick 1.3.x or higher
- Elasticsearch 2.x (2.3 at this time write this README)

## Setup
Install dependencies
```bash
npm install
```

Create config file for development environment by copying `.env.example` to `.env.development` and edit it to match your postgresql and elasticsearch setting:
```
DB_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/fu_marketplace
...
ELASTIC_SEARCH_HOST=localhost:9200
ELASTIC_SEARCH_INDEX_NAME=fum
```

And also edit `.env.test` to match to postgresql setting:
```
DB_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/fu_marketplace_test
...
ELASTIC_SEARCH_HOST=localhost:9200
ELASTIC_SEARCH_INDEX_NAME=fum_test
```

Run migrations, seeds and elasticsearch setup
```bash
npm run db:migrate
npm run db:seed:all
npm run setup:elasticsearch
```

## SEED
Run shop seeder:
```bash
npm run utils:seeder:shop
```

Start local server
```bash
npm start
```

## Testing
Run all test
```bash
npm test
```

Watch files and auto re-test
```bash
npm run test:watch
```

Test individual file
```bash
npm run test:file test/models/User.js
```

# LICENSE
Full License Text
The MIT License (MIT)

Copyright (c) 2016 ProIS Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
