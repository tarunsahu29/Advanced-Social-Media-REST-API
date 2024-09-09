const express = require('express')
const {
  loginController,
  registerController,
  logoutController,
  fetchUserController,
} = require('../controllers/authController')
const router = express.Router()

//REGISTER
router.post('/register', registerController)

//LOGIN

router.post('/login', loginController)

//LOGOUT

router.get('/logout', logoutController)

//FETCH CURRENT USER

router.get('/fetch', fetchUserController)

module.exports = router
