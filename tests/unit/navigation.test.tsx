// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/actions", () => ({ signOutAction: vi.fn() }));

import { MobileHeader } from "@/components/layout/mobile-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { isActive, navGroups } from "@/config/navigation";

beforeEach(() => {
  pathname.current = "/dashboard";
});

describe("navigation structure", () => {
  it("has the required groups and items in order", () => {
    expect(navGroups.map((g) => g.label)).toEqual(["Workspace", "Research tools", "Resources", "Account"]);
    expect(navGroups.map((g) => g.items.map((i) => i.label))).toEqual([
      ["Dashboard", "My Projects", "Recent"],
      [
        "Research Planner",
        "Persona Builder",
        "Competitor Analyzer",
        "Journey Mapper",
        "Research Synthesizer",
        "Opportunity Analyzer",
      ],
      ["Templates"],
      ["Settings", "Billing"],
    ]);
  });

  it("matches nested routes for prefix items only", () => {
    const projects = navGroups[0].items[1];
    const dashboard = navGroups[0].items[0];
    expect(isActive(projects, "/projects/abc/edit")).toBe(true);
    expect(isActive(projects, "/projectsx")).toBe(false);
    expect(isActive(dashboard, "/dashboard/extra")).toBe(false);
  });
});

describe("SidebarNav", () => {
  it("renders every group and link", () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const label of ["Workspace", "Research tools", "Resources", "Account"]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).getAllByRole("link")).toHaveLength(11); // every item except the disabled Billing
  });

  it("marks only the current page as active", () => {
    pathname.current = "/projects/123";
    render(<SidebarNav />);
    const active = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(active.map((a) => a.textContent)).toEqual(["My Projects"]);
  });

  it("shows Billing as a disabled, non-link item", () => {
    render(<SidebarNav />);
    expect(screen.queryByRole("link", { name: /Billing/ })).toBeNull();
    const billing = screen.getByText("Billing").closest("[aria-disabled]");
    expect(billing).toHaveAttribute("aria-disabled", "true");
  });

  it("flags only the unfinished research tools as coming soon", () => {
    render(<SidebarNav />);
    expect(screen.getAllByText("Soon")).toHaveLength(1);
    // Live tools carry no badge.
    const planner = screen.getByRole("link", { name: "Research Planner" });
    expect(planner).toHaveAttribute("href", "/tools/research-planner");
    expect(within(planner).queryByText("Soon")).toBeNull();
    for (const name of [/Persona Builder/, /Competitor Analyzer/, /Journey Mapper/, /Research Synthesizer/]) {
      expect(within(screen.getByRole("link", { name })).queryByText("Soon")).toBeNull();
    }
    expect(within(screen.getByRole("link", { name: /Opportunity Analyzer/ })).getByText("Soon")).toBeInTheDocument();
  });
});

describe("MobileHeader drawer", () => {
  it("is closed initially and opens from the menu button", async () => {
    const user = userEvent.setup();
    render(<MobileHeader name="Ada Lovelace" email="ada@example.com" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /My Projects/ })).toBeInTheDocument();
  });

  it("closes when a destination is chosen", async () => {
    const user = userEvent.setup();
    render(<MobileHeader name="Ada" email="ada@example.com" />);
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("link", { name: /Templates/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    render(<MobileHeader name="Ada" email="ada@example.com" />);
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
