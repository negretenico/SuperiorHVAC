import { describe, expect, it } from "vitest";
import { todo } from "../config/business";
import { filled, resolveMaybe, showTodoMarkers } from "./todo";

describe("showTodoMarkers", () => {
  it("is on only in development", () => {
    expect(showTodoMarkers("development")).toBe(true);
    expect(showTodoMarkers("production")).toBe(false);
    expect(showTodoMarkers("test")).toBe(false);
    expect(showTodoMarkers(undefined)).toBe(false);
  });
});

describe("filled", () => {
  it("returns real values and undefined for todo()", () => {
    expect(filled("x")).toBe("x");
    expect(filled(0)).toBe(0);
    expect(filled(todo("zip"))).toBeUndefined();
    expect(filled(undefined)).toBeUndefined();
  });
});

describe("resolveMaybe", () => {
  it("passes real values through in every mode", () => {
    expect(resolveMaybe("hello", "production")).toEqual({ kind: "value", value: "hello" });
    expect(resolveMaybe("hello", "development")).toEqual({ kind: "value", value: "hello" });
  });

  it("hides todo() in production builds", () => {
    expect(resolveMaybe(todo("Joey's bio"), "production")).toEqual({ kind: "hidden" });
  });

  it("shows a labelled marker for todo() in dev", () => {
    expect(resolveMaybe(todo("Joey's bio"), "development")).toEqual({ kind: "marker", text: "TODO: Joey's bio" });
  });

  it("treats undefined like a missing optional value: hidden, no marker", () => {
    expect(resolveMaybe(undefined, "development")).toEqual({ kind: "hidden" });
  });
});
