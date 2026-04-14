const { Router } = require("express");
const express = require("express");
const multer = require("multer");
const {
  registration,
  login,
  logout,
  getPosts,
  uploadResume,
  submitApplication,
  scoreResume,
  chat,
  getMyApplications,
} = require("../controllers/candidate.controller");

const candidateRouter = Router();
const formDataParser = multer();
const resumeUploadParser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function requireFormContentType(req, res, next) {
  if (
    req.is("multipart/form-data") ||
    req.is("application/x-www-form-urlencoded")
  ) {
    return next();
  }

  const error = new Error(
    "Content-Type must be multipart/form-data or application/x-www-form-urlencoded.",
  );
  error.statusCode = 415;
  return next(error);
}

function requireJsonContentType(req, res, next) {
  if (req.is("application/json")) {
    return next();
  }

  const error = new Error("Content-Type must be application/json.");
  error.statusCode = 415;
  return next(error);
}

candidateRouter.post(
  "/registration",
  requireFormContentType,
  formDataParser.none(),
  registration,
);
candidateRouter.post(
  "/login",
  requireJsonContentType,
  express.json({ limit: "32kb" }),
  login,
);
candidateRouter.post("/logout", logout);
candidateRouter.get("/get-posts", getPosts);
candidateRouter.post(
  "/upload-resume",
  requireFormContentType,
  resumeUploadParser.single("file"),
  uploadResume,
);
candidateRouter.post(
  "/submit-application",
  requireFormContentType,
  resumeUploadParser.single("file"),
  submitApplication,
);
candidateRouter.post(
  "/score-resume",
  requireFormContentType,
  resumeUploadParser.single("file"),
  scoreResume,
);
candidateRouter.post(
  "/chat",
  requireFormContentType,
  formDataParser.none(),
  chat,
);
candidateRouter.get("/my-applications", getMyApplications);

module.exports = candidateRouter;
