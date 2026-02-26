(function()
{
const token =localStorage.getItem("token");
const role = localStorage.getItem("role");
if(!token || role !== admin){window.location.replace("/");}
})();