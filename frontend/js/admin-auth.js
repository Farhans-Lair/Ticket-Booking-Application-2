(function () {
  const role = localStorage.getItem("role");

  // Check both token existence AND role — a regular user's token would
  // otherwise pass the token-only check and reach the admin page
  if (role !== 'admin') {
    window.location.replace("/");
  }
})();
