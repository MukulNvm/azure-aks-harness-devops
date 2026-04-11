const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const client = require("prom-client");

const app = express();
const port = process.env.PORT || 8080;

const register = new client.Registry();
client.collectDefaultMetrics({
  register,
  prefix: "devops_harness_"
});

const httpRequestCounter = new client.Counter({
  name: "devops_harness_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: "devops_harness_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

const users = [
  { id: 1, name: "Ava Sharma", role: "Platform Engineer" },
  { id: 2, name: "Liam Patel", role: "SRE" },
  { id: 3, name: "Noah Singh", role: "DevOps Engineer" }
];

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const route = req.path;
  const end = httpRequestDuration.startTimer({ method: req.method, route });

  res.on("finish", () => {
    const statusCode = String(res.statusCode);
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode
    });
    end({ status_code: statusCode });
  });

  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
