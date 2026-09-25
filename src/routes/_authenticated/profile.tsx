import { createFileRoute } from "@tanstack/react-router";

import { UserProfilePage } from "@/components/UserProfilePage";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "حسابي | الذات" },
      { name: "description", content: "إدارة الملف الشخصي وكلمة المرور في منصة الذات." },
    ],
  }),
  component: UserProfilePage,
});
