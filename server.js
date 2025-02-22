import wisp from "wisp-server-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import schedule from "node-schedule";
import { WebSocketServer } from "ws";
import fs from "fs";

dotenv.config();

const bare = createBareServer("/bare/");
const __dirname = join(fileURLToPath(import.meta.url), "..");
const app = express();
const publicPath = "public";

app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/get-chat-completion", async (req, res) => {
  try {
    const { messages } = req.body;
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "you are willson. you will respond casually to any message as if it were a website title, you say something you think about the website. nothing other than that.",
        },
        ...messages,
      ],
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
    });

    res.json({ message: chatCompletion.choices[0]?.message?.content });
  } catch (error) {
    res.status(500).json({ error: "Failed to get response from Groq API" });
  }
});

let dailyNekoUrl = "";

app.get("/daily-neko", (req, res) => {
  if (dailyNekoUrl) {
    res.json({ link: dailyNekoUrl });
  } else {
    res.status(500).json({ error: "Neko image not available" });
  }
});

// Fetch daily neko initially and then schedule to update every minute
fetchDailyNeko();
schedule.scheduleJob("0 6 * * *", fetchDailyNeko);

app.use(express.static(publicPath));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

app.use((req, res) => {
  res.status(404);
  res.sendFile(join(__dirname, publicPath, "404.html"));
});

// Create HTTP server using Express
const httpServer = createServer(app);

const wss = new WebSocketServer({ noServer: true }); // Use noServer mode to prevent conflicts

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
});

async function fetchDailyNeko() {
  try {
    const response = await fetch(
      "https://corsproxy.io/?url=https://purrbot.site/api/img/sfw/neko/gif"
    );
    const data = await response.json();

    if (!data.link) throw new Error("API did not return a valid link");

    dailyNekoUrl = data.link;
    console.log("Fetched new Daily Neko Image URL:", dailyNekoUrl);

    // Notify all connected clients to update the Neko image
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({ action: "updateNeko", link: dailyNekoUrl })
        );
      }
    });
  } catch (error) {
    console.error("Failed to fetch daily Neko image:", error);
  }
}

// Properly handle WebSocket upgrades to avoid duplicate calls
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8081; // 8080 keeps getting taken by steamconsole Lol

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close();
  bare.close();
  process.exit(0);
}
