"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateAIInsights } from "./dashboard";

export async function updateUser(data) {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const user = await db.user?.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");

  const normalizedIndustry = data.industry.trim().toLowerCase();

  try {
    const result = await db.$transaction(
      async (tx) => {
        // 1. Check if industry insight already exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: normalizedIndustry,
          },
        });

        // 2. If not found, create it with fallback
        if (!industryInsight) {
          const insights = await generateAIInsights(normalizedIndustry);

          try {
            industryInsight = await tx.industryInsight.create({
              data: {
                industry: normalizedIndustry,
                ...insights,
                nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          } catch (err) {
            // Handle duplicate creation race condition
            if (err.code === "P2002") {
              industryInsight = await tx.industryInsight.findUnique({
                where: { industry: normalizedIndustry },
              });
            } else {
              throw err;
            }
          }
        }

        // 3. Update the user with normalized industry and other fields
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: normalizedIndustry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000,
      }
    );

    return { success: true, ...result };
  } catch (error) {
    console.log("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const user = await db.user?.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");
  try {
    const user = await db.user?.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });
    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.log("failed to check onboarding status", error.message);
    throw new Error("Failed to check onboarding status");
  }
}
