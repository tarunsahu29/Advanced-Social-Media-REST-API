const { CustomError } = require('../middlewares/error')
const Comment = require('../models/Comment')
const Post = require('../models/Post')
const User = require('../models/User')

const createCommentController = async (req, res, next) => {
  const { postId, userId, text } = req.body
  try {
    const post = await Post.findById(postId)
    if (!post) {
      throw new CustomError('Post not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const newComment = new Comment({
      user: userId,
      post: postId,
      text,
    })

    await newComment.save()
    post.comments.push(newComment._id)
    await post.save()

    res.status(201).json({
      status: 'success',
      message: 'Comment created successfully',
      newComment,
    })
  } catch (error) {
    next(error)
  }
}

const createCommentReplyController = async (req, res, next) => {
  const { commentId } = req.params
  const { text, userId } = req.body
  try {
    const parentComment = await Comment.findById(commentId)
    if (!parentComment) {
      throw new CustomError(
        'Parent comment not found, hence cannot reply!!',
        404,
      )
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const reply = {
      text,
      user: userId,
    }

    parentComment.replies.push(reply)
    await parentComment.save()

    res.status(200).json({
      status: 'success',
      message: 'Reply created successfully',
      data: {
        reply,
      },
    })
  } catch (error) {
    next(error)
  }
}

const updateCommentController = async (req, res, next) => {
  const { commentId } = req.params
  const { text, userId } = req.body
  try {
    const commentToUpdate = await Comment.findById(commentId)
    if (!commentToUpdate) {
      throw new CustomError('Comment not found!', 404)
    }

    if (commentToUpdate.user.toString() !== userId) {
      throw new CustomError('You can update only your comment!', 404)
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { text },
      { new: true, runValidators: true },
    )

    res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: {
        updatedComment,
      },
    })
  } catch (error) {
    next(error)
  }
}

const updateReplyCommentController = async (req, res, next) => {
  const { commentId, replyId } = req.params
  const { text, userId } = req.body

  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }

    const replyIndex = comment.replies.findIndex(
      (reply) => reply._id.toString() === replyId,
    )
    if (replyIndex === -1) {
      throw new CustomError('Reply not found!', 404)
    }

    if (comment.replies[replyIndex].user.toString() !== userId) {
      throw new CustomError('You cannot update someone elses reply', 404)
    }

    comment.replies[replyIndex].text = text

    await comment.save()
    res.status(200).json({
      status: 'success',
      message: 'Reply was updated successfully!!',
      data: {
        comment,
      },
    })
  } catch (error) {
    next(error)
  }
}

const populateUserDetails = async (comments) => {
  for (const comment of comments) {
    await comment.populate('user', 'username fullname profilePicture')
    if (comment.replies.length > 0) {
      await comment.populate('replies.user', 'username fullname profilePicture')
    }
  }
}

const getCommentsByPostController = async (req, res, next) => {
  const { postId } = req.params
  try {
    const post = await Post.findById(postId)
    if (!post) {
      throw new CustomError('Post not found!', 404)
    }

    const comments = await Comment.find({ post: postId })

    await populateUserDetails(comments)

    res.status(200).json({
      status: 'success',
      data: {
        comments,
      },
    })
  } catch (error) {
    next(error)
  }
}

const deleteCommentController = async (req, res, next) => {
  const { commentId } = req.params
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }
    await Post.findOneAndUpdate(
      { comments: commentId },
      { $pull: { comments: commentId } },
      { new: true },
    )
    await comment.deleteOne()

    res.status(200).json({ message: 'Comment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const deleteReplyCommentController = async (req, res, next) => {
  const { commentId, replyId } = req.params
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }

    const replyIndex = comment.replies.findIndex(
      (reply) => reply._id.toString() === replyId,
    )
    if (replyIndex === -1) {
      throw new CustomError('Reply not found!', 404)
    }

    comment.replies = comment.replies.filter((id) => {
      id.toString() !== replyId
    })

    await comment.save()
    res.status(200).json({
      status: 'success',
      message: 'Reply deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

const likeCommentController = async (req, res, next) => {
  const { commentId } = req.params
  const { userId } = req.body
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }

    if (comment.likes.includes(userId)) {
      throw new CustomError('You have already liked this comment!!', 404)
    }

    comment.likes.push(userId)
    await comment.save()

    res.status(200).json({
      status: 'success',
      message: 'Comment liked successfully',
      data: {
        comment,
      },
    })
  } catch (error) {
    next(error)
  }
}

const dislikeCommentController = async (req, res, next) => {
  const { commentId } = req.params
  const { userId } = req.body
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    if (!comment.likes.includes(userId)) {
      throw new CustomError(
        'Cannot dislike, since you have not liked the comment!!',
        404,
      )
    }

    comment.likes = comment.likes.filter((id) => id.toString() !== userId)

    await comment.save()

    res.status(200).json({
      status: 'success',
      message: 'Comment disliked successfully',
      data: {
        comment,
      },
    })
  } catch (error) {
    next(error)
  }
}

const likeReplyCommentController = async (req, res, next) => {
  const { commentId, replyId } = req.params
  const { userId } = req.body
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }

    const replyComment = comment.replies.id(replyId)
    if (!replyComment) {
      throw new CustomError('Reply not found!', 404)
    }
    if (replyComment.likes.includes(userId)) {
      throw new CustomError('Already liked the reply!!', 404)
    }

    replyComment.likes.push(userId)

    await comment.save()

    res.status(200).json({
      status: 'success',
      message: 'Reply liked successfully!!',
      data: {
        comment,
      },
    })
  } catch (error) {
    next(error)
  }
}

const dislikeReplyCommentController = async (req, res, next) => {
  const { commentId, replyId } = req.params
  const { userId } = req.body
  try {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new CustomError('Comment not found!', 404)
    }
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }

    const replyComment = comment.replies.id(replyId)
    if (!replyComment) {
      throw new CustomError('Reply not found!', 404)
    }
    if (!replyComment.likes.includes(userId)) {
      throw new CustomError('Reply is not liked, like it to dislike!!', 404)
    }

    replyComment.likes = replyComment.likes.filter(
      (id) => id.toString() !== userId,
    )

    await comment.save()

    res.status(200).json({
      status: 'success',
      message: 'Reply disliked successfully!!',
      data: {
        comment,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createCommentController,
  createCommentReplyController,
  updateCommentController,
  updateReplyCommentController,
  getCommentsByPostController,
  deleteCommentController,
  deleteReplyCommentController,
  likeCommentController,
  dislikeCommentController,
  likeReplyCommentController,
  dislikeReplyCommentController,
}
