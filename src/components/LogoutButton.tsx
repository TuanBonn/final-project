// src/components/LogoutButton.tsx
"use client";

// NO need to import createClient anymore
// import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call your logout API
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Logout failed.");
      }

      // Logout successful
      console.log("Successfully logged out from client."); // Debug log
      router.replace("/"); // Back to homepage
      router.refresh(); // Refresh page to update UI (Header receives user = null)
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
