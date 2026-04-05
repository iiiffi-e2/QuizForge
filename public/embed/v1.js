(function () {
  var current = document.currentScript;
  var origin = "";
  if (current && current.src) {
    try {
      origin = new URL(current.src).origin;
    } catch {
      origin = "";
    }
  }
  if (!origin) {
    origin = window.location.origin;
  }
  var nodes = document.querySelectorAll(".quizforge-embed");
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (el.getAttribute("data-qf-mounted")) continue;
    var sid = el.getAttribute("data-sid");
    if (!sid) continue;
    el.setAttribute("data-qf-mounted", "1");
    var iframe = document.createElement("iframe");
    iframe.src =
      origin + "/quiz?sid=" + encodeURIComponent(sid) + "&embed=1";
    iframe.title = "QuizForge quiz";
    iframe.setAttribute("loading", "lazy");
    iframe.style.width = "100%";
    iframe.style.minHeight = "520px";
    iframe.style.border = "0";
    iframe.style.borderRadius = "12px";
    iframe.style.background = "transparent";
    el.appendChild(iframe);
  }
})();
