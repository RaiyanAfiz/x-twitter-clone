import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

// Models
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserProfile controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (userToModify._id === currentUser._id) {
      return res.status(400).json({ error: "You can not follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.following.includes(userToModify._id);

    if (isFollowing) {
      // Unfollow the user
      await User.findByIdAndUpdate(userToModify._id, { $pull: { followers: currentUser._id } });
      await User.findByIdAndUpdate(currentUser._id, { $pull: { following: userToModify._id } });

      // TODO: return the id of the user as a response
      return res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow the user
      await User.findByIdAndUpdate(userToModify._id, { $push: { followers: currentUser._id } });
      await User.findByIdAndUpdate(currentUser._id, { $push: { following: userToModify._id } });

      //   Notification
      const newNotification = new Notification({
        type: "follow",
        from: currentUser._id,
        to: userToModify._id,
      });
      await newNotification.save();

      // TODO: return the id of the user as a response
      return res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const usersFollowedByMe = await User.findById(userId).select("following");
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      { $sample: { size: 10 } },
    ]);

    const filteredUsers = users.filter((user) => !usersFollowedByMe.following.includes(user._id));
    const suggestedUser = filteredUsers.slice(0, 4);

    suggestedUser.forEach((user) => (user.password = null));
    res.status(200).json(suggestedUser);
  } catch (error) {
    console.log("Error in getSuggestedUsers controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  // TODO: Clean up and put in similar checks as login function
  const { fullName, email, userName, currentPassword, newPassword, bio, link } = req.body;
  const userId = req.user._id;
  let { profileImg, coverImg } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // If only currentPassword or newPassword is given
    if ((!currentPassword && newPassword) || (currentPassword && !newPassword)) {
      return res
        .status(400)
        .json({ error: "Please provide both current password and new password" });
    }
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ error: "Current password incorrect" });
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
      }
      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
      }
      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    console.log(email);
    user.username = userName || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    user = await user.save();
    user.password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateUser controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
