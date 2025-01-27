const {buildSchema} = require('graphql')

module.exports = buildSchema(`

        type AuthData {
            token: String!,
            userId:  String!
        }

        type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
        }

        type User {
            _id: ID!
            name: String!
            email: String!
            password: String!
            status: String!
            posts: [Post!]!
        }

        type PostData {
            posts: [Post!]!
            totalPosts: Int!
        }

        input UserInputData {
            email: String!
            name: String!
            password: String!
        }


        input PostInputData {
            title: String!
            content: String!
            imageUrl: String!
        }

         type rootQuery {
            login(email: String!, password: String!): AuthData!
            posts(page: Int!): PostData!
            post(id: ID!): Post!
            user: User!
        }

        type rootMutation {
            createUser(userInput:UserInputData): User!
            createPost(postInput: PostInputData): Post!
            updatePost(id: ID!, postInput: PostInputData): Post!
            deletePost(id:ID!): Boolean
            updateStatus(status:String!): User!
        }   

        schema {
            query: rootQuery
            mutation: rootMutation
        }
    `)