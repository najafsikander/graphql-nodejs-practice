const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const {clearImage} = require('../util/file');
module.exports = {

    createUser:async function({userInput}, req) {
        const errors = [];
        const {email,name,password} = userInput;
        if(!validator.isEmail(email)) errors.push({'message':'Email is invalid'});
        if(validator.isEmpty(password) || !validator.isLength(password, {min:5})) errors.push({'message': 'Password too short'});

        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors
            error.code = 422;
            throw error;
        }
        const existingUser = await User.findOne({email: email});

        if(existingUser) {
            throw 'User already exists'
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            email,
            name,
            password: hashedPassword
        });

        const createdUser = await user.save();
        return {
            ...createdUser._doc, 
            _id: createdUser._id.toString()
          };
    },

    login: async function ({email, password}) {
        const user = await User.findOne({email});
        if(!user) {
            const error = new Error('User not found');
            error.code = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if(!isEqual) {
            const error = new Error('Password is incorrect');
            error.code = 401;
            throw error;
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, 'secret', {expiresIn: '1h'});
        const userId = user._id.toString();
        return {token, userId};
    },

    createPost: async function({postInput}, {req}){
        console.log('isAuth: ', req);
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min:5})) {
            errors.push({message: 'Title is invalid'});
        }

        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min:5})) {
            errors.push({message: 'Content is invalid'});
        }

        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors
            error.code = 422;
            throw error;
        }
        const {title, content, imageUrl} = postInput;
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('Invalid user');
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title,
            content,
            imageUrl,
            creator: user
        });
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id,
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        };
    },

    posts: async function ({page}, {req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }

        if(!page) {
            page =1
        }

        const perPage = 2;

        const skip = (page - 1) * perPage;

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find().sort({createdAt: -1}).skip(skip).limit(perPage).populate('creator');
        return {posts: posts.map((p) => {
            console.log('Post', p)
            return {
                ...p._doc,
                _id: p._id.toString(),
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString()
            }
        } ), totalPosts};
    },

    post: async function({id}, {req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');
        if(!post) {
            const error = new Error('No post found');
            error.code = 404;
            throw error;
        }

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.createdAt.toISOString()
        };
    },
    updatePost: async function({id, postInput}, {req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');
        if(!post) {
            const error = new Error('No post found');
            error.code = 404;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()) {
            const error  = new Error('Not authorized');
            error.code = 403;
            throw error;
        }

        const errors = [];
        if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min:5})) {
            errors.push({message: 'Title is invalid'});
        }

        if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min:5})) {
            errors.push({message: 'Content is invalid'});
        }

        if(errors.length > 0) {
            const error = new Error('Invalid input');
            error.data = errors
            error.code = 422;
            throw error;
        }

        post.title = postInput.title;
        post.content = postInput.content;

        if(postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }

        const updatedPost = await post.save();

        return {
            ...updatedPost._doc,
            id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        };
    },
    deletePost: async function({id},{req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');

        if(!post) {
            const error = new Error('No post found');
            error.code = 404;
            throw error;
        }
        if(post.creator._id.toString() !== req.userId.toString()) {
            const error  = new Error('Not authorized');
            error.code = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(id);
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        return true;
    },
    user: async function(args, {req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('No user found');
            error.code = 404;
            throw error;
        }

        return {...user._doc, _id: user._id.toString()}
    },
    updateStatus: async function({status},{req}) {
        if(!req.isAuth) {
            const error = new Error('User is not authenticated');
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if(!user) {
            const error = new Error('No user found');
            error.code = 404;
            throw error;
        }
        user.status = status;
        await user.save();
        return {...user._doc, _id: user._id.toString()}
    }
}