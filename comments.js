// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Comments storage
const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
  const id = randomBytes(4).toString('hex'); // Generate random id
  const { content } = req.body; // Get content from request body

  // Get comments array for post id or create new one
  const comments = commentsByPostId[req.params.id] || [];

  // Push new comment to comments array
  comments.push({ id, content, status: 'pending' });

  // Set comments array to commentsByPostId
  commentsByPostId[req.params.id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id,
      content,
      status: 'pending',
      postId: req.params.id,
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Receive events from event bus
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);

  // Check event type
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    // Get comment by ID from commentsByPostId
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => comment.id === id);
    // Update comment status
    comment.status = status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content,
      },
    });
  }

  // Send response
  res.send({});
});

// Start web server
app.listen(4001, () => {
  console.log('Listening on 4001');
});
