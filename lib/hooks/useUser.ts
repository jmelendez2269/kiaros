/**
 * Custom hook for user context
 *
 * TODO: Extend with additional user data from Supabase
 */

import { useUser as useClerkUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserProfile } from "@/lib/types";

export function useUser() {
  const { user, isLoaded, isSignedIn } = useClerkUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const fetchUserProfile = async () => {
      if (!isSignedIn || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Fetch user profile from Supabase
        // const profile = await getUserProfile(user.id);
        // setUserProfile(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [isLoaded, isSignedIn, user]);

  return {
    user,
    userProfile,
    isLoaded,
    isSignedIn,
    isLoading,
  };
}
