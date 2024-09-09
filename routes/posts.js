const express = require('express')

const router = express.Router()
const upload = require('../middlewares/upload')
const {
  createPostController,
  createPostWithImageController,
  updatePostController,
  getPostsController,
  deletePostController,
  likePostController,
  dislikePostController,
} = require('../controllers/postController')

//CREATE POST

router.post('/create', createPostController)

//CREATE POST WITH IMAGES

router.post(
  '/create/:userId',
  upload.array('images', 5),
  createPostWithImageController,
)

//UPDATE POST

router.put('/update/:postId', updatePostController)

//GET USER POSTS

router.get('/all/:userId', getPostsController)

//DELETE POST

router.delete('/delete/:postId', deletePostController)

//LIKE POST ROUTE

router.post('/like/:postId', likePostController)

//DISLILE POST ROUTE

router.post('/dislike/:postId', dislikePostController)

module.exports = router
