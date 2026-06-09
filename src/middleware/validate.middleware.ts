import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { ZodSchema } from "zod";

type ValidationTarget = "body" | "params" | "query";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request[target]);

    if (!result.success) {
      return next(
        createHttpError(400, "Request validation failed", {
          details: result.error.flatten()
        })
      );
    }

    if (target === "query") {
      Object.defineProperty(request, "query", {
        value: result.data,
        configurable: true,
        enumerable: true
      });
    } else {
      request[target] = result.data;
    }

    return next();
  };
}
