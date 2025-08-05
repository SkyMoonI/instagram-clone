const isOwnerOrAdmin = (resourceUserId, currentUser) => {
  const resourceUserIdStr = resourceUserId._id
    ? resourceUserId._id.toString() // If populated
    : resourceUserId.toString(); // If not populated

  // resourceUserId(post.user) = ObjectId("abc123");
  // currentUser.id(req.user.id) = "abc123";
  const isOwner = resourceUserIdStr === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  // console.log(
  //   resourceUserId.toString(),
  //   currentUser.id,
  //   currentUser.role,
  //   isOwner,
  //   isAdmin,
  // );

  return isOwner || isAdmin;
};

module.exports = isOwnerOrAdmin;
