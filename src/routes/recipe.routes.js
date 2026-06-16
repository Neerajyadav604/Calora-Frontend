const express = require('express');
const upload = require('../middleware/upload');
const requireFirebaseAuth = require('../middleware/requireFirebaseAuth');
const { createRecipe } = require('../controllers/recipeController');

const router = express.Router();

router.post('/', requireFirebaseAuth, upload.single('image'), createRecipe);

module.exports = router;
