import { describe, it, expect } from "vitest";
import {
  UnauthenticatedError,
  UnauthorizedError,
  NotFoundError,
  ServerError,
  ValidationError,
} from "./errors";

const errorCases = [
  {
    ErrorClass: UnauthenticatedError,
    name: "UnauthenticatedError",
    defaultMessage: "User not authenticated",
  },
  {
    ErrorClass: UnauthorizedError,
    name: "UnauthorizedError",
    defaultMessage: "User not authorized",
  },
  {
    ErrorClass: NotFoundError,
    name: "NotFoundError",
    defaultMessage: "Resource not found",
  },
  {
    ErrorClass: ServerError,
    name: "ServerError",
    defaultMessage: "Server error",
  },
  {
    ErrorClass: ValidationError,
    name: "ValidationError",
    defaultMessage: "Validation error",
  },
];

describe("Custom error classes", () => {
  errorCases.forEach(({ ErrorClass, name, defaultMessage }) => {
    describe(name, () => {
      it("is an instance of Error", () => {
        expect(new ErrorClass()).toBeInstanceOf(Error);
      });

      it(`has name "${name}"`, () => {
        expect(new ErrorClass().name).toBe(name);
      });

      it(`has default message "${defaultMessage}"`, () => {
        expect(new ErrorClass().message).toBe(defaultMessage);
      });

      it("supports custom messages", () => {
        const custom = new ErrorClass("custom msg");
        expect(custom.message).toBe("custom msg");
      });
    });
  });
});
