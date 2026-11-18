import { describe, expect, it } from "vitest";
import { business, type Service } from "../config/business";
import { countWord, initials, joinTowns, serviceNote, spectrum, wordmarkParts } from "./text";

describe("initials", () => {
  it("takes first and last initials", () => {
    expect(initials("Joey Ojeda")).toBe("JO");
    expect(initials("Ramon Negrete")).toBe("RN");
    expect(initials("cher")).toBe("C");
    expect(initials("Mary Ann  Smith")).toBe("MS");
  });
});

describe("wordmarkParts", () => {
  it("splits a trailing all-caps word off as the tag", () => {
    expect(wordmarkParts("Superior HVAC")).toEqual({ main: "Superior", tag: "HVAC" });
    expect(wordmarkParts("Acme Heating")).toEqual({ main: "Acme Heating", tag: "" });
  });
});

describe("countWord", () => {
  it("spells small counts", () => {
    expect(countWord(2)).toBe("Two");
    expect(countWord(1)).toBe("One");
    expect(countWord(13)).toBe("13");
  });
});

describe("joinTowns", () => {
  it("joins with commas", () => {
    expect(joinTowns(["Norwalk", "Sandusky", "Huron"])).toBe("Norwalk, Sandusky, Huron");
  });
});

const svc = (over: Partial<Service>): Service => ({
  slug: "x",
  name: "X",
  summary: "s",
  climate: "both",
  symptoms: [],
  ...over,
});

describe("serviceNote", () => {
  it("prefers the labelled note", () => {
    expect(serviceNote(svc({ note: { label: "Good timing", text: "Spring." }, symptoms: ["A"] }))).toEqual({
      label: "Good timing",
      text: "Spring.",
    });
  });
  it("otherwise builds 'Call us if' from symptoms, sentence-cased", () => {
    expect(serviceNote(svc({ symptoms: ["No heat", "Cold rooms", "Cycling on and off"] }))).toEqual({
      label: "Call us if",
      text: "No heat · cold rooms · cycling on and off",
    });
  });
  it("returns undefined when there is nothing to say", () => {
    expect(serviceNote(svc({}))).toBeUndefined();
  });
});

describe("spectrum", () => {
  it("orders warm to cool and assigns a 0..1 position and side label", () => {
    const out = spectrum(business.services);
    expect(out.map((s) => s.service.climate)).toEqual(["heat", "both", "both", "cool"]);
    expect(out.map((s) => s.pos)).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(out.map((s) => s.side)).toEqual(["Warm side", "Both seasons", "Both seasons", "Cool side"]);
  });
  it("handles a single service", () => {
    expect(spectrum([svc({ climate: "cool" })])[0]?.pos).toBe(0.5);
  });
});
