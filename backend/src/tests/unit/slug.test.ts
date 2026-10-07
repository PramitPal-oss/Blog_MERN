import { slugBase } from "../../utils/slug.js";
describe("slugBase", () => {
  it("normalizes punctuation and accents", () => expect(slugBase("  Déjà Vu: MERN!  ")).toBe("deja-vu-mern"));
  it("uses a fallback for titles without ASCII letters or digits", () => expect(slugBase("你好")).toBe("post"));
});
