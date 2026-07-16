require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
let pipeline;
// Dynamic import for transformers since it's an ESM module usually, but we installed commonjs compatible one? 
// Actually @xenova/transformers works in CJS via await import or require depending on version.

async function loadTransformers() {
  const transformers = await import('@xenova/transformers');
  pipeline = transformers.pipeline;
}

const seedData = [
  {
    name: "Water Sleeping Mask",
    brand: "LANEIGE",
    category: "Moisturizer",
    price: 2500,
    ingredients: ["Water", "Butylene Glycol", "Glycerin", "Trehalose", "Cyclopentasiloxane"],
    attributes: { finish: "Dewy", shadeFamily: "None", skinType: ["Dry", "Combination"] },
    productUrl: "https://example.com/laneige",
    dominantColorLAB: { L: 90, a: -2, b: -5 }
  },
  {
    name: "Hydrating Water Gel",
    brand: "Neutrogena",
    category: "Moisturizer",
    price: 950,
    ingredients: ["Water", "Dimethicone", "Glycerin", "Butylene Glycol", "Trehalose", "Phenoxyethanol"],
    attributes: { finish: "Dewy", shadeFamily: "None", skinType: ["Oily", "Combination"] },
    productUrl: "https://example.com/neutrogena",
    dominantColorLAB: { L: 85, a: -5, b: -10 }
  },
  {
    name: "Ultra Facial Cream",
    brand: "Kiehl's",
    category: "Moisturizer",
    price: 3200,
    ingredients: ["Water", "Glycerin", "Squalane", "Cyclopentasiloxane", "Stearic Acid"],
    attributes: { finish: "Natural", shadeFamily: "None", skinType: ["Dry", "Normal"] },
    productUrl: "https://example.com/kiehls",
    dominantColorLAB: { L: 95, a: 0, b: 2 }
  },
  {
    name: "Squalane Moisture Cream",
    brand: "The Ordinary",
    category: "Moisturizer",
    price: 800,
    ingredients: ["Water", "Glycerin", "Squalane", "Stearic Acid", "Cetyl Alcohol"],
    attributes: { finish: "Natural", shadeFamily: "None", skinType: ["Dry", "Normal"] },
    productUrl: "https://example.com/theordinary",
    dominantColorLAB: { L: 92, a: 1, b: 5 }
  }
];

async function seed() {
  await loadTransformers();
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dupedna';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  await Product.deleteMany({});
  console.log('Cleared existing products');

  console.log('Loading embedding model...');
  const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model loaded.');

  for (const item of seedData) {
    const textToEmbed = item.ingredients.join(', ');
    const output = await generateEmbedding(textToEmbed, { pooling: 'mean', normalize: true });
    
    // Output is a tensor, we need to convert it to a regular JS array
    const embeddingArray = Array.from(output.data);
    
    const doc = new Product({
      ...item,
      ingredientEmbedding: embeddingArray
    });
    
    await doc.save();
    console.log(`Saved: ${item.name}`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
