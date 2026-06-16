const express = require('express');
const upload = require('../middleware/upload');
const requireFirebaseAuth = require('../middleware/requireFirebaseAuth');
const { uploadProfilePhoto } = require('../controllers/userController');

const router = express.Router();

router.post('/profile-photo', requireFirebaseAuth, upload.single('image'), uploadProfilePhoto);

module.exports = router;
