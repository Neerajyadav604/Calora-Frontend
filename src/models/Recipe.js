const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  cuisine: { type: String },
  dietaryType: { type: String, enum: ['veg', 'non-veg', 'vegan'], required: true },
  createdBy: { type: String, required: true },
  authorName: { type: String },
  imageUrl: { type: String, default: null },
  perServing: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
  },
  servingSize: { type: String },
  servings: { type: Number, default: 1 },
  prepTime: { type: Number },
  cookTime: { type: Number },
  totalTime: { type: Number },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  spiceLevel: { type: String, enum: ['No Spice', 'Mild', 'Medium', 'Hot'] },
  ingredients: [{ name: String }],
  instructions: [{ step: Number, text: String }],
  dietaryTags: [String],
  saves: { type: Number, default: 0 },
  savedBy: [String],
  isFeatured: { type: Boolean, default: false },
  isTopChoice: { type: Boolean, default: false },
}, { timestamps: true });

RecipeSchema.index({ title: 'text', cuisine: 'text', dietaryTags: 'text' });

module.exports = mongoose.model('Recipe', RecipeSchema);
