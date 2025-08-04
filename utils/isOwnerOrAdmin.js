const isOwnerOrAdmin = (resourceUserId, currentUser) => {
  // resourceUserId(post.user) = ObjectId("abc123");
  // currentUser.id(req.user.id) = "abc123";
  const isOwner = resourceUserId.toString() === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  return isOwner || isAdmin;
};

module.exports = isOwnerOrAdmin;
