const { CustomError } = require('../middlewares/error')
const User = require('../models/User')
const Post = require('../models/Post')
const Comment = require('../models/Comment')
const Story = require('../models/Story')

const getUserController = async (req, res, next) => {
  const { userId } = req.params
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError('User not found!', 404)
    }
    const { password, ...data } = user._doc
    res.status(200).json(data)
  } catch (error) {
    next(error)
  }
}

const updateUserController = async (req, res, next) => {
  const { userId } = req.params
  const updateData = req.body

  try {
    // Use findByIdAndUpdate to find and update the document
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Ensure the update is validated
    })

    if (!updatedUser) {
      throw new CustomError('User not found!', 404)
    }
    res
      .status(200)
      .json({ message: 'User updated successfully!!', user: updatedUser })
  } catch (error) {
    next(error)
  }
}

const followUserController = async (req, res, next) => {
  const { userId } = req.params
  const { _id } = req.body
  try {
    if (userId == _id) {
      throw new CustomError('You can not follow yourself dumb!!', 500)
    }
    const userToFollow = await User.findById(userId)
    const loggedInUser = await User.findById(_id)

    if (!userToFollow || !loggedInUser) {
      throw new CustomError('User not found!!', 404)
    }

    //If you haave blocked someone, you have to first unblock them to follow them!!

    if (loggedInUser.blockList.includes(userId)) {
      throw new CustomError(
        'You have to first Unblock that user to follow them dumb!!',
        400,
      )
    }
    if (loggedInUser.following.includes(userId)) {
      throw new CustomError('Already following this user!!', 400)
    }

    loggedInUser.following.push(userId)
    userToFollow.followers.push(_id)

    await loggedInUser.save()
    await userToFollow.save()

    res.status(200).json({ message: 'Successfully followed the user!!' })
  } catch (error) {
    next(error)
  }
}

const unfollowUserController = async (req, res, next) => {
  const { userId } = req.params
  const { _id } = req.body
  try {
    if (userId == _id) {
      throw new CustomError('You can not unfollow yourself dumb!!', 500)
    }
    const userToUnfollow = await User.findById(userId)
    const loggedInUser = await User.findById(_id)

    if (!userToUnfollow || !loggedInUser) {
      throw new CustomError('User not found!!', 404)
    }

    if (!loggedInUser.following.includes(userId)) {
      throw new CustomError('Not following this User!!', 400)
    }

    loggedInUser.following = loggedInUser.following.filter(
      (id) => id.toString() !== userId,
    )
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== _id,
    )

    await loggedInUser.save()
    await userToUnfollow.save()

    res.status(200).json({ message: 'Successfully unfollowed that bitch!!' })
  } catch (error) {
    next(error)
  }
}

const blockUserController = async (req, res, next) => {
  const { userId } = req.params
  const { _id } = req.body
  try {
    if (userId === _id) {
      throw new CustomError('You can not block yourself', 500)
    }
    const userToBlock = await User.findById(userId)
    const loggedInUser = await User.findById(_id)

    if (!userToBlock || !loggedInUser) {
      throw new CustomError('User not found!!', 404)
    }

    if (loggedInUser.blockList.includes(userId)) {
      throw new CustomError('The User is already blocked!!', 400)
    }

    loggedInUser.blockList.push(userId)

    loggedInUser.following = loggedInUser.following.filter(
      (id) => id.toString() !== userId,
    )
    userToBlock.followers = userToBlock.followers.filter(
      (id) => id.toString() !== _id,
    )

    await loggedInUser.save()
    await userToBlock.save()

    res.status(200).json({ message: 'Successfully blocked that bitch!!' })
  } catch (error) {
    next(error)
  }
}

const unblockUserController = async (req, res, next) => {
  const { userId } = req.params
  const { _id } = req.body
  try {
    if (userId === _id) {
      throw new CustomError('You can not unblock yourself', 500)
    }
    const userToUnblock = await User.findById(userId)
    const loggedInUser = await User.findById(_id)

    if (!userToUnblock || !loggedInUser) {
      throw new CustomError('User not found!!', 404)
    }

    if (!loggedInUser.blockList.includes(userId)) {
      throw new CustomError('The User is already unblocked!!', 400)
    }

    loggedInUser.blockList = loggedInUser.blockList.filter(
      (id) => id.toString() !== userId,
    )
    await loggedInUser.save()

    res.status(200).json({ message: 'Successfully unblocked that bitch!!' })
  } catch (error) {
    next(error)
  }
}

const getBlockedUsersController = async (req, res, next) => {
  const { userId } = req.params
  try {
    const user = await User.findById(userId).populate(
      'blockList',
      'username fullName profilePicture',
    )
    if (!user) {
      throw new CustomError('User not found!!', 404)
    }

    const { blockList, ...data } = user

    res.status(200).json(blockList)
  } catch (error) {
    next(error)
  }
}

const deleteUserController = async (req, res, next) => {
  const { userId } = req.params
  try {
    const userToDelete = await User.findById(userId)

    if (!userToDelete) {
      throw new CustomError('User not found!!', 404)
    }

    // Delete all posts by the user
    await Post.deleteMany({ user: userId })

    // Remove all comments made by the user from posts
    await Post.updateMany(
      { 'comments.user': userId },
      { $pull: { comments: { user: userId } } },
    )

    // Remove all replies made by the user from comments
    const commentsWithUserReplies = await Comment.find({
      'replies.user': userId,
    })
    await Promise.all(
      commentsWithUserReplies.map(async (comment) => {
        comment.replies = comment.replies.filter(
          (reply) => reply.user.toString() !== userId,
        )
        await comment.save()
      }),
    )

    // Delete all comments made by the user
    await Comment.deleteMany({ user: userId })

    // Delete all stories by the user
    await Story.deleteMany({ user: userId })

    // Remove the user from the likes arrays of posts
    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } })

    // Remove the user from the followers lists of users who were following them
    await User.updateMany(
      { _id: { $in: userToDelete.following } },
      { $pull: { followers: userId } },
    )

    // Remove the user from the following lists of other users
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } },
    )

    // Remove the user from the likes arrays of comments
    await Comment.updateMany({}, { $pull: { likes: userId } })

    // Remove the user from likes on replies in comments
    await Comment.updateMany(
      { 'replies.likes': userId },
      { $pull: { 'replies.likes': userId } },
    )

    // Remove the user from likes arrays of posts
    await Post.updateMany({}, { $pull: { likes: userId } })

    // Delete the user
    await userToDelete.deleteOne()

    res.status(200).json({
      message: 'Everything associated with the user is deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

const searchUserController = async (req, res, next) => {
  const { query } = req.params
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: new RegExp(query, 'i') } },
        { fullName: { $regex: new RegExp(query, 'i') } },
      ],
    }).select('-password') // Exclude the password field
    res.status(200).json(users)
  } catch (error) {
    next(error)
  }
}

const generateFileUrl = (filename) => {
  return process.env.URL + `/uploads/${filename}`
}

const uploadProfilePictureController = async (req, res, next) => {
  const { userId } = req.params
  const { filename } = req.file
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: generateFileUrl(filename) },
      { new: true },
    ).select('-password')

    if (!user) {
      throw new CustomError('User not found!', 404)
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully!!',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

const uploadCoverPictureController = async (req, res, next) => {
  const { userId } = req.params
  const { filename } = req.file
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { coverPicture: generateFileUrl(filename) },
      { new: true },
    ).select('-password')

    if (!user) {
      throw new CustomError('User not found!', 404)
    }

    res.status(200).json({
      status: 'success',
      message: 'Cover picture updated successfully!!',
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getUserController,
  updateUserController,
  followUserController,
  unfollowUserController,
  blockUserController,
  unblockUserController,
  getBlockedUsersController,
  deleteUserController,
  searchUserController,
  uploadProfilePictureController,
  uploadCoverPictureController,
}
