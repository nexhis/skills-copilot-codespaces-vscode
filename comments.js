// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Post comments
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  // Get content from request
  const { content } = req.body;
  // Get comments for specific post
  const comments = commentsByPostId[req.params.id] || [];
  // Push new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });
  // Update comments
  commentsByPostId[req.params.id] = comments;
  // Emit event
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });
  // Send back to user
  res.status(201).send(comments);
});

// Post event
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);
  // Get event type
  const { type, data } = req.body;
  // Check for comment moderation
  if (type === 'CommentModerated') {
    // Get comment
    const { postId, id, status, content } = data;
    // Get comments for specific post
    const comments = commentsByPostId[postId];
    // Get comment
    const comment = comments.find((comment) => {
      return comment.id === id;
    });
    // Update status
    comment.status = status;
    // Emit event
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content,
      },
    });
  }
  // Send back to user
  res.send({});
});

// Listen on port