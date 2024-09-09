const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { CustomError } = require('../middlewares/error')

const registerController = async (req, res, next) => {
  try {
    console.log(req.body)
    const { password, username, email } = req.body
    const existingUser = await User.findOne({ $or: [{ username }, { email }] })

    if (existingUser) {
      throw new CustomError('Username or email already exists', 400)
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = bcrypt.hashSync(password, salt)
    const newUser = new User({ ...req.body, password: hashedPassword })
    const savedUser = await newUser.save()

    res.status(201).json({
      status: 'success',
      data: {
        user: savedUser,
      },
    })
  } catch (error) {
    next(error)
  }
}

const loginController = async (req, res, next) => {
  try {
    let user
    if (req.body.email) {
      user = await User.findOne({ email: req.body.email })
    } else {
      user = await User.findOne({ username: req.body.username })
    }

    if (!user) {
      throw new CustomError('User not found!!', 404)
    }

    const match = await bcrypt.compare(req.body.password, user.password)
    if (!match) {
      throw new CustomError('Wrong Credentials!!', 400)
    }
    const { password, ...data } = user._doc
    const token = jwt.sign(
      { _id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE,
      },
    )
    res.cookie('token', token).status(200).json({
      status: 'success',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

const logoutController = async (req, res, next) => {
  try {
    res
      .clearCookie('token', { sameSite: 'none', secure: true })
      .status(200)
      .json({
        status: 'success',
        message: 'User logged out succesfully!!',
      })
  } catch (error) {
    next(error)
  }
}

const fetchUserController = async (req, res, next) => {
  try {
    const token = req.cookies.token

    // Check if the token is missing
    if (!token) {
      throw new CustomError('Authentication token is missing!', 400) // Unauthorized
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, data) => {
      if (err) {
        throw new CustomError('Invalid token!', 400) // Forbidden
      }

      try {
        const id = data._id
        const user = await User.findOne({ _id: id })

        if (!user) {
          throw new CustomError('User not found!', 404) // Not Found
        }

        res.status(200).json({
          status: 'success',
          data: {
            user,
          },
        })
      } catch (error) {
        next(error)
      }
    })
  } catch (error) {
    next(error) // Pass the error to the error-handling middleware
  }
}

module.exports = {
  registerController,
  loginController,
  logoutController,
  fetchUserController,
}
