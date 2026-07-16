require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/Product');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const ColorThief = require('colorthief');
const convert = require('color-convert');
const deltaE = require('delta-e');
const fs = require('fs');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dupedna';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to MongoDB (Atlas/Local)');
  } catch (err) {
    console.log('Primary MongoDB connection failed. Falling back to MongoMemoryServer...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('Connected to In-Memory MongoDB');
      
      const seedData = [
        {
          name: "Water Sleeping Mask", brand: "LANEIGE", category: "Moisturizer", price: 2500,
          ingredients: ["Water", "Butylene Glycol", "Glycerin", "Trehalose", "Cyclopentasiloxane"],
          attributes: { finish: "Dewy", shadeFamily: "None", skinType: ["Dry", "Combination"] },
          productUrl: "https://example.com/laneige", dominantColorLAB: { L: 90, a: -2, b: -5 }
        },
        {
          name: "Hydrating Water Gel", brand: "Neutrogena", category: "Moisturizer", price: 950,
          ingredients: ["Water", "Dimethicone", "Glycerin", "Butylene Glycol", "Trehalose", "Phenoxyethanol"],
          attributes: { finish: "Dewy", shadeFamily: "None", skinType: ["Oily", "Combination"] },
          productUrl: "https://example.com/neutrogena", dominantColorLAB: { L: 85, a: -5, b: -10 }
        },
        {
          name: "Ultra Facial Cream", brand: "Kiehl's", category: "Moisturizer", price: 3200,
          ingredients: ["Water", "Glycerin", "Squalane", "Cyclopentasiloxane", "Stearic Acid"],
          attributes: { finish: "Natural", shadeFamily: "None", skinType: ["Dry", "Normal"] },
          productUrl: "https://example.com/kiehls", dominantColorLAB: { L: 95, a: 0, b: 2 }
        },
        {
          name: "Squalane Moisture Cream", brand: "The Ordinary", category: "Moisturizer", price: 800,
          ingredients: ["Water", "Glycerin", "Squalane", "Stearic Acid", "Cetyl Alcohol"],
          attributes: { finish: "Natural", shadeFamily: "None", skinType: ["Dry", "Normal"] },
          productUrl: "https://example.com/theordinary", dominantColorLAB: { L: 92, a: 1, b: 5 }
        }
      ];

      (async () => {
        while (!generateEmbedding) await new Promise(r => setTimeout(r, 500));
        for (const item of seedData) {
          const output = await generateEmbedding(item.ingredients.join(', '), { pooling: 'mean', normalize: true });
          await new Product({ ...item, ingredientEmbedding: Array.from(output.data) }).save();
        }
        console.log('Seeded in-memory DB with 4 mock products.');
      })();

    } catch (fallbackErr) {
      console.error('Failed to start MongoMemoryServer:', fallbackErr);
    }
  }
}
connectDB();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

let generateEmbedding;
async function initTransformers() {
  const transformers = await import('@xenova/transformers');
  const pipeline = transformers.pipeline;
  generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Embedding model loaded into server memory.');
}
initTransformers().catch(console.error);

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Calculate attribute similarity
function attributeSimilarity(attrA, attrB) {
  if (!attrA || !attrB) return 0;
  let score = 0;
  let total = 3;
  if (attrA.finish === attrB.finish) score++;
  if (attrA.shadeFamily === attrB.shadeFamily) score++;
  
  // Array overlap for skinType
  const stA = attrA.skinType || [];
  const stB = attrB.skinType || [];
  if (stA.length > 0 && stB.length > 0) {
    const intersection = stA.filter(x => stB.includes(x));
    const union = new Set([...stA, ...stB]);
    score += intersection.length / union.size;
  } else if (stA.length === 0 && stB.length === 0) {
    score++;
  }
  return score / total;
}

app.post('/api/dupes/:productId', async (req, res) => {
  try {
    const target = await Product.findById(req.params.productId);
    if (!target) return res.status(404).json({ error: 'Product not found' });

    if (!target.ingredientEmbedding || target.ingredientEmbedding.length === 0) {
      return res.status(400).json({ error: 'Target product has no embedding' });
    }

    let candidates = [];

    if (target.dupesGenerated) {
      // Fast path: dupes have already been generated and saved for this product previously!
      // We can just fetch all products in this category from the database to score them.
      candidates = await Product.find({ category: target.category, _id: { $ne: target._id } });
      
      if (candidates.length === 0) {
         candidates = await Product.find({ _id: { $ne: target._id } });
      }
    } else {
      // Slow path: Call Gemini to generate 5 dynamic dupes
      const prompt = `You are a cosmetic data expert. Find 5 real makeup/skincare dupes or alternatives for:
Name: ${target.name}
Brand: ${target.brand}
Category: ${target.category}
Ingredients: ${target.ingredients.join(', ')}

IMPORTANT INSTRUCTION: When listing the ingredients for the dupes, if an ingredient is also present in the target product, you MUST spell it EXACTLY the same way as it appears above (e.g., if target has 'Water', do not write 'Aqua / Water'). This is critical for our overlap matching algorithm.

Return ONLY a valid JSON array of 5 objects (no markdown, just raw JSON). Each object must exactly match this structure:
{
  "_id": "random_string_id",
  "name": "string (product name)",
  "brand": "string (brand name)",
  "category": "${target.category}",
  "price": number (price in INR),
  "ingredients": ["array of strings", "each ingredient separated"],
  "attributes": {
    "finish": "string (e.g. Dewy, Matte, Natural)",
    "shadeFamily": "string (e.g. Red, Pink, None)",
    "skinType": ["array of strings"]
  },
  "productUrl": "https://google.com/search?q=brand+product+name"
}`;

      const aiResult = await model.generateContent(prompt);
      let jsonText = aiResult.response.text();
      if (jsonText.includes('```')) {
         const match = jsonText.match(/```(?:json)?\n([\s\S]*?)```/);
         if (match) jsonText = match[1];
      }
      
      let generatedDupes = [];
      try {
        generatedDupes = JSON.parse(jsonText);
      } catch (parseErr) {
        console.error("Failed to parse Gemini dupes JSON:", jsonText);
        return res.status(500).json({ error: 'Failed to generate dynamic dupes.' });
      }

      // Generate embeddings in parallel to save time and save them to DB for the explain endpoint
      candidates = await Promise.all(generatedDupes.map(async (dupe) => {
        const textToEmbed = dupe.ingredients.join(', ');
        const output = await generateEmbedding(textToEmbed, { pooling: 'mean', normalize: true });
        
        const newDupe = new Product({
          ...dupe,
          _id: new mongoose.Types.ObjectId(),
          ingredientEmbedding: Array.from(output.data)
        });
        
        try {
          await newDupe.save();
        } catch (e) {
          console.error("Error saving dynamic dupe:", e.message);
        }
        
        return newDupe;
      }));

      // Mark the target as having had its dupes generated
      target.dupesGenerated = true;
      await target.save();
    }

    const matches = candidates.map(candidate => {
      const cosSim = cosineSimilarity(target.ingredientEmbedding, candidate.ingredientEmbedding);
      const attrSim = attributeSimilarity(target.attributes, candidate.attributes);
      
      const finalScore = (0.7 * cosSim) + (0.3 * attrSim);

      // Smarter shared ingredients exact/fuzzy list
      const targetIngs = target.ingredients.map(i => i.toLowerCase().trim());
      const candIngs = candidate.ingredients.map(i => i.toLowerCase().trim());
      
      const sharedIngredients = candIngs.filter(cIng => {
        return targetIngs.some(tIng => {
          if (cIng === tIng) return true;
          // check if they are very similar substrings (e.g. water vs water (aqua))
          if (tIng.length > 4 && cIng.includes(tIng)) return true;
          if (cIng.length > 4 && tIng.includes(cIng)) return true;
          return false;
        });
      });

      return {
        _id: candidate._id,
        name: candidate.name,
        brand: candidate.brand,
        price: candidate.price,
        productUrl: candidate.productUrl,
        matchScore: Math.round(finalScore * 100),
        candidateIngredients: candidate.ingredients,
        sharedIngredients
      };
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);
    const top5 = matches.slice(0, 5);

    res.json({
      target: {
        _id: target._id,
        name: target.name,
        brand: target.brand,
        ingredients: target.ingredients
      },
      matches: top5
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dupes/:productId/explain/:dupeId', async (req, res) => {
  try {
    const target = await Product.findById(req.params.productId);
    const dupe = await Product.findById(req.params.dupeId);
    
    if (!target || !dupe) return res.status(404).json({ error: 'Product not found' });

    const targetIngs = target.ingredients.map(i => i.toLowerCase().trim());
    const dupeIngs = dupe.ingredients.map(i => i.toLowerCase().trim());
    const shared = targetIngs.filter(i => dupeIngs.includes(i));

    const prompt = `You are a cosmetic chemistry expert. Explain in exactly 2 short sentences why "${dupe.name}" by ${dupe.brand} is a good dupe for "${target.name}" by ${target.brand}. They share ${shared.length} out of ${dupeIngs.length} ingredients (including ${shared.slice(0, 3).join(', ')}).`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ explanation: text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating explanation' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query) return res.json([]);

    if (query.startsWith('http')) {
      const products = await Product.find({ productUrl: query }).select('-ingredientEmbedding');
      if (products.length > 0) return res.json(products);

      console.log('Scraping URL:', query);
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      const response = await axios.get(query, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000,
        maxRedirects: 5
      });
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header, noscript').remove();
      const textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);
      
      const prompt = `You are a cosmetic data extractor. Extract details from this product webpage text. Return ONLY a valid JSON object matching exactly this structure (no markdown blocks, just raw JSON):
{
  "name": "string (product name)",
  "brand": "string (brand name)",
  "category": "string (e.g. Moisturizer, Lip Gloss, Foundation)",
  "price": number (price in INR, if not found guess based on brand or default to 1500),
  "ingredients": ["array of strings", "each ingredient separated"],
  "attributes": {
    "finish": "string (e.g. Dewy, Matte, Natural)",
    "shadeFamily": "string (e.g. Red, Pink, None)",
    "skinType": ["array of strings"]
  }
}
Text: ${textContent}`;

      const aiResult = await model.generateContent(prompt);
      let jsonText = aiResult.response.text();
      if (jsonText.includes('\`\`\`')) {
         const match = jsonText.match(/\`\`\`(?:json)?\n([\s\S]*?)\`\`\`/);
         if (match) jsonText = match[1];
      }
      
      const productData = JSON.parse(jsonText);
      productData.productUrl = query;
      
      if (!generateEmbedding) throw new Error("Embedding model not loaded yet");
      
      const ingredientsString = productData.ingredients.join(', ');
      const output = await generateEmbedding(ingredientsString, { pooling: 'mean', normalize: true });
      productData.ingredientEmbedding = Array.from(output.data);
      
      const doc = new Product(productData);
      await doc.save();
      
      const savedProduct = doc.toObject();
      delete savedProduct.ingredientEmbedding;
      return res.json([savedProduct]);
    } else {
      const products = await Product.find({ 
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } }
        ]
      }).select('-ingredientEmbedding').limit(10);
      return res.json(products);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search error' });
  }
});

app.post('/api/shade-match', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const tempPath = path.join(__dirname, 'temp-upload.jpg');
    fs.writeFileSync(tempPath, req.file.buffer);

    const rgb = await ColorThief.getColor(tempPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const labArray = convert.rgb.lab(rgb);
    const uploadedLab = { L: labArray[0], A: labArray[1], B: labArray[2] };

    const products = await Product.find({ dominantColorLAB: { $exists: true } });

    const matches = products.map(p => {
      const pLab = { L: p.dominantColorLAB.L, A: p.dominantColorLAB.a, B: p.dominantColorLAB.b };
      const diff = deltaE.getDeltaE00(uploadedLab, pLab);
      return {
        _id: p._id,
        name: p.name,
        brand: p.brand,
        productUrl: p.productUrl,
        deltaE: diff,
        rgbMatch: rgb
      };
    });

    matches.sort((a, b) => a.deltaE - b.deltaE);
    res.json(matches.slice(0, 5));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Shade match error' });
  }
});

// Basic endpoint to fetch initial products to test with
app.get('/api/products', async (req, res) => {
  const products = await Product.find().select('-ingredientEmbedding').limit(10);
  res.json(products);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
