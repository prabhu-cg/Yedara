import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/auth/schemas";

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe("login form validation", () => {
  it("accepts a valid email and any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });

  it("trims the email", () => {
    const parsed = loginSchema.parse({ email: "  a@b.co  ", password: "x" });
    expect(parsed.email).toBe("a@b.co");
  });

  it("rejects missing and malformed values", () => {
    expect(messages(loginSchema.safeParse({ email: "", password: "" }))).toEqual(
      expect.arrayContaining(["Email is required", "Password is required"]),
    );
    expect(messages(loginSchema.safeParse({ email: "nope", password: "x" }))).toContain(
      "Enter a valid email address",
    );
  });

  it("rejects passwords over bcrypt's 72 character limit", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x".repeat(73) }).success).toBe(false);
  });
});

describe("password rules", () => {
  it.each([
    ["short1", "Use at least 8 characters"],
    ["12345678", "Include at least one letter"],
    ["abcdefgh", "Include at least one number"],
    ["a1".repeat(40), "Use 72 characters or fewer"],
  ])("rejects %s", (value, message) => {
    expect(messages(passwordSchema.safeParse(value))).toContain(message);
  });

  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("correct horse 9").success).toBe(true);
  });
});

describe("signup form validation", () => {
  const valid = { fullName: "Ada Lovelace", email: "ada@example.com", password: "analytical1" };

  it("accepts valid input", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name", () => {
    expect(messages(signupSchema.safeParse({ ...valid, fullName: "   " }))).toContain("Your name is required");
  });

  it("limits the name length", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "x".repeat(121) }).success).toBe(false);
  });
});

describe("forgot password validation", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "ok@example.com" }).success).toBe(true);
  });
});

describe("reset password validation", () => {
  it("requires both passwords to match", () => {
    const result = resetPasswordSchema.safeParse({ password: "abcdefg1", confirmPassword: "abcdefg2" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
    expect(messages(result)).toContain("Passwords do not match");
  });

  it("accepts matching strong passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "abcdefg1", confirmPassword: "abcdefg1" }).success).toBe(true);
  });
});

describe("profile validation", () => {
  it("requires a name but allows empty optional fields", () => {
    expect(profileSchema.safeParse({ fullName: "A", jobTitle: "", company: "" }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: "", jobTitle: "", company: "" }).success).toBe(false);
  });
});
