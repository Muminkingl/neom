"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { DashboardContent } from "@/components/watermelon/library-dashboard/components/library/dashboard-content";

export default function DashboardPage() {
  const { isStaffAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isStaffAuth) {
      router.push("/dashboard/patient-form");
    }
  }, [isStaffAuth, router]);

  return <DashboardContent />;
}