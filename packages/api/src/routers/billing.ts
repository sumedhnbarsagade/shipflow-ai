import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import Razorpay from "razorpay";

export const billingRouter = router({
  createSubscription: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (razorpayKeyId && razorpayKeySecret) {
        try {
          const razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
          });

          // Create a payment link or subscription plan for testing.
          // Since we want this to be simple, let's create a subscription.
          // Note: In real production, you'd specify a pre-created plan_id.
          // We will create a Razorpay subscription with a standard plan or payment link.
          const link = await razorpay.paymentLink.create({
            amount: 4900, // INR 49.00
            currency: "INR",
            accept_partial: false,
            description: "ShipFlow AI Premium Plan - Monthly Subscription",
            customer: {
              name: ctx.session.user.name,
              email: ctx.session.user.email,
            },
            notify: {
              email: true,
              sms: false,
            },
            reminder_enable: true,
            notes: {
              organizationId: input.organizationId,
            },
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing?success=true&orgId=${input.organizationId}`,
            callback_method: "get",
          });

          return {
            paymentLink: link.short_url,
            isMock: false,
          };
        } catch (e: any) {
          console.error("Razorpay error:", e);
          // Return mock checkout if credentials fail
        }
      }

      // Mock Subscription Fallback
      return {
        paymentLink: `/billing?mock_checkout=true&orgId=${input.organizationId}`,
        isMock: true,
      };
    }),

  verifyPayment: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        paymentId: z.string().optional(),
        isMock: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Transition organization subscription to PREMIUM
      const sub = await ctx.prisma.orgSubscription.findUnique({
        where: { organizationId: input.organizationId },
      });

      const updated = await ctx.prisma.orgSubscription.upsert({
        where: { organizationId: input.organizationId },
        update: {
          plan: "PREMIUM",
          aiCredits: 1000, // premium credit allowance
          repoLimit: 9999, // premium unlimited repos
        },
        create: {
          organizationId: input.organizationId,
          plan: "PREMIUM",
          aiCredits: 1000,
          repoLimit: 9999,
        },
      });

      return { success: true, plan: updated.plan };
    }),
});
