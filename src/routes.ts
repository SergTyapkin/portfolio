export default {
  // Other pages
  '/': false, // root is always false

  '/3d': true,

  // Page 404
  '/:pathMatch(.*)*': false,
};
