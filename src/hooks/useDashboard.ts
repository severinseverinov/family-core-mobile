import { useQuery } from "@tanstack/react-query";
import { getDashboardItems } from "../services/events";
import { getFamilyDetails } from "../services/family";

// Aile bilgilerini çeken hook
export const useFamily = () => {
  return useQuery({
    queryKey: ["family"],
    queryFn: getFamilyDetails,
  });
};

// Dashboard kalemlerini çeken hook
export const useDashboardItems = (dateStr?: string) => {
  return useQuery({
    queryKey: ["dashboard", dateStr],
    queryFn: () => getDashboardItems(dateStr),
  });
};
