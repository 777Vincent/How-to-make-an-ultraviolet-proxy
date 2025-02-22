const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const wispUrl =
  (location.protocol === "https:" ? "wss" : "ws") +
  "://" +
  location.host +
  "/wisp/";
const bareUrl =
  (location.protocol === "https:" ? "https" : "http") +
  "://" +
  location.host +
  "/bare/";

let isKeyPressed = false;

document
  .getElementById("webSearch")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !isKeyPressed) {
      isKeyPressed = true;
      event.preventDefault();
      document.getElementById("searchButton").click();
    }
  });

document
  .getElementById("webSearch")
  .addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      isKeyPressed = false;
    }
  });

document.getElementById("searchIcon").addEventListener("click", function () {
  var dropdown = document.getElementById("dropdownMenu");
  if (dropdown.style.display === "none" || dropdown.style.display === "") {
    dropdown.style.display = "block";
  } else {
    dropdown.style.display = "none";
  }
});

window.onclick = function (event) {
  if (!event.target.matches(".searchIcon")) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.style.display === "block") {
        openDropdown.style.display = "none";
      }
    }
  }
};

async function checkURL(url) {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
    return response.ok || response.status === 0;
  } catch (error) {
    return false;
  }
}
let searchUrl = "https://www.google.com/search?q="; // will be dynamic soon, for duckduckgo as kindKid wanted
document.getElementById("searchButton").onclick = async function (event) {
  event.preventDefault();

  let url = document.getElementById("webSearch").value;

  if (!url.includes(".")) {
    url = searchUrl + encodeURIComponent(url);
  } else {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
  }
  url = url + "&t=web";
  const activeTab = document.querySelector(".tab.active");
  const link = activeTab.getAttribute("link");
  const activeIframe = document.querySelector(`iframe[link="${link}"]`);
  activeIframe.setAttribute("origin", url);

  async function getCompletion() {
    const response = await fetch("/get-chat-completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: url,
          },
        ],
      }),
    });
    const data = await response.json();
    console.log(data);
    if (data) {
      Toastify({
        text: data.message,

        duration: 3000,
      }).showToast();
    }
  }

  getCompletion();

  if (!(await connection.getTransport())) {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }

  if (await checkURL(url)) {
    let domain = new URL(url).origin;
    domain = domain.replace("https://", "");
    let faviconUrl = `https://favicone.com/${domain}`;
    const favicon = activeTab.querySelector(`img[link="${link}"]`);
    favicon.src = faviconUrl;
    activeIframe.src = __uv$config.prefix + __uv$config.encodeUrl(url);
  } else {
    activeIframe.src = "./404.html";
  }
};

async function getRandomPluralNoun() {
  try {
    const response = await fetch("./data/pluralNouns.json");
    const nouns = await response.json();

    const keys = Object.keys(nouns);
    const randomIndex = Math.floor(Math.random() * keys.length);
    const randomSingularNoun = keys[randomIndex];
    const randomPluralNoun = nouns[randomSingularNoun];

    return randomPluralNoun;
  } catch (error) {
    console.error("Error fetching plural nouns:", error.message);
  }
}

async function setPlaceholder() {
  const randomPluralNoun1 = await getRandomPluralNoun();
  const randomPluralNoun2 = await getRandomPluralNoun();

  if (randomPluralNoun1 && randomPluralNoun2) {
    webSearch.placeholder = `Search anything from ${randomPluralNoun1} to ${randomPluralNoun2}`;
  } else {
    webSearch.placeholder = "Search something!";
  }
}

setPlaceholder();
const backButton = document.querySelector(".backButton");
const forwardButton = document.querySelector(".forwardButton");
backButton.addEventListener("click", () => {
  iframeWindow.contentWindow.history.back();
});
forwardButton.addEventListener("click", () => {
  iframeWindow.contentWindow.history.forward();
});
let activeTab = document.querySelector(".tab.active");
let link = activeTab.getAttribute("link");
let activeIframe = document.querySelector(`iframe[link="${link}"]`);
function navigateToHome() {
  if (activeIframe) {
    activeIframe.src = "./main.html";
  } else {
    console.error("Iframe not found.");
  }
}
const homeButton = document.querySelector(".homeButton");
homeButton.addEventListener("click", navigateToHome);

const tabsContainer = document.querySelector(".tabs");
tabsContainer.addEventListener("wheel", (event) => {
  if (event.deltaY !== 0) {
    event.preventDefault();
    tabsContainer.scrollLeft += event.deltaY;
  }
});

function addTab() {
  let linkNum = tabsContainer.children.length;
  const newTab = document.createElement("button");
  newTab.classList.add("tab");
  newTab.setAttribute("link", linkNum);
  newTab.innerHTML = `<img src="./images/home.svg" alt="tab icon" class="tab-icon" link="${linkNum}"/> New Tab`;
  const newIframe = document.createElement("iframe");
  newIframe.classList.add("iframeWindow");
  newIframe.src = "./main.html";
  newIframe.setAttribute("link", linkNum);
  newIframe.setAttribute("active", "active");
  newIframe.style.display = "none";
  tabsContainer.insertBefore(newTab, tabsContainer.lastElementChild);
  document.body.appendChild(newIframe);
  attachTabEventListeners();
}

const addTabButton = document.querySelector(".addTab");
addTabButton.addEventListener("click", addTab);

function attachTabEventListeners() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) =>
    tab.addEventListener("click", (event) => {
      const link = event.target.getAttribute("link");

      tabs.forEach((t) => t.classList.remove("active"));
      event.target.classList.add("active");

      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        if (iframe.getAttribute("link") === link) {
          iframe.style.display = "block";
          iframe.setAttribute("active", "true");
        } else {
          iframe.style.display = "none";
          iframe.setAttribute("active", "false");
        }
      });
    })
  );
}

attachTabEventListeners();

const contextMenu = document.querySelector(".wrapper"),
  shareMenu = contextMenu.querySelector(".share-menu");
let rightClickedTab = null;
window.addEventListener("contextmenu", (e) => {
  if (!e.target.closest(".tab")) return;
  const tabs = document.querySelectorAll(".tab");
  rightClickedTab = e.target;
  console.log(rightClickedTab);
  e.preventDefault();
  let x = e.clientX,
    y = e.clientY,
    winWidth = window.innerWidth,
    winHeight = window.innerHeight,
    cmWidth = contextMenu.offsetWidth,
    cmHeight = contextMenu.offsetHeight;

  if (x > winWidth - cmWidth - shareMenu.offsetWidth) {
    shareMenu.style.left = "-200px";
  } else {
    shareMenu.style.left = "";
    shareMenu.style.right = "-200px";
  }

  x = x > winWidth - cmWidth ? winWidth - cmWidth - 5 : x;
  y = y > winHeight - cmHeight ? winHeight - cmHeight - 5 : y;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.style.visibility = "visible";
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".wrapper")) {
    contextMenu.style.visibility = "hidden";
  }
});

document.addEventListener("click", (event) => {
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    if (iframe.contentWindow.document.contains(event.target)) {
      contextMenu.style.visibility = "hidden";
    }
  });
});

const twitterButton = document.querySelector(".share-menu .item:nth-child(1)");
function shareOnTwitter(text, urlToShare) {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}&url=${encodeURIComponent(urlToShare)}`;
  window.open(twitterUrl, "_blank", "width=600,height=400");
}

twitterButton.addEventListener("click", () => {
  if (rightClickedTab) {
    const rclink = rightClickedTab.getAttribute("link");
    const rcIframe = document.querySelector(`iframe[link="${rclink}"]`);
    const rciframeTitle = rcIframe.contentDocument?.title;
    const rctext = rciframeTitle;
    const rcurlToShare = rcIframe.getAttribute("origin");
    shareOnTwitter(rctext, rcurlToShare);
    contextMenu.style.visibility = "hidden";
  }
});

const deleteButton = document.querySelector(".item.delete");
deleteButton.addEventListener("click", () => {
  const rclink = rightClickedTab.getAttribute("link");
  const rcactiveIframe = document.querySelector(`iframe[link="${rclink}"]`);
  rightClickedTab.remove();
  rcactiveIframe.remove();
  contextMenu.style.visibility = "hidden";
});

const copyLinkButton = document.querySelector(".item.copy-link");
copyLinkButton.addEventListener("click", () => {
  const rclink = rightClickedTab.getAttribute("link");
  const rcactiveIframe = document.querySelector(`iframe[link="${rclink}"]`);
  const rcurlToCopy = rcactiveIframe.getAttribute("origin");
  navigator.clipboard.writeText(rcurlToCopy);
  contextMenu.style.visibility = "hidden";
  Toastify({
    text: "Link copied to clipboard",
    duration: 3000,
  }).showToast();
});

function attachIframeClickListener(iframe) {
  iframe.addEventListener("load", () => {
    iframe.contentWindow.document.addEventListener("click", () => {
      contextMenu.style.visibility = "hidden";
    });
    activeTab = document.querySelector(".tab.active");
    link = activeTab.getAttribute("link");
    activeIframe = document.querySelector(`iframe[link="${link}"]`);
    let activeIframeTitle = activeIframe.contentWindow.document.title;
    if (event.target.getAttribute("link") === link) {
      Array.from(activeTab.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          activeTab.removeChild(node);
        }
      });
      const imgNode = activeTab.querySelector("img.tab-icon");
      const newTextNode = document.createTextNode(activeIframeTitle);
      if (imgNode) {
        activeTab.insertBefore(newTextNode, imgNode.nextSibling);
      } else {
        activeTab.appendChild(newTextNode);
      }
      const favicon = activeTab.querySelector(`img[link="${link}"]`);
      favicon.src = `https://favicone.com/${activeIframe
        .getAttribute("origin")
        .origin.replace("https://", "")}`;
    }
  });
}

const iframes = document.querySelectorAll("iframe");
iframes.forEach(attachIframeClickListener);

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === "IFRAME") {
        attachIframeClickListener(node);
      }
    });
  });
});
//todo: add event listener to dropdown items
const dropdownItems = document.querySelectorAll(".dropdown-item");
dropdownItems.forEach((item) => {
  item.addEventListener("click", () => {
    const engine = item.getAttribute("id");
    const searchIcon = document.getElementById("searchIcon");
    const itemImage = item.querySelector("img").src;
    searchIcon.src = itemImage;

    if (engine === "google") {
      searchUrl = "https://www.google.com/search?q=";
    } else if (engine === "duckduckgo") {
      searchUrl = "https://duckduckgo.com?q=";
    } else if (engine === "bing") {
      searchUrl = "https://www.bing.com/search?q=";
    } else if (engine === "yahoo") {
      searchUrl = "https://search.yahoo.com/search?p=";
    } else if (engine === "startpage") {
      searchUrl = "https://www.startpage.com/do/search?q=";
    } else if (engine === "yandex") {
      searchUrl = "https://yandex.com/search?text=";
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
