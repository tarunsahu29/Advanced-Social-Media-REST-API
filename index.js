const express = require('express')
const connectDB = require('./database/db')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const app = express()

const dotenv = require('dotenv')
const authRoute = require('./routes/auth')
const userRoute = require('./routes/users')
const postRoute = require('./routes/posts')
const commentRoute = require('./routes/comments')
const path = require('path')

const { errorHandler } = require('./middlewares/error')

dotenv.config()

app.use(express.json())
app.use(morgan('dev'))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoute)
app.use('/api/user', userRoute)
app.use('/api/post', postRoute)
app.use('/api/comment', commentRoute)

app.use(errorHandler)

app.listen(process.env.PORT, () => {
  connectDB()
  console.log(`Listening on port ${process.env.PORT}...`)
})
