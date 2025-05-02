import { v2 as cloudinary } from "cloudinary";

import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    const userId = req.user._id;
    // const userId = req.user._id.toString();

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!text && !img) return res.status(404).json({ error: "Post must have text or image" });

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.log("Error in createPost controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(500).json({ error: "Not authorized to delete this post." });
    }

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(post._id);
    res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    console.log("Error in deletePost controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    // Find out why const here didn't trigger since I am adding something to the db entry
    const post = await Post.findById(postId);

    if (!post) res.status(404).json({ error: "Post not found" });
    if (!text) res.status(400).json({ error: "Text field is required" });

    // Check if using comment user model is a thing
    const comment = { user: userId, text };
    post.comments.push(comment);
    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in commentOnPost controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;
    // Can also be written as
    // const {id:postId} = req.params

    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ error: "Post not found" });

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());

      res.status(200).json(updatedLikes);
    } else {
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();

      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();

      const updatedLikes = post.likes;

      res.status(200).json(updatedLikes);
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    if (posts.length === 0) return res.status(200).json([]);

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in getAllPosts controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getLikedPosts = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    /* 
    See if something like this can work

    likedPosts = await User.findById(userId).select("-password").populate(likedPosts)
    
    Populate with different name?? likedPosts vs posts
    */

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(likedPosts);
  } catch (error) {
    console.log("Error in getLikedPosts controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const followedPosts = await Post.find({ user: { $in: user.following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(followedPosts);
  } catch (error) {
    console.log("Error in getFollowedPosts controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userName } = req.params;
    const user = await User.findOne(userName);
    if (!user) return res.status(404).json({ error: "User not found" });

    const userPosts = await Post.find({ user: { $in: user._id } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(userPosts);
  } catch (error) {
    console.log("Error in getUserPosts controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE LATER
export const testGetAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find().select("_id, username");
    res.status(200).json(allUsers);
  } catch (error) {
    console.log("Error in testGetAllUsers controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE LATER
export const testGetAllPosts = async (req, res) => {
  try {
    const allPosts = await Post.find().select("_id, user").populate({
      path: "user",
      select: "_id, username",
    });
    res.status(200).json(allPosts);
  } catch (error) {
    console.log("Error in testGetAllPosts controller", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
