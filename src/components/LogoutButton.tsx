"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Logout failed.");
      }

      console.log("Successfully logged out from client.");
      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      console.error("Logout error:", error);
      let errorMessage = "An error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert("Logout error: " + errorMessage);
    }
  };

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Logout
    </Button>
  );
}
