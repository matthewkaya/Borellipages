import {
  changePassword,
  logout,
  requireAdminAuth
} from "@/scripts/adminAuth";

export function initAdminSettings(): void {
  requireAdminAuth();

  const form = document.getElementById("admin-password-form");
  const feedback = document.getElementById("password-feedback");
  const logoutButton = document.getElementById("admin-logout");

  if (!(form instanceof HTMLFormElement) || !(feedback instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const oldPassword =
      form.querySelector<HTMLInputElement>("#old-password")?.value ?? "";
    const newPassword =
      form.querySelector<HTMLInputElement>("#new-password")?.value ?? "";
    const confirmPassword =
      form.querySelector<HTMLInputElement>("#confirm-password")?.value ?? "";

    const result = await changePassword(oldPassword, newPassword, confirmPassword);
    feedback.textContent = result.message;
    feedback.className = result.ok
      ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      : "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700";

    if (result.ok) {
      form.reset();
    }
  });

  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener("click", () => {
      logout();
      window.location.assign("/admin/login");
    });
  }
}
