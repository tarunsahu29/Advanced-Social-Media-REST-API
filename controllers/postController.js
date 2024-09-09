const { CustomError } = require('../middlewares/error')
const Comment = require('../models/Comment')
const Post = require('../models/Post')
const User = require('../models/User')

const createPostController = async (req, res, next) => {
  const { userId, caption } = req.body
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const newPost = new Post({
      user: userId,
      caption,
    })
    await newPost.save()
    user.posts.push(newPost._id)
    await user.save()
    res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: {
        newPost,
      },
    })
  } catch (error) {
    next(error)
  }
}

const generateFileUrl = (filename) => {
  return process.env.URL + `/uploads/${filename}`
}

const createPostWithImageController = async (req, res, next) => {
  const { userId } = req.params
  const { caption } = req.body
  const files = req.files
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const imageUrls = files.map((file) => generateFileUrl(file.filename))
    const newPost = new Post({
      user: userId,
      caption,
      image: imageUrls,
    })

    await newPost.save()
    user.posts.push(newPost._id)
    await user.save()
    res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: {
        newPost,
      },
    })
  } catch (error) {
    next(error)
  }
}

const updatePostController = async (req, res, next) => {
  const { postId } = req.params
  const { caption } = req.body
  try {
    const postToUpdate = await Post.findById(postId)
    if (!postToUpdate) {
      throw new CustomError('Post not found!', 404)
    }
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { caption },
      { new: true, runValidators: true },
    )
    await postToUpdate.save()
    res.status(200).json({
      status: 'success',
      message: 'Post updated successfully',
      data: {
        updatedPost,
      },
    })
  } catch (error) {
    next(error)
  }
}

const getPostsController = async (req, res, next) => {
  const { userId } = req.params
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const posts = await Post.find({ user: userId })
    res.status(200).json({
      status: 'success',
      data: {
        posts,
      },
    })
  } catch (error) {
    next(error)
  }
}

const deletePostController = async (req, res, next) => {
  const { postId } = req.params
  try {
    const postToDelete = await Post.findById(postId)
    if (!postToDelete) {
      throw new CustomError('Post not found!', 404)
    }
    const user = await User.findById(postToDelete.user)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    user.posts = user.posts.filter(
      (postId) => postId.toString() !== postToDelete._id.toString(),
    )
    await user.save()
    await Comment.deleteMany({ post: postId })
    await postToDelete.deleteOne()

    res.status(200).json({ message: 'Post deleted successfully!!' })
  } catch (error) {
    next(error)
  }
}

const likePostController = async (req, res, next) => {
  const { postId } = req.params
  const { userId } = req.body
  try {
    const post = await Post.findById(postId)
    if (!post) {
      throw new CustomError('Post not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    if (post.likes.includes(userId)) {
      throw new CustomError('You have already liked this post!!', 404)
    }
    post.likes.push(userId)
    await post.save()
    res.status(200).json({
      status: 'success',
      message: 'Post liked successfully',
      data: {
        post,
      },
    })
  } catch (error) {
    next(error)
  }
}

const dislikePostController = async (req, res, next) => {
  const { postId } = req.params
  const { userId } = req.body
  try {
    const post = await Post.findById(postId)
    if (!post) {
      throw new CustomError('Post not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    //i can only dislike on the posts, or basically undo the like action if i have already liked th post
    if (!post.likes.includes(userId)) {
      throw new CustomError('You have not liked the post!!', 404)
    }
    post.likes = post.likes.filter((id) => id.toString() !== userId)
    await post.save()
    res.status(200).json({
      status: 'success',
      message: 'Post unliked successfully',
      data: {
        post,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPostController,
  createPostWithImageController,
  updatePostController,
  getPostsController,
  deletePostController,
  likePostController,
  dislikePostController,
}
