import { test, expect } from "@playwright/test";

const categories = [
  "category-refrigerator",
  "category-washing-machine",
  "category-air-conditioner",
];

test.describe("Landing page", () => {
  test("renders hero section and key interactions", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("text-hero-title")).toBeVisible();
    await expect(page.getByTestId("text-hero-description")).toContainText("AI");
    await expect(page.getByTestId("input-search-product")).toBeVisible();
    await expect(page.getByTestId("button-search")).toBeEnabled();

    for (const category of categories) {
      await expect(page.getByTestId(category)).toBeVisible();
    }

    await expect(page.getByTestId("button-kakao-chat")).toBeVisible();
  });
});
