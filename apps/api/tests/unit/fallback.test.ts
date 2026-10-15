import { describe, expect, it } from "vitest";
import { classifyWithRules } from "../../src/ai/fallback";

// The sample queries from BookLeaf's support playbook.
const cases = [
  {
    text: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
    category: "ROYALTY_PAYMENTS",
    priority: "HIGH",
  },
  {
    text: "My royalty amount seems too low. I sold 200 copies but only got ₹3,000.",
    category: "ROYALTY_PAYMENTS",
    priority: "MEDIUM",
  },
  {
    text: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
    category: "ISBN_METADATA",
    priority: "HIGH",
  },
  {
    text: "I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.",
    category: "PRINTING_QUALITY",
    priority: "HIGH",
  },
  {
    text: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
    category: "DISTRIBUTION",
    priority: "HIGH",
  },
  {
    text: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
    category: "BOOK_STATUS",
    priority: "MEDIUM",
  },
  {
    text: "Can I update the description of my book on Amazon after it's already live?",
    category: "GENERAL",
    priority: "LOW",
  },
];

describe("classifyWithRules", () => {
  it.each(cases)("$category / $priority: $text", ({ text, category, priority }) => {
    const result = classifyWithRules("", text);
    expect(result.category).toBe(category);
    expect(result.priority).toBe(priority);
    expect(result.reason).toBeTruthy();
  });

  it("flags six months without royalty as critical", () => {
    const result = classifyWithRules("Royalty", "I haven't received any royalty for 6 months.");
    expect(result.priority).toBe("CRITICAL");
  });
});
