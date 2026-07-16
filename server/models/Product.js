const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true }, // in INR
  ingredients: [{ type: String }],
  ingredientEmbedding: { type: [Number] }, // 384-dimensional vector from all-MiniLM-L6-v2
  attributes: {
    finish: { type: String },
    shadeFamily: { type: String },
    skinType: [{ type: String }]
  },
  productUrl: { type: String },
  dominantColorLAB: { 
    L: Number,
    a: Number,
    b: Number
  }, // Optional, for future shade-matcher feature
  dupesGenerated: { type: Boolean, default: false }
});

module.exports = mongoose.model('Product', productSchema);
