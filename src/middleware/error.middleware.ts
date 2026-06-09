import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({
    success: false,
    error: {
      message: "Route not found"
    }
  });
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : 500;

  let message = "Internal server error";
  let details = undefined;

  if (statusCode === 500) {
    // For 500 errors, log to server console
    console.error("[500 ERROR]", error);

    // Only expose actual error message in development
    if (isDevelopment && error instanceof Error) {
      message = error.message;
    }
  } else {
    // For expected errors (400, 401, etc.), we can safely show the message
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
      message = error.message;
    }
  }

  // Preserve validation details for 400 Bad Request
  if (statusCode === 400 && typeof error === "object" && error !== null && "details" in error) {
    details = error.details;
  }

  response.status(statusCode).json({
    success: false,
    error: {
      message,
      details
    }
  });
}
